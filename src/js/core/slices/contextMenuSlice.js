/**
 * Context Menu slice: manages the node context menu state for tree node interactions.
 * This slice bridges the gap between DeckGL's vanilla JS picking system and React components.
 */
export const createContextMenuSlice = (set, get) => ({
  // ==========================================================================
  // STATE
  // ==========================================================================
  contextMenuOpen: false,
  contextMenuPosition: { x: 0, y: 0 },
  contextMenuNode: null,      // The D3 tree node that was clicked
  contextMenuTreeData: null,  // The current tree data

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  /**
   * Show the context menu at a specific position for a tree node.
   * Called from DeckGL's picking handler.
   * @param {Object} node - The D3 tree node
   * @param {Object} treeData - The current tree data
   * @param {number} x - Screen X coordinate
   * @param {number} y - Screen Y coordinate
   */
  showNodeContextMenu: (node, treeData, x, y) => {
    set({
      contextMenuOpen: true,
      contextMenuPosition: { x, y },
      contextMenuNode: node,
      contextMenuTreeData: treeData,
    });
  },

  /**
   * Hide the context menu and clear state.
   */
  hideNodeContextMenu: () => {
    set({
      contextMenuOpen: false,
      contextMenuNode: null,
      contextMenuTreeData: null,
    });
  },

  // ==========================================================================
  // RESET
  // ==========================================================================
  resetContextMenu: () => set({
    contextMenuOpen: false,
    contextMenuPosition: { x: 0, y: 0 },
    contextMenuNode: null,
    contextMenuTreeData: null,
  }),
});
