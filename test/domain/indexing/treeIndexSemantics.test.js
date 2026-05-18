import { describe, expect, it } from 'vitest';
import {
  resolveComparisonActiveTreeIndex,
  resolveCursorTreeIndex,
  resolveHighlightTreeIndex,
  resolveMsaSourceFrameIndex,
} from '../../../src/domain/indexing/treeIndexSemantics.js';

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

  it('uses midpoint ownership for comparison active-tree context', () => {
    expect(resolveComparisonActiveTreeIndex(4, 5, 0.49)).toBe(4);
    expect(resolveComparisonActiveTreeIndex(4, 5, 0.5)).toBe(5);
  });

  it('maps generated timeline frames to the previous MSA source frame', () => {
    const sourceTreeSequenceIndices = [0, 3, 5];

    expect(resolveMsaSourceFrameIndex(sourceTreeSequenceIndices, 0)).toBe(0);
    expect(resolveMsaSourceFrameIndex(sourceTreeSequenceIndices, 2)).toBe(0);
    expect(resolveMsaSourceFrameIndex(sourceTreeSequenceIndices, 3)).toBe(1);
    expect(resolveMsaSourceFrameIndex(sourceTreeSequenceIndices, 4)).toBe(1);
    expect(resolveMsaSourceFrameIndex(sourceTreeSequenceIndices, 5)).toBe(2);
  });
});
