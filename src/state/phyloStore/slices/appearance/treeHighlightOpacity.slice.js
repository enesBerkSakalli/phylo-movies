export const createTreeHighlightOpacitySlice = (set) => ({
  // ==========================================================================
  // STATE
  // ==========================================================================
  markedSubtreeOpacity: 0.5, // Default opacity for the marked subtree highlight (reduced from 0.8)

  // ==========================================================================
  // ACTIONS
  // ==========================================================================
  setMarkedSubtreeOpacity: (opacity) => {
    const value = Math.max(0, Math.min(1, Number(opacity)));
    set({ markedSubtreeOpacity: value });
  },
});
