
import { describe, it, expect } from 'vitest';
import {
  signedShortestAngle,
  polarToCartesian,
  createPolarInterpolator,
  calculateBranchCoordinates
} from '../src/treeVisualisation/layout/RadialTreeGeometry.js';
import { LinkGeometryBuilder } from '../src/treeVisualisation/deckgl/builders/geometry/links/LinkGeometryBuilder.js';

describe('RadialTreeGeometry', () => {

  describe('signedShortestAngle', () => {
    it('calculates small positive differences', () => {
      expect(signedShortestAngle(0, 0.1)).toBeCloseTo(0.1);
    });

    it('calculates small negative differences', () => {
      expect(signedShortestAngle(0.1, 0)).toBeCloseTo(-0.1);
    });

    it('handles wrapping across PI (anti-clockwise)', () => {
      // From 0.1 to 6.1 (~2PI - 0.18)
      // Should go negative path: 6.1 - 0.1 = 6.0. 6.0 - 2PI = -0.28...
      const start = 0.1;
      const end = Math.PI * 2 - 0.1;
      expect(signedShortestAngle(start, end)).toBeCloseTo(-0.2);
    });

    it('handles wrapping across PI (clockwise)', () => {
      const start = Math.PI * 2 - 0.1;
      const end = 0.1;
      expect(signedShortestAngle(start, end)).toBeCloseTo(0.2);
    });
  });

  describe('polarToCartesian', () => {
    it('converts 0 angle', () => {
      const res = polarToCartesian(10, 0);
      expect(res.x).toBeCloseTo(10);
      expect(res.y).toBeCloseTo(0);
    });

    it('converts PI/2 angle', () => {
      const res = polarToCartesian(10, Math.PI / 2);
      expect(res.x).toBeCloseTo(0);
      expect(res.y).toBeCloseTo(10);
    });

    it('respects center offset', () => {
      const center = { x: 100, y: 50 };
      const res = polarToCartesian(10, 0, center);
      expect(res.x).toBeCloseTo(110);
      expect(res.y).toBeCloseTo(50);
    });
  });

  describe('createPolarInterpolator', () => {
    it('uses the shared shortest-angle helper directly', () => {
      const interpolate = createPolarInterpolator(0, 1, Math.PI, 1);

      expect(interpolate(1).angle).toBeCloseTo(-Math.PI);
    });
  });

  describe('calculateBranchCoordinates', () => {
    it('returns straight line for very small angle delta', () => {
      const d = {
        source: { radius: 10, angle: 0 },
        target: { radius: 20, angle: 0.00001 }
      };
      const res = calculateBranchCoordinates(d);
      expect(res.arcProperties).toBeNull();
      expect(res.movePoint).toBeDefined();
      expect(res.lineEndPoint).toBeDefined();
    });

    it('returns arc props for normal branch', () => {
      const d = {
        source: { radius: 10, angle: 0 },
        target: { radius: 20, angle: Math.PI / 2 }
      };
      const res = calculateBranchCoordinates(d);
      expect(res.arcProperties).toBeDefined();
      expect(res.arcProperties.startAngle).toBe(0);
      expect(res.arcProperties.endAngle).toBe(Math.PI / 2);
      expect(res.arcEndPoint.x).toBeCloseTo(0); // radius 10 at 90deg
      expect(res.arcEndPoint.y).toBeCloseTo(10);
    });
  });

  describe('LinkGeometryBuilder', () => {
    it('can render direct straight source-to-target link geometry', () => {
      const builder = new LinkGeometryBuilder({ geometryMode: 'straight' });
      const path = Array.from(builder.createLinkPath({
        source: { radius: 10, angle: 0, x: 10, y: 0 },
        target: { radius: 20, angle: Math.PI / 2, x: 0, y: 20 },
      }));

      expect(path).toHaveLength(6);
      expect(path).toEqual([10, 0, 0, 0, 20, 0]);
    });
  });
});
