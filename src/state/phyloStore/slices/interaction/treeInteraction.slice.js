/**
 * Context Menu slice: manages the node context menu state for tree node interactions.
 * This slice bridges the gap between DeckGL's vanilla JS picking system and React components.
 */
export const createContextMenuSlice = (set) => ({
  // ==========================================================================
  // STATE
  // ==========================================================================
  contextMenuOpen: false,
  contextMenuPosition: { x: 0, y: 0 },
  contextMenuNode: null, // Normalized node data for the clicked tree element

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  /**
   * Show the context menu at a specific position for a tree node.
   * Called from DeckGL's picking handler.
   * @param {Object} node - Normalized plain tree node
   * @param {{ x: number, y: number }} position - Screen position
   */
  showNodeContextMenu: (node, position) => {
    set({
      contextMenuOpen: true,
      contextMenuPosition: position,
      contextMenuNode: node,
    });
  },

  /**
   * Hide the context menu and clear state.
   */
  hideNodeContextMenu: () => {
    set({
      contextMenuOpen: false,
      contextMenuNode: null,
    });
  },
});
