import { TimelineMathUtils } from '../math/TimelineMathUtils.js';

export class TimelineClock {
  constructor({ segments, timelineData, movieData }) {
    this.segments = segments;
    this.timelineData = timelineData;
    this.movieData = movieData;
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
      this.movieData
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
