const { expect } = require('chai');
const sinon = require('sinon');
const { TreeInterpolator } = require('../src/js/treeVisualisation/deckgl/interpolation/TreeInterpolator.js');

describe('TreeInterpolator - Type-Safe Property Extraction', () => {
  let interpolator;

  beforeEach(() => {
    interpolator = new TreeInterpolator();
  });

  describe('_extractAngle()', () => {
    it('should extract angle from Node object', () => {
      const node = {
        id: 'node-1',
        angle: 1.57,
        polarRadius: 100,
        position: [0, 100, 0]
      };

      expect(interpolator._extractAngle(node)).to.equal(1.57);
    });

    it('should extract angle from Label object', () => {
      const label = {
        id: 'label-1',
        nodeId: 'node-1',
        angle: 2.35,
        polarRadius: 120,
        text: 'Species A'
      };

      expect(interpolator._extractAngle(label)).to.equal(2.35);
    });

    it('should extract angle from Extension object with polarData', () => {
      const extension = {
        id: 'extension-1',
        nodeId: 'node-1',
        polarData: {
          source: { angle: 0.785, radius: 100 },
          target: { angle: 0.785, radius: 120 }
        }
      };

      expect(interpolator._extractAngle(extension)).to.equal(0.785);
    });

    it('should extract angle from leaf reference as fallback', () => {
      const objWithLeaf = {
        id: 'obj-1',
        leaf: { angle: 3.14, radius: 100 }
      };

      expect(interpolator._extractAngle(objWithLeaf)).to.equal(3.14);
    });

    it('should return 0 and warn for object with no angle', () => {
      const consoleWarnStub = sinon.stub(console, 'warn');
      const invalidObj = { id: 'invalid', position: [0, 0, 0] };

      expect(interpolator._extractAngle(invalidObj)).to.equal(0);
      expect(consoleWarnStub.calledOnce).to.be.true;
      expect(consoleWarnStub.firstCall.args[0]).to.include('[TreeInterpolator]');

      consoleWarnStub.restore();
    });

    it('should handle null/undefined gracefully', () => {
      const consoleWarnStub = sinon.stub(console, 'warn');

      expect(interpolator._extractAngle(null)).to.equal(0);
      expect(interpolator._extractAngle(undefined)).to.equal(0);

      consoleWarnStub.restore();
    });
  });

  describe('_extractRadius()', () => {
    it('should extract polarRadius from Node object', () => {
      const node = {
        id: 'node-1',
        angle: 1.57,
        polarRadius: 150,
        radius: 2
      };

      expect(interpolator._extractRadius(node)).to.equal(150);
    });

    it('should extract radius as fallback from Node object', () => {
      const node = {
        id: 'node-1',
        angle: 1.57,
        radius: 2
      };

      expect(interpolator._extractRadius(node)).to.equal(2);
    });

    it('should extract polarRadius from Label object', () => {
      const label = {
        id: 'label-1',
        angle: 2.35,
        polarRadius: 160
      };

      expect(interpolator._extractRadius(label)).to.equal(160);
    });

    it('should extract radius from Extension polarData', () => {
      const extension = {
        id: 'extension-1',
        polarData: {
          source: { angle: 0.785, radius: 100 },
          target: { angle: 0.785, radius: 120 }
        }
      };

      expect(interpolator._extractRadius(extension)).to.equal(100);
    });

    it('should extract radius from leaf reference as fallback', () => {
      const objWithLeaf = {
        id: 'obj-1',
        leaf: { angle: 3.14, radius: 100 }
      };

      expect(interpolator._extractRadius(objWithLeaf)).to.equal(100);
    });

    it('should return 0 and warn for object with no radius', () => {
      const consoleWarnStub = sinon.stub(console, 'warn');
      const invalidObj = { id: 'invalid', position: [0, 0, 0] };

      expect(interpolator._extractRadius(invalidObj)).to.equal(0);
      expect(consoleWarnStub.called).to.be.true;

      consoleWarnStub.restore();
    });
  });

  describe('_extractNodeId()', () => {
    it('should extract id from Node object', () => {
      const node = { id: 'node-123', angle: 1.57 };
      expect(interpolator._extractNodeId(node)).to.equal('node-123');
    });

    it('should extract id from Label object (id takes priority over nodeId)', () => {
      const label = { id: 'label-1', nodeId: 'node-123' };
      expect(interpolator._extractNodeId(label)).to.equal('label-1');
    });

    it('should extract id from Extension object (id takes priority)', () => {
      const ext = { id: 'ext-1', nodeId: 'node-123', globalId: 'global-123' };
      expect(interpolator._extractNodeId(ext)).to.equal('ext-1');
    });

    it('should return null for object with no ID', () => {
      const invalidObj = { position: [0, 0, 0] };
      expect(interpolator._extractNodeId(invalidObj)).to.be.null;
    });
  });
});

