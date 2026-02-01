
import { describe, it, expect } from 'vitest';
import { calculateRadialBundlePoint, buildBundledBezierPath } from '../src/js/treeVisualisation/deckgl/builders/geometry/connectors/ConnectorGeometryBuilder.js';

describe('ConnectorGeometryBuilder', () => {

  describe('calculateRadialBundlePoint', () => {
    it('should return treeCenter if no points are provided', () => {
      const center = [100, 100];
      const result = calculateRadialBundlePoint([], center);
      expect(result).toEqual(center);
    });

    it('should calculate the correct bundle point for a single point', () => {
      const points = [[200, 100]];
      const center = [100, 100];

      const result = calculateRadialBundlePoint(points, center);

      expect(result[0]).toBeCloseTo(220);
      expect(result[1]).toBeCloseTo(100);
      expect(result[2]).toBe(0);
    });

    it('should calculate the centroid angle and max radius for multiple points', () => {
      const points = [[200, 100], [100, 200]];
      const center = [100, 100];

      const result = calculateRadialBundlePoint(points, center);

      const angle = Math.atan2(result[1] - center[1], result[0] - center[0]);
      const radius = Math.sqrt(Math.pow(result[0] - center[0], 2) + Math.pow(result[1] - center[1], 2));

      expect(angle).toBeCloseTo(Math.PI / 4, 2);
      expect(radius).toBeCloseTo(120);
    });
  });

  describe('buildBundledBezierPath', () => {
    it('should return an empty array if start or end point is missing', () => {
      expect(buildBundledBezierPath(null, [0,0], [0,0], [0,0])).toEqual([]);
      expect(buildBundledBezierPath([0,0], null, [0,0], [0,0])).toEqual([]);
    });

    it('should generate a path with the specified number of samples', () => {
      const from = [0, 0];
      const to = [100, 0];
      const srcBundle = [10, 10];
      const dstBundle = [90, 10];
      const samples = 10;

      const path = buildBundledBezierPath(from, to, srcBundle, dstBundle, samples);
      expect(path.length).toBeGreaterThanOrEqual(samples);

      const start = path[0];
      const end = path[path.length - 1];
      expect(start[0]).toBeCloseTo(from[0]);
      expect(start[1]).toBeCloseTo(from[1]);
      expect(end[0]).toBeCloseTo(to[0]);
      expect(end[1]).toBeCloseTo(to[1]);
    });

    it('should use radial departure when centers are provided', () => {
      // Test Radial Logic
      const center = [0, 0];
      const from = [10, 0]; // Point on X-axis, r=10
      const to = [20, 0]; // Far away

      // If we use Horizontal logic, CP1 would be to the left of 'from'.
      // If we use Radial logic, vector is (1,0), so CP1 should be further out on X axis.
      // dx = 10, dy = 0, len = 10. Normal = (1, 0).
      // We rely on internal implementation details slightly, but can verify direction.

      // Passing centers triggers new logic
      const path = buildBundledBezierPath(from, to, [15, 10], [15, 10], 10, {
        sourceCenter: center,
        targetCenter: [30, 0] // Target center
      });

      // Check the second point in the path (approximate derivative)
      // The curve should move OUTWARDS (positive X) first
      const p1 = path[1];
      expect(p1[0]).toBeGreaterThan(from[0]); // Moving away from center
    });
  });
});
