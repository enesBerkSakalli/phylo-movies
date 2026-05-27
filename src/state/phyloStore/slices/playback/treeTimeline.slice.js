/**
 * Timeline slice: timeline/chart state and tooltip controls.
 */
export const createTimelineSlice = (set, get) => ({
  // ==========================================================================
  // STATE: Timeline/Chart
  // ==========================================================================
  barOptionValue: 'rfd',
  hoveredSegmentIndex: null,
  hoveredSegmentData: null,
  hoveredSegmentPosition: null,
  selectedTimelineSegmentIndex: null,
  isTooltipHovered: false,

  // ==========================================================================
  // ACTIONS: Timeline Tooltip
  // ==========================================================================
  setHoveredSegment: (segmentIndex, segmentData = null, position = null) => {
    const { isTooltipHovered } = get();
    if (segmentIndex === null && isTooltipHovered) return;
    set({
      hoveredSegmentIndex: segmentIndex,
      hoveredSegmentData: segmentData,
      hoveredSegmentPosition: position,
    });
  },

  setTooltipHovered: (isHovered) => set({ isTooltipHovered: isHovered }),

  setSelectedTimelineSegment: (segmentIndex) => {
    set({
      selectedTimelineSegmentIndex: segmentIndex,
    });
  },

  // ==========================================================================
  // ACTIONS: Chart
  // ==========================================================================
  setBarOption: (option) => set({ barOptionValue: option }),

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

  scrollToStartTimeline: () => {
    callTimelineManager(get, 'scrollToStartTimeline', 'scrollToStart');
  },

  scrollToEndTimeline: () => {
    callTimelineManager(get, 'scrollToEndTimeline', 'scrollToEnd');
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
