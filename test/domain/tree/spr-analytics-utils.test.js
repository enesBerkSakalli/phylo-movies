import { describe, expect, it } from 'vitest';
import * as sprAnalytics from '../../../src/domain/spr/sprAnalytics.js';

const {
  buildSprAnalyticsModel,
  buildSprMoveEventRows,
  buildSprActivityTimelinePoints,
  calculateSprDatasetSummary,
  calculateSprMovedSubtreeRecurrences,
  calculateSprPairActivity,
} = sprAnalytics;

const solution0 = {
  affected_subtrees_by_split: {
    '[9]': [[[1], [2, 3]]],
    '[10]': [[[1]]],
  },
  attachment_edges_by_split: {
    '[9]': {
      '[1]': {
        source: [1, 7, 8],
        destination: [1, 5, 6],
      },
      '[2, 3]': {
        source: [2, 3, 8],
        destination: [2, 3, 9],
      },
    },
    '[10]': {
      '[1]': {
        source: [1, 4],
        destination: [1, 11],
      },
    },
  },
};

const solution1 = {
  affected_subtrees_by_split: {
    '[8]': [[[4, 5, 6]]],
  },
  attachment_edges_by_split: {
    '[8]': {
      '[4, 5, 6]': {
        source: [4, 5, 6, 7],
        destination: [4, 5, 6, 12],
      },
    },
  },
};

const pairs = [
  {
    pair_id: 'pair_0_1',
    pair_ordinal: 0,
    source_input_tree_index: 0,
    target_input_tree_index: 1,
    source_frame_index: 0,
    target_frame_index: 10,
    generated_frame_range: [1, 9],
    solution: solution0,
  },
  {
    pair_id: 'pair_1_2',
    pair_ordinal: 1,
    source_input_tree_index: 1,
    target_input_tree_index: 2,
    source_frame_index: 10,
    target_frame_index: 20,
    generated_frame_range: [11, 19],
    solution: solution1,
  },
];

const temporalEvents = [
  {
    event_id: 'pair_0_1:split:0',
    event_type: 'split_change',
    pair_id: 'pair_0_1',
    pair_ordinal: 0,
    local_step_range: [0, 4],
    frame_range: [1, 5],
    split: [9],
  },
  {
    event_id: 'pair_0_1:split:1',
    event_type: 'split_change',
    pair_id: 'pair_0_1',
    pair_ordinal: 0,
    local_step_range: [5, 9],
    frame_range: [6, 10],
    split: [10],
  },
  {
    event_id: 'pair_1_2:split:0',
    event_type: 'split_change',
    pair_id: 'pair_1_2',
    pair_ordinal: 1,
    local_step_range: [0, 4],
    frame_range: [11, 15],
    split: [8],
  },
  {
    event_id: 'pair_0_1:spr:0',
    event_type: 'spr_move',
    pair_id: 'pair_0_1',
    pair_ordinal: 0,
    local_step_range: [0, 4],
    frame_range: [1, 5],
    pivot_edge: [9],
    driver_subtree: [1],
    highlight_group: [[1]],
    collapse_path: [],
    expand_path: [],
    collapse_hops: 1,
    expand_hops: 2,
    total_hops: 3,
    collapse_branch_length: 0.2,
    expand_branch_length: 0.4,
    total_branch_length: 0.6,
  },
  {
    event_id: 'pair_0_1:spr:1',
    event_type: 'spr_move',
    pair_id: 'pair_0_1',
    pair_ordinal: 0,
    local_step_range: [0, 4],
    frame_range: [1, 5],
    pivot_edge: [9],
    driver_subtree: [2, 3],
    highlight_group: [[2, 3]],
    collapse_path: [],
    expand_path: [],
    collapse_hops: 1,
    expand_hops: 0,
    total_hops: 1,
    collapse_branch_length: 0.5,
    expand_branch_length: 0,
    total_branch_length: 0.5,
  },
  {
    event_id: 'pair_0_1:spr:2',
    event_type: 'spr_move',
    pair_id: 'pair_0_1',
    pair_ordinal: 0,
    local_step_range: [5, 9],
    frame_range: [6, 10],
    pivot_edge: [10],
    driver_subtree: [1],
    highlight_group: [[1]],
    collapse_path: [],
    expand_path: [],
    collapse_hops: 1,
    expand_hops: 1,
    total_hops: 2,
    collapse_branch_length: 0.1,
    expand_branch_length: 0.15,
    total_branch_length: 0.25,
  },
  {
    event_id: 'pair_1_2:spr:0',
    event_type: 'spr_move',
    pair_id: 'pair_1_2',
    pair_ordinal: 1,
    local_step_range: [0, 4],
    frame_range: [11, 15],
    pivot_edge: [8],
    driver_subtree: [4, 5, 6],
    highlight_group: [[4, 5, 6]],
    collapse_path: [],
    expand_path: [],
    collapse_hops: 2,
    expand_hops: 2,
    total_hops: 4,
    collapse_branch_length: 0.7,
    expand_branch_length: 0.5,
    total_branch_length: 1.2,
  },
];

