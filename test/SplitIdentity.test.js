import { describe, expect, it } from 'vitest';
import {
  getLinkSplitIndices,
  getNodeKey,
  getSplitIndices,
  toSubtreeKey,
} from '../src/domain/tree/splits.js';

describe('split identity contract', () => {
  it('reads split indices from normalized render elements only', () => {
    const splits = [2, 3];

    expect(getSplitIndices({ split_indices: splits })).toBe(splits);
    expect(getSplitIndices({ data: { split_indices: splits } })).toBeNull();
    expect(getSplitIndices({ target: { data: { split_indices: splits } } })).toBeNull();
    expect(getSplitIndices({ leaf: { data: { split_indices: splits } } })).toBeNull();
    expect(getSplitIndices({ originalNode: { data: { split_indices: splits } } })).toBeNull();
    expect(getSplitIndices({ id: 'node-without-splits' })).toBeNull();
  });

  it('reads link split indices from normalized links only', () => {
    const splits = [4, 5];

    expect(getLinkSplitIndices({ split_indices: splits })).toBe(splits);
    expect(getLinkSplitIndices({ target: { data: { split_indices: splits } } })).toBeNull();
  });

  it('generates keyed IDs from normalized elements only', () => {
    const splitKey = toSubtreeKey([7]);
    const normalized = { split_indices: [7] };
    const d3Node = { data: { split_indices: [7] } };

    expect(getNodeKey(normalized)).toBe(`node-${splitKey}`);
    expect(getNodeKey(d3Node)).toBeNull();
  });
});
