import { describe, expect, it } from 'vitest';
import { validatePhyloMovieData } from '../../../src/domain/backend/phyloMovieSchema';
import { phyloData } from '../../../src/services/data/dataService';

const minimalTree = {
  name: 'root',
  length: 0,
  split_indices: [0, 1],
  children: [
    {
      name: 'taxon-a',
      length: 1,
      split_indices: [0],
      children: [],
    },
    {
      name: 'taxon-b',
      length: 1,
      split_indices: [1],
      children: [],
    },
  ],
};

function inputTreeMetadata() {
  return {
    tree_pair_key: null,
    step_in_pair: null,
    source_tree_global_index: null,
    frame_type: 'input_tree',
    state_semantics: 'processed_input_tree',
    is_observed_input: true,
  };
}

function interpolationFrameMetadata(
  treePairKey = 'pair_0_1',
  stepInPair = 1,
  sourceTreeGlobalIndex = 0
) {
  return {
    tree_pair_key: treePairKey,
    step_in_pair: stepInPair,
    source_tree_global_index: sourceTreeGlobalIndex,
    frame_type: 'interpolation_frame',
    state_semantics: 'algorithmic_intermediate',
    is_observed_input: false,
  };
}

function makePayload(overrides: Record<string, unknown> = {}) {
  return {
    interpolated_trees: [minimalTree],
    tree_metadata: [inputTreeMetadata()],
    distances: {
      robinson_foulds: [],
      weighted_robinson_foulds: [],
    },
    tree_pair_solutions: {
      pair_0_1: {
        affected_subtrees_by_split: {
          '[0, 1]': [[[2], [3, 4]]],
        },
        attachment_edges_by_split: {},
      },
    },
    pair_interpolation_ranges: [[0, 0]],
    pivot_edge_tracking: [null],
    subtree_highlight_tracking: [null],
    msa: {
      sequences: {
        'taxon-a': 'ACGT',
      },
      window_size: 4,
      step_size: 1,
    },
    file_name: 'example.nwk',
    split_change_timeline: [{
      type: 'original',
      tree_index: 0,
      global_index: 0,
      name: '',
    }],
    ...overrides,
  };
}