const pairMetrics = {
  rows: [
    {
      pair_id: 'pair_0_1',
      pair_ordinal: 0,
      robinson_foulds: 0.25,
      weighted_robinson_foulds: 1.25,
    },
    {
      pair_id: 'pair_1_2',
      pair_ordinal: 1,
      robinson_foulds: 0.5,
      weighted_robinson_foulds: 1.5,
    },
  ],
  semantics: {},
};

const analyticsOptions = { temporalEvents, pairMetrics };

const topologySourceTree = {
  name: 'sourceRoot',
  length: 0,
  split_indices: [1, 2, 3, 4, 5, 6],
  children: [
    { name: 'B', length: 1, split_indices: [1], children: [] },
    {
      name: 'source23',
      length: 0.2,
      split_indices: [2, 3],
      children: [
        { name: 'C', length: 1, split_indices: [2], children: [] },
        { name: 'D', length: 1, split_indices: [3], children: [] },
      ],
    },
    {
      name: 'source456',
      length: 0.3,
      split_indices: [4, 5, 6],
      children: [
        { name: 'E', length: 1, split_indices: [4], children: [] },
        { name: 'F', length: 1, split_indices: [5], children: [] },
        { name: 'G', length: 1, split_indices: [6], children: [] },
      ],
    },
  ],
};

const topologyTargetTree = {
  ...topologySourceTree,
  name: 'targetRoot',
  children: [
    { name: 'B', length: 1, split_indices: [1], children: [] },
    {
      name: 'target23',
      length: 0.4,
      split_indices: [2, 3],
      children: [
        { name: 'D', length: 1, split_indices: [3], children: [] },
        { name: 'C', length: 1, split_indices: [2], children: [] },
      ],
    },
    topologySourceTree.children[2],
  ],
};

const topologyTrees = [];
topologyTrees[0] = topologySourceTree;
topologyTrees[10] = topologyTargetTree;
topologyTrees[20] = topologySourceTree;

