import { SubtreeExtractor } from '../utils/SubtreeExtractor.js';
import { useAppStore } from '../core/store.js';

const lucideSvg = (nodes) => {
  const children = nodes.map(([tag, attrs]) => {
    const attrString = Object.entries(attrs)
      .filter(([key]) => key !== 'key')
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    return `<${tag} ${attrString}></${tag}>`;
  }).join('');

  return `<svg aria-hidden="true" focusable="false" class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${children}</svg>`;
};

const ICON_COPY = lucideSvg([
  ["rect", { width: "8", height: "4", x: "8", y: "2", rx: "1", ry: "1" }],
  ["path", { d: "M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" }],
  ["path", { d: "M16 4h2a2 2 0 0 1 2 2v4" }],
  ["path", { d: "M21 14H11" }],
  ["path", { d: "m15 10-4 4 4 4" }]
]);

const ICON_HIGHLIGHT = lucideSvg([
  ["path", { d: "m9 11-6 6v3h9l3-3" }],
  ["path", { d: "m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" }]
]);

const ICON_CROSSHAIR = lucideSvg([
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["line", { x1: "22", x2: "18", y1: "12", y2: "12" }],
  ["line", { x1: "6", x2: "2", y1: "12", y2: "12" }],
  ["line", { x1: "12", x2: "12", y1: "6", y2: "2" }],
  ["line", { x1: "12", x2: "12", y1: "22", y2: "18" }]
]);

const ICON_INFO = lucideSvg([
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "M12 16v-4" }],
  ["path", { d: "M12 8h.01" }]
]);

/**
 * NodeContextMenu - Context menu component for tree node interactions
 * Provides options for subtree extraction, highlighting, and navigation
 */
export class NodeContextMenu {
  constructor() {
    this.menu = null;
    this.currentNode = null;
    this.currentTreeData = null;
    this.isVisible = false;

    this._createMenuElement();
    this._attachEventListeners();
  }

  /**
   * Create the HTML element for the context menu
   * @private
   */
  _createMenuElement() {
    this.menu = document.createElement('div');
    this.menu.id = 'node-context-menu';
    this.menu.className = [
      'node-context-menu',
      'fixed',
      'z-[99999]',
      'min-w-[240px]',
      'max-w-[320px]',
      'overflow-hidden',
      'rounded-md',
      'border',
      'border-border',
      'bg-popover',
      'text-popover-foreground',
      'shadow-lg',
      'text-sm',
      'font-medium',
      'backdrop-blur',
    ].join(' ');
    Object.assign(this.menu.style, {
      position: 'fixed',
      left: '0px',
      top: '0px',
      zIndex: '99999',
      display: 'none',
    });

    // Add menu items with shadcn-style classes
    this.menu.innerHTML = `
      <div class="context-menu-header flex flex-col gap-1 border-b border-border bg-muted/50 px-4 py-3 text-xs font-semibold text-muted-foreground">
        <span class="node-name"></span>
        <span class="node-stats"></span>
      </div>
      <div role="separator" class="context-menu-separator h-px bg-border"></div>
      <button class="context-menu-item flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" data-action="extract-subtree">
        <span class="menu-icon text-foreground/70" aria-hidden="true">${ICON_COPY}</span>
        <span class="menu-text flex-1 text-foreground">Copy Subtree (Newick)</span>
      </button>
      <button class="context-menu-item flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" data-action="highlight-descendants">
        <span class="menu-icon text-foreground/70" aria-hidden="true">${ICON_HIGHLIGHT}</span>
        <span class="menu-text flex-1 text-foreground">Highlight Descendants</span>
      </button>
      <button class="context-menu-item flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" data-action="focus-node">
        <span class="menu-icon text-foreground/70" aria-hidden="true">${ICON_CROSSHAIR}</span>
        <span class="menu-text flex-1 text-foreground">Focus on Node</span>
      </button>
      <button class="context-menu-item flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" data-action="copy-info">
        <span class="menu-icon text-foreground/70" aria-hidden="true">${ICON_INFO}</span>
        <span class="menu-text flex-1 text-foreground">Copy Node Info</span>
      </button>
    `;
    document.body.appendChild(this.menu);
  }

