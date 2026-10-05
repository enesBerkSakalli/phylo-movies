import { describe, expect, it } from 'vitest';
import {
  resolveCursorTreeIndex,
  resolveHighlightTreeIndex,
  rightComparisonIndex,
} from '../../../../src/domain/indexing/treeIndexSemantics.js';

describe('tree index semantics during transitions', () => {
  it('keeps playback cursor ownership on the source tree until the transition midpoint', () => {
    expect(resolveCursorTreeIndex(4, 5, 0)).toBe(4);
    expect(resolveCursorTreeIndex(4, 5, 0.49)).toBe(4);
    expect(resolveCursorTreeIndex(4, 5, 0.5)).toBe(5);
    expect(resolveCursorTreeIndex(4, 5, 1)).toBe(5);
  });

  it('uses target-tree highlights as soon as transition motion begins', () => {
    expect(resolveHighlightTreeIndex(4, 5, 0)).toBe(4);
    expect(resolveHighlightTreeIndex(4, 5, 1e-7)).toBe(4);
    expect(resolveHighlightTreeIndex(4, 5, 1e-5)).toBe(5);
    expect(resolveHighlightTreeIndex(4, 5, 1)).toBe(5);
  });

  it('compares with the next input tree, or the last one past it', () => {
    expect(rightComparisonIndex([0, 3, 5], 0)).toBe(3);
    expect(rightComparisonIndex([0, 3, 5], 3)).toBe(5);
    expect(rightComparisonIndex([0, 3, 5], 5)).toBe(5);
    expect(rightComparisonIndex([], 2)).toBeUndefined();
  });
});