describe('SPR analytics model', () => {
  it('builds an auditable SPR move event ledger from normalized temporal events', () => {
    const branchSupportIndex = {
      getSupport(inputTreeIndex, splitIndices) {
        const key = `${inputTreeIndex}:${splitIndices.join(',')}`;
        return (
          {
            '0:7,8': { raw: '41', kind: 'bootstrap', primary: 41, bootstrap: 41 },
            '1:5,6': { raw: '93', kind: 'bootstrap', primary: 93, bootstrap: 93 },
          }[key] ?? null
        );
      },
      getBranchValue(inputTreeIndex, splitIndices) {
        const key = `${inputTreeIndex}:${splitIndices.join(',')}`;
        return (
          {
            '0:1': {
              key: 'support.bootstrap.value',
              label: 'Bootstrap',
              value: 61,
              displayValue: '61',
              role: 'branch_support',
              support: { kind: 'bootstrap', primary: 61, bootstrap: 61 },
            },
            '1:1': {
              key: 'support.bootstrap.value',
              label: 'Bootstrap',
              value: 79,
              displayValue: '79',
              role: 'branch_support',
              support: { kind: 'bootstrap', primary: 79, bootstrap: 79 },
            },
          }[key] ?? null
        );
      },
      getNearestParentBranchValue(inputTreeIndex, splitIndices) {
        const key = `${inputTreeIndex}:${splitIndices.join(',')}`;
        return (
          {
            '0:1': {
              key: 'support.bootstrap.value',
              label: 'Bootstrap',
              value: 72.5,
              displayValue: '72.5',
              role: 'branch_support',
              support: { kind: 'bootstrap', primary: 72.5, bootstrap: 72.5 },
            },
            '1:1': {
              key: 'support.bootstrap.value',
              label: 'Bootstrap',
              value: 84,
              displayValue: '84',
              role: 'branch_support',
              support: { kind: 'bootstrap', primary: 84, bootstrap: 84 },
            },
          }[key] ?? null
        );
      },
    };
    const events = buildSprMoveEventRows(pairs, {
      ...analyticsOptions,
      branchSupportIndex,
      branchValueThreshold: 70,
    });

    expect(events).toHaveLength(4);
    expect(events[0]).toMatchObject({
      eventId: 'pair_0_1:spr:0',
      pairId: 'pair_0_1',
      pairIndex: 0,
      sourceInputTreeIndex: 0,
      targetInputTreeIndex: 1,
      pairLabel: 'Source tree 1 -> Target tree 2',
      eventIndex: 0,
      signature: '1',
      splitIndices: [1],
      pivotEdge: [9],
      sourceAttachment: [7, 8],
      destinationAttachment: [5, 6],
      stepRange: [0, 4],
      frameRange: [1, 5],
      interpolationRange: [0, 10],
      generatedFrameRange: [1, 9],
      totalPathHops: 3,
      totalPathLength: 0.6,
      rfDistance: 0.25,
      weightedRfDistance: 1.25,
      sourceAttachmentSupport: { raw: '41', kind: 'bootstrap', primary: 41, bootstrap: 41 },
      destinationAttachmentSupport: { raw: '93', kind: 'bootstrap', primary: 93, bootstrap: 93 },
      sourceMovedSubtreeBranchValue: { displayValue: '61', role: 'branch_support' },
      destinationMovedSubtreeBranchValue: { displayValue: '79', role: 'branch_support' },
      sourceParentBranchValue: { displayValue: '72.5', role: 'branch_support' },
      destinationParentBranchValue: { displayValue: '84', role: 'branch_support' },
      branchValueClass: 'mixed_value',
      contextBranchValueClass: 'both_high_value',
    });
    expect(events[0]).not.toHaveProperty('pairKey');
    expect(events[0]).not.toHaveProperty('destinationTreeIndex');
    expect(events[2]).toMatchObject({
      eventId: 'pair_0_1:spr:2',
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

  it('normalizes SPR event arrays without mutating the backend payload', () => {
    const unsortedPairs = [
      {
        pair_id: 'opaque-pair',
        pair_ordinal: 0,
        source_input_tree_index: 10,
        target_input_tree_index: 11,
        source_frame_index: 50,
        target_frame_index: 55,
        generated_frame_range: [51, 54],
        solution: {
          affected_subtrees_by_split: {},
          attachment_edges_by_split: {
            '[3, 9]': {
              '[1, 4]': {
                source: [8, 1, 7],
                destination: [6, 1, 5],
              },
            },
          },
        },
      },
    ];
    const unsortedTemporalEvents = [
      {
        event_id: 'opaque-pair:spr:0',
        event_type: 'spr_move',
        pair_id: 'opaque-pair',
        pair_ordinal: 0,
        local_step_range: [0, 2],
        frame_range: [51, 53],
        pivot_edge: [9, 3],
        driver_subtree: [4, 1],
        highlight_group: [[4, 1]],
        collapse_path: [],
        expand_path: [],
        collapse_hops: 1,
        expand_hops: 1,
        total_hops: 2,
        collapse_branch_length: 0.1,
        expand_branch_length: 0.2,
        total_branch_length: 0.3,
      },
    ];
    const originalPayload = structuredClone({ unsortedPairs, unsortedTemporalEvents });

    const events = buildSprMoveEventRows(unsortedPairs, {
      temporalEvents: unsortedTemporalEvents,
      pairMetrics: {
        rows: [
          {
            pair_id: 'opaque-pair',
            pair_ordinal: 0,
            robinson_foulds: 0.7,
            weighted_robinson_foulds: 7,
          },
        ],
        semantics: {},
      },
    });

    expect(events[0]).toMatchObject({
      pairId: 'opaque-pair',
      sourceInputTreeIndex: 10,
      targetInputTreeIndex: 11,
      signature: '1,4',
      splitIndices: [1, 4],
      pivotEdge: [3, 9],
      sourceAttachment: [7, 8],
      destinationAttachment: [5, 6],
      rfDistance: 0.7,
      weightedRfDistance: 7,
    });
    expect({ unsortedPairs, unsortedTemporalEvents }).toEqual(originalPayload);
  });

  it('builds per-pair SPR activity from the same event ledger', () => {
    const rows = calculateSprPairActivity(pairs, analyticsOptions);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      pairId: 'pair_0_1',
      pairIndex: 0,
      sourceInputTreeIndex: 0,
      targetInputTreeIndex: 1,
      interpolationRange: [0, 10],
      rfDistance: 0.25,
      weightedRfDistance: 1.25,
      uniqueMovedSubtreeCount: 2,
      singleTaxonMoveEventCount: 2,
      multiTaxonMoveEventCount: 1,
      transitionEventCount: 2,
      sprMoveEventCount: 3,
      totalPathHops: 6,
      averagePathHops: 2,
      totalPathLength: 1.35,
      averagePathLength: 0.45,
    });
    expect(rows[0]).not.toHaveProperty('pairKey');
    expect(rows[0].events).toHaveLength(3);
    expect(rows[0].topMovedSubtree).toMatchObject({
      signature: '1',
      splitIndices: [1],
      count: 2,
      percentage: 66.66666666666666,
      totalPathHops: 5,
      averagePathHops: 2.5,
      totalPathLength: 0.85,
      averagePathLength: 0.425,
    });
    expect(rows[1]).toMatchObject({
      pairId: 'pair_1_2',
      pairIndex: 1,
      uniqueMovedSubtreeCount: 1,
      transitionEventCount: 1,
      sprMoveEventCount: 1,
      totalPathHops: 4,
      averagePathHops: 4,
      totalPathLength: 1.2,
      averagePathLength: 1.2,
    });
  });

  it('builds a full analytics model from one canonical event ledger', () => {
    const model = buildSprAnalyticsModel(pairs, analyticsOptions);

    expect(model.eventRows).toHaveLength(4);
    expect(model.movedSubtreeRecurrences[0]).toMatchObject({
      signature: '1',
      rank: 1,
      count: 2,
      percentage: 50,
      representativeSourceInputTreeIndex: 0,
      representativeTargetInputTreeIndex: 1,
      representativeFrameRange: [1, 5],
    });
    expect(
      model.movedSubtreeRecurrences.map(({ signature, count, rank }) => ({
        signature,
        count,
        rank,
      }))
    ).toEqual([
      { signature: '1', count: 2, rank: 1 },
      { signature: '2,3', count: 1, rank: 2 },
      { signature: '4,5,6', count: 1, rank: 2 },
    ]);
    expect(model.pairActivityRows[0].events[0]).toBe(model.eventRows[0]);
    expect(model.summary).toMatchObject({
      pairCount: 2,
      activePairCount: 2,
      sprMoveEventCount: 4,
      uniqueMovedSubtreeCount: 3,
    });
  });

  it('attaches exact moved-subtree topology and Newick to event and recurrence rows', () => {
    const model = buildSprAnalyticsModel(pairs, {
      ...analyticsOptions,
      interpolatedTrees: topologyTrees,
    });

    expect(model.eventRows[1]).toMatchObject({
      signature: '2,3',
      sourceMovedSubtreeNewick: '(C:1,D:1)source23:0.2;',
      destinationMovedSubtreeNewick: '(D:1,C:1)target23:0.4;',
    });
    expect(model.eventRows[1].sourceMovedSubtreeTopology.topologySignature).toBe('(2,3)');
    expect(model.eventRows[1].destinationMovedSubtreeTopology.topologySignature).toBe('(2,3)');
    expect(
      model.eventRows[1].sourceMovedSubtreeTopology.root.children.map((child) => child.name)
    ).toEqual(['C', 'D']);
    expect(model.movedSubtreeRecurrences.find((item) => item.signature === '2,3')).toMatchObject({
      sourceTopologyVariantCount: 1,
      destinationTopologyVariantCount: 1,
      topologyVariantCount: 1,
      sourceMovedSubtreeNewick: '(C:1,D:1)source23:0.2;',
      destinationMovedSubtreeNewick: '(D:1,C:1)target23:0.4;',
    });
  });

  it('carries the resolved parent branch value label into recurrence rows', () => {
    const branchSupportIndex = {
      getSupport: () => null,
      getBranchValue: () => null,
      getNearestParentBranchValue(inputTreeIndex, splitIndices) {
        if (inputTreeIndex !== 0 || splitIndices.join(',') !== '1') return null;
        return {
          key: 'support.bootstrap.value',
          label: 'Bootstrap',
          value: 72.5,
          displayValue: '72.5',
          role: 'branch_support',
        };
      },
    };

    const recurrences = calculateSprMovedSubtreeRecurrences([pairs[0]], {
      temporalEvents: [temporalEvents[3]],
      pairMetrics: { rows: [pairMetrics.rows[0]], semantics: {} },
      branchSupportIndex,
    });

    expect(recurrences[0]).toMatchObject({
      signature: '1',
      parentBranchValueLabel: 'Bootstrap',
      sourceParentBranchValueMedian: 72.5,
    });
  });

  it('reports malformed SPR events without a pivot edge before resolving attachments', () => {
    const malformedEvents = [
      {
        ...temporalEvents[3],
        pivot_edge: [],
      },
    ];

    expect(() =>
      buildSprMoveEventRows([pairs[0]], {
        temporalEvents: malformedEvents,
        pairMetrics: { rows: [pairMetrics.rows[0]], semantics: {} },
      })
    ).toThrow(/must include a non-empty pivot_edge/);
  });

  it('reports SPR events whose attachment context cannot be resolved', () => {
    const malformedEvents = [
      {
        ...temporalEvents[3],
        pivot_edge: [999],
      },
    ];

    expect(() =>
      buildSprMoveEventRows([pairs[0]], {
        temporalEvents: malformedEvents,
        pairMetrics: { rows: [pairMetrics.rows[0]], semantics: {} },
      })
    ).toThrow(/could not resolve attachment context/);
  });

  it('keeps backend highlight context separate from the physical moved subtree', () => {
    const groupedPairs = [
      {
        ...pairs[0],
        solution: {
          affected_subtrees_by_split: {
            '[9]': [[[1], [2]]],
          },
          attachment_edges_by_split: {
            '[9]': {
              '[1]': {
                source: [1, 7],
                destination: [1, 9],
              },
              '[2]': {
                source: [2, 8],
                destination: [2, 10],
              },
            },
          },
        },
      },
    ];
    const groupedEvents = [
      {
        ...temporalEvents[3],
        highlight_group: [[1], [2]],
        collapse_hops: 1,
        expand_hops: 2,
        total_hops: 3,
        collapse_branch_length: 0.1,
        expand_branch_length: 0.4,
        total_branch_length: 0.5,
      },
    ];

    const events = buildSprMoveEventRows(groupedPairs, {
      temporalEvents: groupedEvents,
      pairMetrics: { rows: [pairMetrics.rows[0]], semantics: {} },
    });
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

    const recurrences = calculateSprMovedSubtreeRecurrences(groupedPairs, {
      temporalEvents: groupedEvents,
      pairMetrics: { rows: [pairMetrics.rows[0]], semantics: {} },
    });
    expect(recurrences[0]).toMatchObject({
      signature: '1',
      splitIndices: [1],
      driverSplitIndices: [1],
      contextSplitIndices: [1, 2],
      highlightGroup: [[1], [2]],
      groupSize: 2,
      totalPathHops: 3,
      totalPathLength: 0.5,
    });
    expect(recurrences.find((item) => item.signature === '1,2')).toBeUndefined();
  });

  it('aggregates path travel and dataset-level activity by moved subtree', () => {
    const recurrences = calculateSprMovedSubtreeRecurrences(pairs, analyticsOptions);
    const summary = calculateSprDatasetSummary(pairs, analyticsOptions);

    expect(recurrences[0]).toMatchObject({
      signature: '1',
      rank: 1,
      count: 2,
      totalPathHops: 5,
      averagePathHops: 2.5,
      totalPathLength: 0.85,
      averagePathLength: 0.425,
      pairCount: 1,
      pairIds: ['pair_0_1'],
    });
    expect(summary).toMatchObject({
      pairCount: 2,
      activePairCount: 2,
      transitionEventCount: 3,
      uniqueMovedSubtreeCount: 3,
      singleTaxonMoveEventCount: 2,
      multiTaxonMoveEventCount: 2,
      topMovedSubtreeSharePercentage: 50,
      sprMoveEventCount: 4,
      totalPathHops: 10,
      averagePathHops: 2.5,
      totalPathLength: 2.55,
      averagePathLength: 0.6375,
    });
    expect(summary).not.toHaveProperty('farthestMover');
    expect(summary.farthestMovedSubtree).toMatchObject({
      signature: '4,5,6',
      splitIndices: [4, 5, 6],
      count: 1,
      totalPathHops: 4,
      totalPathLength: 1.2,
    });
  });

  it('does not infer SPR analytics rows from pair solutions without spr_move temporal events', () => {
    const rows = calculateSprPairActivity(pairs, {
      temporalEvents: temporalEvents.filter((event) => event.event_type === 'split_change'),
      pairMetrics,
    });
    const events = buildSprMoveEventRows(pairs, {
      temporalEvents: temporalEvents.filter((event) => event.event_type === 'split_change'),
      pairMetrics,
    });
    const summary = calculateSprDatasetSummary(pairs, {
      temporalEvents: temporalEvents.filter((event) => event.event_type === 'split_change'),
      pairMetrics,
    });
    const recurrences = calculateSprMovedSubtreeRecurrences(pairs, {
      temporalEvents: temporalEvents.filter((event) => event.event_type === 'split_change'),
      pairMetrics,
    });

    expect(events).toHaveLength(0);
    expect(recurrences).toHaveLength(0);
    expect(rows[0]).toMatchObject({
      uniqueMovedSubtreeCount: 0,
      sprMoveEventCount: 0,
      totalPathHops: 0,
      averagePathHops: 0,
      totalPathLength: 0,
      averagePathLength: 0,
    });
    expect(summary).toMatchObject({
      pairCount: 2,
      activePairCount: 0,
      uniqueMovedSubtreeCount: 0,
      sprMoveEventCount: 0,
      totalPathHops: 0,
      averagePathHops: 0,
      totalPathLength: 0,
      averagePathLength: 0,
    });
  });

  it('formats pair activity rows for the SPR activity timeline', () => {
    const rows = calculateSprPairActivity(pairs, analyticsOptions);

    expect(buildSprActivityTimelinePoints(rows)).toEqual([
      {
        pairIndex: 0,
        pairId: 'pair_0_1',
        pairLabel: 'Source tree 1 -> Target tree 2',
        sprMoveEvents: 3,
        uniqueMovedSubtrees: 2,
        singleTaxonMoveEventCount: 2,
        multiTaxonMoveEventCount: 1,
        topMovedSubtreeSignature: '1',
      },
      {
        pairIndex: 1,
        pairId: 'pair_1_2',
        pairLabel: 'Source tree 2 -> Target tree 3',
        sprMoveEvents: 1,
        uniqueMovedSubtrees: 1,
        singleTaxonMoveEventCount: 0,
        multiTaxonMoveEventCount: 1,
        topMovedSubtreeSignature: '4,5,6',
      },
    ]);
  });
});
