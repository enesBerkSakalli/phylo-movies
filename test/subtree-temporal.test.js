
import { describe, it, expect } from 'vitest';
import { calculateSubtreeTemporalDistribution } from '../src/js/domain/tree/subtreeFrequencyUtils';

describe('calculateSubtreeTemporalDistribution', () => {
  it('should track subtree occurrences over time', () => {
    const mockPairSolutions = {
      'pair_0_1': {
        jumping_subtree_solutions: {
          'edge_1': [ [ [2, 3] ] ] // Subtree A at time 0
        }
      },
      'pair_1_2': {
        jumping_subtree_solutions: {
          'edge_2': [ [ [2, 3] ] ] // Subtree A at time 1
        }
      },
      'pair_2_3': {
        jumping_subtree_solutions: {
          'edge_3': [ [ [5, 6] ] ] // Subtree B at time 2
        }
      }
    };

    const result = calculateSubtreeTemporalDistribution(mockPairSolutions);

    // Check Subtree A (2,3)
    const timeMapA = result.get('2,3');
    expect(timeMapA).toBeDefined();
    expect(timeMapA.get(0)).toBe(1); // Occurred at pair 0
    expect(timeMapA.get(1)).toBe(1); // Occurred at pair 1
    expect(timeMapA.has(2)).toBe(false); // Did not occur at pair 2

    // Check Subtree B (5,6)
    const timeMapB = result.get('5,6');
    expect(timeMapB).toBeDefined();
    expect(timeMapB.get(2)).toBe(1); // Occurred at pair 2
  });
});
