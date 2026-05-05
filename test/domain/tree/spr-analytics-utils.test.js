import { describe, expect, it } from 'vitest';
import {
  buildSprActivityTimelinePoints,
  calculateSprDatasetSummary,
  calculateSprMoverFrequencies,
  calculateSprPairActivity,
} from '../../../src/domain/tree/sprAnalyticsUtils.js';

describe('SPR analytics model', () => {
  const pairSolutions = {
    pair_0_1: {
      jumping_subtree_solutions: {
        '[9]': [
          [[1], [2, 3]],
        ],
        '[10]': [
          [[1]],
        ],
      },
      split_change_events: [
        { split: [9], step_range: [0, 4] },
        { split: [10], step_range: [5, 9] },
      ],
      solution_to_source_map: {
        '[9]': {
          '[1]': [1, 7, 8],
          '[2, 3]': [2, 3, 8],
        },
        '[10]': {
          '[1]': [1, 4],
        },
      },
      solution_to_destination_map: {
        '[9]': {
          '[1]': [1, 5, 6],
          '[2, 3]': [2, 3, 9],
        },
        '[10]': {
          '[1]': [1, 11],
        },
      },
      spr_move_events: [
        {
          moving_subtree: [1],
          collapse_hops: 1,
          expand_hops: 2,
          total_hops: 3,
          collapse_branch_length: 0.2,
          expand_branch_length: 0.4,
          total_branch_length: 0.6,
        },
        {
          moving_subtree: [2, 3],
          collapse_hops: 1,
          expand_hops: 0,
          total_hops: 1,
          collapse_branch_length: 0.5,
          expand_branch_length: 0,
          total_branch_length: 0.5,
        },
        {
          moving_subtree: [1],
          collapse_hops: 1,
          expand_hops: 1,
          total_hops: 2,
          collapse_branch_length: 0.1,
          expand_branch_length: 0.15,
          total_branch_length: 0.25,
        },
      ],
    },
    pair_1_2: {
      jumping_subtree_solutions: {
        '[8]': [
          [[4, 5, 6]],
        ],
      },
      split_change_events: [
        { split: [8], step_range: [0, 4] },
      ],
      solution_to_source_map: {
        '[8]': {
          '[4, 5, 6]': [4, 5, 6, 7],
        },
      },
      solution_to_destination_map: {
        '[8]': {
          '[4, 5, 6]': [4, 5, 6, 12],
        },
      },
      spr_move_events: [
        {
          moving_subtree: [4, 5, 6],
          collapse_hops: 2,
          expand_hops: 2,
          total_hops: 4,
          collapse_branch_length: 0.7,
          expand_branch_length: 0.5,
          total_branch_length: 1.2,
        },
      ],
    },
  };

  it('builds per-pair SPR activity with distance and size-class context', () => {
    const rows = calculateSprPairActivity(pairSolutions, {
      robinsonFouldsDistances: [0.25, 0.5],
      weightedRobinsonFouldsDistances: [1.25, 1.5],
      pairInterpolationRanges: [[0, 10], [10, 20]],
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      pairKey: 'pair_0_1',
      pairIndex: 0,
      sourceTreeIndex: 0,
      destinationTreeIndex: 1,
      interpolationRange: [0, 10],
      rfDistance: 0.25,
      weightedRfDistance: 1.25,
      moverOccurrenceCount: 3,
      uniqueMoverCount: 2,
      singletonMoverOccurrences: 2,
      cladeMoverOccurrences: 1,
      transitionEventCount: 2,
      sprMoveEventCount: 3,
      totalPathHops: 6,
      averagePathHops: 2,
      totalPathLength: 1.35,
      averagePathLength: 0.45,
    });
    expect(rows[0].topMover).toMatchObject({
      signature: '1',
      splitIndices: [1],
      count: 2,
      percentage: 66.66666666666666,
      pathEventCount: 2,
      totalPathHops: 5,
      averagePathHops: 2.5,
      totalPathLength: 0.85,
      averagePathLength: 0.425,
    });
    expect(rows[0].topMover.attachmentContexts).toEqual([
      {
        pivotEdge: [9],
        sourceAttachment: [7, 8],
        destinationAttachment: [5, 6],
      },
      {
        pivotEdge: [10],
        sourceAttachment: [4],
        destinationAttachment: [11],
      },
    ]);
    expect(rows[1]).toMatchObject({
      pairKey: 'pair_1_2',
      pairIndex: 1,
      moverOccurrenceCount: 1,
      uniqueMoverCount: 1,
      singletonMoverOccurrences: 0,
      cladeMoverOccurrences: 1,
      transitionEventCount: 1,
      sprMoveEventCount: 1,
      totalPathHops: 4,
      averagePathHops: 4,
      totalPathLength: 1.2,
      averagePathLength: 1.2,
    });
  });

  it('aggregates path travel by moved group', () => {
    const frequencies = calculateSprMoverFrequencies(pairSolutions);

    expect(frequencies[0]).toMatchObject({
      signature: '1',
      count: 2,
      totalPathHops: 5,
      averagePathHops: 2.5,
      totalPathLength: 0.85,
      averagePathLength: 0.425,
    });
    expect(frequencies.find((item) => item.signature === '2,3')).toMatchObject({
      totalPathHops: 1,
      averagePathHops: 1,
      totalPathLength: 0.5,
      averagePathLength: 0.5,
    });
  });

  it('summarizes dataset-level SPR activity without conflating events and movers', () => {
    const summary = calculateSprDatasetSummary(pairSolutions);

    expect(summary).toMatchObject({
      pairCount: 2,
      activePairCount: 2,
      transitionEventCount: 3,
      moverOccurrenceCount: 4,
      uniqueMovingSubtreeCount: 3,
      singletonMoverOccurrences: 2,
      cladeMoverOccurrences: 2,
      maxPairMoverOccurrenceCount: 3,
      topMoverSharePercentage: 50,
      sprMoveEventCount: 4,
      totalPathHops: 10,
      averagePathHops: 2.5,
      totalPathLength: 2.55,
      averagePathLength: 0.6375,
    });
    expect(summary.farthestMover).toMatchObject({
      signature: '4,5,6',
      splitIndices: [4, 5, 6],
      count: 1,
      totalPathHops: 4,
      averagePathHops: 4,
      totalPathLength: 1.2,
      averagePathLength: 1.2,
    });
  });

  it('formats pair activity rows for the SPR activity timeline', () => {
    const rows = calculateSprPairActivity(pairSolutions, {
      robinsonFouldsDistances: [0.25, 0.5],
      weightedRobinsonFouldsDistances: [1.25, 1.5],
    });

    expect(buildSprActivityTimelinePoints(rows)).toEqual([
      {
        pairIndex: 0,
        pairKey: 'pair_0_1',
        pairLabel: '0 -> 1',
        moverOccurrences: 3,
        transitionEvents: 2,
        uniqueMovers: 2,
        singletonMoverOccurrences: 2,
        cladeMoverOccurrences: 1,
        rfDistance: 0.25,
        weightedRfDistance: 1.25,
        totalPathHops: 6,
        averagePathHops: 2,
        totalPathLength: 1.35,
        averagePathLength: 0.45,
        topMoverSignature: '1',
      },
      {
        pairIndex: 1,
        pairKey: 'pair_1_2',
        pairLabel: '1 -> 2',
        moverOccurrences: 1,
        transitionEvents: 1,
        uniqueMovers: 1,
        singletonMoverOccurrences: 0,
        cladeMoverOccurrences: 1,
        rfDistance: 0.5,
        weightedRfDistance: 1.5,
        totalPathHops: 4,
        averagePathHops: 4,
        totalPathLength: 1.2,
        averagePathLength: 1.2,
        topMoverSignature: '4,5,6',
      },
    ]);
  });
});
