export const createTaxonomyColoringPanelSlice = (set) => ({
  // ==========================================================================
  // STATE
  // ==========================================================================
  taxaColoringOpen: false,
  taxaColoringWindow: { x: 40, y: 40, width: 640, height: 700 },

  // ==========================================================================
  // ACTIONS
  // ==========================================================================
  setTaxaColoringOpen: (isOpen) => set({ taxaColoringOpen: !!isOpen }),
  setTaxaColoringWindow: (partial) => set((state) => ({
    taxaColoringWindow: { ...state.taxaColoringWindow, ...partial }
  })),
});
