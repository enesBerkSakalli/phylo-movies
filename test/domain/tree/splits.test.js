import { describe, expect, it } from 'vitest';
import * as splitPrimitives from '../../../src/domain/tree/splits.js';

const { flattenSplitSets, getSplitKey, getSplitIndices, toSubtreeKey } = splitPrimitives;

describe('domain tree split primitives', () => {
  it('flattens nested backend split sets while preserving leaf arrays', () => {
    expect(flattenSplitSets([[[1], [2, 3]], [[[4, 5]]]])).toEqual([[1], [2, 3], [4, 5]]);
  });

  it('reads only normalized split indices from render data', () => {
    const splits = [2, 3];

    expect(getSplitIndices({ split_indices: splits })).toBe(splits);
    expect(getSplitIndices({ data: { split_indices: splits } })).toBeNull();
  });

  it('generates order-independent subtree keys', () => {
    expect(toSubtreeKey([3, 1, 2])).toBe(toSubtreeKey([2, 3, 1]));
  });

  it('prefers precomputed split keys on normalized elements', () => {
    expect(getSplitKey({ splitKey: 'cached-key', split_indices: [3, 2, 1] })).toBe('cached-key');
  });

  it('exports backend split-key helpers without legacy helper names', () => {
    expect(typeof splitPrimitives.toBackendSplitKey).toBe('function');
    expect(typeof splitPrimitives.parseBackendSplitKey).toBe('function');
    expect(splitPrimitives).not.toHaveProperty('toLegacySplitKey');
    expect(splitPrimitives).not.toHaveProperty('parseLegacySplitKey');
  });

  it('uses canonical backend split keys as the only backend-map lookup contract', () => {
    const value = [[10]];

    expect(splitPrimitives.toBackendSplitKey([2, 1])).toBe('[1, 2]');
    expect(splitPrimitives.isCanonicalBackendSplitKey('[1, 2]')).toBe(true);
    expect(splitPrimitives.isCanonicalBackendSplitKey('[2,1]')).toBe(false);
    expect(splitPrimitives.getBackendSplitMapValue({ '[1, 2]': value }, [2, 1])).toBe(value);
    expect(splitPrimitives.getBackendSplitMapValue({ '[2,1]': value }, [1, 2])).toBeUndefined();
    expect(splitPrimitives.parseBackendSplitKey('[2,1]')).toEqual([]);
    expect(splitPrimitives).not.toHaveProperty('getMapValueBySplitIdentity');
    expect(splitPrimitives).not.toHaveProperty('getSplitIdentityKey');
  });
});
