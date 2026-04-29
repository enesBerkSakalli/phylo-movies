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

  getInterpolationDataForProgress(progress) {
    if (!this.hasTimeline()) return null;
    return TimelineMathUtils.getInterpolationDataForTimelineProgress(
      progress,
      this.segments,
      this.timelineData,
      this.treeList
    );
  }

  getTimelineProgressForTreeIndex(treeIndex) {
    if (!this.hasTimeline()) return null;
    return TimelineMathUtils.getTimelineProgressForTreeIndex(
      this.segments,
      this.timelineData,
      treeIndex
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