describe('validatePhyloMovieData', () => {
  it('accepts a valid backend movie payload', () => {
    const result = validatePhyloMovieData(makePayload());

    expect(result.interpolated_trees).toHaveLength(1);
    expect(result.tree_metadata).toHaveLength(1);
    expect(result.tree_metadata[0].source_tree_global_index).toBeNull();
    expect(result.file_name).toBe('example.nwk');
    expect(result.msa?.sequences?.['taxon-a']).toBe('ACGT');
  });

  it('validates the explicit backend movie contract through service validation', () => {
    const result = phyloData.validate(makePayload({
      subtree_highlight_tracking: [[[0]]],
    }));

    expect(result.subtree_highlight_tracking).toEqual([[[0]]]);
    expect(result).not.toHaveProperty('split_change_events');
  });

  it('rejects top-level fields outside the app contract', () => {
    expect(() => phyloData.validate(makePayload({
      pipeline_info: { model_used: 'iqtree' },
    }))).toThrow(/phyloMovieData\.pipeline_info is not part of the backend contract/);
  });

  it('rejects metadata fields outside the app contract', () => {
    expect(() => validatePhyloMovieData(makePayload({
      tree_metadata: [{
        tree_pair_key: 'pair_0_1',
        step_in_pair: 2,
        source_tree_global_index: 0,
        frame_type: 'interpolation_frame',
        state_semantics: 'algorithmic_intermediate',
        is_observed_input: false,
        unused_extra_field: 'ignored',
      }],
    }))).toThrow(/tree_metadata\[0\]\.unused_extra_field is not part of the backend contract/);
  });

  it('keeps explicit distance semantics in the app contract', () => {
    const result = validatePhyloMovieData(makePayload({
      distances: {
        robinson_foulds: [1],
        weighted_robinson_foulds: [1.5],
        semantics: {
          robinson_foulds: {
            topology: 'rooted_clades',
            normalization: 'symmetric_difference_over_union',
            scope: 'adjacent_processed_input_trees',
          },
          weighted_robinson_foulds: {
            topology: 'rooted_clades',
            includes_branch_lengths: true,
            includes_terminal_and_root_splits: true,
            scope: 'adjacent_processed_input_trees',
          },
        },
      },
      msa: {
        sequences: {
          'taxon-a': 'ACGT',
        },
        window_size: 4,
        step_size: 1,
      },
    }));

    expect(result.distances).toEqual({
      robinson_foulds: [1],
      weighted_robinson_foulds: [1.5],
      semantics: {
        robinson_foulds: {
          topology: 'rooted_clades',
          normalization: 'symmetric_difference_over_union',
          scope: 'adjacent_processed_input_trees',
        },
        weighted_robinson_foulds: {
          topology: 'rooted_clades',
          includes_branch_lengths: true,
          includes_terminal_and_root_splits: true,
          scope: 'adjacent_processed_input_trees',
        },
      },
    });
    expect(result.msa).toEqual({
      sequences: {
        'taxon-a': 'ACGT',
      },
      window_size: 4,
      step_size: 1,
    });
  });

  it('rejects distance and MSA fields outside the app contract', () => {
    expect(() => validatePhyloMovieData(makePayload({
      distances: {
        robinson_foulds: [1],
        weighted_robinson_foulds: [1.5],
        cosine_distance: [0.25],
      },
    }))).toThrow(/distances\.cosine_distance is not part of the backend contract/);

    expect(() => validatePhyloMovieData(makePayload({
      distances: {
        robinson_foulds: [1],
        weighted_robinson_foulds: [1.5],
        semantics: {
          robinson_foulds: {
            topology: 'rooted_clades',
            unused_metric_field: 'ignored',
          },
        },
      },
    }))).toThrow(/distances\.semantics\.robinson_foulds\.unused_metric_field is not part of the backend contract/);

    expect(() => validatePhyloMovieData(makePayload({
      msa: {
        sequences: null,
        window_size: 4,
        step_size: 1,
        alignment_length: 4,
      },
    }))).toThrow(/msa\.alignment_length is not part of the backend contract/);
  });

  it('requires positive integer MSA window dimensions', () => {
    expect(() => validatePhyloMovieData(makePayload({
      msa: {
        window_size: 4,
        step_size: 1,
      },
    }))).toThrow(/msa\.sequences must be an object or null/);

    expect(() => validatePhyloMovieData(makePayload({
      msa: {
        sequences: null,
        window_size: 0,
        step_size: 1,
      },
    }))).toThrow(/msa\.window_size must be positive/);

    expect(() => validatePhyloMovieData(makePayload({
      msa: {
        sequences: null,
        window_size: 1,
        step_size: 1.5,
      },
    }))).toThrow(/msa\.step_size must be an integer/);
  });

  it('rejects missing required fields', () => {
    const payload = makePayload();
    delete (payload as Record<string, unknown>).interpolated_trees;

    expect(() => validatePhyloMovieData(payload)).toThrow(/interpolated_trees must be an array/);
  });

  it('rejects wrong array field types', () => {
    expect(() => validatePhyloMovieData(makePayload({
      tree_metadata: {},
    }))).toThrow(/tree_metadata must be an array/);
  });

  it('rejects wrong object field types', () => {
    expect(() => validatePhyloMovieData(makePayload({
      distances: [],
    }))).toThrow(/distances must be an object/);
  });

  it('rejects tree metadata whose length does not match interpolated_trees', () => {
    expect(() => validatePhyloMovieData(makePayload({
      tree_metadata: [],
    }))).toThrow(/tree_metadata length \(0\) must match interpolated_trees length \(1\)/);
  });

  it('requires tree metadata indices to be integers', () => {
    expect(() => validatePhyloMovieData(makePayload({
      tree_metadata: [interpolationFrameMetadata('pair_0_1', 1.5, 0)],
    }))).toThrow(/tree_metadata\[0\]\.step_in_pair must be an integer/);

    expect(() => validatePhyloMovieData(makePayload({
      tree_metadata: [interpolationFrameMetadata('pair_0_1', 1, 0.5)],
    }))).toThrow(/tree_metadata\[0\]\.source_tree_global_index must be an integer/);
  });

  it('requires explicit tree metadata frame semantics', () => {
    expect(() => validatePhyloMovieData(makePayload({
      tree_metadata: [{
        tree_pair_key: null,
        step_in_pair: null,
        source_tree_global_index: null,
        state_semantics: 'processed_input_tree',
        is_observed_input: true,
      }],
    }))).toThrow(/tree_metadata\[0\]\.frame_type must be input_tree or interpolation_frame/);

    expect(() => validatePhyloMovieData(makePayload({
      tree_metadata: [{
        tree_pair_key: null,
        step_in_pair: null,
        source_tree_global_index: null,
        frame_type: 'input_tree',
        is_observed_input: true,
      }],
    }))).toThrow(/tree_metadata\[0\]\.state_semantics must be processed_input_tree or algorithmic_intermediate/);

    expect(() => validatePhyloMovieData(makePayload({
      tree_metadata: [{
        tree_pair_key: null,
        step_in_pair: null,
        source_tree_global_index: null,
        frame_type: 'input_tree',
        state_semantics: 'processed_input_tree',
      }],
    }))).toThrow(/tree_metadata\[0\]\.is_observed_input must be a boolean/);
  });

  it('rejects malformed recursive tree nodes', () => {
    expect(() => validatePhyloMovieData(makePayload({
      interpolated_trees: [{
        name: '',
        length: 0,
        split_indices: [0],
      }],
    }))).toThrow(/interpolated_trees\[0\]\.children must be an array/);
  });

  it('rejects tree nodes without stable split indices', () => {
    expect(() => validatePhyloMovieData(makePayload({
      interpolated_trees: [{
        name: '',
        length: 0,
        split_indices: [],
        children: [],
      }],
    }))).toThrow(/split_indices must not be empty/);
  });

  it('rejects tree node fields outside the app contract', () => {
    expect(() => validatePhyloMovieData(makePayload({
      interpolated_trees: [{
        ...minimalTree,
        values: { legacy: true },
      }],
    }))).toThrow(/interpolated_trees\[0\]\.values is not part of the backend contract/);
  });

  it('rejects split_change_tracking without pivot_edge_tracking', () => {
    const payload = makePayload({
      pivot_edge_tracking: undefined,
      split_change_tracking: [null],
    });

    expect(() => validatePhyloMovieData(payload)).toThrow(/phyloMovieData\.split_change_tracking is not part of the backend contract/);
  });

  it('rejects legacy subtree API payloads without the canonical highlight key', () => {
    const legacySubtreeApiKey = ['subtree', 'tracking'].join('_');
    const payload = makePayload({
      subtree_highlight_tracking: undefined,
      [legacySubtreeApiKey]: [null],
    });

    expect(() => validatePhyloMovieData(payload)).toThrow(/phyloMovieData\.subtree_tracking is not part of the backend contract/);
  });

  it('rejects flat subtree_highlight_tracking entries', () => {
    expect(() => validatePhyloMovieData(makePayload({
      subtree_highlight_tracking: [[2, 3]],
    }))).toThrow(/subtree_highlight_tracking\[0\]\[0\] must be an array/);
  });

  it('rejects tracking data whose length does not match interpolated_trees', () => {
    expect(() => validatePhyloMovieData(makePayload({
      pivot_edge_tracking: [null, [0, 1]],
    }))).toThrow(/pivot_edge_tracking length \(2\) must match interpolated_trees length \(1\)/);

    expect(() => validatePhyloMovieData(makePayload({
      subtree_highlight_tracking: [null, [[0]]],
    }))).toThrow(/subtree_highlight_tracking length \(2\) must match interpolated_trees length \(1\)/);
  });

  it('rejects missing explicit pair interpolation ranges', () => {
    expect(() => validatePhyloMovieData(makePayload({
      pair_interpolation_ranges: [],
    }))).toThrow(/pair_interpolation_ranges must not be empty/);
  });

  it('rejects flat affected_subtrees_by_split entries', () => {
    expect(() => validatePhyloMovieData(makePayload({
      tree_pair_solutions: {
        pair_0_1: {
          affected_subtrees_by_split: {
            '[0, 1]': [[2, 3]],
          },
          attachment_edges_by_split: {},
        },
      },
    }))).toThrow(/affected_subtrees_by_split/);
  });

  it('rejects noncanonical backend split-map keys', () => {
    expect(() => validatePhyloMovieData(makePayload({
      tree_pair_solutions: {
        pair_0_1: {
          affected_subtrees_by_split: {
            '[1,0]': [[[0]]],
          },
          attachment_edges_by_split: {},
        },
      },
    }))).toThrow(/canonical backend split key/);

    expect(() => validatePhyloMovieData(makePayload({
      tree_pair_solutions: {
        pair_0_1: {
          affected_subtrees_by_split: {
            '[0, 1]': [[[0]]],
          },
          attachment_edges_by_split: {
            '[0, 1]': {
              '[1,0]': {
                source: [1],
                destination: [2],
              },
            },
          },
        },
      },
    }))).toThrow(/canonical backend split key/);
  });

  it('requires affected_subtrees_by_split even when SPR move events are present', () => {
    expect(() => validatePhyloMovieData(makePayload({
      tree_pair_solutions: {
        pair_0_1: {
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
    }))).toThrow(/affected_subtrees_by_split must be an object/);
  });

  it('keeps SPR move path metrics on validated tree pair solutions', () => {
    const result = validatePhyloMovieData(makePayload({
      tree_pair_solutions: {
        pair_0_1: {
          affected_subtrees_by_split: {
            '[0, 1]': [[[0]]],
          },
          attachment_edges_by_split: {},
          spr_move_events: [{
            pivot_edge: [0, 1],
            driver_subtree: [0],
            highlight_group: [[0]],
            step_range: [0, 0],
            collapse_path: [{
              split: [0, 1],
              branch_length: 0.25,
            }],
            expand_path: [{
              split: [0],
              branch_length: 0.5,
            }],
            collapse_hops: 1,
            expand_hops: 2,
            total_hops: 3,
            collapse_branch_length: 0.25,
            expand_branch_length: 0.5,
            total_branch_length: 0.75,
          }],
        },
      },
    }));

    expect(result.tree_pair_solutions.pair_0_1.spr_move_events?.[0]).toMatchObject({
      driver_subtree: [0],
      highlight_group: [[0]],
      collapse_hops: 1,
      expand_hops: 2,
      total_hops: 3,
      total_branch_length: 0.75,
    });
  });

  it('rejects legacy SPR moving_subtree event fields', () => {
    expect(() => validatePhyloMovieData(makePayload({
      tree_pair_solutions: {
        pair_0_1: {
          affected_subtrees_by_split: {
            '[0, 1]': [[[0]]],
          },
          attachment_edges_by_split: {},
          spr_move_events: [{
            pivot_edge: [0, 1],
            moving_subtree: [0],
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
    }))).toThrow(/spr_move_events\[0\]\.moving_subtree is not part of the backend contract/);
  });

  it('rejects legacy SPR moving_subtree_group event fields', () => {
    expect(() => validatePhyloMovieData(makePayload({
      tree_pair_solutions: {
        pair_0_1: {
          affected_subtrees_by_split: {
            '[0, 1]': [[[0], [1]]],
          },
          attachment_edges_by_split: {},
          spr_move_events: [{
            pivot_edge: [0, 1],
            driver_subtree: [0],
            moving_subtree_group: [[0], [1]],
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
    }))).toThrow(/spr_move_events\[0\]\.moving_subtree_group is not part of the backend contract/);
  });

  it('validates split_change_timeline against input-tree-inclusive pair ranges', () => {
    const result = validatePhyloMovieData(makePayload({
      interpolated_trees: [minimalTree, minimalTree, minimalTree],
      tree_metadata: [
        inputTreeMetadata(),
        interpolationFrameMetadata(),
        inputTreeMetadata(),
      ],
      pair_interpolation_ranges: [[0, 2]],
      pivot_edge_tracking: [null, [0, 1], null],
      subtree_highlight_tracking: [null, [[0]], null],
      split_change_timeline: [
        {
          type: 'original',
          tree_index: 0,
          global_index: 0,
          name: '',
        },
        {
          type: 'split_event',
          pair_key: 'pair_0_1',
          split: [0, 1],
          step_range_local: [0, 0],
          step_range_global: [1, 1],
        },
        {
          type: 'original',
          tree_index: 1,
          global_index: 2,
          name: '',
        },
      ],
    }));

    expect(result.split_change_timeline).toHaveLength(3);
    expect(result.split_change_timeline[1]).toMatchObject({
      type: 'split_event',
      pair_key: 'pair_0_1',
      step_range_global: [1, 1],
    });
  });

  it('rejects split events whose pair key does not match adjacent original timeline entries', () => {
    expect(() => validatePhyloMovieData(makePayload({
      interpolated_trees: [minimalTree, minimalTree, minimalTree],
      tree_metadata: [
        inputTreeMetadata(),
        interpolationFrameMetadata('pair_7_8'),
        inputTreeMetadata(),
      ],
      tree_pair_solutions: {
        pair_7_8: {
          affected_subtrees_by_split: {
            '[0, 1]': [[[0], [1]]],
          },
          attachment_edges_by_split: {},
        },
      },
      pair_interpolation_ranges: [[0, 2]],
      pivot_edge_tracking: [null, [0, 1], null],
      subtree_highlight_tracking: [null, [[0]], null],
      split_change_timeline: [
        {
          type: 'original',
          tree_index: 0,
          global_index: 0,
          name: '',
        },
        {
          type: 'split_event',
          pair_key: 'pair_7_8',
          split: [0, 1],
          step_range_local: [0, 0],
          step_range_global: [1, 1],
        },
        {
          type: 'original',
          tree_index: 1,
          global_index: 2,
          name: '',
        },
      ],
    }))).toThrow(/pair_key must match adjacent original tree_index values/);
  });

  it('rejects original timeline entries whose tree_index order disagrees with global_index order', () => {
    expect(() => validatePhyloMovieData(makePayload({
      interpolated_trees: [minimalTree, minimalTree, minimalTree],
      tree_metadata: [
        inputTreeMetadata(),
        interpolationFrameMetadata(),
        inputTreeMetadata(),
      ],
      pair_interpolation_ranges: [[0, 2]],
      pivot_edge_tracking: [null, [0, 1], null],
      subtree_highlight_tracking: [null, [[0]], null],
      split_change_timeline: [
        {
          type: 'original',
          tree_index: 1,
          global_index: 0,
          name: '',
        },
        {
          type: 'split_event',
          pair_key: 'pair_0_1',
          split: [0, 1],
          step_range_local: [0, 0],
          step_range_global: [1, 1],
        },
        {
          type: 'original',
          tree_index: 0,
          global_index: 2,
          name: '',
        },
      ],
    }))).toThrow(/original entries must have increasing global_index when sorted by tree_index/);
  });

  it('rejects metadata source frame indices that do not point to input tree frames', () => {
    expect(() => validatePhyloMovieData(makePayload({
      interpolated_trees: [minimalTree, minimalTree, minimalTree],
      tree_metadata: [
        inputTreeMetadata(),
        interpolationFrameMetadata('pair_0_1', 1, 1),
        inputTreeMetadata(),
      ],
      pair_interpolation_ranges: [[0, 2]],
      pivot_edge_tracking: [null, [0, 1], null],
      subtree_highlight_tracking: [null, [[0]], null],
      split_change_timeline: [
        {
          type: 'original',
          tree_index: 0,
          global_index: 0,
          name: '',
        },
        {
          type: 'split_event',
          pair_key: 'pair_0_1',
          split: [0, 1],
          step_range_local: [0, 0],
          step_range_global: [1, 1],
        },
        {
          type: 'original',
          tree_index: 1,
          global_index: 2,
          name: '',
        },
      ],
    }))).toThrow(/source_tree_global_index must reference an input tree frame/);
  });

  it('rejects metadata pair keys that disagree with split event pair keys', () => {
    expect(() => validatePhyloMovieData(makePayload({
      interpolated_trees: [minimalTree, minimalTree, minimalTree],
      tree_metadata: [
        inputTreeMetadata(),
        interpolationFrameMetadata('pair_7_8'),
        inputTreeMetadata(),
      ],
      tree_pair_solutions: {
        pair_0_1: {
          affected_subtrees_by_split: {
            '[0, 1]': [[[0], [1]]],
          },
          attachment_edges_by_split: {},
        },
        pair_7_8: {
          affected_subtrees_by_split: {},
          attachment_edges_by_split: {},
        },
      },
      pair_interpolation_ranges: [[0, 2]],
      pivot_edge_tracking: [null, [0, 1], null],
      subtree_highlight_tracking: [null, [[0]], null],
      split_change_timeline: [
        {
          type: 'original',
          tree_index: 0,
          global_index: 0,
          name: '',
        },
        {
          type: 'split_event',
          pair_key: 'pair_0_1',
          split: [0, 1],
          step_range_local: [0, 0],
          step_range_global: [1, 1],
        },
        {
          type: 'original',
          tree_index: 1,
          global_index: 2,
          name: '',
        },
      ],
    }))).toThrow(/tree_metadata\[1\]\.tree_pair_key must match split_change_timeline pair_key/);
  });

  it('rejects split_change_timeline gaps in transition coverage', () => {
    expect(() => validatePhyloMovieData(makePayload({
      interpolated_trees: [minimalTree, minimalTree, minimalTree],
      tree_metadata: [
        inputTreeMetadata(),
        interpolationFrameMetadata(),
        inputTreeMetadata(),
      ],
      pair_interpolation_ranges: [[0, 2]],
      pivot_edge_tracking: [null, [0, 1], null],
      subtree_highlight_tracking: [null, [[0]], null],
      split_change_timeline: [
        {
          type: 'original',
          tree_index: 0,
          global_index: 0,
          name: '',
        },
        {
          type: 'original',
          tree_index: 1,
          global_index: 2,
          name: '',
        },
      ],
    }))).toThrow(/missing split event coverage for tree index 1/);
  });

  it('rejects overlapping split_change_timeline transition ranges', () => {
    expect(() => validatePhyloMovieData(makePayload({
      interpolated_trees: [minimalTree, minimalTree, minimalTree, minimalTree],
      tree_metadata: [
        inputTreeMetadata(),
        interpolationFrameMetadata(),
        interpolationFrameMetadata('pair_0_1', 2, 0),
        inputTreeMetadata(),
      ],
      pair_interpolation_ranges: [[0, 3]],
      pivot_edge_tracking: [null, [0, 1], [0, 1], null],
      subtree_highlight_tracking: [null, [[0]], [[0]], null],
      split_change_timeline: [
        {
          type: 'original',
          tree_index: 0,
          global_index: 0,
          name: '',
        },
        {
          type: 'split_event',
          pair_key: 'pair_0_1',
          split: [0, 1],
          step_range_local: [0, 1],
          step_range_global: [1, 2],
        },
        {
          type: 'split_event',
          pair_key: 'pair_0_1',
          split: [0, 1],
          step_range_local: [1, 1],
          step_range_global: [2, 2],
        },
        {
          type: 'original',
          tree_index: 1,
          global_index: 3,
          name: '',
        },
      ],
    }))).toThrow(/overlaps tree index 2/);
  });
});
