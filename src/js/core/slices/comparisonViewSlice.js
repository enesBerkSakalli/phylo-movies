import { clamp } from '../../domain/math/mathUtils.js';

// ==========================================================================
// Private Helper Functions
// ==========================================================================

function createEmptyViewLinkMapping() {
  return {
    fromIndex: null,
    toIndex: null,
    sourceToDest: {},
  };
}

export const createComparisonViewSlice = (set) => ({
  // ==========================================================================
  // STATE
  // ==========================================================================
  comparisonMode: false,
  // Left tree offsets
  leftTreeOffsetX: 0,
  leftTreeOffsetY: 0,
  // Right tree offsets (replacing/aliasing viewOffset)
  viewOffsetX: 0,
  viewOffsetY: 0,
  viewsConnected: false,
  viewLinkMapping: createEmptyViewLinkMapping(),

  // ==========================================================================
  // ACTIONS
  // ==========================================================================
  toggleComparisonMode: () => set((state) => ({ comparisonMode: !state.comparisonMode })),

  setLeftTreeOffsetX: (offset) => set({ leftTreeOffsetX: clamp(Number(offset), -5000, 5000) }),
  setLeftTreeOffsetY: (offset) => set({ leftTreeOffsetY: clamp(Number(offset), -5000, 5000) }),

  // viewOffset acts as rightTreeOffset for compatibility
  setViewOffsetX: (offset) => {
    set({ viewOffsetX: clamp(Number(offset), -5000, 5000) });
  },

  setViewOffsetY: (offset) => {
    set({ viewOffsetY: clamp(Number(offset), -5000, 5000) });
  },

  setViewsConnected: (enabled) => set({ viewsConnected: !!enabled }),


  setViewLinkMapping: (mapping) => {
    set({ viewLinkMapping: mapping });
  },

  // ==========================================================================
  // ACTIONS: Reset
  // ==========================================================================
  resetComparison: () => set({
    comparisonMode: false,
    leftTreeOffsetX: 0,
    leftTreeOffsetY: 0,
    viewOffsetX: 0,
    viewOffsetY: 0,
    viewsConnected: false,
    viewLinkMapping: createEmptyViewLinkMapping(),
  }),
});
