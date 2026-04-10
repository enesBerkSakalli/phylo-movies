import { clamp } from '@/utils/math/mathUtils.js';
import { renderTreeControllers } from '@/store/internal/changeTracking.helpers.js';

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

export const createComparisonViewSlice = (set, get) => ({
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
  screenPositionsLeft: {},
  screenPositionsRight: {},
  connectorStrokeWidth: 1,
  linkConnectionOpacity: 0.6,

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

  setScreenPositions: (side, positions) => {
    const nextPositions = positions && typeof positions === 'object' ? positions : {};
    if (side === 'right') {
      set({ screenPositionsRight: nextPositions });
      return;
    }
    set({ screenPositionsLeft: nextPositions });
  },

  setConnectorStrokeWidth: (width) => set({ connectorStrokeWidth: Number(width) }),

  setLinkConnectionOpacity: (opacity) => {
    const value = Math.max(0, Math.min(1, Number(opacity)));
    set((state) => ({ linkConnectionOpacity: value, colorVersion: state.colorVersion + 1 }));
    renderTreeControllers(get().treeControllers);
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
    screenPositionsLeft: {},
    screenPositionsRight: {},
    connectorStrokeWidth: 1,
    linkConnectionOpacity: 0.6,
  }),
});
