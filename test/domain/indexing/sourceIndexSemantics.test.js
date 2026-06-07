import { describe, expect, it } from 'vitest';
import {
  findNextInputTreeSequenceIndex,
  findPreviousInputTreeSequenceIndex,
  resolveComparisonRightTreeIndex,
} from '../../../src/domain/indexing/treeIndexSemantics.js';

describe('source input tree index semantics', () => {
  it('names previous and next observed-tree navigation as input-tree navigation', () => {
    const inputTreeIndices = [0, 3, 5];

    expect(findPreviousInputTreeSequenceIndex(inputTreeIndices, 4)).toBe(3);
    expect(findNextInputTreeSequenceIndex(inputTreeIndices, 4)).toBe(5);
  });

  it('resolves the comparison right tree from the active comparison tree', () => {
    const inputTreeIndices = [0, 1, 5];

    expect(resolveComparisonRightTreeIndex(inputTreeIndices, 0, 0)).toBe(1);
    expect(resolveComparisonRightTreeIndex(inputTreeIndices, 1, 1)).toBe(5);
    expect(resolveComparisonRightTreeIndex(inputTreeIndices, 5, 5)).toBe(5);
    expect(resolveComparisonRightTreeIndex([], 3, 4)).toBe(4);
  });
});
