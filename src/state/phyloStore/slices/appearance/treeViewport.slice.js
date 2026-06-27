export const createTreeViewportSlice = (set, get) => ({
  // ==========================================================================
  // STATE
  // ==========================================================================
  cameraMode: 'orthographic',

  // ==========================================================================
  // ACTIONS
  // ==========================================================================
  toggleCameraMode: () => {
    const { cameraMode } = get();
    const newMode = cameraMode === 'orthographic' ? 'orbit' : 'orthographic';
    set({ cameraMode: newMode });
    return newMode;
  },
  setCameraMode: (mode) => {
    const nextMode = mode === 'orbit' ? 'orbit' : 'orthographic';
    if (get().cameraMode === nextMode) return nextMode;
    set({ cameraMode: nextMode });
    return nextMode;
  },
});
