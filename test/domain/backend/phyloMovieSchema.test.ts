import { describe, expect, it } from 'vitest';
import { validatePhyloMovieData } from '../../../src/domain/backend/phyloMovieSchema';

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

function makePayload(overrides: Record<string, unknown> = {}) {
  return {
    interpolated_trees: [minimalTree],
    tree_metadata: [{
      tree_pair_key: null,
      step_in_pair: null,
      source_tree_global_index: null,
    }],
    distances: {
      robinson_foulds: [],
      weighted_robinson_foulds: [],
    },
    tree_pair_solutions: {
      pair_0_1: {
        jumping_subtree_solutions: {
          '[0, 1]': [[[2], [3, 4]]],
        },
        solution_to_source_map: {},
        solution_to_destination_map: {},
        split_change_events: [{
          split: [0, 1],
          step_range: [0, 0],
        }],
      },
    },
    pair_interpolation_ranges: [[0, 0]],
    pivot_edge_tracking: [null],
    subtree_tracking: [null],
    sorted_leaves: ['taxon-a', 'taxon-b'],
    msa: {
      sequences: {
        'taxon-a': 'ACGT',
      },
      window_size: 4,
      step_size: 1,
    },
    file_name: 'example.nwk',
    split_change_events: {
      pair_0_1: [{
        split: [0, 1],
        step_range: [0, 0],
      }],
    },
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

  it('does not keep metadata fields outside the app contract', () => {
    const result = validatePhyloMovieData(makePayload({
      tree_metadata: [{
        tree_pair_key: 'pair_0_1',
        step_in_pair: 2,
        source_tree_global_index: 0,
        unused_extra_field: 'ignored',
      }],
    }));

    expect(result.tree_metadata[0]).toEqual({
      tree_pair_key: 'pair_0_1',
      step_in_pair: 2,
      source_tree_global_index: 0,
    });
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

  it('keeps validated tree nodes in the current backend topology shape', () => {
    const result = validatePhyloMovieData(makePayload({
      interpolated_trees: [{
        ...minimalTree,
        values: { legacy: true },
      }],
    }));

    expect(result.interpolated_trees[0]).toEqual(minimalTree);
  });

  it('rejects split_change_tracking without pivot_edge_tracking', () => {
    const payload = makePayload({
      pivot_edge_tracking: undefined,
      split_change_tracking: [null],
    });

    expect(() => validatePhyloMovieData(payload)).toThrow(/pivot_edge_tracking must be an array/);
  });

  it('rejects flat subtree_tracking entries', () => {
    expect(() => validatePhyloMovieData(makePayload({
      subtree_tracking: [[2, 3]],
    }))).toThrow(/subtree_tracking\[0\]\[0\] must be an array/);
  });

  it('rejects tracking data whose length does not match interpolated_trees', () => {
    expect(() => validatePhyloMovieData(makePayload({
      pivot_edge_tracking: [null, [0, 1]],
    }))).toThrow(/pivot_edge_tracking length \(2\) must match interpolated_trees length \(1\)/);

    expect(() => validatePhyloMovieData(makePayload({
      subtree_tracking: [null, [[0]]],
    }))).toThrow(/subtree_tracking length \(2\) must match interpolated_trees length \(1\)/);
  });

  it('rejects flat jumping_subtree_solutions entries', () => {
    expect(() => validatePhyloMovieData(makePayload({
      tree_pair_solutions: {
        pair_0_1: {
          jumping_subtree_solutions: {
            '[0, 1]': [[2, 3]],
          },
          solution_to_source_map: {},
          solution_to_destination_map: {},
          split_change_events: [],
        },
      },
    }))).toThrow(/jumping_subtree_solutions/);
  });

  it('rejects top-level split_change_events that are not keyed by pair', () => {
    expect(() => validatePhyloMovieData(makePayload({
      split_change_events: [],
    }))).toThrow(/split_change_events must be an object/);
  });

  it('rejects malformed split_change_events entries', () => {
    expect(() => validatePhyloMovieData(makePayload({
      split_change_events: {
        pair_0_1: [{
          split: [0, 1],
          step_range: [0],
        }],
      },
    }))).toThrow(/split_change_events\.pair_0_1\[0\]\.step_range must be \[number, number\]/);
  });

  it('validates split_change_timeline against anchor-inclusive pair ranges', () => {
    const result = validatePhyloMovieData(makePayload({
      interpolated_trees: [minimalTree, minimalTree, minimalTree],
      tree_metadata: [
        {
          tree_pair_key: null,
          step_in_pair: null,
          source_tree_global_index: null,
        },
        {
          tree_pair_key: 'pair_0_1',
          step_in_pair: 1,
          source_tree_global_index: 0,
        },
        {
          tree_pair_key: null,
          step_in_pair: null,
          source_tree_global_index: null,
        },
      ],
      pair_interpolation_ranges: [[0, 2]],
      pivot_edge_tracking: [null, [0, 1], null],
      subtree_tracking: [null, [[0]], null],
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

  it('rejects split_change_timeline gaps in transition coverage', () => {
    expect(() => validatePhyloMovieData(makePayload({
      interpolated_trees: [minimalTree, minimalTree, minimalTree],
      tree_metadata: [
        {
          tree_pair_key: null,
          step_in_pair: null,
          source_tree_global_index: null,
        },
        {
          tree_pair_key: 'pair_0_1',
          step_in_pair: 1,
          source_tree_global_index: 0,
        },
        {
          tree_pair_key: null,
          step_in_pair: null,
          source_tree_global_index: null,
        },
      ],
      pair_interpolation_ranges: [[0, 2]],
      pivot_edge_tracking: [null, [0, 1], null],
      subtree_tracking: [null, [[0]], null],
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
        {
          tree_pair_key: null,
          step_in_pair: null,
          source_tree_global_index: null,
        },
        {
          tree_pair_key: 'pair_0_1',
          step_in_pair: 1,
          source_tree_global_index: 0,
        },
        {
          tree_pair_key: 'pair_0_1',
          step_in_pair: 2,
          source_tree_global_index: 0,
        },
        {
          tree_pair_key: null,
          step_in_pair: null,
          source_tree_global_index: null,
        },
      ],
      pair_interpolation_ranges: [[0, 3]],
      pivot_edge_tracking: [null, [0, 1], [0, 1], null],
      subtree_tracking: [null, [[0]], [[0]], null],
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
