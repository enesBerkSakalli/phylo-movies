/**
 * Owns segment-click navigation policy for the timeline.
 *
 * Responsibilities:
 * - interpret clicked segments as anchor or transition navigation
 * - update clipboard state for anchor trees
 * - dispatch directional navigation through the store
 */
export class TimelineNavigationController {
  constructor({ segments, store, onTimelinePositionUpdated }) {
    this.segments = segments;
    this.store = store;
    this.onTimelinePositionUpdated = onTimelinePositionUpdated;
  }

  handleTimelineClick(segmentIndex) {
    const segment = this._validateSegment(segmentIndex);
    if (!segment) return;

    if (segment.isFullTree) {
      const originalIndex = segment.interpolationData?.[0]?.originalIndex ?? segment.index;
      this.store.getState().setClipboardTreeIndex(originalIndex);
    }

    const targetTreeIndex = segment.interpolationData?.[0]?.originalIndex ?? segment.index;
    this.navigateToTree(targetTreeIndex);
    requestAnimationFrame(() => this.onTimelinePositionUpdated?.());
  }

  navigateToTree(targetTreeIndex) {
    const { currentTreeIndex, goToPosition } = this.store.getState();
    const direction = targetTreeIndex === currentTreeIndex
      ? 'jump'
      : (targetTreeIndex > currentTreeIndex ? 'forward' : 'backward');
    goToPosition(targetTreeIndex, direction);
  }

  _validateSegment(segmentIndex) {
    if (segmentIndex < 0 || segmentIndex >= this.segments.length) return null;
    return this.segments[segmentIndex];
  }
}
