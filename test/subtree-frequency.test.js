
import { describe, it, expect } from 'vitest';
import { calculateSubtreeFrequencies, getTopSubtrees, formatSubtreeLabel } from '../src/js/domain/tree/subtreeFrequencyUtils';

describe('subtreeFrequencyUtils', () => {
  describe('calculateSubtreeFrequencies', () => {
    it('should return empty array for null/undefined input', () => {
      expect(calculateSubtreeFrequencies(null)).toEqual([]);
      expect(calculateSubtreeFrequencies(undefined)).toEqual([]);
    });

    it('should calculate frequencies correctly from nested structure', () => {
      const mockPairSolutions = {
        'pair_0_1': {
          jumping_subtree_solutions: {
            'edge_1': [
              [ // Solution 1
                [2, 3], // Subtree A
                [5, 6, 7] // Subtree B
              ]
            ]
          }
        },
        'pair_1_2': {
          jumping_subtree_solutions: {
            'edge_2': [
              [ // Solution 1
                [2, 3], // Subtree A again
                [8] // Subtree C
              ]
            ]
          }
        }
      };

      const result = calculateSubtreeFrequencies(mockPairSolutions);

      // Expected:
      // [2,3] -> count 2
      // [5,6,7] -> count 1
      // [8] -> count 1

      expect(result).toHaveLength(3);

      // Check first item (most frequent)
      expect(result[0].splitIndices).toEqual([2, 3]);
      expect(result[0].count).toBe(2);
      expect(result[0].percentage).toBe(50); // 2 out of 4 total

      // Check others (order might vary strictly but counts should precise)
      const count1Items = result.filter(r => r.count === 1);
      expect(count1Items).toHaveLength(2);
    });

    it('should handle multiple solutions per edge correctly', () => {
      const mockPairSolutions = {
        'pair_0_1': {
          jumping_subtree_solutions: {
            'edge_1': [
              [ [[1, 2]] ], // Option 1
              [ [[1, 2]] ]  // Option 2 (duplicate logic? usually these are distinct options)
            ]
          }
        }
      };

      // If the data structure implies both are valid possibilities or just listing them
      // our current logic sums them all.
      const result = calculateSubtreeFrequencies(mockPairSolutions);
      expect(result[0].count).toBe(2);
    });
  });

  describe('formatSubtreeLabel', () => {
    it('should format small subtrees with indices', () => {
      expect(formatSubtreeLabel([1, 2])).toBe("Nodes: 1, 2");
      expect(formatSubtreeLabel([1, 2, 3])).toBe("Nodes: 1, 2, 3");
    });

    it('should format large subtrees with count', () => {
      expect(formatSubtreeLabel([1, 2, 3, 4])).toBe("Subtree (4 nodes)");
    });

    it('should use leaf names if provided', () => {
      const leaves = ['Zero', 'A', 'B', 'C', 'D', 'E'];
      // Indices: 1, 2 -> A, B
      expect(formatSubtreeLabel([1, 2], leaves)).toBe("A, B");

      // Indices: 1, 2, 3, 4 -> A, B... (+2)
      expect(formatSubtreeLabel([1, 2, 3, 4], leaves)).toBe("A, B... (+2)");
    });
  });
});
