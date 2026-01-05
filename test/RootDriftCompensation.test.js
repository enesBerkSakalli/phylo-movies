const { expect } = require('chai');
const { TreeInterpolator } = require('../src/js/treeVisualisation/deckgl/interpolation/TreeInterpolator.js');

describe('TreeInterpolator - Root Drift Compensation', () => {
  let interpolator;

  beforeEach(() => {
    interpolator = new TreeInterpolator();
  });

  describe('_calculateRootDrift', () => {
    it('should return 0 when no root nodes found', () => {
      const fromNodes = [{ id: 'child', depth: 1, angle: 0.5 }];
      const toNodes = [{ id: 'child', depth: 1, angle: 0.6 }];

      const drift = interpolator._calculateRootDrift(fromNodes, toNodes, 0.5);
      expect(drift).to.equal(0);
    });

    it('should return 0 when root angles are the same', () => {
      const fromNodes = [{ id: 'root', depth: 0, angle: 1.0 }];
      const toNodes = [{ id: 'root', depth: 0, angle: 1.0 }];

      const drift = interpolator._calculateRootDrift(fromNodes, toNodes, 0.5);
      expect(drift).to.equal(0);
    });

    it('should calculate drift at midpoint', () => {
      const fromNodes = [{ id: 'root', depth: 0, angle: 0 }];
      const toNodes = [{ id: 'root', depth: 0, angle: 0.2 }];

      const drift = interpolator._calculateRootDrift(fromNodes, toNodes, 0.5);
      expect(drift).to.be.closeTo(0.1, 0.001);
    });

    it('should return full drift at t=1', () => {
      const fromNodes = [{ id: 'root', depth: 0, angle: 0 }];
      const toNodes = [{ id: 'root', depth: 0, angle: 0.5 }];

      const drift = interpolator._calculateRootDrift(fromNodes, toNodes, 1);
      expect(drift).to.be.closeTo(0.5, 0.001);
    });

    it('should return 0 drift at t=0', () => {
      const fromNodes = [{ id: 'root', depth: 0, angle: 0 }];
      const toNodes = [{ id: 'root', depth: 0, angle: 0.5 }];

      const drift = interpolator._calculateRootDrift(fromNodes, toNodes, 0);
      expect(drift).to.equal(0);
    });
  });

  describe('_interpolatePositionPolar with rootDrift', () => {
    it('should compensate for root drift in polar interpolation', () => {
      const fromNode = { angle: 0, polarRadius: 100 };
      const toNode = { angle: 0.2, polarRadius: 100 };

      // No drift - should interpolate normally
      const posNoDrift = interpolator._interpolatePositionPolar(fromNode, toNode, 0.5, 0);
      const expectedAngleNoDrift = 0.1; // midpoint
      expect(posNoDrift[0]).to.be.closeTo(100 * Math.cos(expectedAngleNoDrift), 0.01);
      expect(posNoDrift[1]).to.be.closeTo(100 * Math.sin(expectedAngleNoDrift), 0.01);

      // With drift = 0.1 - should compensate by subtracting drift
      const posWithDrift = interpolator._interpolatePositionPolar(fromNode, toNode, 0.5, 0.1);
      const compensatedAngle = 0; // 0.1 - 0.1 = 0
      expect(posWithDrift[0]).to.be.closeTo(100 * Math.cos(compensatedAngle), 0.01);
      expect(posWithDrift[1]).to.be.closeTo(100 * Math.sin(compensatedAngle), 0.01);
    });
  });

  describe('interpolateTreeData with drift compensation', () => {
    it('should keep root position stable during interpolation', () => {
      const dataFrom = {
        nodes: [
          { id: 'root', depth: 0, angle: 0, polarRadius: 0, position: [0, 0, 0], radius: 5 }
        ],
        links: [],
        labels: [],
        extensions: []
      };
      const dataTo = {
        nodes: [
          { id: 'root', depth: 0, angle: 0.2, polarRadius: 0, position: [0, 0, 0], radius: 5 }
        ],
        links: [],
        labels: [],
        extensions: []
      };

      const result = interpolator.interpolateTreeData(dataFrom, dataTo, 1.0);

      // Root should stay at origin (radius 0) regardless of angle
      expect(result.nodes[0].position[0]).to.be.closeTo(0, 0.01);
      expect(result.nodes[0].position[1]).to.be.closeTo(0, 0.01);
    });
  });
});

describe('TreeInterpolator - Subtree-Only Movement', () => {
  let interpolator;

  beforeEach(() => {
    interpolator = new TreeInterpolator();
  });

  describe('_isElementMoving', () => {
    it('should return true when movingSet is null (default behavior)', () => {
      const element = { split_indices: [1, 2, 3] };
      expect(interpolator._isElementMoving(element, null)).to.equal(true);
    });

    it('should return true when element split_indices overlap with movingSet', () => {
      const element = { split_indices: [1, 2, 3] };
      const movingSet = new Set([2, 4, 5]);
      expect(interpolator._isElementMoving(element, movingSet)).to.equal(true);
    });

    it('should return false when element split_indices do not overlap with movingSet', () => {
      const element = { split_indices: [1, 2, 3] };
      const movingSet = new Set([4, 5, 6]);
      expect(interpolator._isElementMoving(element, movingSet)).to.equal(false);
    });

    it('should return true when element has no split_indices (default to moving)', () => {
      const element = { id: 'node1' };
      const movingSet = new Set([1, 2, 3]);
      expect(interpolator._isElementMoving(element, movingSet)).to.equal(true);
    });
  });

  describe('interpolateTreeData with movingSubtree', () => {
    it('should keep non-moving nodes at from position', () => {
      const dataFrom = {
        nodes: [
          { id: 'n1', split_indices: [1], position: [10, 20, 0], radius: 5, angle: 0, polarRadius: 22 },
          { id: 'n2', split_indices: [2], position: [30, 40, 0], radius: 5, angle: 0.5, polarRadius: 50 }
        ],
        links: [],
        labels: [],
        extensions: []
      };
      const dataTo = {
        nodes: [
          { id: 'n1', split_indices: [1], position: [50, 60, 0], radius: 5, angle: 0.3, polarRadius: 78 },
          { id: 'n2', split_indices: [2], position: [70, 80, 0], radius: 5, angle: 0.8, polarRadius: 106 }
        ],
        links: [],
        labels: [],
        extensions: []
      };

      // Only node with split_index 1 should move
      const result = interpolator.interpolateTreeData(dataFrom, dataTo, 0.5, { movingSubtree: [1] });

      // Node 1 should have interpolated (moved)
      // Node 2 should stay at from position
      expect(result.nodes[1].position[0]).to.equal(30);
      expect(result.nodes[1].position[1]).to.equal(40);
    });
  });
});
