const { expect } = require('chai');
const fs = require('fs');
const path = require('path');

const { TimelineDataProcessor } = require('../src/timeline/data/TimelineDataProcessor.js');
const { TimelineMathUtils } = require('../src/timeline/math/TimelineMathUtils.js');

function loadMovieData() {
  const candidates = [
    path.join(__dirname, 'data', 'small_example', 'small_example.response.json'),
    path.join(__dirname, 'data', 'example.json')
  ];

  for (const filePath of candidates) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      // Try the next fixture candidate.
    }
  }

  throw new Error('No input JSON found for TimelineMathUtils tests.');
}

describe('TimelineMathUtils', () => {
  let segments;
  let timelineData;

  before(() => {
    const movieData = loadMovieData();
    segments = TimelineDataProcessor.createSegments(movieData);
    timelineData = TimelineDataProcessor.createTimelineData(segments);
  });

  it('round-trips interpolation tree lookup through getTargetTreeForTime', () => {
    segments.forEach((segment, segmentIndex) => {
      if (!segment.hasInterpolation || segment.interpolationData.length <= 1) {
        return;
      }

      const segmentStartTime = segmentIndex === 0
        ? 0
        : timelineData.cumulativeDurations[segmentIndex - 1];

      segment.interpolationData.forEach((entry) => {
        const lookup = TimelineMathUtils.findSegmentForTreeIndex(segments, entry.originalIndex);
        const absoluteTime = segmentStartTime + lookup.timeInSegment;
        const resolved = TimelineMathUtils.getTargetTreeForTime(
          segments,
          absoluteTime,
          timelineData.segmentDurations,
          'nearest',
          timelineData.cumulativeDurations
        );

        expect(lookup.segmentIndex).to.equal(segmentIndex);
        expect(resolved.segmentIndex).to.equal(segmentIndex);
        expect(resolved.treeIndex).to.equal(entry.originalIndex);
      });
    });
  });

  it('returns zero progress and zero time when total duration is zero', () => {
    expect(TimelineMathUtils.timeToProgress(0, 0)).to.equal(0);
    expect(TimelineMathUtils.timeToProgress(250, 0)).to.equal(0);
    expect(TimelineMathUtils.progressToTime(0.5, 0)).to.equal(0);
  });

  it('returns a safe empty interpolation result for empty input', () => {
    const result = TimelineMathUtils.getInterpolationDataForProgress(0.25, [], { interpolated_trees: [] });

    expect(result).to.deep.equal({
      fromTree: null,
      toTree: null,
      timeFactor: 0,
      fromIndex: -1,
      toIndex: -1
    });
  });

  it('maps linear tree progress onto weighted timeline progress', () => {
    const firstInterpolationIndex = segments.findIndex(segment => (
      segment.hasInterpolation && segment.interpolationData.length > 1
    ));
    const segment = segments[firstInterpolationIndex];
    const entry = segment.interpolationData[segment.interpolationData.length - 1];
    const linearProgress = entry.originalIndex / (loadMovieData().interpolated_trees.length - 1);

    const weightedProgress = TimelineMathUtils.getTimelineProgressForLinearTreeProgress(
      linearProgress,
      loadMovieData().interpolated_trees.length,
      segments,
      timelineData
    );

    const currentTime = TimelineMathUtils.progressToTime(weightedProgress, timelineData.totalDuration);
    const resolved = TimelineMathUtils.getTargetTreeForTime(
      segments,
      currentTime,
      timelineData.segmentDurations,
      'nearest',
      timelineData.cumulativeDurations
    );

    expect(resolved.treeIndex).to.equal(entry.originalIndex);
    expect(weightedProgress).to.not.equal(linearProgress);
  });

  it('resolves exact timeline boundaries consistently', () => {
    const firstInterpolationIndex = segments.findIndex((segment, index) => (
      index > 0 && segment.hasInterpolation && segment.interpolationData.length > 1
    ));
    const boundaryTime = timelineData.cumulativeDurations[firstInterpolationIndex - 1];
    const firstInterpolationSegment = segments[firstInterpolationIndex];
    const atBoundary = TimelineMathUtils.getTargetTreeForTime(
      segments,
      boundaryTime,
      timelineData.segmentDurations,
      'nearest',
      timelineData.cumulativeDurations
    );

    expect(atBoundary.segmentIndex).to.equal(firstInterpolationIndex);
    expect(atBoundary.treeIndex).to.equal(firstInterpolationSegment.interpolationData[0].originalIndex);

    const lastSegmentIndex = segments.length - 1;
    const lastSegment = segments[lastSegmentIndex];
    const lastEntry = lastSegment.interpolationData[lastSegment.interpolationData.length - 1];
    const atTimelineEnd = TimelineMathUtils.getTargetTreeForTime(
      segments,
      timelineData.totalDuration,
      timelineData.segmentDurations,
      'nearest',
      timelineData.cumulativeDurations
    );

    expect(atTimelineEnd.segmentIndex).to.equal(lastSegmentIndex);
    expect(atTimelineEnd.treeIndex).to.equal(lastEntry.originalIndex);
  });
});
