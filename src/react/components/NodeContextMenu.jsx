import React, { useEffect, useCallback, useRef } from 'react';
import { ClipboardCopy, Highlighter, Crosshair, Info } from 'lucide-react';
import { useAppStore } from '../../js/core/store.js';
import { SubtreeExtractor } from '../../js/domain/tree/subtreeExtractor.js';
import { toast } from 'sonner';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * NodeContextMenu - React component for tree node context menu.
 * Renders a floating menu at the click position with node-specific actions.
 *
 * This component is controlled by the contextMenuSlice in the store,
 * allowing DeckGL's vanilla JS picking handlers to trigger it.
 */
export function NodeContextMenu() {
  const menuRef = useRef(null);

  // Store state
  const isOpen = useAppStore((s) => s.contextMenuOpen);
  const position = useAppStore((s) => s.contextMenuPosition);
  const node = useAppStore((s) => s.contextMenuNode);
  const hideMenu = useAppStore((s) => s.hideNodeContextMenu);
  const setManuallyMarkedNodes = useAppStore((s) => s.setManuallyMarkedNodes);
  const treeControllers = useAppStore((s) => s.treeControllers);

  // Close menu on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        hideMenu();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        hideMenu();
      }
    };

    // Delay to avoid immediate close from the triggering click
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, hideMenu]);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const rect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = position.x;
    let adjustedY = position.y;

    if (rect.right > viewportWidth) {
      adjustedX = viewportWidth - rect.width - 10;
    }
    if (adjustedX < 10) adjustedX = 10;

    if (rect.bottom > viewportHeight) {
      adjustedY = viewportHeight - rect.height - 10;
    }
    if (adjustedY < 10) adjustedY = 10;

    if (adjustedX !== position.x || adjustedY !== position.y) {
      menuRef.current.style.left = `${adjustedX}px`;
      menuRef.current.style.top = `${adjustedY}px`;
    }
  }, [isOpen, position]);

  // ==========================================================================
  // ACTION HANDLERS
  // ==========================================================================

  const handleExtractSubtree = useCallback(() => {
    if (!node) return;

    try {
      const newick = SubtreeExtractor.nodeToNewick(node);
      navigator.clipboard.writeText(newick).then(() => {
        const nodeName = node.data?.name || `Node (depth ${node.depth})`;
        toast.success(`Subtree copied from ${nodeName}`);
      }).catch(() => {
        // Fallback for clipboard API failure
        const textarea = document.createElement('textarea');
        textarea.value = newick;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        toast.success('Subtree copied (fallback)');
      });
    } catch (error) {
      console.error('Failed to extract subtree:', error);
      toast.error('Failed to extract subtree');
    }
    hideMenu();
  }, [node, hideMenu]);

  const handleHighlightDescendants = useCallback(() => {
    if (!node) return;

    const splitIndices = node.data?.split_indices || node.split_indices;

    if (splitIndices && setManuallyMarkedNodes) {
      setManuallyMarkedNodes(splitIndices);
      toast.success(`Highlighted subtree with ${splitIndices.length} taxa`);
    } else {
      toast.warning('Could not identify subtree taxa');
    }
    hideMenu();
  }, [node, setManuallyMarkedNodes, hideMenu]);

  const handleFocusOnNode = useCallback(() => {
    if (!node) return;

    if (treeControllers && treeControllers.length > 0) {
      const controller = treeControllers[0];
      if (controller && typeof controller.focusOnNode === 'function') {
        controller.focusOnNode(node);
      }
    }
    hideMenu();
  }, [node, treeControllers, hideMenu]);

  const handleCopyInfo = useCallback(() => {
    if (!node) return;

    try {
      const stats = SubtreeExtractor.getSubtreeStats(node);
      const breadcrumb = SubtreeExtractor.createBreadcrumb(node);

      const info = `Node: ${node.data?.name || 'unnamed'}
Path: ${breadcrumb}
Descendants: ${stats.totalNodes}
Leaves: ${stats.leafCount}
Max Depth: ${stats.maxDepth}`;

      navigator.clipboard.writeText(info).then(() => {
        toast.success('Node info copied to clipboard');
      }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = info;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        toast.success('Node info copied (fallback)');
      });
    } catch (error) {
      console.error('Failed to copy node info:', error);
      toast.error('Failed to copy node info');
    }
    hideMenu();
  }, [node, hideMenu]);

  // ==========================================================================
  // DERIVED STATE
  // ==========================================================================

  if (!isOpen || !node) return null;

  const nodeName = node.data?.name || `Node (depth ${node.depth})`;
  let nodeStats = '';
  let canExtract = false;

  try {
    const stats = SubtreeExtractor.getSubtreeStats(node);
    nodeStats = `${stats.totalNodes} nodes, ${stats.leafCount} leaves`;
    canExtract = SubtreeExtractor.isValidSubtreeRoot(node);
  } catch (error) {
    console.error('Error getting node stats:', error);
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div
      ref={menuRef}
      className="fixed z-[99999] min-w-[240px] max-w-[320px] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg backdrop-blur"
      style={{
        left: position.x,
        top: position.y,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex flex-col gap-0.5 border-b border-border bg-muted/50 px-3 py-2">
        <span className="text-sm font-semibold text-foreground truncate">
          {nodeName}
        </span>
        <span className="text-xs text-muted-foreground">
          {nodeStats}
        </span>
      </div>

      {/* Menu Items */}
      <div className="p-1">
        <MenuItem
          icon={ClipboardCopy}
          label="Copy Subtree (Newick)"
          onClick={handleExtractSubtree}
          disabled={!canExtract}
        />
        <MenuItem
          icon={Highlighter}
          label="Highlight Descendants"
          onClick={handleHighlightDescendants}
        />
        <MenuItem
          icon={Crosshair}
          label="Focus on Node"
          onClick={handleFocusOnNode}
        />
        <MenuItem
          icon={Info}
          label="Copy Node Info"
          onClick={handleCopyInfo}
        />
      </div>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Individual menu item with icon and label.
 */
import { Button } from '@/components/ui/button';

function MenuItem({ icon: Icon, label, onClick, disabled = false }) {
  return (
    <Button
      variant="ghost"
      className="w-full justify-start gap-3 px-2 h-9 font-normal"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      <Icon className="size-4 text-muted-foreground" />
      <span className="flex-1 text-left">{label}</span>
    </Button>
  );
}

export default NodeContextMenu;
