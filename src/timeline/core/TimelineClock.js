export class TimelineClock {
  constructor({ timelineDataset }) {
    this.timelineDataset = timelineDataset;
  }

  hasTimeline() {
    return this.timelineDataset?.hasTimeline?.() === true;
  }

  getSegmentCount() {
    return this.timelineDataset?.segments?.length ?? 0;
  }

  getTransitionFrameForProgress(progress) {
    if (!this.hasTimeline()) return null;
    return this.timelineDataset.getTransitionFrameAtTimelineProgress(progress);
  }

  getTimelineProgressForLinearTreeProgress(progress, treeCount) {
    if (!this.hasTimeline()) return null;
    return this.timelineDataset.getTimelineProgressForLinearTreeProgress(progress, treeCount);
  }
}
