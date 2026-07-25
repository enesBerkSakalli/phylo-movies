import {
  DEFAULT_HYPERBOLIC_PROJECTION_STRENGTH,
  DEFAULT_LAYOUT_PROJECTION_MODE,
  normalizeHyperbolicProjectionStrength,
  normalizeLayoutProjectionMode,
} from '../../../../treeVisualisation/layout/hyperbolicProjection/index.js';

export const DEFAULT_BRANCH_TRANSFORMATION = 'normalized-sqrt';

function invalidateTreeLayout(get) {
  const state = get();
  state.resetInterpolationCaches();

  const controller = state.treeController;
  if (!controller) return;

  controller._lastFocusedTreeIndex = null;
  controller.resetComparisonAutoFit?.();
  Promise.resolve(controller.renderAllElements()).catch((error) => {
    console.warn('[treeLayout] Failed to render layout update:', error);
  });
}

export const createTreeLayoutSlice = (set, get) => ({
  // ==========================================================================
  // STATE
  // ==========================================================================
  branchTransformation: DEFAULT_BRANCH_TRANSFORMATION,
  linkGeometryMode: 'radial-elbow',
  layoutAngleDegrees: 360,
  layoutRotationDegrees: 0,
  layoutProjectionMode: DEFAULT_LAYOUT_PROJECTION_MODE,
  hyperbolicProjectionStrength: DEFAULT_HYPERBOLIC_PROJECTION_STRENGTH,

  // ==========================================================================
  // ACTIONS
  // ==========================================================================
  setBranchTransformation: (transform) => {
    const nextTransform = transform || 'none';
    if (get().branchTransformation === nextTransform) return;
    set({ branchTransformation: nextTransform });
    invalidateTreeLayout(get);
  },

  setLinkGeometryMode: (mode) => {
    const nextMode = mode === 'straight' ? 'straight' : 'radial-elbow';
    if (get().linkGeometryMode === nextMode) return;
    set({ linkGeometryMode: nextMode });
    invalidateTreeLayout(get);
  },

  setLayoutAngleDegrees: (degrees) => {
    const value = Number.isFinite(degrees) ? degrees : 360;
    if (get().layoutAngleDegrees === value) return;
    set({ layoutAngleDegrees: value });
    invalidateTreeLayout(get);
  },

  setLayoutRotationDegrees: (degrees) => {
    const value = Number.isFinite(degrees) ? degrees : 0;
    if (get().layoutRotationDegrees === value) return;
    set({ layoutRotationDegrees: value });
    invalidateTreeLayout(get);
  },

  setLayoutProjectionMode: (mode) => {
    const nextMode = normalizeLayoutProjectionMode(mode);
    if (get().layoutProjectionMode === nextMode) return;
    set({ layoutProjectionMode: nextMode });
    invalidateTreeLayout(get);
  },

  setHyperbolicProjectionStrength: (strength) => {
    const value = normalizeHyperbolicProjectionStrength(strength);
    if (get().hyperbolicProjectionStrength === value) return;
    set({ hyperbolicProjectionStrength: value });
    invalidateTreeLayout(get);
  },
});
