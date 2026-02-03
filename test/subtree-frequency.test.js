
import { describe, it, expect } from 'vitest';
import { calculateSubtreeFrequencies, getTopSubtrees, formatSubtreeLabel } from '../src/js/domain/tree/subtreeFrequencyUtils';

describe('subtreeFrequencyUtils', () => {
  describe('calculateSubtreeFrequencies', () => {
    it('should return empty array for null/undefined input', () => {
      expect(calculateSubtreeFrequencies(null)).toEqual([]);
      expect(calculateSubtreeFrequencies(undefined)).toEqual([]);
    });

    it('should return empty array for empty object', () => {
      expect(calculateSubtreeFrequencies({})).toEqual([]);
    });

    it('should calculate frequencies from tree_pair_solutions structure', () => {
      // Mock tree_pair_solutions with jumping_subtree_solutions
      const mockPairSolutions = {
        'pair_0_1': {
          jumping_subtree_solutions: {
            '[10, 11, 12, 13]': [  // pivot edge
              [[13]]               // subtree that jumps at this pivot
            ],
            '[2, 3, 4, 5, 6]': [   // another pivot edge
              [[4], [6]]           // two subtrees jump at this pivot
            ]
          }
        },
        'pair_2_3': {
          jumping_subtree_solutions: {
            '[10, 11, 12, 13]': [
              [[13]]               // same subtree jumps again
            ]
          }
        }
      };

      const result = calculateSubtreeFrequencies(mockPairSolutions);

      // Expected:
      // [13] -> count 2 (appears in pair_0_1 and pair_2_3)
      // [4] -> count 1
      // [6] -> count 1

      expect(result).toHaveLength(3);

      // Check first item (most frequent)
      expect(result[0].splitIndices).toEqual([13]);
      expect(result[0].count).toBe(2);
      expect(result[0].percentage).toBe(50); // 2 out of 4 total

      // Check others
      const count1Items = result.filter(r => r.count === 1);
      expect(count1Items).toHaveLength(2);
    });

    it('should handle multi-taxon subtrees', () => {
      const mockPairSolutions = {
        'pair_0_1': {
          jumping_subtree_solutions: {
            '[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]': [
              [[[9, 10, 11, 12, 13]]]  // multi-taxon subtree
            ]
          }
        }
      };

      const result = calculateSubtreeFrequencies(mockPairSolutions);

      expect(result).toHaveLength(1);
      expect(result[0].splitIndices).toEqual([9, 10, 11, 12, 13]);
      expect(result[0].count).toBe(1);
    });

    it('should skip empty jumping_subtree_solutions', () => {
      const mockPairSolutions = {
        'pair_0_1': {
          jumping_subtree_solutions: {}
        },
        'pair_1_2': {
          // no jumping_subtree_solutions key
        }
      };

      const result = calculateSubtreeFrequencies(mockPairSolutions);
      expect(result).toEqual([]);
    });
  });

  describe('formatSubtreeLabel', () => {
    it('should format subtrees with indices when no names provided', () => {
      expect(formatSubtreeLabel([1, 2])).toBe("Nodes: 1, 2");
      expect(formatSubtreeLabel([1, 2, 3])).toBe("Nodes: 1, 2, 3");
      expect(formatSubtreeLabel([1, 2, 3, 4])).toBe("Nodes: 1, 2, 3, 4");
    });

    it('should show all leaf names when provided', () => {
      const leaves = ['Zero', 'A', 'B', 'C', 'D', 'E'];
      // Indices: 1, 2 -> A, B
      expect(formatSubtreeLabel([1, 2], leaves)).toBe("A, B");

      // Indices: 1, 2, 3, 4 -> A, B, C, D (all names shown)
      expect(formatSubtreeLabel([1, 2, 3, 4], leaves)).toBe("A, B, C, D");

      // All indices
      expect(formatSubtreeLabel([0, 1, 2, 3, 4, 5], leaves)).toBe("Zero, A, B, C, D, E");
    });
  });
});
