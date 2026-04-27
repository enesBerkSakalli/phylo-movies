import { describe, expect, it } from 'vitest';
import { validatePhyloMovieData } from '../../../src/domain/backend/phyloMovieSchema';

const minimalTree = {
  name: 'root',
  length: 0,
  split_indices: [0],
  children: [],
};

function makePayload(overrides: Record<string, unknown> = {}) {
  return {
    interpolated_trees: [minimalTree],
    tree_metadata: [{
      global_tree_index: 0,
      tree_pair_key: null,
      step_in_pair: null,
      reference_pair_tree_index: null,
      target_pair_tree_index: null,
      source_tree_global_index: 0,
      target_tree_global_index: null,
      is_full_tree: true,
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
        split_change_events: [],
      },
    },
    pair_interpolation_ranges: [[0, 0]],
    pivot_edge_tracking: [null, [0, 1]],
    subtree_tracking: [null, [[2], [3, 4]]],
    sorted_leaves: ['taxon-a'],
    msa: {
      sequences: {
        'taxon-a': 'ACGT',
      },
      window_size: 4,
      step_size: 1,
    },
    file_name: 'example.nwk',
    ...overrides,
  };
}

describe('validatePhyloMovieData', () => {
  it('accepts a valid backend movie payload', () => {
    const result = validatePhyloMovieData(makePayload());

    expect(result.interpolated_trees).toHaveLength(1);
    expect(result.tree_metadata).toHaveLength(1);
    expect(result.file_name).toBe('example.nwk');
    expect(result.msa?.sequences?.['taxon-a']).toBe('ACGT');
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

  it('rejects split_change_tracking without pivot_edge_tracking', () => {
    const payload = makePayload({
      pivot_edge_tracking: undefined,
      split_change_tracking: [null, [1, 2]],
    });

    expect(() => validatePhyloMovieData(payload)).toThrow(/pivot_edge_tracking must be an array/);
  });

  it('rejects flat subtree_tracking entries', () => {
    expect(() => validatePhyloMovieData(makePayload({
      subtree_tracking: [null, [2, 3]],
    }))).toThrow(/subtree_tracking\[1\]\[0\] must be an array/);
  });

  it('rejects flat jumping_subtree_solutions entries', () => {
    expect(() => validatePhyloMovieData(makePayload({
      tree_pair_solutions: {
        pair_0_1: {
          jumping_subtree_solutions: {
            '[0, 1]': [[2, 3]],
          },
        },
      },
    }))).toThrow(/jumping_subtree_solutions/);
  });
});
