import { describe, expect, it } from 'vitest';
import { normalizeMsaRegionRange } from '../../../src/domain/msa/msaRegionRange.js';

describe('MSA region range normalization', () => {
  it('returns null for non-finite inputs', () => {
    expect(normalizeMsaRegionRange(Number.NaN, 10, 100)).toBeNull();
    expect(normalizeMsaRegionRange(2, Number.POSITIVE_INFINITY, 100)).toBeNull();
  });

  it('sorts reversed ranges before clamping', () => {
    expect(normalizeMsaRegionRange(20, 5, 100)).toEqual({
      start: 5,
      end: 20,
    });
  });

  it('uses an open-ended upper bound when no column count is available', () => {
    expect(normalizeMsaRegionRange(0, 200, 0)).toEqual({
      start: 1,
      end: 200,
    });
  });

  it('clamps ranges to the available MSA columns', () => {
    expect(normalizeMsaRegionRange(-3, 25, 12)).toEqual({
      start: 1,
      end: 12,
    });
  });
});
