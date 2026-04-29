function invalidateTreeLayout(get) {
  const state = get();
  state.resetInterpolationCaches?.();

  for (const controller of state.treeControllers || []) {
    Promise.resolve(controller?.renderAllElements?.()).catch((error) => {
      console.warn('[treeLayout] Failed to render layout update:', error);
    });
  }
}

export const createTreeLayoutSlice = (set, get) => ({
  // ==========================================================================
  // STATE
  // ==========================================================================
  branchTransformation: 'none',
  layoutAngleDegrees: 360,
  layoutRotationDegrees: 0,

  // ==========================================================================
  // ACTIONS
  // ==========================================================================
  setBranchTransformation: (transform) => {
    const nextTransform = transform || 'none';
    if (get().branchTransformation === nextTransform) return;
    set({ branchTransformation: nextTransform });
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
});
