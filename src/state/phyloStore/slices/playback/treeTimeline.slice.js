/**
 * Timeline slice: timeline state and tooltip controls.
 */
export const createTimelineSlice = (set, get) => ({
  // ==========================================================================
  // STATE: Timeline
  // ==========================================================================
  hoveredSegmentIndex: null,
  hoveredSegmentData: null,
  hoveredSegmentPosition: null,
  selectedTimelineSegmentIndex: null,

  // ==========================================================================
  // ACTIONS: Timeline Tooltip
  // ==========================================================================
  setHoveredSegment: (segmentIndex, segmentData = null, position = null) => {
    set({
      hoveredSegmentIndex: segmentIndex,
      hoveredSegmentData: segmentData,
      hoveredSegmentPosition: position,
    });
  },

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
