import { renderTreeControllers } from '../../internal/changeTracking.helpers.js';

function mapToPlainObject(value) {
  return value instanceof Map ? Object.fromEntries(value) : value;
}

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
    // Normalize maps to plain objects for storage, lookup, and legend rendering.
    const normalized = grouping
      ? {
          ...grouping,
          groupColorMap: mapToPlainObject(grouping.groupColorMap) || {},
        }
      : null;

    if (normalized?.taxaColorMap instanceof Map) {
      normalized.taxaColorMap = mapToPlainObject(normalized.taxaColorMap);
    }

    if (normalized?.csvTaxaMap instanceof Map) {
      normalized.csvTaxaMap = mapToPlainObject(normalized.csvTaxaMap);
    }

    set((s) => ({
      taxaGrouping: normalized,
      taxaColorVersion: s.taxaColorVersion + 1,
    }));
    renderTreeControllers(get());
  },

  setMonophyleticColoring: (enabled) => {
    const { colorManager } = get();
    colorManager?.setMonophyleticColoring(enabled);
    set((s) => ({
      monophyleticColoringEnabled: enabled,
      taxaColorVersion: s.taxaColorVersion + 1,
    }));
    renderTreeControllers(get());
  },
});
