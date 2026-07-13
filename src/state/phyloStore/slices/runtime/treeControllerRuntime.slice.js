export const createTreeControllerRuntimeSlice = (set, get) => ({
  treeController: null,

  setTreeController: (treeController) => {
    const currentController = get().treeController;
    if (currentController === treeController) return;

    currentController?.destroy();
    set({ treeController });
  },

  startAnimationPlayback: async () => {
    const { playing, treeController } = get();
    if (!playing) treeController?.startAnimation();
  },

  resetInterpolationCaches: () => {
    get().treeController?.resetInterpolationCaches();
  },

  stopAnimationPlayback: () => {
    const { treeController, stop } = get();
    treeController?.stopAnimation();
    stop();
  },

  resetControllers: () => {
    const { treeController, movieTimelineManager } = get();
    treeController?.destroy();
    movieTimelineManager?.destroy();

    set({
      treeController: null,
      movieTimelineManager: null,
    });
  },
});
