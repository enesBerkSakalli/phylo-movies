import { describe, it, expect } from 'vitest';
import { buildBundledBezierPath } from '../../../../src/treeVisualisation/deckgl/builders/geometry/connectors/ConnectorGeometryBuilder.js';

function flatPathPoint(path, index) {
  const offset = index * 3;
  return [path[offset], path[offset + 1], path[offset + 2]];
}

const options = { bundlingStrength: 0.65, sourceCenter: [-50, 0], targetCenter: [150, 0] };

describe('ConnectorGeometryBuilder', () => {
  describe('buildBundledBezierPath', () => {
    it('should return an empty Float32Array if start or end point is missing', () => {
      expect(buildBundledBezierPath(null, [0, 0], [0, 0], [0, 0], 10, options)).toEqual(
        new Float32Array(0)
      );
      expect(buildBundledBezierPath([0, 0], null, [0, 0], [0, 0], 10, options)).toEqual(
        new Float32Array(0)
      );
    });

    it('returns an empty Float32Array when Bezier endpoints are not finite', () => {
      expect(
        buildBundledBezierPath([Number.NaN, 0], [100, 0], [10, 10], [90, 10], 10, options)
      ).toEqual(new Float32Array(0));
      expect(
        buildBundledBezierPath(
          [0, 0],
          [100, 0],
          [Number.POSITIVE_INFINITY, 10],
          [90, 10],
          10,
          options
        )
      ).toEqual(new Float32Array(0));
    });

    it('should generate a path with the specified number of samples', () => {
      const from = [0, 0];
      const to = [100, 0];
      const srcBundle = [10, 10];
      const dstBundle = [90, 10];
      const samples = 10;

      const path = buildBundledBezierPath(from, to, srcBundle, dstBundle, samples, options);
      expect(path.length / 3).toBeGreaterThanOrEqual(samples);

      const start = flatPathPoint(path, 0);
      const end = flatPathPoint(path, path.length / 3 - 1);
      expect(start[0]).toBeCloseTo(from[0]);
      expect(start[1]).toBeCloseTo(from[1]);
      expect(end[0]).toBeCloseTo(to[0]);
      expect(end[1]).toBeCloseTo(to[1]);
    });

    it('returns a flat Float32Array path for deck.gl PathLayer', () => {
      const path = buildBundledBezierPath([0, 0], [100, 0], [10, 10], [90, 10], 10, options);

      expect(path).toBeInstanceOf(Float32Array);
      expect(path.length % 3).toBe(0);
      expect(Array.from(path.slice(0, 3))).toEqual([0, 0, 0]);
      expect(Array.from(path.slice(-3))).toEqual([100, 0, 0]);
    });

    it('departs radially from the source center', () => {
      // from (10, 0) is on the +X axis of the source center, so the curve must first move +X.
      const from = [10, 0];
      const to = [20, 0];

      const path = buildBundledBezierPath(from, to, [15, 10], [15, 10], 10, {
        bundlingStrength: 0.65,
        sourceCenter: [0, 0],
        targetCenter: [30, 0],
      });

      const p1 = flatPathPoint(path, 1);
      expect(p1[0]).toBeGreaterThan(from[0]); // Moving away from center
    });
  });
});
