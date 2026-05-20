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
    frames: [
      {
        frame_index: 0,
        frame_type: 'input_tree',
        state_semantics: 'processed_input_tree',
        is_observed_input: true,
        input_tree_index: 0,
        pair_id: null,
        pair_ordinal: null,
        local_step_index: null,
        source_frame_index: null,
        target_frame_index: null,
      },
      {
        frame_index: 1,
        frame_type: 'interpolation_frame',
        state_semantics: 'algorithmic_intermediate',
        is_observed_input: false,
        input_tree_index: null,
        pair_id: 'pair_7_8',
        pair_ordinal: 0,
        local_step_index: 0,
        source_frame_index: 0,
        target_frame_index: 3,
      },
      {
        frame_index: 2,
        frame_type: 'interpolation_frame',
        state_semantics: 'algorithmic_intermediate',
        is_observed_input: false,
        input_tree_index: null,
        pair_id: 'pair_7_8',
        pair_ordinal: 0,
        local_step_index: 1,
        source_frame_index: 0,
        target_frame_index: 3,
      },
      {
        frame_index: 3,
        frame_type: 'input_tree',
        state_semantics: 'processed_input_tree',
        is_observed_input: true,
        input_tree_index: 1,
        pair_id: null,
        pair_ordinal: null,
        local_step_index: null,
        source_frame_index: null,
        target_frame_index: null,
      },
    ],
    pairs: [
      {
        pair_id: 'pair_7_8',
        pair_ordinal: 0,
        source_input_tree_index: 0,
        target_input_tree_index: 1,
        source_frame_index: 0,
        target_frame_index: 3,
        generated_frame_range: [1, 2],
        solution: {
          affected_subtrees_by_split: {
            '[0, 1]': [[[0], [1]]],
          },
          attachment_edges_by_split: {
            '[0, 1]': {
              '[0]': {
                source: [0, 1],
                destination: [0, 1],
              },
            },
          },
        },
      },
    ],
    temporal_events: [
      {
        event_id: 'pair_7_8:split:0',
        event_type: 'split_change',
        pair_id: 'pair_7_8',
        pair_ordinal: 0,
        local_step_range: [0, 1],
        frame_range: [1, 2],
        split: [0, 1],
      },
      {
        event_id: 'pair_7_8:spr:0',
        event_type: 'spr_move',
        pair_id: 'pair_7_8',
        pair_ordinal: 0,
        local_step_range: [0, 0],
        frame_range: [1, 1],
        pivot_edge: [0, 1],
        driver_subtree: [0],
        highlight_group: [[0]],
        collapse_path: [],
        expand_path: [],
        collapse_hops: 0,
        expand_hops: 0,
        total_hops: 0,
        collapse_branch_length: 0,
        expand_branch_length: 0,
        total_branch_length: 0,
      },
    ],
    pivot_edge_tracking: [null, [0, 1], [0, 1], null],
    subtree_highlight_tracking: [null, [[0]], [[1]], null],
    pair_metrics: {
      rows: [{
        pair_id: 'pair_7_8',
        pair_ordinal: 0,
        robinson_foulds: 1,
        weighted_robinson_foulds: 1,
      }],
      semantics: {},
    },
    msa: {
      sequences: null,
      window_size: 1,
      step_size: 1,
    },
    file_name: 'current-contract.nwk',
  };
}

describe('current backend timing data contract', () => {
  it('builds mover timing from normalized temporal spr_move events', () => {
    const movieData = validatePhyloMovieData(makeCurrentTimingPayload());
    const event = movieData.temporal_events.find((entry) => entry.event_type === 'spr_move');

    expect(event).toMatchObject({
      event_type: 'spr_move',
      pivot_edge: [0, 1],
      driver_subtree: [0],
      highlight_group: [[0]],
      local_step_range: [0, 0],
    });
    expect(event).not.toHaveProperty('moving_taxa');

    const segments = TimelineDataProcessor.createSegments(movieData);
    const transition = segments.find(segment => segment.pairId === 'pair_7_8' && !segment.isInputTreeSegment);

    expect(transition?.timing).toEqual([
      { type: 'motion', fromIndex: 0, toIndex: 1, durationMs: 1000 },
      { type: 'hold', holdIndex: 1, holdKind: 'mover', durationMs: 200 },
      { type: 'motion', fromIndex: 1, toIndex: 2, durationMs: 1000 },
      { type: 'hold', holdIndex: 2, holdKind: 'pivot', durationMs: 900 },
    ]);
  });
});
