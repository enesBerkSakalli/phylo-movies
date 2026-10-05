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
  zoomInTimeline: () => {
    callTimelineManager(get, 'zoomInTimeline', 'zoomIn');
  },

  zoomOutTimeline: () => {
    callTimelineManager(get, 'zoomOutTimeline', 'zoomOut');
  },

  fitTimeline: () => {
    callTimelineManager(get, 'fitTimeline', 'fit');
  },
});

function callTimelineManager(get, actionName, managerMethodName) {
  try {
    const manager = get().movieTimelineManager;
    manager?.[managerMethodName]?.();
  } catch (e) {
    console.warn(`[Store] ${actionName} failed:`, e);
  }
}
