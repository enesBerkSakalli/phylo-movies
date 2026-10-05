export const createTimelineRuntimeSlice = () => ({
  // ==========================================================================
  // STATE: Timeline Runtime
  // ==========================================================================
  timeline: null, // the movie as plain data, from the moment a dataset loads
  timelineView: null, // the strip's renderer while one is mounted
  isScrubbing: false, // a handle drag on the strip is in progress
});
