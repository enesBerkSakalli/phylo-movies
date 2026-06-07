const { expect } = require('chai');
const fs = require('fs');
const path = require('path');

const { TimelineDataProcessor } = require('../src/timeline/data/TimelineDataProcessor.js');
const { TimelineMathUtils } = require('../src/timeline/math/TimelineMathUtils.js');

function loadMovieData() {
  const candidates = [path.join(__dirname, 'data', 'small_example', 'small_example.response.json')];

  for (const filePath of candidates) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      // Try the next fixture candidate.
    }
  }

  throw new Error('No input JSON found for TimelineMathUtils tests.');
}

function loadPaperExampleMovieData() {
  return JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '..', 'publication_data', 'precomputed', 'paper_example.movie.json'),
      'utf8'
    )
  );
}

function makeSemanticTimingFixture() {
  const treeList = Array.from({ length: 4 }, (_, index) => ({ id: `tree-${index}` }));
  const segments = [
    {
      isInputTreeSegment: false,
      hasInterpolation: true,
      interpolationData: [
        { originalIndex: 0 },
        { originalIndex: 1 },
        { originalIndex: 2 },
        { originalIndex: 3 },
      ],
      timing: [
        { type: 'motion', fromIndex: 0, toIndex: 1, durationMs: 1000 },
        { type: 'hold', holdIndex: 1, holdKind: 'mover', durationMs: 200 },
        { type: 'motion', fromIndex: 1, toIndex: 2, durationMs: 1000 },
        { type: 'motion', fromIndex: 2, toIndex: 3, durationMs: 1000 },
        { type: 'hold', holdIndex: 3, holdKind: 'pivot', durationMs: 900 },
      ],
    },
  ];
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

  it('round-trips interpolation frame lookup through getTargetFrameForTime', () => {
    segments.forEach((segment, segmentIndex) => {
      if (!segment.hasInterpolation || segment.interpolationData.length <= 1) {
        return;
      }

      const segmentStartTime =
        segmentIndex === 0 ? 0 : timelineData.cumulativeDurations[segmentIndex - 1];

      segment.interpolationData.forEach((entry) => {
        if (entry.originalIndex === segment.contextStart) {
          return;
        }

        const lookup = TimelineMathUtils.findSegmentForFrameIndex(segments, entry.originalIndex);
        const absoluteTime = segmentStartTime + lookup.timeInSegment;
        const resolved = TimelineMathUtils.getTargetFrameForTime(
          segments,
          absoluteTime,
          timelineData.segmentDurations,
          'nearest',
          timelineData.cumulativeDurations
        );

        expect(lookup.segmentIndex).to.equal(segmentIndex);
        expect(resolved.segmentIndex).to.equal(segmentIndex);
        expect(resolved.frameIndex).to.equal(entry.originalIndex);
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
      targetTreeIndex: -1,
    });
  });

  it('maps linear frame progress onto weighted timeline progress', () => {
    const firstInterpolationIndex = segments.findIndex(
      (segment) => segment.hasInterpolation && segment.interpolationData.length > 1
    );
    const segment = segments[firstInterpolationIndex];
    const entry = segment.interpolationData[segment.interpolationData.length - 1];
    const linearProgress = entry.originalIndex / (loadMovieData().interpolated_trees.length - 1);

    const weightedProgress = TimelineMathUtils.getTimelineProgressForLinearTreeProgress(
      linearProgress,
      loadMovieData().interpolated_trees.length,
      segments,
      timelineData
    );

    const currentTime = TimelineMathUtils.progressToTime(
      weightedProgress,
      timelineData.totalDuration
    );
    const resolved = TimelineMathUtils.getTargetFrameForTime(
      segments,
      currentTime,
      timelineData.segmentDurations,
      'nearest',
      timelineData.cumulativeDurations
    );

    expect(resolved.frameIndex).to.equal(entry.originalIndex);
    expect(weightedProgress).to.not.equal(linearProgress);
  });

  it('maps the paper example final linear progress to the final input-tree hold', () => {
    const movieData = loadPaperExampleMovieData();
    const paperSegments = TimelineDataProcessor.createSegments(movieData);
    const paperTimelineData = TimelineDataProcessor.createTimelineData(paperSegments);
    const treeCount = movieData.interpolated_trees.length;

    const weightedProgress = TimelineMathUtils.getTimelineProgressForLinearTreeProgress(
      1,
      treeCount,
      paperSegments,
      paperTimelineData
    );
    const currentTime = TimelineMathUtils.progressToTime(
      weightedProgress,
      paperTimelineData.totalDuration
    );
    const resolved = TimelineMathUtils.getTargetFrameForTime(
      paperSegments,
      currentTime,
      paperTimelineData.segmentDurations,
      'nearest',
      paperTimelineData.cumulativeDurations
    );

    expect(currentTime).to.equal(15900);
    expect(resolved).to.include({
      frameIndex: treeCount - 1,
      segmentIndex: 3,
    });
  });

  it('uses explicit interpolation intervals, not frame count, for transition segment duration', () => {
    const durations = TimelineMathUtils.calculateSegmentDurations([
      {
        isInputTreeSegment: false,
        hasInterpolation: true,
        interpolationData: [{ originalIndex: 0 }, { originalIndex: 1 }, { originalIndex: 2 }],
        timing: [
          { type: 'motion', fromIndex: 0, toIndex: 1, durationMs: 700 },
          { type: 'motion', fromIndex: 1, toIndex: 2, durationMs: 1300 },
        ],
      },
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
      holdKind: 'mover',
    });
    expect(pivotHold).to.include({
      sourceTree: treeList[3],
      targetTree: treeList[3],
      transitionProgress: 0,
      sourceTreeIndex: 3,
      targetTreeIndex: 3,
      holdKind: 'pivot',
    });
  });

  it('resolves input-tree holds as static observed input tree states', () => {
    const treeList = [{ id: 'input-tree' }];
    const segments = [
      {
        isInputTreeSegment: true,
        hasInterpolation: false,
        interpolationData: [{ originalIndex: 0 }],
        timing: [
          {
            type: 'hold',
            holdIndex: 0,
            holdKind: 'input_tree',
            durationMs: 1500,
          },
        ],
      },
    ];
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
      holdKind: 'input_tree',
    });
  });

  it('rejects timeline progress resolution when segment timing is missing', () => {
    const treeList = [{ id: 'tree-0' }];
    expect(() =>
      TimelineMathUtils.getTransitionFrameForTimelineProgress(
        0.5,
        [{ interpolationData: [{ originalIndex: 0 }], isInputTreeSegment: true }],
        {
          totalDuration: 1000,
          segmentDurations: [1000],
          cumulativeDurations: [1000],
        },
        treeList
      )
    ).to.throw(/timeline segment timing is required/);
  });

  it('rejects segments without explicit timing intervals', () => {
    expect(() =>
      TimelineMathUtils.calculateSegmentDurations([
        {
          isInputTreeSegment: true,
          hasInterpolation: false,
          interpolationData: [{ originalIndex: 0 }],
        },
        {
          isInputTreeSegment: false,
          hasInterpolation: true,
          interpolationData: [{ originalIndex: 0 }, { originalIndex: 1 }, { originalIndex: 2 }],
        },
        {
          isInputTreeSegment: false,
          hasInterpolation: false,
          interpolationData: [{ originalIndex: 0 }],
        },
      ])
    ).to.throw(/timeline segment timing is required/);
  });

  it('resolves exact timeline boundaries consistently', () => {
    const firstInterpolationIndex = segments.findIndex(
      (segment, index) =>
        index > 0 && segment.hasInterpolation && segment.interpolationData.length > 1
    );
    const boundaryTime = timelineData.cumulativeDurations[firstInterpolationIndex - 1];
    const firstInterpolationSegment = segments[firstInterpolationIndex];
    const atBoundary = TimelineMathUtils.getTargetFrameForTime(
      segments,
      boundaryTime,
      timelineData.segmentDurations,
      'nearest',
      timelineData.cumulativeDurations
    );

    expect(atBoundary.segmentIndex).to.equal(firstInterpolationIndex);
    expect(atBoundary.frameIndex).to.equal(
      firstInterpolationSegment.interpolationData[0].originalIndex
    );

    const lastSegmentIndex = segments.length - 1;
    const lastSegment = segments[lastSegmentIndex];
    const lastEntry = lastSegment.interpolationData[lastSegment.interpolationData.length - 1];
    const atTimelineEnd = TimelineMathUtils.getTargetFrameForTime(
      segments,
      timelineData.totalDuration,
      timelineData.segmentDurations,
      'nearest',
      timelineData.cumulativeDurations
    );

    expect(atTimelineEnd.segmentIndex).to.equal(lastSegmentIndex);
    expect(atTimelineEnd.frameIndex).to.equal(lastEntry.originalIndex);
  });
});
