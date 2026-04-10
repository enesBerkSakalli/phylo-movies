import { renderTreeControllers } from '@/state/phyloStore/internal/changeTracking.helpers.js';

export const createTaxonomyColoringSlice = (set, get) => ({
  // ==========================================================================
  // STATE
  // ==========================================================================
  monophyleticColoringEnabled: true,
  taxaGrouping: null,
  taxaColorVersion: 0,

  // ==========================================================================
  // ACTIONS
  // ==========================================================================
  setTaxaGrouping: (grouping) => {
    // Normalize Map to plain object for storage/legend rendering
    const normalizedGroupMap = grouping?.groupColorMap instanceof Map
      ? Object.fromEntries(grouping.groupColorMap)
      : grouping?.groupColorMap;

    const normalized = grouping
      ? { ...grouping, groupColorMap: normalizedGroupMap || {} }
      : null;

    set({ taxaGrouping: normalized });
  },

  setMonophyleticColoring: (enabled) => {
    set((s) => ({ monophyleticColoringEnabled: enabled, taxaColorVersion: s.taxaColorVersion + 1 }));
    const { colorManager, treeControllers } = get();
    colorManager?.setMonophyleticColoring(enabled);
    renderTreeControllers(treeControllers);
  },

  updateTaxaColors: (newColorMap) => {
    set((s) => ({ taxaColorVersion: s.taxaColorVersion + 1 }));
    const { colorManager, treeControllers } = get();
    colorManager?.refreshColorCategories?.();
    renderTreeControllers(treeControllers);
  },
});
