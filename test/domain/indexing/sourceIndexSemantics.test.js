import { describe, expect, it } from 'vitest';
import TransitionIndexResolver from '../../../src/domain/indexing/TransitionIndexResolver.js';
import {
  findNextInputTreeSequenceIndex,
  findPreviousInputTreeSequenceIndex,
  getMSAFrameIndexForTimelineIndex
} from '../../../src/domain/indexing/IndexMapping.js';

describe('source input tree index semantics', () => {
  it('returns the source global tree index from backend metadata', () => {
    const resolver = new TransitionIndexResolver([
      { tree_pair_key: null, step_in_pair: null, source_tree_global_index: null },
      { tree_pair_key: 'pair_0_5', step_in_pair: 1, source_tree_global_index: 0 },
      { tree_pair_key: 'pair_0_5', step_in_pair: 2, source_tree_global_index: 0 },
      { tree_pair_key: null, step_in_pair: null, source_tree_global_index: null },
      { tree_pair_key: 'pair_5_8', step_in_pair: 1, source_tree_global_index: 3 },
      { tree_pair_key: null, step_in_pair: null, source_tree_global_index: null },
    ], [[0, 3], [3, 5]]);

    expect(resolver.getSourceGlobalIndex(2)).toBe(0);
    expect(resolver.getSourceGlobalIndex(4)).toBe(3);
  });

  it('does not return a source global tree index outside input tree frames', () => {
    const resolver = new TransitionIndexResolver([
      { source_tree_global_index: null },
      { source_tree_global_index: 99 },
      { source_tree_global_index: null },
    ], [[0, 2]]);

    expect(resolver.getSourceGlobalIndex(1)).toBe(1);
  });

  it('names previous and next observed-tree navigation as input-tree navigation', () => {
    const inputTreeIndices = [0, 3, 5];

    expect(findPreviousInputTreeSequenceIndex(inputTreeIndices, 4)).toBe(3);
    expect(findNextInputTreeSequenceIndex(inputTreeIndices, 4)).toBe(5);
  });

  it('keeps generated timeline frames on the previous MSA source frame', () => {
    const transitionResolver = {
      fullTreeIndices: [0, 3, 5],
    };

    expect(getMSAFrameIndexForTimelineIndex(0, transitionResolver)).toBe(0);
    expect(getMSAFrameIndexForTimelineIndex(2, transitionResolver)).toBe(0);
    expect(getMSAFrameIndexForTimelineIndex(3, transitionResolver)).toBe(1);
    expect(getMSAFrameIndexForTimelineIndex(4, transitionResolver)).toBe(1);
    expect(getMSAFrameIndexForTimelineIndex(5, transitionResolver)).toBe(2);
  });
});
