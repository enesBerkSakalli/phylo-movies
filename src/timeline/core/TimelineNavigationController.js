/**
 * Owns segment-click navigation policy for the timeline.
 *
 * Responsibilities:
 * - interpret clicked segments as input-tree or transition navigation
 * - update clipboard state for input trees
 * - dispatch directional navigation through the store
 */
export class TimelineNavigationController {
  constructor({ timelineDataset, segments, timelineData, store, onTimelinePositionUpdated }) {
    this.timelineDataset = timelineDataset;
    this.segments = segments;
    this.timelineData = timelineData;
    this.store = store;
    this.onTimelinePositionUpdated = onTimelinePositionUpdated;
  }

  handleTimelineClick(segmentIndex, clickTimeMs = null) {
    const segment = this._validateSegment(segmentIndex);
    if (!segment) return;

    if (segment.isInputTreeSegment) {
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

    const target = this.timelineDataset.getCursorInSegmentAtMovieTime(segmentIndex, clickTimeMs, { bias: 'nearest' });

    return target?.frameIndex;
  }

  _resolveSegmentFrameIndex(segment) {
    const frameIndex = segment?.interpolationData?.[0]?.originalIndex ?? segment?.index;
    if (!Number.isInteger(frameIndex)) {
      throw new Error('[TimelineNavigationController] segment frame index is required');
    }
    return frameIndex;
  }

  _resolveSeekOptions(segmentIndex, clickTimeMs) {
    if (!Number.isFinite(clickTimeMs) || !Number.isFinite(this.timelineData?.totalDuration) || this.timelineData.totalDuration <= 0) {
      return undefined;
    }

    const bounds = this.timelineDataset.getSegmentBounds(segmentIndex);
    if (!bounds || bounds.end < bounds.start) return undefined;

    const cursor = this.timelineDataset.getCursorInSegmentAtMovieTime(segmentIndex, clickTimeMs, { bias: 'nearest' });
    return {
      timelineProgress: cursor.timelineProgress,
    };
  }
}
