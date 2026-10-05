import { getSegmentBounds } from '../utils/segmentTiming.js';

const EDGE_MS = 1;

/**
 * Owns segment-click navigation policy for the timeline.
 *
 * Responsibilities:
 * - interpret clicked segments as input-tree or transition navigation
 * - update clipboard state for input trees
 * - dispatch directional navigation through the store
 */
export class TimelineNavigationController {
  constructor({ timeline, store, onTimelinePositionUpdated }) {
    this.timeline = timeline;
    this.store = store;
    this.onTimelinePositionUpdated = onTimelinePositionUpdated;
  }

  handleTimelineClick(segmentIndex, clickTimeMs = null) {
    const segment = this.timeline.segments[segmentIndex];
    if (!segment) return;

    if (segment.isInputTreeSegment) {
      this.store.getState().setClipboardTreeIndex(segment.firstFrame);
    }

    // A timed click lands strictly inside the segment, so a boundary click stays on it.
    const cursor = Number.isFinite(clickTimeMs)
      ? this._cursorInSegment(segmentIndex, clickTimeMs)
      : null;
    if (cursor) this.navigateToFrame(cursor.frameIndex, { movieTimeMs: cursor.movieTimeMs });
    else this.navigateToFrame(segment.firstFrame);
    requestAnimationFrame(() => this.onTimelinePositionUpdated?.());
  }

  navigateToFrame(targetFrameIndex, seekOptions = undefined) {
    const { frameIndex, goToPosition } = this.store.getState();
    const direction =
      targetFrameIndex === frameIndex
        ? 'jump'
        : targetFrameIndex > frameIndex
          ? 'forward'
          : 'backward';
    goToPosition(targetFrameIndex, direction, seekOptions);
  }

  _cursorInSegment(segmentIndex, ms) {
    const { start, end } = getSegmentBounds(segmentIndex, this.timeline);
    const bounded =
      end - start <= EDGE_MS ? start : Math.max(start + EDGE_MS, Math.min(ms, end - EDGE_MS));
    const cursor = this.timeline.cursorAt(bounded);
    if (cursor?.segmentIndex !== segmentIndex) {
      throw new Error('[TimelineNavigationController] movie time resolved outside its segment');
    }
    return cursor;
  }
}
