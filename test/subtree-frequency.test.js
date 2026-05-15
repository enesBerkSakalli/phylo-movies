import { describe, it, expect } from 'vitest';
import * as sprAnalytics from '../src/domain/spr/sprAnalytics.js';

const {
  calculateSprMovedSubtreeFrequencies: calculateSubtreeFrequencies,
  getTopSprMovedSubtrees: getTopSubtrees,
  formatSubtreeLabel,
} = sprAnalytics;

describe('SPR moved subtree frequencies', () => {
  it('exports moved-subtree frequency helpers without legacy mover names', () => {
    expect(sprAnalytics.calculateSprMovedSubtreeFrequencies).toBeTypeOf('function');
    expect(sprAnalytics.getTopSprMovedSubtrees).toBeTypeOf('function');
    expect(sprAnalytics.calculateSprMoverFrequencies).toBeUndefined();
    expect(sprAnalytics.getTopSprMovers).toBeUndefined();
  });

  describe('calculateSubtreeFrequencies', () => {
    it('should return empty array for null/undefined input', () => {
      expect(calculateSubtreeFrequencies(null)).toEqual([]);
      expect(calculateSubtreeFrequencies(undefined)).toEqual([]);
    });

    it('should return empty array for empty object', () => {
      expect(calculateSubtreeFrequencies({})).toEqual([]);
    });

    it('should calculate frequencies from spr_move_events', () => {
      const mockPairSolutions = {
        'pair_0_1': {
          spr_move_events: [
            {
              pivot_edge: [10, 11, 12, 13],
              driver_subtree: [13],
              highlight_group: [[13]]
            },
            {
              pivot_edge: [2, 3, 4, 5, 6],
              driver_subtree: [4],
              highlight_group: [[4]]
            },
            {
              pivot_edge: [2, 3, 4, 5, 6],
              driver_subtree: [6],
              highlight_group: [[6]]
            }
          ]
        },
        'pair_2_3': {
          spr_move_events: [
            {
              pivot_edge: [10, 11, 12, 13],
              driver_subtree: [13],
              highlight_group: [[13]]
            }
          ]
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
          spr_move_events: [
            {
              pivot_edge: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
              driver_subtree: [9, 10, 11, 12, 13],
              highlight_group: [[9, 10, 11, 12, 13]]
            }
          ]
        }
      };

      const result = calculateSubtreeFrequencies(mockPairSolutions);

      expect(result).toHaveLength(1);
      expect(result[0].splitIndices).toEqual([9, 10, 11, 12, 13]);
      expect(result[0].count).toBe(1);
    });

    it('should not infer frequencies from jumping_subtree_solutions without spr_move_events', () => {
      const mockPairSolutions = {
        'pair_0_1': {
          jumping_subtree_solutions: {
            '[10, 11, 12, 13]': [
              [[13]]
            ]
          }
        },
        'pair_1_2': {
          // no spr_move_events key
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
