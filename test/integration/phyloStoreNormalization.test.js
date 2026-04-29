import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../src/state/phyloStore/store.js';

const tree0 = { name: '', length: 0, split_indices: [0, 1], children: [] };
const tree1 = { name: '', length: 0, split_indices: [0, 1], children: [] };
const tree2 = { name: '', length: 0, split_indices: [0, 1], children: [] };

function makeMovieData() {
  return {
    interpolated_trees: [tree0, tree1, tree2],
    tree_metadata: [
      { tree_pair_key: null, step_in_pair: null, source_tree_global_index: null },
      { tree_pair_key: 'pair_0_2', step_in_pair: 1, source_tree_global_index: 0 },
      { tree_pair_key: null, step_in_pair: null, source_tree_global_index: null },
    ],
    distances: {
      robinson_foulds: [1],
      weighted_robinson_foulds: [1],
    },
    tree_pair_solutions: {
      pair_0_2: {
        jumping_subtree_solutions: {},
      },
    },
    pair_interpolation_ranges: [[0, 2]],
    split_change_events: {
      pair_0_2: [{ split: [0], step_range: [1, 1] }],
    },
    split_change_timeline: [
      { type: 'original', global_index: 0, tree_index: 0, name: 'Anchor tree 1' },
      {
        type: 'split_event',
        pair_key: 'pair_0_2',
        split: [0],
        step_range_global: [1, 1],
        step_range_local: [1, 1],
      },
      { type: 'original', global_index: 2, tree_index: 1, name: 'Anchor tree 2' },
    ],
    pivot_edge_tracking: [null, [0], null],
    subtree_tracking: [null, [[1]], null],
    sorted_leaves: ['taxon-a', 'taxon-b'],
    msa: {
      sequences: null,
      window_size: 1,
      step_size: 1,
    },
    file_name: 'normalization-test.json',
  };
}

describe('phylo store dataset normalization', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback) => setTimeout(callback, 0));
    vi.stubGlobal('cancelAnimationFrame', (id) => clearTimeout(id));
  });

  afterEach(() => {
    useAppStore.getState().reset();
    vi.unstubAllGlobals();
  });

  it('stores derived tree lookup data once during dataset initialization', () => {
    const movieData = makeMovieData();

    useAppStore.getState().initialize(movieData);

    const state = useAppStore.getState();
    expect(state.treeList).toBe(movieData.interpolated_trees);
    expect(state.treeMetadata).toBe(movieData.tree_metadata);
    expect(state.leafNamesByIndex).toEqual(['taxon-a', 'taxon-b']);
    expect(state.movieData.sorted_leaves).toBeUndefined();
    expect(state.fullTreeIndices).toEqual([0, 2]);
    expect(state.pairInterpolationRanges).toEqual([[0, 2]]);
    expect(state.treeIndexByPair).toEqual({ pair_0_2: [1] });
  });

  it('returns explicit tree context for original and interpolated tree indices', () => {
    useAppStore.getState().initialize(makeMovieData());

    const originalContext = useAppStore.getState().getTreeContext(0);
    const interpolatedContext = useAppStore.getState().getTreeContext(1);

    expect(originalContext).toMatchObject({
      treeIndex: 0,
      tree: tree0,
      pairKey: null,
      isOriginal: true,
      isFullTree: true,
    });
    expect(interpolatedContext).toMatchObject({
      treeIndex: 1,
      tree: tree1,
      pairKey: 'pair_0_2',
      isOriginal: false,
      isFullTree: false,
    });
  });
});
