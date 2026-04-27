import { TIMELINE_CONSTANTS } from '../constants.js';
import { TimelineMathUtils } from '../math/TimelineMathUtils.js';

const SCRUB_GRACE_PERIOD_MS = 150;

export class TimelineStateSynchronizer {
  constructor(timelineData, segments, store) {
    this.timelineData = timelineData;
    this.segments = segments;
    this.store = store;
  }

  getEffectivePlaybackState(lastScrubEndTime) {
    const { animationProgress, timelineProgress, playing, treeList } = this.store.getState();
    const withinGracePeriod = lastScrubEndTime > 0 &&
      (performance.now() - lastScrubEndTime) < SCRUB_GRACE_PERIOD_MS;
    const preservingScrubPosition = (withinGracePeriod || !playing) && timelineProgress != null;
    const progress = preservingScrubPosition
      ? timelineProgress
      : this._mapAnimationProgressToTimelineProgress(animationProgress, treeList?.length ?? 0);

    return { progress, preservingScrubPosition };
  }

  syncRendererFromStore(timeline, lastScrubEndTime) {
    if (!timeline || !this.timelineData) return null;

    const { progress, preservingScrubPosition } = this.getEffectivePlaybackState(lastScrubEndTime);
    const currentTime = TimelineMathUtils.progressToTime(progress, this.timelineData.totalDuration);
    timeline.setCustomTime(currentTime);

    const { treeIndex, segmentIndex } = TimelineMathUtils.getTargetTreeForTime(
      this.segments,
      currentTime,
      this.timelineData.segmentDurations,
      'nearest',
      this.timelineData.cumulativeDurations
    );

    const segment = this._validateSegment(segmentIndex);
    if (!segment) {
      timeline.setSelection(null);
      return null;
    }

    timeline.setSelection([segmentIndex + TIMELINE_CONSTANTS.INDEX_OFFSET_UI]);
    return { currentTime, treeIndex, segment, preservingScrubPosition };
  }

  restoreMountedState(timeline, lastScrubEndTime) {
    if (!timeline) return;

    // Temporary React remounts should restore the last durable timeline state
    // from the store, while transient hover/tooltip state is reset in unmount().
    this.syncRendererFromStore(timeline, lastScrubEndTime);
  }

  updateStoreTimelineState(time, segment, currentTreeIndex) {
    const totalProgress = TimelineMathUtils.timeToProgress(time, this.timelineData.totalDuration);
    const segmentIndex = this.segments.indexOf(segment);
    if (segmentIndex === -1) return;

    let treeInSegment;
    let treesInSegment;

    if (segment.hasInterpolation && segment.interpolationData?.length > 1) {
      treesInSegment = segment.interpolationData.length;
      treeInSegment = TimelineMathUtils.calculateTreePositionInSegment(segment, currentTreeIndex).treeInSegment;
    } else {
      treeInSegment = TIMELINE_CONSTANTS.DEFAULT_TREE_IN_SEGMENT;
      treesInSegment = TIMELINE_CONSTANTS.DEFAULT_TREES_IN_SEGMENT;
    }

    this.store.getState().updateTimelineState({
      currentSegmentIndex: segmentIndex,
      totalSegments: this.segments.length,
      treeInSegment,
      treesInSegment,
      timelineProgress: totalProgress
    });
  }

  _validateSegment(segmentIndex) {
    if (segmentIndex < 0 || segmentIndex >= this.segments.length) return null;
    return this.segments[segmentIndex];
  }

  _mapAnimationProgressToTimelineProgress(animationProgress, treeCount) {
    return TimelineMathUtils.getTimelineProgressForLinearTreeProgress(
      animationProgress,
      treeCount,
      this.segments,
      this.timelineData
    );
  }
}
