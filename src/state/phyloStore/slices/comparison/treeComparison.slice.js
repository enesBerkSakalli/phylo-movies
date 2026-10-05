import { clamp, clamp01 } from '../../../../domain/math/mathUtils.js';
import { renderTreeController } from '../../internal/changeTracking.helpers.js';

const INITIAL = {
  comparisonMode: false,
  leftTreeOffsetX: 0,
  leftTreeOffsetY: 0,
  rightTreeOffsetX: 0,
  rightTreeOffsetY: 0,
  viewsConnected: false,
  connectorStrokeWidth: 1,
  linkConnectionOpacity: 0.6,
};

export const createComparisonViewSlice = (set, get) => ({
  // ==========================================================================
  // STATE
  // ==========================================================================
  ...INITIAL,

  // ==========================================================================
  // ACTIONS
  // ==========================================================================
  toggleComparisonMode: () => set((state) => ({ comparisonMode: !state.comparisonMode })),

  setLeftTreeOffsetX: (offset) => set({ leftTreeOffsetX: clamp(Number(offset), -5000, 5000) }),
  setLeftTreeOffsetY: (offset) => set({ leftTreeOffsetY: clamp(Number(offset), -5000, 5000) }),

  setRightTreeOffsetX: (offset) => {
    set({ rightTreeOffsetX: clamp(Number(offset), -5000, 5000) });
  },

  setRightTreeOffsetY: (offset) => {
    set({ rightTreeOffsetY: clamp(Number(offset), -5000, 5000) });
  },

  setViewsConnected: (enabled) => {
    const nextValue = !!enabled;
    if (get().viewsConnected === nextValue) return;

    set({ viewsConnected: nextValue });

    const state = get();
    if (!state.comparisonMode) return;

    state.treeController?.resetComparisonAutoFit?.();
    renderTreeController(state);
  },

  setConnectorStrokeWidth: (width) => set({ connectorStrokeWidth: Number(width) }),

  setLinkConnectionOpacity: (opacity) => {
    const value = clamp01(Number(opacity));
    set((state) => ({ linkConnectionOpacity: value, colorVersion: state.colorVersion + 1 }));
  },

  // ==========================================================================
  // ACTIONS: Reset
  // ==========================================================================
  resetComparison: () => set(INITIAL),
});
