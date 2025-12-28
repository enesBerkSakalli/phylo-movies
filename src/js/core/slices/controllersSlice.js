/**
 * Controllers slice: runtime controller instances and animation orchestration.
 */
export const createControllersSlice = (set, get) => ({
  // ==========================================================================
  // STATE: Controllers
  // ==========================================================================
  treeControllers: [],
  movieTimelineManager: null,

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

    // Destroy existing controllers
    treeControllers.forEach((controller) => {
      if (typeof controller?.destroy === 'function') {
        controller.destroy();
      }
    });

    // Destroy timeline manager
    movieTimelineManager?.destroy();

    set({
      treeControllers: [],
      movieTimelineManager: null,
    });
  },
});
