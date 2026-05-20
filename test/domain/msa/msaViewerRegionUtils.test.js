import { describe, expect, it } from 'vitest';
import {
  normalizeViewerRegion,
  resolveRegionTargetColumn,
} from '../../../src/msaViewer/regionUtils.js';

describe('MSA viewer region utilities', () => {
  it('normalizes string and reversed one-based region inputs', () => {
    expect(normalizeViewerRegion('10', '2', 12)).toEqual({
      startCol: 2,
      endCol: 10,
    });
  });

  it('returns null for invalid region inputs', () => {
    expect(normalizeViewerRegion('abc', 10, 12)).toBeNull();
    expect(normalizeViewerRegion(2, Number.POSITIVE_INFINITY, 12)).toBeNull();
  });

  it('clamps regions to available columns when data is loaded', () => {
    expect(normalizeViewerRegion(-5, 99, 8)).toEqual({
      startCol: 1,
      endCol: 8,
    });
  });

  it('preserves an open upper bound before data is loaded', () => {
    expect(normalizeViewerRegion(2, 99, 0)).toEqual({
      startCol: 2,
      endCol: 99,
    });
  });

  it('resolves start, center, and end scroll target columns as zero-based positions', () => {
    const region = { startCol: 2, endCol: 4 };

    expect(resolveRegionTargetColumn(region, 'start')).toBe(1);
    expect(resolveRegionTargetColumn(region, 'center')).toBe(2.5);
    expect(resolveRegionTargetColumn(region, 'end')).toBe(3);
  });
});
