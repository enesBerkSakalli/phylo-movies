export const createTreeControllersRuntimeSlice = (set, get) => ({
  // ==========================================================================
  // STATE: Controllers
  // ==========================================================================
  treeControllers: [],

  // ==========================================================================
  // ACTIONS: Tree Controllers
  // ==========================================================================
  setTreeControllers: (controllers) => {
    const { treeControllers: currentControllers } = get();
    const nextControllers = Array.isArray(controllers) ? controllers : [];
    const nextSet = new Set(nextControllers);

    currentControllers.forEach((controller) => {
      if (!nextSet.has(controller) && typeof controller?.destroy === 'function') {
        controller.destroy();
      }
    });

    set({ treeControllers: nextControllers });
  },

  // ==========================================================================
  // ACTIONS: Animation Controls
  // ==========================================================================
  startAnimationPlayback: async () => {
    const { playing } = get();
    if (playing) return;
    const controllers = get().treeControllers;
    controllers.forEach(c => c?.startAnimation?.());
  },

  resetInterpolationCaches: () => {
    const { treeControllers } = get();
    treeControllers.forEach(c => c?.resetInterpolationCaches?.());
  },

  stopAnimationPlayback: () => {
    const { treeControllers, stop } = get();
    treeControllers.forEach(c => c?.stopAnimation?.());
    stop();
  },

  // ==========================================================================
  // ACTIONS: Reset
  // ==========================================================================
  resetControllers: () => {
    const { treeControllers, movieTimelineManager } = get();

    treeControllers.forEach((controller) => {
      if (typeof controller?.destroy === 'function') {
        controller.destroy();
      }
    });

    movieTimelineManager?.destroy();

    set({
      treeControllers: [],
      movieTimelineManager: null,
    });
  },
});