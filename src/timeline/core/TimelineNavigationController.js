/**
 * Owns segment-click navigation policy for the timeline.
 *
 * Responsibilities:
 * - interpret clicked segments as input-tree or transition navigation
 * - update clipboard state for input trees
 * - dispatch directional navigation through the store
 */
import { TimelineMathUtils } from '../math/TimelineMathUtils.js';
import { getSegmentBounds } from '../utils/segmentTiming.js';

export class TimelineNavigationController {
  constructor({ segments, timelineData, store, onTimelinePositionUpdated }) {
    this.segments = segments;
    this.timelineData = timelineData;
    this.store = store;
    this.onTimelinePositionUpdated = onTimelinePositionUpdated;
  }

  handleTimelineClick(segmentIndex, clickTimeMs = null) {
    const segment = this._validateSegment(segmentIndex);
    if (!segment) return;

    if (segment.isFullTree) {
      const originalIndex = segment.interpolationData?.[0]?.originalIndex ?? segment.index;
      this.store.getState().setClipboardTreeIndex(originalIndex);
    }

    const targetTreeIndex = this._resolveTargetTreeIndex(segmentIndex, clickTimeMs);
    const seekOptions = this._resolveSeekOptions(segmentIndex, clickTimeMs);
    this.navigateToTree(targetTreeIndex, seekOptions);
    requestAnimationFrame(() => this.onTimelinePositionUpdated?.());
  }

  navigateToTree(targetTreeIndex, seekOptions = undefined) {
    const { currentTreeIndex, goToPosition } = this.store.getState();
    const direction = targetTreeIndex === currentTreeIndex
      ? 'jump'
      : (targetTreeIndex > currentTreeIndex ? 'forward' : 'backward');
    goToPosition(targetTreeIndex, direction, seekOptions);
  }

  _validateSegment(segmentIndex) {
    if (segmentIndex < 0 || segmentIndex >= this.segments.length) return null;
    return this.segments[segmentIndex];
  }

  _resolveTargetTreeIndex(segmentIndex, clickTimeMs) {
    const segment = this.segments[segmentIndex];
    const fallbackIndex = segment.interpolationData?.[0]?.originalIndex ?? segment.index;

    if (
      !Number.isFinite(clickTimeMs) ||
      !this.timelineData ||
      !Array.isArray(this.timelineData.segmentDurations) ||
      !Array.isArray(this.timelineData.cumulativeDurations)
    ) {
      return fallbackIndex;
    }

    const bounds = getSegmentBounds(segmentIndex, this.timelineData);
    if (!bounds || bounds.end < bounds.start) {
      return fallbackIndex;
    }

    const boundedTime = this._boundClickTimeToSegment(clickTimeMs, bounds.start, bounds.end);
    const target = TimelineMathUtils.getTargetTreeForTime(
      this.segments,
      boundedTime,
      this.timelineData.segmentDurations,
      'nearest',
      this.timelineData.cumulativeDurations
    );

    if (target.segmentIndex !== segmentIndex || !Number.isInteger(target.treeIndex)) {
      return fallbackIndex;
    }

    return target.treeIndex;
  }

  _boundClickTimeToSegment(clickTimeMs, segmentStart, segmentEnd) {
    const duration = segmentEnd - segmentStart;
    if (duration <= TimelineMathUtils.EPSILON_MS) {
      return segmentStart;
    }

    const start = segmentStart + TimelineMathUtils.EPSILON_MS;
    const end = segmentEnd - TimelineMathUtils.EPSILON_MS;
    return Math.max(start, Math.min(clickTimeMs, end));
  }

  _resolveSeekOptions(segmentIndex, clickTimeMs) {
    if (!Number.isFinite(clickTimeMs) || !Number.isFinite(this.timelineData?.totalDuration) || this.timelineData.totalDuration <= 0) {
      return undefined;
    }

    const bounds = getSegmentBounds(segmentIndex, this.timelineData);
    if (!bounds || bounds.end < bounds.start) return undefined;

    const boundedTime = this._boundClickTimeToSegment(clickTimeMs, bounds.start, bounds.end);
    return {
      timelineProgress: boundedTime / this.timelineData.totalDuration,
    };
  }
}
