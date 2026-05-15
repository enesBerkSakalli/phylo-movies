import { describe, expect, it } from 'vitest';
import {
  flattenSplitSets,
  getMapValueBySplitIdentity,
  getSplitIndices,
  parseLegacySplitKey,
  toSubtreeKey,
} from '../../../src/domain/tree/splits.js';

describe('domain tree split primitives', () => {
  it('flattens nested backend split sets while preserving leaf arrays', () => {
    expect(flattenSplitSets([[[1], [2, 3]], [[[4, 5]]]])).toEqual([
      [1],
      [2, 3],
      [4, 5],
    ]);
  });

  it('reads only normalized split indices from render data', () => {
    const splits = [2, 3];

    expect(getSplitIndices({ split_indices: splits })).toBe(splits);
    expect(getSplitIndices({ data: { split_indices: splits } })).toBeNull();
  });

  it('generates order-independent subtree keys', () => {
    expect(toSubtreeKey([3, 1, 2])).toBe(toSubtreeKey([2, 3, 1]));
  });

  it('resolves legacy split-keyed maps by numeric split identity', () => {
    const value = [[10]];

    expect(getMapValueBySplitIdentity({ '[2,1]': value }, [1, 2])).toBe(value);
    expect(parseLegacySplitKey('[2,1]')).toEqual([1, 2]);
  });
});
