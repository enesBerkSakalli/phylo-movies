import { describe, it, expect } from 'vitest';
import calculateScales, { getMaxScaleValue } from '../src/js/domain/tree/scaleUtils.js';

describe('scaleUtils', () => {
  describe('calculateScales', () => {
    it('calculates max depth for a single simple tree', () => {
      // Depth: Root (0) -> Child (10) = 10
      const tree = { length: 0, children: [{ length: 10 }] };
      const result = calculateScales([tree], [0]);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(10);
      expect(result[0].index).toBe(0);
    });

    it('calculates max depth for a nested tree', () => {
      // Depth: Root(0) -> A(5) -> B(3) = 8
      // Depth: Root(0) -> C(2) = 2
      // Max should be 8
      const tree = {
        length: 0,
        children: [
          { length: 5, children: [{ length: 3 }] },
          { length: 2 }
        ]
      };
      const result = calculateScales([tree], [0]);
      expect(result[0].value).toBe(8);
    });

    it('handles multiple trees', () => {
      const tree1 = { length: 0, children: [{ length: 10 }] };
      const tree2 = { length: 0, children: [{ length: 20 }] };
      const result = calculateScales([tree1, tree2], [0, 1]);
      expect(result).toHaveLength(2);
      expect(result[0].value).toBe(10);
      expect(result[1].value).toBe(20);
    });

    it('handles specific indices only', () => {
      const list = [
        { length: 0, children: [{ length: 10 }] },
        { length: 0, children: [{ length: 20 }] },
        { length: 0, children: [{ length: 30 }] }
      ];
      // Only calc for index 0 and 2
      const result = calculateScales(list, [0, 2]);
      expect(result).toHaveLength(2);
      expect(result[0].value).toBe(10); // Index 0
      expect(result[1].value).toBe(30); // Index 2
      expect(result[1].index).toBe(2);
    });
  });

  describe('getMaxScaleValue', () => {
    it('returns the maximum value from a list of objects', () => {
      const input = [{ value: 10 }, { value: 50 }, { value: 5 }];
      expect(getMaxScaleValue(input)).toBe(50);
    });

    it('returns 1 for empty list (safe default)', () => {
      expect(getMaxScaleValue([])).toBe(1);
    });
  });
});
