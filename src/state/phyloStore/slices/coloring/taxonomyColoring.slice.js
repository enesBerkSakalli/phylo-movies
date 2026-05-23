import { renderTreeControllers } from '../../internal/changeTracking.helpers.js';

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

    set((s) => ({
      taxaGrouping: normalized,
      taxaColorVersion: s.taxaColorVersion + 1,
    }));
    renderTreeControllers(get());
  },

  setMonophyleticColoring: (enabled) => {
    set((s) => ({ monophyleticColoringEnabled: enabled, taxaColorVersion: s.taxaColorVersion + 1 }));
    const { colorManager } = get();
    colorManager?.setMonophyleticColoring(enabled);
    renderTreeControllers(get());
  },
});
