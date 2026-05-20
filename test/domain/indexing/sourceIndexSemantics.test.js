import { describe, expect, it } from 'vitest';
import {
  findNextInputTreeSequenceIndex,
  findPreviousInputTreeSequenceIndex,
} from '../../../src/domain/indexing/treeIndexSemantics.js';

describe('source input tree index semantics', () => {
  it('names previous and next observed-tree navigation as input-tree navigation', () => {
    const inputTreeIndices = [0, 3, 5];

    expect(findPreviousInputTreeSequenceIndex(inputTreeIndices, 4)).toBe(3);
    expect(findNextInputTreeSequenceIndex(inputTreeIndices, 4)).toBe(5);
  });
});