describe('TreeInterpolator - Angle Interpolation', () => {
  let interpolator;

  beforeEach(() => {
    interpolator = new TreeInterpolator();
  });

  describe('angleAt() - Basic Shortest Path', () => {
    it('should interpolate angle along shortest path (clockwise)', () => {
      const fromNode = { id: 'n1', angle: 0, polarRadius: 100 };
      const toNode = { id: 'n1', angle: Math.PI / 2, polarRadius: 100 }; // 90°

      const angle = interpolator.angleAt(fromNode, toNode, 0.5, null);

      expect(angle).to.be.closeTo(Math.PI / 4, 0.00001); // 45° (halfway)
    });

    it('should interpolate angle along shortest path (counter-clockwise)', () => {
      const fromNode = { id: 'n1', angle: Math.PI / 2, polarRadius: 100 }; // 90°
      const toNode = { id: 'n1', angle: 0, polarRadius: 100 };

      const angle = interpolator.angleAt(fromNode, toNode, 0.5, null);

      expect(angle).to.be.closeTo(Math.PI / 4, 0.00001); // 45° (halfway)
    });

    it('should handle wraparound at 360° boundary', () => {
      const fromNode = { id: 'n1', angle: Math.PI * 1.9, polarRadius: 100 }; // ~342°
      const toNode = { id: 'n1', angle: Math.PI * 0.1, polarRadius: 100 };   // ~18°

      const angle = interpolator.angleAt(fromNode, toNode, 0.5, null);

      // Should go through 0° (360°), not the long way
      expect(Math.abs(angle)).to.be.lessThan(Math.PI / 4);
    });

    it('should return start angle at t=0', () => {
      const fromNode = { id: 'n1', angle: 1.0, polarRadius: 100 };
      const toNode = { id: 'n1', angle: 2.0, polarRadius: 100 };

      const angle = interpolator.angleAt(fromNode, toNode, 0, null);

      expect(angle).to.be.closeTo(1.0, 0.00001);
    });

    it('should return end angle at t=1', () => {
      const fromNode = { id: 'n1', angle: 1.0, polarRadius: 100 };
      const toNode = { id: 'n1', angle: 2.0, polarRadius: 100 };

      const angle = interpolator.angleAt(fromNode, toNode, 1, null);

      expect(angle).to.be.closeTo(2.0, 0.00001);
    });
  });

  describe('angleAt() - Group Consensus (disabled)', () => {
    it('ignores group direction and uses shortest path (strong consensus)', () => {
      const fromNode = { id: 'n1', angle: 0, polarRadius: 100 };
      const toNode = { id: 'n1', angle: Math.PI / 4, polarRadius: 100 }; // 45°

      const context = {
        nodeToGroup: new Map([
          ['n1', { sign: -1, consensus: 0.9 }]
        ]),
        subtreeRigidMode: true
      };

      const angle = interpolator.angleAt(fromNode, toNode, 0.5, context);

      // Shortest path, halfway
      expect(angle).to.be.closeTo(Math.PI / 8, 0.00001);
    });

    it('uses shortest path regardless of weak consensus', () => {
      const fromNode = { id: 'n1', angle: 0, polarRadius: 100 };
      const toNode = { id: 'n1', angle: Math.PI / 4, polarRadius: 100 }; // 45°

      const context = {
        nodeToGroup: new Map([
          ['n1', { sign: -1, consensus: 0.6 }]
        ]),
        subtreeRigidMode: true
      };

      const angle = interpolator.angleAt(fromNode, toNode, 0.5, context);

      expect(angle).to.be.closeTo(Math.PI / 8, 0.00001);
    });

    it('uses shortest path for small rotations', () => {
      const fromNode = { id: 'n1', angle: 0, polarRadius: 100 };
      const toNode = { id: 'n1', angle: Math.PI / 12, polarRadius: 100 }; // 15°

      const context = {
        nodeToGroup: new Map([
          ['n1', { sign: -1, consensus: 0.9 }]
        ]),
        subtreeRigidMode: true
      };

      const angle = interpolator.angleAt(fromNode, toNode, 0.5, context);

      expect(angle).to.be.closeTo(Math.PI / 24, 0.00001);
    });
  });

  describe('angleAt() - Extension Objects', () => {
    it('should work with Extension objects (polarData structure)', () => {
      const fromExt = {
        id: 'ext-1',
        polarData: { source: { angle: 0, radius: 100 } }
      };
      const toExt = {
        id: 'ext-1',
        polarData: { source: { angle: Math.PI / 2, radius: 100 } }
      };

      const angle = interpolator.angleAt(fromExt, toExt, 0.5, null);

      expect(angle).to.be.closeTo(Math.PI / 4, 0.00001); // 45°
    });

    it('should work with mixed Node and Extension objects', () => {
      const fromNode = { id: 'n1', angle: 0, polarRadius: 100 };
      const toExt = {
        id: 'ext-1',
        polarData: { source: { angle: Math.PI / 2, radius: 100 } }
      };

      const angle = interpolator.angleAt(fromNode, toExt, 0.5, null);

      expect(angle).to.be.closeTo(Math.PI / 4, 0.00001);
    });
  });

  describe('radiusAt()', () => {
    it('should interpolate radius linearly', () => {
      const fromNode = { id: 'n1', polarRadius: 100 };
      const toNode = { id: 'n1', polarRadius: 200 };

      const radius = interpolator.radiusAt(fromNode, toNode, 0.5);

      expect(radius).to.equal(150);
    });

    it('should work with Extension objects', () => {
      const fromExt = {
        id: 'ext-1',
        polarData: { source: { angle: 0, radius: 100 } }
      };
      const toExt = {
        id: 'ext-1',
        polarData: { source: { angle: 0, radius: 200 } }
      };

      const radius = interpolator.radiusAt(fromExt, toExt, 0.5);

      expect(radius).to.equal(150);
    });

    it('should handle objects with only radius property (no polarRadius)', () => {
      const fromNode = { id: 'n1', radius: 50 };
      const toNode = { id: 'n1', radius: 100 };

      const radius = interpolator.radiusAt(fromNode, toNode, 0.5);

      expect(radius).to.equal(75);
    });

    it('should clamp t to [0, 1] range', () => {
      const fromNode = { id: 'n1', polarRadius: 100 };
      const toNode = { id: 'n1', polarRadius: 200 };

      expect(interpolator.radiusAt(fromNode, toNode, -0.5)).to.equal(100); // t=0
      expect(interpolator.radiusAt(fromNode, toNode, 1.5)).to.equal(200);  // t=1
    });
  });
});

