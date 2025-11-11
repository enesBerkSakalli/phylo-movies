import { SubtreeExtractor } from '../utils/SubtreeExtractor.js';
import { useAppStore } from '../core/store.js';

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
    this.menu.className = 'node-context-menu md-elevation-2';
    this.menu.style.cssText = `
      position: fixed;
      background: var(--md-sys-color-surface-container, #fff);
      border-radius: var(--md-sys-shape-corner-medium, 12px);
      padding: 8px 0;
      z-index: 99999;
      display: none;
      min-width: 240px;
      font-family: var(--md-sys-typescale-body-medium-font, Roboto, sans-serif);
      font-size: var(--md-sys-typescale-body-medium-size, 14px);
      max-width: 320px;
      overflow: hidden;
      box-shadow: var(--md-sys-elevation-level2, 0 2px 6px rgba(0, 0, 0, 0.15));
    `;

    // Add menu items with Material Icons
    this.menu.innerHTML = `
      <div class="context-menu-header">
        <span class="node-name"></span>
        <span class="node-stats"></span>
      </div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" data-action="extract-subtree">
        <span class="menu-icon material-icons">content_copy</span>
        <span class="menu-text">Copy Subtree (Newick)</span>
      </div>
      <div class="context-menu-item" data-action="highlight-descendants">
        <span class="menu-icon material-icons">highlight</span>
        <span class="menu-text">Highlight Descendants</span>
      </div>
      <div class="context-menu-item" data-action="focus-node">
        <span class="menu-icon material-icons">center_focus_strong</span>
        <span class="menu-text">Focus on Node</span>
      </div>
      <div class="context-menu-item" data-action="copy-info">
        <span class="menu-icon material-icons">info</span>
        <span class="menu-text">Copy Node Info</span>
      </div>
    `;

    // Add styles for menu items
    const style = document.createElement('style');
    style.textContent = `
      .node-context-menu .context-menu-header {
        padding: 12px 16px;
        font-weight: var(--md-sys-typescale-title-small-weight, 500);
        color: var(--md-sys-color-on-surface-variant);
        font-size: var(--md-sys-typescale-label-large-size, 0.875rem);
        border-bottom: 1px solid var(--md-sys-color-outline-variant, #CAC4D0);
        margin-bottom: 4px;
        background: var(--md-sys-color-surface-container-low, #F7F2FA);
      }

      .node-context-menu .node-name {
        display: block;
        font-weight: var(--md-sys-typescale-title-small-weight, 600);
        color: var(--md-sys-color-on-surface);
        margin-bottom: 4px;
        font-size: var(--md-sys-typescale-title-small-size, 1rem);
      }

      .node-context-menu .node-stats {
        font-size: var(--md-sys-typescale-label-small-size, 0.75rem);
        color: var(--md-sys-color-on-surface-variant);
        opacity: 0.8;
      }

      .node-context-menu .context-menu-separator {
        height: 1px;
        background: var(--md-sys-color-outline-variant, #CAC4D0);
        margin: 0;
      }

      .node-context-menu .context-menu-item {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        cursor: pointer;
        transition: all 0.2s var(--md-sys-motion-easing-standard, cubic-bezier(0.4, 0, 0.2, 1));
        color: var(--md-sys-color-on-surface);
        position: relative;
        min-height: 48px;
      }

      .node-context-menu .context-menu-item::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--md-sys-color-on-surface);
        opacity: 0;
        transition: opacity 0.2s var(--md-sys-motion-easing-standard, cubic-bezier(0.4, 0, 0.2, 1));
        pointer-events: none;
      }

      .node-context-menu .context-menu-item:hover::before {
        opacity: var(--md-sys-state-hover-state-layer-opacity, 0.08);
      }

      .node-context-menu .context-menu-item:active::before {
        opacity: var(--md-sys-state-pressed-state-layer-opacity, 0.12);
      }

      .node-context-menu .context-menu-item.disabled {
        opacity: 0.38;
        cursor: not-allowed;
      }

      .node-context-menu .context-menu-item.disabled::before {
        display: none;
      }

      .node-context-menu .menu-icon {
        margin-right: 16px;
        font-size: 20px;
        color: var(--md-sys-color-on-surface-variant);
        position: relative;
        z-index: 1;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .node-context-menu .menu-text {
        flex: 1;
        color: var(--md-sys-color-on-surface);
        font-size: var(--md-sys-typescale-body-large-size, 1rem);
        line-height: var(--md-sys-typescale-body-large-line-height, 1.5);
        letter-spacing: var(--md-sys-typescale-body-large-tracking, 0.5px);
        position: relative;
        z-index: 1;
      }

      /* Make sure the menu is always visible */
      .node-context-menu {
        visibility: visible !important;
        opacity: 1 !important;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(this.menu);

  }

  /**
   * Attach event listeners to the menu
   * @private
   */
  _attachEventListeners() {
    // Handle menu item clicks
    this.menu.addEventListener('click', (event) => {
      console.log('[NodeContextMenu] Menu click event:', event);
      console.log('[NodeContextMenu] Event target:', event.target);

      const item = event.target.closest('.context-menu-item');
      console.log('[NodeContextMenu] Closest menu item:', item);

      if (!item) {
        console.log('[NodeContextMenu] No menu item found');
        return;
      }

      if (item.classList.contains('disabled')) {
        console.log('[NodeContextMenu] Menu item is disabled');
        return;
      }

      const action = item.dataset.action;
      console.log('[NodeContextMenu] Action:', action);
      this._handleAction(action);
      this.hide();
    });

    // Hide menu when clicking outside
    document.addEventListener('click', (event) => {
      if (this.isVisible && !this.menu.contains(event.target)) {
        this.hide();
      }
    });

    // Hide menu on escape key
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
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
        if (canExtract) {
          extractItem.classList.remove('disabled');
        } else {
          extractItem.classList.add('disabled');
        }
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
    if (this.menu && this.menu.parentNode) {
      this.menu.parentNode.removeChild(this.menu);
    }
    this.menu = null;
    this.currentNode = null;
    this.currentTreeData = null;
    this.isVisible = false;
  }
}
