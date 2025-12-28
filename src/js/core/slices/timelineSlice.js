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
      hoveredSegmentPosition: position
    });
  },

  setTooltipHovered: (isHovered) => set({ isTooltipHovered: isHovered }),

  // ==========================================================================
  // ACTIONS: Chart
  // ==========================================================================
  setBarOption: (option) => set({ barOptionValue: option }),

  // ==========================================================================
  // ACTIONS: Timeline Controls
  // ==========================================================================
  zoomInTimeline: () => {
    const { movieTimelineManager } = get();
    try {
      movieTimelineManager?.timeline?.zoomIn?.(0.2);
    } catch (e) {
      console.warn('[Store] zoomInTimeline failed:', e);
    }
  },

  zoomOutTimeline: () => {
    const { movieTimelineManager } = get();
    try {
      movieTimelineManager?.timeline?.zoomOut?.(0.2);
    } catch (e) {
      console.warn('[Store] zoomOutTimeline failed:', e);
    }
  },

  fitTimeline: () => {
    const { movieTimelineManager } = get();
    try {
      movieTimelineManager?.timeline?.fit?.();
    } catch (e) {
      console.warn('[Store] fitTimeline failed:', e);
    }
  },

  scrollToStartTimeline: () => {
    const { movieTimelineManager } = get();
    try {
      movieTimelineManager?.timeline?.moveTo?.(0);
    } catch (e) {
      console.warn('[Store] scrollToStartTimeline failed:', e);
    }
  },

  scrollToEndTimeline: () => {
    const { movieTimelineManager } = get();
    try {
      const timeline = movieTimelineManager?.timeline;
      if (!timeline) return;

      const total = timeline.getTotalDuration?.();
      const range = timeline.getVisibleTimeRange?.();

      if (typeof total === 'number' && range && typeof range.min === 'number' && typeof range.max === 'number') {
        const visible = Math.max(0, range.max - range.min);
        timeline.moveTo(Math.max(0, total - visible));
      }
    } catch (e) {
      console.warn('[Store] scrollToEndTimeline failed:', e);
    }
  },
});
