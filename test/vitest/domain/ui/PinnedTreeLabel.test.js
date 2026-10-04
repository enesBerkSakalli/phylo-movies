import { describe, expect, it } from 'vitest';
import {
  getNextPinnedTreeIndex,
  getPinnedTreeLabel,
} from '../../../../src/components/movie-player/pinnedTree.js';

describe('pinned tree label', () => {
  it('names the pinned tree by its input-tree position', () => {
    expect(getPinnedTreeLabel(null, [0, 5, 10])).toBe('None');
    expect(getPinnedTreeLabel(10, [0, 5, 10])).toBe('Input 3');
    expect(getPinnedTreeLabel(7, [0, 5, 10])).toBe('Tree 8');
  });

  it('starts pinning from the cursor when nothing is pinned', () => {
    const inputTreeIndices = [0, 5, 10, 15];
    const fromCursor = { clipboardTreeIndex: null, inputTreeIndices, frameIndex: 7 };
    expect(getNextPinnedTreeIndex(1, fromCursor)).toBe(10);
    expect(getNextPinnedTreeIndex(-1, fromCursor)).toBe(5);
  });

  it('steps from the pinned tree and stops at the ends', () => {
    const inputTreeIndices = [0, 5, 10, 15];
    expect(
      getNextPinnedTreeIndex(1, { clipboardTreeIndex: 5, inputTreeIndices, frameIndex: 0 })
    ).toBe(10);
    expect(
      getNextPinnedTreeIndex(1, { clipboardTreeIndex: 15, inputTreeIndices, frameIndex: 0 })
    ).toBe(15);
    expect(
      getNextPinnedTreeIndex(-1, { clipboardTreeIndex: 0, inputTreeIndices, frameIndex: 9 })
    ).toBe(0);
    expect(
      getNextPinnedTreeIndex(1, { clipboardTreeIndex: null, inputTreeIndices: [], frameIndex: 0 })
    ).toBeNull();
  });
});
