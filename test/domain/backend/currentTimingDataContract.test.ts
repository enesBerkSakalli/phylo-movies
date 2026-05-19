import { describe, expect, it } from 'vitest';
import { validatePhyloMovieData } from '../../../src/domain/backend/phyloMovieSchema';
import { TimelineDataProcessor } from '../../../src/timeline/data/TimelineDataProcessor.js';

const tree = {
  name: 'root',
  length: 0,
  split_indices: [0, 1],
  children: [
    { name: 'LBPenguin', length: 1, split_indices: [0], children: [] },
    { name: 'oystercatcher', length: 1, split_indices: [1], children: [] },
  ],
};

function makeCurrentTimingPayload() {
  return {
    interpolated_trees: [tree, tree, tree, tree],
    tree_metadata: [
      {
        tree_pair_key: null,
        step_in_pair: null,
        source_tree_global_index: null,
        frame_type: 'input_tree',
        state_semantics: 'processed_input_tree',
        is_observed_input: true,
      },
      {
        tree_pair_key: 'pair_7_8',
        step_in_pair: 1,
        source_tree_global_index: 0,
        frame_type: 'interpolation_frame',
        state_semantics: 'algorithmic_intermediate',
        is_observed_input: false,
      },
      {
        tree_pair_key: 'pair_7_8',
        step_in_pair: 2,
        source_tree_global_index: 0,
        frame_type: 'interpolation_frame',
        state_semantics: 'algorithmic_intermediate',
        is_observed_input: false,
      },
      {
        tree_pair_key: null,
        step_in_pair: null,
        source_tree_global_index: null,
        frame_type: 'input_tree',
        state_semantics: 'processed_input_tree',
        is_observed_input: true,
      },
    ],
    distances: {
      robinson_foulds: [1],
      weighted_robinson_foulds: [1],
    },
    tree_pair_solutions: {
      pair_7_8: {
        affected_subtrees_by_split: {
          '[0, 1]': [[[0], [1]]],
        },
        attachment_edges_by_split: {},
        spr_move_events: [{
          pivot_edge: [0, 1],
          driver_subtree: [0],
          highlight_group: [[0]],
          step_range: [0, 0],
          collapse_path: [],
          expand_path: [],
          collapse_hops: 0,
          expand_hops: 0,
          total_hops: 0,
          collapse_branch_length: 0,
          expand_branch_length: 0,
          total_branch_length: 0,
        }],
      },
    },
    pair_interpolation_ranges: [[0, 3]],
    pivot_edge_tracking: [null, [0, 1], [0, 1], null],
    subtree_highlight_tracking: [null, [[0]], [[1]], null],
    sorted_leaves: ['LBPenguin', 'oystercatcher'],
    msa: {
      sequences: null,
      window_size: 1,
      step_size: 1,
    },
    file_name: 'current-contract.nwk',
    split_change_timeline: [
      { type: 'original', tree_index: 7, global_index: 0, name: 'Input Tree 8' },
      {
        type: 'split_event',
        pair_key: 'pair_7_8',
        split: [0, 1],
        step_range_local: [0, 1],
        step_range_global: [1, 2],
      },
      { type: 'original', tree_index: 8, global_index: 3, name: 'Input Tree 9' },
    ],
  };
}

describe('current backend timing data contract', () => {
  it('builds mover timing from validated current spr_move_events data', () => {
    const movieData = validatePhyloMovieData(makeCurrentTimingPayload());
    const event = movieData.tree_pair_solutions.pair_7_8.spr_move_events?.[0];

    expect(event).toMatchObject({
      pivot_edge: [0, 1],
      driver_subtree: [0],
      highlight_group: [[0]],
      step_range: [0, 0],
    });
    expect(event).not.toHaveProperty('moving_taxa');

    const segments = TimelineDataProcessor.createSegments(movieData);
    const transition = segments.find(segment => segment.treePairKey === 'pair_7_8' && !segment.isFullTree);

    expect(transition?.timing).toEqual([
      { type: 'motion', fromIndex: 0, toIndex: 1, durationMs: 1000 },
      { type: 'hold', holdIndex: 1, holdKind: 'mover', durationMs: 200 },
      { type: 'motion', fromIndex: 1, toIndex: 2, durationMs: 1000 },
      { type: 'hold', holdIndex: 2, holdKind: 'pivot', durationMs: 900 },
    ]);
  });
});
