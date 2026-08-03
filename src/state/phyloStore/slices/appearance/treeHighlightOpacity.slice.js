import { clamp01 } from '../../../../domain/math/mathUtils.js';
export const createTreeHighlightOpacitySlice = (set) => ({
  // ==========================================================================
  // STATE
  // ==========================================================================
  subtreeHighlightOpacity: 0.5, // Default opacity for the subtree highlight

  // ==========================================================================
  // ACTIONS
  // ==========================================================================
  setSubtreeHighlightOpacity: (opacity) => {
    const value = clamp01(Number(opacity));
    set({ subtreeHighlightOpacity: value });
  },
});
