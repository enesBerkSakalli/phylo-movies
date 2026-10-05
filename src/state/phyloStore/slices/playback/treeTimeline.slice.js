/**
 * Timeline slice: the movie as plain data, the strip that shows it, and what is pointed at on it.
 */
export const createTimelineSlice = (set) => ({
  timeline: null, // the movie as plain data, from the moment a dataset loads
  timelineView: null, // the strip's renderer while one is mounted
  isScrubbing: false, // a handle drag on the strip is in progress
  hoveredSegment: null, // {index, x}: the segment under the pointer and where its tooltip hangs
  selectedTimelineSegmentIndex: null,

  setHoveredSegment: (hoveredSegment) => set({ hoveredSegment }),

  setSelectedTimelineSegment: (segmentIndex) => set({ selectedTimelineSegmentIndex: segmentIndex }),
});
