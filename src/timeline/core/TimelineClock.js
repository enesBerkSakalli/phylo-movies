import { TimelineMathUtils } from '../math/TimelineMathUtils.js';

export class TimelineClock {
  constructor({ segments, timelineData, treeList }) {
    this.segments = segments;
    this.timelineData = timelineData;
    this.treeList = Array.isArray(treeList) ? treeList : [];
  }

  hasTimeline() {
    return Array.isArray(this.segments) &&
      this.segments.length > 0 &&
      Number.isFinite(this.timelineData?.totalDuration) &&
      this.timelineData.totalDuration > 0;
  }

  getSegmentCount() {
    return Array.isArray(this.segments) ? this.segments.length : 0;
  }

  getTransitionFrameForProgress(progress) {
    if (!this.hasTimeline()) return null;
    return TimelineMathUtils.getTransitionFrameForTimelineProgress(
      progress,
      this.segments,
      this.timelineData,
      this.treeList
    );
  }

  getTimelineProgressForFrameIndex(frameIndex) {
    if (!this.hasTimeline()) return null;
    return TimelineMathUtils.getTimelineProgressForFrameIndex(
      this.segments,
      this.timelineData,
      frameIndex
    );
  }

  getTimelineProgressForLinearTreeProgress(progress, treeCount) {
    if (!this.hasTimeline()) return null;
    return TimelineMathUtils.getTimelineProgressForLinearTreeProgress(
      progress,
      treeCount,
      this.segments,
      this.timelineData
    );
  }
}
