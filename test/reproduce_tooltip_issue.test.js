import { describe, it, expect } from 'vitest';

// Copied from src/react/components/timeline/TimelineSegmentTooltip.jsx for reproduction
function getMovingSubtreeGroups(jumpingSubtrees, getLeafNamesByIndices) {
  if (!jumpingSubtrees || !jumpingSubtrees.length || !getLeafNamesByIndices) {
    return [];
  }

  const subtreeGroups = [];

  for (const solution of jumpingSubtrees) {
    if (!Array.isArray(solution)) continue;

    for (const leafIndicesGroup of solution) {
      if (!Array.isArray(leafIndicesGroup) || leafIndicesGroup.length === 0) continue;

      const leafNames = getLeafNamesByIndices(leafIndicesGroup);
      if (leafNames && leafNames.length > 0) {
        subtreeGroups.push(leafNames);
      }
    }
  }

  return subtreeGroups;
}

describe('getMovingSubtreeGroups reproduction', () => {
    it('fails with 2-level array structure (current data format)', () => {
        // Data format seen in example.json: Array<Array<number>>
        // e.g. [[9, 10, 11, 12, 13]]
        const jumpingSubtrees = [[9, 10, 11]];
        const getLeafNames = (indices) => indices.map(i => `Leaf ${i}`);

        const result = getMovingSubtreeGroups(jumpingSubtrees, getLeafNames);

        // The current implementation expects 3 levels: Array<Array<Array<number>>>
        // So it iterates 'solution' (which is [9, 10, 11])
        // Then 'leafIndicesGroup' becomes 9 (number).
        // Then checks Array.isArray(9) -> false.
        // Result is empty array.
        expect(result).toEqual([]);
    });

    it('works with 3-level array structure (expected by current code)', () => {
        const jumpingSubtrees = [[[9, 10, 11]]];
        const getLeafNames = (indices) => indices.map(i => `Leaf ${i}`);

        const result = getMovingSubtreeGroups(jumpingSubtrees, getLeafNames);
        expect(result).toEqual([['Leaf 9', 'Leaf 10', 'Leaf 11']]);
    });
});
