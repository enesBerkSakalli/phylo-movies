export const createTreeHighlightOpacitySlice = (set) => ({
  // ==========================================================================
  // STATE
  // ==========================================================================
  subtreeHighlightOpacity: 0.5, // Default opacity for the subtree highlight

  // ==========================================================================
  // ACTIONS
  // ==========================================================================
  setSubtreeHighlightOpacity: (opacity) => {
    const value = Math.max(0, Math.min(1, Number(opacity)));
    set({ subtreeHighlightOpacity: value });
  },
});
