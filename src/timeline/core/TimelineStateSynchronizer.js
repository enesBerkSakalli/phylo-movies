import { TIMELINE_CONSTANTS } from '../constants.js';

const SCRUB_GRACE_PERIOD_MS = 150;

export class TimelineStateSynchronizer {
  constructor({ timelineDataset, store }) {
    this.timelineDataset = timelineDataset;
    this.timelineData = timelineDataset.timelineData;
    this.segments = timelineDataset.segments;
    this.store = store;
  }

  getEffectivePlaybackState(lastScrubEndTime) {
    const { playhead, playing, treeList } = this.store.getState();
    const withinGracePeriod =
      lastScrubEndTime > 0 && performance.now() - lastScrubEndTime < SCRUB_GRACE_PERIOD_MS;
    const preservingScrubPosition =
      (withinGracePeriod || !playing) && playhead?.timelineProgress != null;
    const progress = preservingScrubPosition
      ? playhead.timelineProgress
      : this._mapAnimationProgressToTimelineProgress(
          playhead?.animationProgress ?? 0,
          treeList?.length ?? 0
        );

    return { progress, preservingScrubPosition };
  }

  syncRendererFromStore(timeline, lastScrubEndTime) {
    if (!timeline || !this.timelineData) return null;

    const { progress, preservingScrubPosition } = this.getEffectivePlaybackState(lastScrubEndTime);
    const cursor = this.timelineDataset.getCursorAtTimelineProgress(progress, { bias: 'nearest' });
    if (!cursor) return null;

    const currentTime = cursor.movieTimeMs;
    timeline.setCustomTime(currentTime);

    const segment = this._validateSegment(cursor.segmentIndex);
    if (!segment) {
      return null;
    }

    return {
      currentTime,
      frameIndex: cursor.frameIndex,
      segment,
      preservingScrubPosition,
    };
  }

  restoreMountedState(timeline, lastScrubEndTime) {
    if (!timeline) return;

    // Temporary React remounts should restore the last durable timeline state
    // from the store, while transient hover/tooltip state is reset in unmount().
    this.syncRendererFromStore(timeline, lastScrubEndTime);
  }

  updateStoreTimelineState(time, segment, frameIndex) {
    const totalProgress = this.timelineDataset.getTimelineProgressAtMovieTime(time);
    const segmentIndex = this.segments.indexOf(segment);
    if (segmentIndex === -1) return;

    let treeInSegment;
    let treesInSegment;

    if (segment.hasInterpolation && segment.interpolationData?.length > 1) {
      const position = this.timelineDataset.getFramePositionInSegment(segmentIndex, frameIndex);
      treeInSegment = position.treeInSegment;
      treesInSegment = position.treesInSegment;
    } else {
      treeInSegment = TIMELINE_CONSTANTS.DEFAULT_TREE_IN_SEGMENT;
      treesInSegment = TIMELINE_CONSTANTS.DEFAULT_TREES_IN_SEGMENT;
    }

    this.store.getState().updateTimelineState({
      currentSegmentIndex: segmentIndex,
      totalSegments: this.segments.length,
      treeInSegment,
      treesInSegment,
      timelineProgress: totalProgress,
    });
  }

  _validateSegment(segmentIndex) {
    if (segmentIndex < 0 || segmentIndex >= this.segments.length) return null;
    return this.segments[segmentIndex];
  }

  _mapAnimationProgressToTimelineProgress(animationProgress, treeCount) {
    return this.timelineDataset.getTimelineProgressForLinearTreeProgress(
      animationProgress,
      treeCount
    );
  }
}
