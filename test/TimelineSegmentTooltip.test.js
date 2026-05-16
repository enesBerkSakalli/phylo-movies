import { describe, expect, it } from 'vitest';
import { extractMovingSubtreeGroups } from '../src/components/timeline/TimelineSegmentTooltip.jsx';

describe('TimelineSegmentTooltip subtree extraction', () => {
  it('extracts leaf names from both flat and nested affected subtree groups', () => {
    const getLeafNames = (indices) => indices.map((index) => `Leaf ${index}`);

    expect(extractMovingSubtreeGroups([[9, 10, 11]], getLeafNames)).toEqual([
      ['Leaf 9', 'Leaf 10', 'Leaf 11'],
    ]);
    expect(extractMovingSubtreeGroups([[[9, 10, 11]]], getLeafNames)).toEqual([
      ['Leaf 9', 'Leaf 10', 'Leaf 11'],
    ]);
  });
});
