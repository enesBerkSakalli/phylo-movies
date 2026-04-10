import { describe, it, expect } from 'vitest';
import {
  computeAngularDistance,
  computeAngularDistances,
  buildVelocityMap,
  buildGlobalVelocityMaps
} from '../src/core/treeVisualisation/deckgl/interpolation/VelocityNormalizer.js';
import { PolarNodeInterpolator } from '../src/core/treeVisualisation/deckgl/interpolation/nodes/PolarNodeInterpolator.js';

describe('VelocityNormalizer', () => {
  describe('computeAngularDistance', () => {
    it('returns 0 for null/missing nodes', () => {
      expect(computeAngularDistance(null, null)).toBe(0);
      expect(computeAngularDistance(null, { angle: 1 })).toBe(0);
    });

    it('returns 0 for two identical nodes (no angular movement)', () => {
      const node = { angle: 1.0 };
      expect(computeAngularDistance(node, node)).toBeCloseTo(0, 10);
    });

    it('returns correct angular distance for simple case', () => {
      const from = { angle: Math.PI / 4 };
      const to = { angle: (3 * Math.PI) / 4 };
      expect(computeAngularDistance(from, to)).toBeCloseTo(Math.PI / 2, 10);
    });

    it('larger angular change produces larger distance', () => {
      const short = computeAngularDistance(
        { angle: Math.PI / 4 },
        { angle: Math.PI / 4 + 0.5 }
      );
      const long = computeAngularDistance(
        { angle: Math.PI / 4 },
        { angle: Math.PI / 4 + 2.0 }
      );
      expect(long).toBeGreaterThan(short);
    });

    it('ignores radius differences (angle-only)', () => {
      const dist1 = computeAngularDistance(
        { angle: 1.0, polarPosition: 50 },
        { angle: 2.0, polarPosition: 50 }
      );
      const dist2 = computeAngularDistance(
        { angle: 1.0, polarPosition: 200 },
        { angle: 2.0, polarPosition: 500 }
      );
      expect(dist1).toBeCloseTo(dist2, 10);
    });
  });

  describe('computeAngularDistances', () => {
    function makeNode(id, angle) { return { id, angle }; }
    function toMap(nodes) { return new Map(nodes.map(n => [n.id, n])); }

    it('returns distances only for matched pairs', () => {
      const from = toMap([makeNode('A', 1.0), makeNode('C', 0.5)]);
      const to = toMap([makeNode('A', 2.0), makeNode('B', 3.0)]);
      const distances = computeAngularDistances(from, to);
      expect(distances.size).toBe(1);
      expect(distances.has('A')).toBe(true);
      expect(distances.has('B')).toBe(false);
    });
  });

  describe('buildGlobalVelocityMaps', () => {
    it('uses the global max angular displacement across element types', () => {
      const nodeAngular = new Map([['n1', 0.5], ['n2', 1.0]]);
      const labelAngular = new Map([['l1', 2.0], ['l2', 0.3]]);

      const { velocityMaps, globalMaxAngle } = buildGlobalVelocityMaps({ nodes: nodeAngular, labels: labelAngular }, 0.5);

      expect(globalMaxAngle).toBeCloseTo(2.0, 10);
      expect(velocityMaps.labels.get('l1').angularT).toBeCloseTo(0.5, 5);
      expect(velocityMaps.nodes.get('n1').angularT).toBe(1);
      expect(velocityMaps.nodes.get('n2').angularT).toBe(1);
    });

    it('correctly normalises when global max is in a different type', () => {
      const nodeAngular = new Map([['n1', 0.2]]);
      const extAngular = new Map([['e1', 1.0]]);

      const { velocityMaps } = buildGlobalVelocityMaps({ nodes: nodeAngular, extensions: extAngular }, 0.4);

      expect(velocityMaps.nodes.get('n1').angularT).toBe(1);
      expect(velocityMaps.extensions.get('e1').angularT).toBeCloseTo(0.4, 5);
    });

    it('handles empty distance maps gracefully', () => {
      const { velocityMaps, globalMaxAngle } = buildGlobalVelocityMaps({ nodes: new Map(), labels: new Map() }, 0.5);
      expect(globalMaxAngle).toBe(0);
      expect(velocityMaps.nodes.size).toBe(0);
      expect(velocityMaps.labels.size).toBe(0);
    });

    it('elements with zero angular distance get t passthrough', () => {
      const { velocityMaps } = buildGlobalVelocityMaps({ nodes: new Map([['n1', 1.0], ['n2', 0]]) }, 0.6);

      const n1 = velocityMaps.nodes.get('n1');
      const n2 = velocityMaps.nodes.get('n2');

      expect(n1.angularT).toBeCloseTo(0.6, 5);
      expect(n2.angularT).toBeCloseTo(0.6, 5);
    });
  });

  describe('angle-only interpolation contract', () => {
    it('uses angularT for angle while radius follows the base eased time', () => {
      const interpolator = new PolarNodeInterpolator();
      const fromNode = { angle: Math.PI / 4, polarPosition: 50 };
      const toNode = { angle: (3 * Math.PI) / 4, polarPosition: 150 };

      const position = interpolator.interpolatePosition(fromNode, toNode, 0.25, { angularT: 0.5 });
      const interpolatedRadius = Math.hypot(position[0], position[1]);
      const interpolatedAngle = Math.atan2(position[1], position[0]);

      expect(interpolatedRadius).toBeCloseTo(75, 5);
      expect(interpolatedAngle).toBeCloseTo(Math.PI / 2, 5);
    });
  });

  describe('buildVelocityMap (legacy)', () => {
    function makeNode(id, angle) {
      return { id, angle };
    }

    function toMap(nodes) {
      return new Map(nodes.map(n => [n.id, n]));
    }

    it('returns empty map when no matched elements', () => {
      const fromMap = toMap([makeNode('A', 0)]);
      const toMap2 = toMap([makeNode('B', 1)]);
      const { velocityMap, maxAngle } = buildVelocityMap(fromMap, toMap2, 0.5);
      expect(velocityMap.size).toBe(0);
      expect(maxAngle).toBe(0);
    });

    it('gives angularT=1 for all elements at global t=1', () => {
      const from = [makeNode('A', 1.0), makeNode('B', 1.0)];
      const to = [makeNode('A', 2.0), makeNode('B', 1.1)];
      const { velocityMap } = buildVelocityMap(toMap(from), toMap(to), 1.0);
      expect(velocityMap.get('A').angularT).toBe(1);
      expect(velocityMap.get('B').angularT).toBe(1);
    });

    it('all elements get the same angularT when they have identical angular deltas', () => {
      const from = [makeNode('A', 1.0), makeNode('B', 2.0)];
      const to = [makeNode('A', 2.0), makeNode('B', 3.0)];
      const { velocityMap } = buildVelocityMap(toMap(from), toMap(to), 0.5);
      expect(velocityMap.get('A').angularT).toBeCloseTo(velocityMap.get('B').angularT, 10);
    });

    it('short-angle element gets higher angularT than large-angle element at t=0.5', () => {
      const from = [makeNode('A', 1.0), makeNode('B', 1.0)];
      const to = [makeNode('A', 1.1), makeNode('B', 3.0)];
      const { velocityMap } = buildVelocityMap(toMap(from), toMap(to), 0.5);
      expect(velocityMap.get('A').angularT).toBeGreaterThan(velocityMap.get('B').angularT);
    });

    it('largest-angle element gets the global t unchanged', () => {
      const from = [makeNode('A', 1.0), makeNode('B', 1.0)];
      const to = [makeNode('A', 1.1), makeNode('B', 3.0)];
      const { velocityMap } = buildVelocityMap(toMap(from), toMap(to), 0.5);
      expect(velocityMap.get('B').angularT).toBeCloseTo(0.5, 5);
    });

    it('returns the maximum angular distance for the matched set', () => {
      const from = [makeNode('A', 1.0), makeNode('B', 1.0)];
      const to = [makeNode('A', 1.5), makeNode('B', 3.0)];
      const { maxAngle } = buildVelocityMap(toMap(from), toMap(to), 0.5);
      expect(maxAngle).toBeCloseTo(2.0, 10);
    });

    it('short-angle element angularT is clamped to 1', () => {
      const from = [makeNode('A', 1.0), makeNode('B', 1.0)];
      const to = [makeNode('A', 1.001), makeNode('B', 4.0)];
      const { velocityMap } = buildVelocityMap(toMap(from), toMap(to), 0.8);
      expect(velocityMap.get('A').angularT).toBe(1);
    });

    it('elements with zero angular movement get the global t', () => {
      const from = [makeNode('A', 1.0), makeNode('B', 1.0)];
      const to = [makeNode('A', 1.0), makeNode('B', 3.0)];
      const { velocityMap } = buildVelocityMap(toMap(from), toMap(to), 0.5);
      expect(velocityMap.get('A').angularT).toBeCloseTo(0.5, 5);
    });
  });
});
