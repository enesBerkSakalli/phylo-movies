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
});
