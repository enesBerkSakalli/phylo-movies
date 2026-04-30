export const selectPlayhead = (state = {}) => state?.playhead ?? {
  animationProgress: 0,
  timelineProgress: null,
  currentTreeIndex: 0
};
