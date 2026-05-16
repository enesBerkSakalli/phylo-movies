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
    const nextControllers = controllers;
    const nextSet = new Set(nextControllers);

    currentControllers.forEach((controller) => {
      if (!nextSet.has(controller)) {
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
    controllers.forEach((controller) => controller.startAnimation());
  },

  resetInterpolationCaches: () => {
    const { treeControllers } = get();
    treeControllers.forEach((controller) => controller.resetInterpolationCaches());
  },

  stopAnimationPlayback: () => {
    const { treeControllers, stop } = get();
    treeControllers.forEach((controller) => controller.stopAnimation());
    stop();
  },

  // ==========================================================================
  // ACTIONS: Reset
  // ==========================================================================
  resetControllers: () => {
    const { treeControllers, movieTimelineManager } = get();

    treeControllers.forEach((controller) => {
      controller.destroy();
    });

    movieTimelineManager?.destroy();

    set({
      treeControllers: [],
      movieTimelineManager: null,
    });
  },
});
