import { describe, expect, it } from 'vitest';
import {
  buildSprMoveEventRows,
  buildSprActivityTimelinePoints,
  calculateSprDatasetSummary,
  calculateSprMoverFrequencies,
  calculateSprPairActivity,
} from '../../../src/domain/spr/sprAnalytics.js';

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
          pivot_edge: [9],
          driver_subtree: [1],
          highlight_group: [[1]],
          step_range: [0, 4],
          collapse_hops: 1,
          expand_hops: 2,
          total_hops: 3,
          collapse_branch_length: 0.2,
          expand_branch_length: 0.4,
          total_branch_length: 0.6,
        },
        {
          pivot_edge: [9],
          driver_subtree: [2, 3],
          highlight_group: [[2, 3]],
          step_range: [0, 4],
          collapse_hops: 1,
          expand_hops: 0,
          total_hops: 1,
          collapse_branch_length: 0.5,
          expand_branch_length: 0,
          total_branch_length: 0.5,
        },
        {
          pivot_edge: [10],
          driver_subtree: [1],
          highlight_group: [[1]],
          step_range: [5, 9],
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
          pivot_edge: [8],
          driver_subtree: [4, 5, 6],
          highlight_group: [[4, 5, 6]],
          step_range: [0, 4],
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

  it('builds an auditable SPR move event ledger with one row per backend move event', () => {
    const events = buildSprMoveEventRows(pairSolutions, {
      robinsonFouldsDistances: [0.25, 0.5],
      weightedRobinsonFouldsDistances: [1.25, 1.5],
      pairInterpolationRanges: [[0, 10], [10, 20]],
    });

    expect(events).toHaveLength(4);
    expect(events[0]).toMatchObject({
      eventId: 'pair_0_1:0',
      pairKey: 'pair_0_1',
      pairIndex: 0,
      pairLabel: '0 -> 1',
      eventIndex: 0,
      signature: '1',
      splitIndices: [1],
      pivotEdge: [9],
      sourceAttachment: [7, 8],
      destinationAttachment: [5, 6],
      stepRange: [0, 4],
      totalPathHops: 3,
      totalPathLength: 0.6,
      rfDistance: 0.25,
      weightedRfDistance: 1.25,
    });
    expect(events[0]).not.toHaveProperty('hasMeasuredPath');
    expect(events[2]).toMatchObject({
      eventId: 'pair_0_1:2',
      signature: '1',
      splitIndices: [1],
      pivotEdge: [10],
      sourceAttachment: [4],
      destinationAttachment: [11],
      stepRange: [5, 9],
      totalPathHops: 2,
      totalPathLength: 0.25,
    });
  });

  it('builds per-pair SPR activity from event-ledger rows', () => {
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
    expect(rows[0]).not.toHaveProperty('pathEventCount');
    expect(rows[0].events).toHaveLength(3);
    expect(rows[0].topMover).toMatchObject({
      signature: '1',
      splitIndices: [1],
      count: 2,
      percentage: 66.66666666666666,
      totalPathHops: 5,
      averagePathHops: 2.5,
      totalPathLength: 0.85,
      averagePathLength: 0.425,
    });
    expect(rows[0].topMover).not.toHaveProperty('pathEventCount');
    expect(rows[0].topMover.attachmentContexts).toMatchObject([
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
    expect(rows[1]).not.toHaveProperty('pathEventCount');
  });

  it('keeps backend highlight context separate from the physical moved subtree', () => {
    const groupedPairSolutions = {
      pair_0_1: {
        jumping_subtree_solutions: {
          '[9]': [
            [[1], [2]],
          ],
        },
        split_change_events: [
          { split: [9], step_range: [0, 3] },
        ],
        solution_to_source_map: {
          '[9]': {
            '[1]': [1, 7],
            '[2]': [2, 8],
          },
        },
        solution_to_destination_map: {
          '[9]': {
            '[1]': [1, 9],
            '[2]': [2, 10],
          },
        },
        spr_move_events: [
          {
            pivot_edge: [9],
            driver_subtree: [1],
            highlight_group: [[1], [2]],
            step_range: [0, 3],
            collapse_hops: 1,
            expand_hops: 2,
            total_hops: 3,
            collapse_branch_length: 0.1,
            expand_branch_length: 0.4,
            total_branch_length: 0.5,
          },
        ],
      },
    };

    const events = buildSprMoveEventRows(groupedPairSolutions);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      signature: '1',
      splitIndices: [1],
      driverSplitIndices: [1],
      contextSplitIndices: [1, 2],
      highlightGroup: [[1], [2]],
      groupSize: 2,
      sourceAttachment: [7],
      destinationAttachment: [9],
      totalPathHops: 3,
      totalPathLength: 0.5,
    });

    const frequencies = calculateSprMoverFrequencies(groupedPairSolutions);
    expect(frequencies).toHaveLength(1);
    expect(frequencies[0]).toMatchObject({
      signature: '1',
      splitIndices: [1],
      driverSplitIndices: [1],
      contextSplitIndices: [1, 2],
      highlightGroup: [[1], [2]],
      groupSize: 2,
      totalPathHops: 3,
      totalPathLength: 0.5,
    });
    expect(frequencies.find((item) => item.signature === '1,2')).toBeUndefined();
  });

  it('maps pair-level distance arrays by interpolation range when pair keys use global tree indices', () => {
    const sparsePairSolutions = {
      pair_0_2: {
        jumping_subtree_solutions: {},
        solution_to_source_map: {},
        solution_to_destination_map: {},
        split_change_events: [],
        spr_move_events: [],
      },
      pair_2_4: {
        jumping_subtree_solutions: {
          '[8]': [
            [[4]],
          ],
        },
        split_change_events: [
          { split: [8], step_range: [0, 1] },
        ],
        solution_to_source_map: {
          '[8]': {
            '[4]': [4, 7],
          },
        },
        solution_to_destination_map: {
          '[8]': {
            '[4]': [4, 9],
          },
        },
        spr_move_events: [
          {
            pivot_edge: [8],
            driver_subtree: [4],
            highlight_group: [[4]],
            step_range: [0, 1],
            collapse_hops: 1,
            expand_hops: 1,
            total_hops: 2,
            collapse_branch_length: 0.1,
            expand_branch_length: 0.2,
            total_branch_length: 0.3,
          },
        ],
      },
    };

    const rows = calculateSprPairActivity(sparsePairSolutions, {
      robinsonFouldsDistances: [0.25, 0.75],
      weightedRobinsonFouldsDistances: [1.25, 1.75],
      pairInterpolationRanges: [[0, 2], [2, 4]],
    });
    const events = buildSprMoveEventRows(sparsePairSolutions, {
      robinsonFouldsDistances: [0.25, 0.75],
      weightedRobinsonFouldsDistances: [1.25, 1.75],
      pairInterpolationRanges: [[0, 2], [2, 4]],
    });

    expect(rows[1]).toMatchObject({
      pairKey: 'pair_2_4',
      pairIndex: 1,
      interpolationRange: [2, 4],
      rfDistance: 0.75,
      weightedRfDistance: 1.75,
    });
    expect(events[0]).toMatchObject({
      pairKey: 'pair_2_4',
      pairIndex: 1,
      interpolationRange: [2, 4],
      rfDistance: 0.75,
      weightedRfDistance: 1.75,
    });
  });

  it('aggregates path travel by moved subtree', () => {
    const frequencies = calculateSprMoverFrequencies(pairSolutions);

    expect(frequencies[0]).toMatchObject({
      signature: '1',
      count: 2,
      totalPathHops: 5,
      averagePathHops: 2.5,
      totalPathLength: 0.85,
      averagePathLength: 0.425,
      pairCount: 1,
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
    expect(summary).not.toHaveProperty('pathEventCount');
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

  it('does not infer SPR analytics rows from legacy jumping subtree solutions', () => {
    const legacyPairSolutions = {
      pair_0_1: {
        jumping_subtree_solutions: {
          '[9]': [
            [[1], [2, 3]],
          ],
        },
        split_change_events: [
          { split: [9], step_range: [0, 4] },
        ],
        solution_to_source_map: {},
        solution_to_destination_map: {},
      },
    };

    const events = buildSprMoveEventRows(legacyPairSolutions);
    const rows = calculateSprPairActivity(legacyPairSolutions);
    const summary = calculateSprDatasetSummary(legacyPairSolutions);
    const frequencies = calculateSprMoverFrequencies(legacyPairSolutions);
    const timeline = buildSprActivityTimelinePoints(rows);

    expect(events).toHaveLength(0);
    expect(frequencies).toHaveLength(0);
    expect(rows[0]).toMatchObject({
      moverOccurrenceCount: 0,
      uniqueMoverCount: 0,
      sprMoveEventCount: 0,
      totalPathHops: 0,
      averagePathHops: 0,
      totalPathLength: 0,
      averagePathLength: 0,
    });
    expect(rows[0]).not.toHaveProperty('pathEventCount');
    expect(summary).toMatchObject({
      pairCount: 1,
      activePairCount: 0,
      moverOccurrenceCount: 0,
      uniqueMovingSubtreeCount: 0,
      sprMoveEventCount: 0,
      totalPathHops: 0,
      averagePathHops: 0,
      totalPathLength: 0,
      averagePathLength: 0,
    });
    expect(summary).not.toHaveProperty('pathEventCount');
    expect(timeline[0].sprMoveEvents).toBe(0);
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
        sprMoveEvents: 3,
        uniqueMovers: 2,
        singletonMoverOccurrences: 2,
        cladeMoverOccurrences: 1,
        topMoverSignature: '1',
      },
      {
        pairIndex: 1,
        pairKey: 'pair_1_2',
        pairLabel: '1 -> 2',
        moverOccurrences: 1,
        sprMoveEvents: 1,
        uniqueMovers: 1,
        singletonMoverOccurrences: 0,
        cladeMoverOccurrences: 1,
        topMoverSignature: '4,5,6',
      },
    ]);
  });
});
