import { describe, expect, it } from 'vitest';
import {
  extractAffectedSubtreeGroups,
  formatPivotEdgePreview,
} from '../src/components/timeline/timelineSegmentTooltipUtils.js';

describe('TimelineSegmentTooltip subtree extraction', () => {
  it('extracts leaf names from both flat and nested affected subtree groups', () => {
    const getLeafNames = (indices) => indices.map((index) => `Leaf ${index}`);

    expect(extractAffectedSubtreeGroups([[9, 10, 11]], getLeafNames)).toEqual([
      ['Leaf 9', 'Leaf 10', 'Leaf 11'],
    ]);
    expect(extractAffectedSubtreeGroups([[[9, 10, 11]]], getLeafNames)).toEqual([
      ['Leaf 9', 'Leaf 10', 'Leaf 11'],
    ]);
  });

  it('formats compact pivot edge previews', () => {
    expect(formatPivotEdgePreview([1, 2, 4])).toBe('1, 2, 4');
    expect(formatPivotEdgePreview([1, 2, 4, 5, 6, 7])).toBe('1, 2, 4, 5 +2');
    expect(formatPivotEdgePreview([])).toBeNull();
    expect(formatPivotEdgePreview(null)).toBeNull();
  });
});