describe('TreeInterpolator - _interpolateRotationWithContext', () => {
  let interpolator;

  beforeEach(() => {
    interpolator = new TreeInterpolator();
  });

  it('should calculate shortest path rotation', () => {
    const result = interpolator._interpolateRotationWithContext(0, Math.PI / 2, 0.5);
    expect(result).to.be.closeTo(Math.PI / 4, 0.00001);
  });

  it('should handle 360° wraparound correctly', () => {
    const fromAngle = Math.PI * 1.9; // ~342°
    const toAngle = Math.PI * 0.1;   // ~18°

    const result = interpolator._interpolateRotationWithContext(fromAngle, toAngle, 0.5);

    // Should interpolate through 0° (shortest path)
    expect(Math.abs(result)).to.be.lessThan(Math.PI / 4);
  });

  it('should ignore group direction and use shortest path', () => {
    const context = {
      nodeToGroup: new Map([
        ['n1', { sign: -1, consensus: 0.9 }]
      ]),
      newAngles: new Map()
    };

    const result = interpolator._interpolateRotationWithContext(
      0,
      Math.PI / 4, // 45° clockwise
      0.5,
      'n1',
      context
    );

    // Should take the shortest path (22.5°)
    expect(result).to.be.closeTo(Math.PI / 8, 0.00001);
  });

  it('should store result in newAngles map when provided', () => {
    const context = {
      newAngles: new Map()
    };

    interpolator._interpolateRotationWithContext(0, Math.PI, 0.5, 'n1', context);

    expect(context.newAngles.has('n1')).to.be.true;
    expect(context.newAngles.get('n1')).to.be.closeTo(Math.PI / 2, 0.00001);
  });
});

describe('TreeInterpolator - Edge Cases', () => {
  let interpolator;

  beforeEach(() => {
    interpolator = new TreeInterpolator();
  });

  it('should handle negative angles correctly', () => {
    const fromNode = { id: 'n1', angle: -Math.PI / 4, polarRadius: 100 };
    const toNode = { id: 'n1', angle: Math.PI / 4, polarRadius: 100 };

    const angle = interpolator.angleAt(fromNode, toNode, 0.5, null);

    expect(angle).to.be.closeTo(0, 0.00001);
  });

  it('should handle 180° rotations correctly (no ambiguity)', () => {
    const fromNode = { id: 'n1', angle: 0, polarRadius: 100 };
    const toNode = { id: 'n1', angle: Math.PI, polarRadius: 100 };

    const angle = interpolator.angleAt(fromNode, toNode, 0.5, null);

    // Either direction is valid for 180°, but should be consistent
    expect(Math.abs(angle - Math.PI / 2)).to.be.lessThan(0.01);
  });

  it('should handle very small angle differences', () => {
    const fromNode = { id: 'n1', angle: 1.0, polarRadius: 100 };
    const toNode = { id: 'n1', angle: 1.0001, polarRadius: 100 };

    const angle = interpolator.angleAt(fromNode, toNode, 0.5, null);

    expect(angle).to.be.closeTo(1.00005, 0.00001);
  });

  it('should handle identical angles', () => {
    const fromNode = { id: 'n1', angle: 1.5, polarRadius: 100 };
    const toNode = { id: 'n1', angle: 1.5, polarRadius: 100 };

    const angle = interpolator.angleAt(fromNode, toNode, 0.5, null);

    expect(angle).to.equal(1.5);
  });

  it('should handle zero radius gracefully', () => {
    const fromNode = { id: 'n1', polarRadius: 0 };
    const toNode = { id: 'n1', polarRadius: 100 };

    const radius = interpolator.radiusAt(fromNode, toNode, 0.5);

    expect(radius).to.equal(50);
  });
});