  /**
   * Attach event listeners to the menu
   * @private
   */
  _attachEventListeners() {
    // Handle menu item clicks
    this._onMenuClick = (event) => {
      console.log('[NodeContextMenu] Menu click event:', event);
      console.log('[NodeContextMenu] Event target:', event.target);

      const item = event.target.closest('.context-menu-item');
      console.log('[NodeContextMenu] Closest menu item:', item);

      if (!item) {
        console.log('[NodeContextMenu] No menu item found');
        return;
      }

      if (item.classList.contains('disabled') || item.disabled) {
        console.log('[NodeContextMenu] Menu item is disabled');
        return;
      }

      const action = item.dataset.action;
      console.log('[NodeContextMenu] Action:', action);
      this._handleAction(action);
      this.hide();
    };
    this.menu.addEventListener('click', this._onMenuClick);

    // Hide menu when clicking outside
    this._onDocumentClick = (event) => {
      if (this.isVisible && !this.menu.contains(event.target)) {
        this.hide();
      }
    };
    document.addEventListener('click', this._onDocumentClick);

    // Hide menu on escape key
    this._onDocumentKeydown = (event) => {
      if (event.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    };
    document.addEventListener('keydown', this._onDocumentKeydown);
  }

  /**
   * Show the context menu for a specific node
   * @param {Object} node - The tree node that was clicked
   * @param {Object} treeData - The current tree data
   * @param {number} x - Screen x coordinate for menu position
   * @param {number} y - Screen y coordinate for menu position
   */
  show(node, treeData, x, y) {
    this.currentNode = node;
    this.currentTreeData = treeData;
    this.isVisible = true;

    // Update menu content
    this._updateMenuContent();

    // Position the menu
    this.menu.style.left = `${x}px`;
    this.menu.style.top = `${y}px`;
    this.menu.style.display = 'block';

    // Adjust position if menu goes off screen
    this._adjustPosition();

    // Add a small delay to check if menu is still visible
    setTimeout(() => {
      console.log('[NodeContextMenu] Menu display after delay:', this.menu.style.display);
      if (this.menu.style.display === 'none') {
        console.log('[NodeContextMenu] Menu was hidden, showing again');
        this.menu.style.display = 'block';
      }
    }, 10);
  }

  /**
   * Hide the context menu
   */
  hide() {
    this.menu.style.display = 'none';
    this.isVisible = false;
    // Don't clear currentNode and currentTreeData - keep them for menu actions
  }

  /**
   * Update menu content based on the current node
   * @private
   */
  _updateMenuContent() {
    if (!this.currentNode) {
      return;
    }

    const nameElement = this.menu.querySelector('.node-name');
    const statsElement = this.menu.querySelector('.node-stats');
    const extractItem = this.menu.querySelector('[data-action="extract-subtree"]');

    // Update node information
    const nodeName = this.currentNode.data?.name || `Node (depth ${this.currentNode.depth})`;

    if (nameElement) {
      nameElement.textContent = nodeName;
    }

    // Get subtree statistics
    try {
      const stats = SubtreeExtractor.getSubtreeStats(this.currentNode);
      const statsText = `${stats.totalNodes} nodes, ${stats.leafCount} leaves`;

      if (statsElement) {
        statsElement.textContent = statsText;
      }
    } catch (error) {
      console.error('[NodeContextMenu] Error getting subtree stats:', error);
    }

    // Enable/disable extract subtree based on node validity
    try {
      const canExtract = SubtreeExtractor.isValidSubtreeRoot(this.currentNode);

      if (extractItem) {
        extractItem.classList.toggle('disabled', !canExtract);
        extractItem.disabled = !canExtract;
      }
    } catch (error) {
      console.error('[NodeContextMenu] Error checking subtree validity:', error);
    }
  }

  /**
   * Adjust menu position to stay within viewport
   * @private
   */
  _adjustPosition() {
    const rect = this.menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let newLeft = parseInt(this.menu.style.left);
    let newTop = parseInt(this.menu.style.top);

    // Adjust horizontal position
    if (rect.right > viewportWidth) {
      newLeft = viewportWidth - rect.width - 10;
    }
    if (newLeft < 10) {
      newLeft = 10;
    }

    // Adjust vertical position
    if (rect.bottom > viewportHeight) {
      newTop = viewportHeight - rect.height - 10;
    }
    if (newTop < 10) {
      newTop = 10;
    }

    this.menu.style.left = `${newLeft}px`;
    this.menu.style.top = `${newTop}px`;
  }

  /**
   * Handle menu action selection
   * @param {string} action - The action to perform
   * @private
   */
  _handleAction(action) {

    if (!this.currentNode || !this.currentTreeData) {
      return;
    }

    const store = useAppStore.getState();

    switch (action) {
      case 'extract-subtree':
        console.log('[NodeContextMenu] Calling _extractSubtree');
        this._extractSubtree();
        break;

      case 'highlight-descendants':
        console.log('[NodeContextMenu] Calling _highlightDescendants');
        this._highlightDescendants();
        break;

      case 'focus-node':
        console.log('[NodeContextMenu] Calling _focusOnNode');
        this._focusOnNode();
        break;

      case 'copy-info':
        console.log('[NodeContextMenu] Calling _copyNodeInfo');
        this._copyNodeInfo();
        break;

      default:
        console.warn(`Unknown action: ${action}`);
    }
  }

  /**
   * Extract subtree and copy newick to clipboard
   * @private
   */
  _extractSubtree() {
    try {
      console.log('[NodeContextMenu] _extractSubtree called');
      console.log('[NodeContextMenu] Current node:', this.currentNode);

      // Convert the subtree to newick format
      const newick = SubtreeExtractor.nodeToNewick(this.currentNode);
      console.log('[NodeContextMenu] Generated newick:', newick);

      // Copy to clipboard
      navigator.clipboard.writeText(newick).then(() => {
        const nodeName = this.currentNode.data?.name || `Node (depth ${this.currentNode.depth})`;
        this._showNotification(`Subtree newick copied to clipboard from ${nodeName}`, 'success');
      }).catch((error) => {
        // Fallback: select text in a temporary element
        const textarea = document.createElement('textarea');
        textarea.value = newick;
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        const nodeName = this.currentNode.data?.name || `Node (depth ${this.currentNode.depth})`;
        this._showNotification(`Subtree newick copied to clipboard (fallback) from ${nodeName}`, 'success');
      });
    } catch (error) {
      console.error('Failed to extract subtree:', error);
      // Show user-friendly error message
      this._showNotification('Failed to extract subtree', 'error');
    }
  }

  /**
   * Highlight descendants of the selected node
   * @private
   */
  _highlightDescendants() {
    const descendants = SubtreeExtractor.getDescendants(this.currentNode);
    const nodeIds = descendants.map(node => node.data.name || `node_${node.depth}_${node.x}_${node.y}`);

    // Update store to highlight these nodes
    const { setHighlightedNodes } = useAppStore.getState();
    if (setHighlightedNodes) {
      setHighlightedNodes(nodeIds);
    }

    this._showNotification(`Highlighted ${descendants.length} nodes`, 'success');
  }

  /**
   * Focus camera on the selected node
   * @private
   */
  _focusOnNode() {
    const { treeControllers } = useAppStore.getState();
    if (treeControllers && treeControllers.length > 0) {
      const controller = treeControllers[0]; // Use first controller
      if (controller && typeof controller.focusOnNode === 'function') {
        controller.focusOnNode(this.currentNode);
      }
    }
  }

  /**
   * Copy node information to clipboard
   * @private
   */
  _copyNodeInfo() {
    const stats = SubtreeExtractor.getSubtreeStats(this.currentNode);
    const breadcrumb = SubtreeExtractor.createBreadcrumb(this.currentNode);

    const info = `Node: ${this.currentNode.data.name || 'unnamed'}
Path: ${breadcrumb}
Descendants: ${stats.totalNodes}
Leaves: ${stats.leafCount}
Max Depth: ${stats.maxDepth}`;

    navigator.clipboard.writeText(info).then(() => {
      this._showNotification('Node info copied to clipboard', 'success');
    }).catch(() => {
      console.warn('Failed to copy to clipboard');
      // Fallback: select text in a temporary element
      const textarea = document.createElement('textarea');
      textarea.value = info;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this._showNotification('Node info copied (fallback)', 'success');
    });
  }

  /**
   * Show a notification message
   * @param {string} message - Message to show
   * @param {string} type - Type of notification ('success', 'error', 'info')
   * @private
   */
  _showNotification(message, type = 'info') {
    // Try to use existing notification system if available
    if (window.notifications && window.notifications.show) {
      window.notifications.show(message, type);
      return;
    }

    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--md-sys-color-inverse-surface);
      color: var(--md-sys-color-inverse-on-surface);
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 10001;
      font-family: var(--md-sys-typescale-body-medium-font);
    `;

    document.body.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  }

  /**
   * Destroy the context menu and clean up resources
   */
  destroy() {
    if (this.menu && this._onMenuClick) {
      this.menu.removeEventListener('click', this._onMenuClick);
    }
    if (this._onDocumentClick) {
      document.removeEventListener('click', this._onDocumentClick);
    }
    if (this._onDocumentKeydown) {
      document.removeEventListener('keydown', this._onDocumentKeydown);
    }
    if (this.menu && this.menu.parentNode) {
      this.menu.parentNode.removeChild(this.menu);
    }
    this._onMenuClick = null;
    this._onDocumentClick = null;
    this._onDocumentKeydown = null;
    this.menu = null;
    this.currentNode = null;
    this.currentTreeData = null;
    this.isVisible = false;
  }
}
