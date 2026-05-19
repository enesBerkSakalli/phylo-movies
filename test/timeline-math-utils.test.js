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

function makeSemanticTimingFixture() {
  const treeList = Array.from({ length: 4 }, (_, index) => ({ id: `tree-${index}` }));
  const segments = [{
    isFullTree: false,
    hasInterpolation: true,
    interpolationData: [
      { originalIndex: 0 },
      { originalIndex: 1 },
      { originalIndex: 2 },
      { originalIndex: 3 }
    ],
    timing: [
      { type: 'motion', fromIndex: 0, toIndex: 1, durationMs: 1000 },
      { type: 'hold', holdIndex: 1, holdKind: 'mover', durationMs: 200 },
      { type: 'motion', fromIndex: 1, toIndex: 2, durationMs: 1000 },
      { type: 'motion', fromIndex: 2, toIndex: 3, durationMs: 1000 },
      { type: 'hold', holdIndex: 3, holdKind: 'pivot', durationMs: 900 }
    ]
  }];
  const timelineData = TimelineDataProcessor.createTimelineData(segments);

  return { treeList, segments, timelineData };
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
        if (entry.originalIndex === segment.contextStart) {
          return;
        }

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

  it('returns a safe empty transition frame for empty input', () => {
    const result = TimelineMathUtils.getTransitionFrameForProgress(0.25, []);

    expect(result).to.include({
      sourceTree: null,
      targetTree: null,
      transitionProgress: 0,
      sourceTreeIndex: -1,
      targetTreeIndex: -1
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

  it('uses interpolation intervals, not frame count, for transition segment duration', () => {
    const durations = TimelineMathUtils.calculateSegmentDurations([
      {
        isFullTree: false,
        hasInterpolation: true,
        interpolationData: [
          { originalIndex: 0 },
          { originalIndex: 1 },
          { originalIndex: 2 }
        ]
      }
    ]);

    expect(durations).to.deep.equal([2000]);
  });

  it('uses semantic timing intervals for transition segment duration when present', () => {
    const { segments } = makeSemanticTimingFixture();

    expect(TimelineMathUtils.calculateSegmentDurations(segments)).to.deep.equal([4100]);
  });

  it('resolves mover and pivot holds as static completed frames', () => {
    const { treeList, segments, timelineData } = makeSemanticTimingFixture();

    const moverHold = TimelineMathUtils.getTransitionFrameForTimelineProgress(
      1100 / timelineData.totalDuration,
      segments,
      timelineData,
      treeList
    );
    const pivotHold = TimelineMathUtils.getTransitionFrameForTimelineProgress(
      3500 / timelineData.totalDuration,
      segments,
      timelineData,
      treeList
    );

    expect(moverHold).to.include({
      sourceTree: treeList[1],
      targetTree: treeList[1],
      transitionProgress: 0,
      sourceTreeIndex: 1,
      targetTreeIndex: 1,
      holdKind: 'mover'
    });
    expect(pivotHold).to.include({
      sourceTree: treeList[3],
      targetTree: treeList[3],
      transitionProgress: 0,
      sourceTreeIndex: 3,
      targetTreeIndex: 3,
      holdKind: 'pivot'
    });
  });

  it('resolves input-tree holds as static observed input tree states', () => {
    const treeList = [{ id: 'input-tree' }];
    const segments = [{
      isFullTree: true,
      hasInterpolation: false,
      interpolationData: [{ originalIndex: 0 }],
      timing: [{
        type: 'hold',
        holdIndex: 0,
        holdKind: 'input_tree',
        durationMs: 1500
      }]
    }];
    const timelineData = TimelineDataProcessor.createTimelineData(segments);

    const resolved = TimelineMathUtils.getTransitionFrameForTimelineProgress(
      0.5,
      segments,
      timelineData,
      treeList
    );

    expect(resolved).to.include({
      sourceTree: treeList[0],
      targetTree: treeList[0],
      transitionProgress: 0,
      sourceTreeIndex: 0,
      targetTreeIndex: 0,
      holdKind: 'input_tree'
    });
  });

  it('uses the timing profile for legacy segments without explicit timing intervals', () => {
    const durations = TimelineMathUtils.calculateSegmentDurations([
      {
        isFullTree: true,
        hasInterpolation: false,
        interpolationData: [{ originalIndex: 0 }]
      },
      {
        isFullTree: false,
        hasInterpolation: true,
        interpolationData: [
          { originalIndex: 0 },
          { originalIndex: 1 },
          { originalIndex: 2 }
        ]
      },
      {
        isFullTree: false,
        hasInterpolation: false,
        interpolationData: [{ originalIndex: 0 }]
      }
    ]);

    expect(durations).to.deep.equal([1500, 2000, 1000]);
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
