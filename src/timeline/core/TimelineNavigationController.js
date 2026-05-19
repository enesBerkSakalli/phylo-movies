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
      const originalIndex = this._resolveSegmentFrameIndex(segment);
      this.store.getState().setClipboardTreeIndex(originalIndex);
    }

    const targetFrameIndex = this._resolveTargetFrameIndex(segmentIndex, clickTimeMs);
    const seekOptions = this._resolveSeekOptions(segmentIndex, clickTimeMs);
    this.navigateToFrame(targetFrameIndex, seekOptions);
    requestAnimationFrame(() => this.onTimelinePositionUpdated?.());
  }

  navigateToFrame(targetFrameIndex, seekOptions = undefined) {
    const { frameIndex, goToPosition } = this.store.getState();
    const direction = targetFrameIndex === frameIndex
      ? 'jump'
      : (targetFrameIndex > frameIndex ? 'forward' : 'backward');
    goToPosition(targetFrameIndex, direction, seekOptions);
  }

  _validateSegment(segmentIndex) {
    if (segmentIndex < 0 || segmentIndex >= this.segments.length) return null;
    return this.segments[segmentIndex];
  }

  _resolveTargetFrameIndex(segmentIndex, clickTimeMs) {
    const segment = this.segments[segmentIndex];
    const segmentFrameIndex = this._resolveSegmentFrameIndex(segment);

    if (!Number.isFinite(clickTimeMs)) {
      return segmentFrameIndex;
    }

    if (
      !this.timelineData ||
      !Array.isArray(this.timelineData.segmentDurations) ||
      !Array.isArray(this.timelineData.cumulativeDurations)
    ) {
      throw new Error('[TimelineNavigationController] timeline timing data is required');
    }

    const bounds = getSegmentBounds(segmentIndex, this.timelineData);
    if (!bounds || bounds.end < bounds.start) {
      throw new Error('[TimelineNavigationController] segment timing bounds are required');
    }

    const boundedTime = this._boundClickTimeToSegment(clickTimeMs, bounds.start, bounds.end);
    const target = TimelineMathUtils.getTargetFrameForTime(
      this.segments,
      boundedTime,
      this.timelineData.segmentDurations,
      'nearest',
      this.timelineData.cumulativeDurations
    );

    if (target.segmentIndex !== segmentIndex || !Number.isInteger(target.frameIndex)) {
      throw new Error('[TimelineNavigationController] clicked timeline segment resolved outside its segment');
    }

    return target.frameIndex;
  }

  _resolveSegmentFrameIndex(segment) {
    const frameIndex = segment?.interpolationData?.[0]?.originalIndex ?? segment?.index;
    if (!Number.isInteger(frameIndex)) {
      throw new Error('[TimelineNavigationController] segment frame index is required');
    }
    return frameIndex;
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
