import { describe, expect, it } from 'vitest';
import TransitionIndexResolver from '../../../src/domain/indexing/TransitionIndexResolver.js';
import { resolveAnchorIndex } from '../../../src/components/TreeStatsPanel/Shared/utils.ts';

describe('source tree index semantics', () => {
  it('returns the source global tree index from backend metadata', () => {
    const resolver = new TransitionIndexResolver([
      { tree_pair_key: null, step_in_pair: null, source_tree_global_index: null },
      { tree_pair_key: 'pair_0_5', step_in_pair: 1, source_tree_global_index: 0 },
      { tree_pair_key: 'pair_0_5', step_in_pair: 2, source_tree_global_index: 0 },
      { tree_pair_key: null, step_in_pair: null, source_tree_global_index: null },
      { tree_pair_key: 'pair_5_8', step_in_pair: 1, source_tree_global_index: 3 },
      { tree_pair_key: null, step_in_pair: null, source_tree_global_index: null },
    ], null, null, [[0, 3], [3, 5]]);

    expect(resolver.getSourceGlobalIndex(2)).toBe(0);
    expect(resolver.getSourceGlobalIndex(4)).toBe(3);
  });

  it('does not remap a source global index through fullTreeIndices again', () => {
    const resolver = {
      getSourceGlobalIndex: () => 3,
    };

    expect(resolveAnchorIndex(4, [0, 3, 5], resolver, 6)).toBe(3);
  });
});
