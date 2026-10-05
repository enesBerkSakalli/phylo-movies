/**
 * Timeline slice: timeline state and tooltip controls.
 */
export const createTimelineSlice = (set, get) => ({
  // ==========================================================================
  // STATE: Timeline
  // ==========================================================================
  hoveredSegment: null, // {index, x}: the segment under the pointer and where its tooltip hangs
  selectedTimelineSegmentIndex: null,

  // ==========================================================================
  // ACTIONS: Timeline Tooltip
  // ==========================================================================
  setHoveredSegment: (hoveredSegment) => set({ hoveredSegment }),

  setSelectedTimelineSegment: (segmentIndex) => {
    set({
      selectedTimelineSegmentIndex: segmentIndex,
    });
  },

  // ==========================================================================
  // ACTIONS: Timeline Controls
  // ==========================================================================
  zoomInTimeline: () => get().timelineView?.zoomIn(),
  zoomOutTimeline: () => get().timelineView?.zoomOut(),
  fitTimeline: () => get().timelineView?.fit(),
});
