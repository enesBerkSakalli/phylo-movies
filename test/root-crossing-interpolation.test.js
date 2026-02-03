/**
 * Tests for root-crossing detection and long arc interpolation.
 * Ensures that nodes don't take the short path through the root (0°)
 * during radial tree animations.
 */
import { expect } from 'chai';
import {
  shortestAngle,
  crossesAngle,
  longArcDelta
} from '../src/js/domain/math/mathUtils.js';
import { PolarNodeInterpolator } from '../src/js/treeVisualisation/deckgl/interpolation/nodes/PolarNodeInterpolator.js';
import { PolarPathInterpolator } from '../src/js/treeVisualisation/deckgl/interpolation/path/PolarPathInterpolator.js';


describe('Root Crossing Detection', () => {
  describe('crossesAngle()', () => {
    const PI = Math.PI;
    const TAU = 2 * PI;

    it('should detect crossing 0° when going from small positive to large positive angle', () => {
      // 10° to 350° via shortest path (clockwise through 0°)
      const startAngle = 10 * PI / 180; // 10°
      const delta = shortestAngle(startAngle, 350 * PI / 180);
      const endAngle = startAngle + delta;

      expect(crossesAngle(startAngle, endAngle, 0)).to.be.true;
    });

    it('should detect crossing 0° when going from large positive to small positive angle', () => {
      // 350° to 10° via shortest path (counter-clockwise through 0°)
      const startAngle = 350 * PI / 180; // 350°
      const delta = shortestAngle(startAngle, 10 * PI / 180);
      const endAngle = startAngle + delta;

      expect(crossesAngle(startAngle, endAngle, 0)).to.be.true;
    });

    it('should NOT detect crossing when path stays in upper half', () => {
      // 45° to 135° - stays in upper quadrants
      const startAngle = 45 * PI / 180;
      const delta = shortestAngle(startAngle, 135 * PI / 180);
      const endAngle = startAngle + delta;

      expect(crossesAngle(startAngle, endAngle, 0)).to.be.false;
    });

    it('should NOT detect crossing when path stays in lower half', () => {
      // 225° to 315° - stays in lower quadrants
      const startAngle = 225 * PI / 180;
      const delta = shortestAngle(startAngle, 315 * PI / 180);
      const endAngle = startAngle + delta;

      expect(crossesAngle(startAngle, endAngle, 0)).to.be.false;
    });

    it('should NOT detect crossing for same start and end angle', () => {
      const angle = 45 * PI / 180;
      expect(crossesAngle(angle, angle, 0)).to.be.false;
    });

    it('should handle negative angles correctly', () => {
      // -10° to 10° should cross 0°
      const startAngle = -10 * PI / 180;
      const endAngle = 10 * PI / 180;
      expect(crossesAngle(startAngle, endAngle, 0)).to.be.true;
    });

    it('should handle angles greater than 2π', () => {
      // 370° to 350° (normalized: 10° to 350°)
      const startAngle = 370 * PI / 180;
      const delta = shortestAngle(startAngle, 350 * PI / 180);
      const endAngle = startAngle + delta;

      expect(crossesAngle(startAngle, endAngle, 0)).to.be.true;
    });

    it('should detect crossing custom target angle (e.g., 90°)', () => {
      // 80° to 100° crosses 90°
      const startAngle = 80 * PI / 180;
      const endAngle = 100 * PI / 180;
      const targetAngle = 90 * PI / 180;

      expect(crossesAngle(startAngle, endAngle, targetAngle)).to.be.true;
    });
  });

  describe('longArcDelta()', () => {
    const PI = Math.PI;
    const TAU = 2 * PI;

    it('should return opposite direction for positive short delta', () => {
      const shortDelta = PI / 4; // 45° counter-clockwise
      const longDelta = longArcDelta(shortDelta);

      // Long arc should be 315° clockwise (negative)
      expect(longDelta).to.be.closeTo(-7 * PI / 4, 0.001);
    });

    it('should return opposite direction for negative short delta', () => {
      const shortDelta = -PI / 6; // 30° clockwise
      const longDelta = longArcDelta(shortDelta);

      // Long arc should be 330° counter-clockwise (positive)
      expect(longDelta).to.be.closeTo(11 * PI / 6, 0.001);
    });

    it('should handle 180° case (ambiguous)', () => {
      const shortDelta = PI;
      const longDelta = longArcDelta(shortDelta);

      // Should return -π (opposite direction, same magnitude)
      expect(Math.abs(longDelta)).to.be.closeTo(PI, 0.001);
      expect(longDelta).to.be.closeTo(-PI, 0.001);
    });
  });

  describe('PolarNodeInterpolator with root crossing', () => {
    let interpolator;

    beforeEach(() => {
      interpolator = new PolarNodeInterpolator();
    });

    it('should take long arc when short path crosses root', () => {
      const fromNode = {
        angle: 10 * Math.PI / 180, // 10°
        polarPosition: 100
      };
      const toNode = {
        angle: 350 * Math.PI / 180, // 350°
        polarPosition: 100
      };

      // At t=0.5, if using short arc through 0°, angle would be ~0°
      // With long arc, angle should be ~180° (going the other way)
      const position = interpolator.interpolatePosition(fromNode, toNode, 0.5);

      // Extract angle from position
      const interpolatedAngle = Math.atan2(position[1], position[0]);
      const normalizedAngle = ((interpolatedAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

      // Should NOT be near 0° (that would mean it crossed the root)
      // Should be around 180° (going the long way)
      expect(normalizedAngle).to.be.greaterThan(Math.PI / 2);
      expect(normalizedAngle).to.be.lessThan(3 * Math.PI / 2);
    });

    it('should use short arc when path does not cross root', () => {
      const fromNode = {
        angle: 45 * Math.PI / 180, // 45°
        polarPosition: 100
      };
      const toNode = {
        angle: 135 * Math.PI / 180, // 135°
        polarPosition: 100
      };

      // At t=0.5, angle should be ~90°
      const position = interpolator.interpolatePosition(fromNode, toNode, 0.5);

      // Extract angle from position
      const interpolatedAngle = Math.atan2(position[1], position[0]);

      // Should be around 90° (midpoint of short arc)
      expect(interpolatedAngle).to.be.closeTo(Math.PI / 2, 0.1);
    });

    it('should interpolate radius correctly regardless of arc direction', () => {
      const fromNode = {
        angle: 10 * Math.PI / 180,
        polarPosition: 50
      };
      const toNode = {
        angle: 350 * Math.PI / 180,
        polarPosition: 150
      };

      const position = interpolator.interpolatePosition(fromNode, toNode, 0.5);

      // Radius at t=0.5 should be 100 (midpoint of 50 and 150)
      const interpolatedRadius = Math.sqrt(position[0] ** 2 + position[1] ** 2);
      expect(interpolatedRadius).to.be.closeTo(100, 0.1);
    });

    it('should handle custom root angle', () => {
      interpolator.setRootAngle(Math.PI / 2); // Root at 90°

      const fromNode = {
        angle: 80 * Math.PI / 180, // 80°
        polarPosition: 100
      };
      const toNode = {
        angle: 100 * Math.PI / 180, // 100°
        polarPosition: 100
      };

      // Short path crosses 90° (custom root), so should take long arc
      const position = interpolator.interpolatePosition(fromNode, toNode, 0.5);
      const interpolatedAngle = Math.atan2(position[1], position[0]);
      const normalizedAngle = ((interpolatedAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

      // Should NOT be near 90° (root) - should go the long way around
      // Long arc from 80° to 100° avoiding 90° would go through ~270°
      expect(Math.abs(normalizedAngle - Math.PI / 2)).to.be.greaterThan(0.5);

  describe('PolarPathInterpolator with root crossing', () => {
    let interpolator;

    beforeEach(() => {
      interpolator = new PolarPathInterpolator();
    });

    it('should invert path arc when generated arc crosses the root', () => {
      // Create a link that crosses 0° (Source: 350°, Target: 10°)
      const startAngle = 350 * Math.PI / 180;
      const endAngle = 10 * Math.PI / 180;

      const link = {
        polarData: {
          source: { angle: startAngle, radius: 100 },
          target: { angle: endAngle, radius: 100 }
        }
      };

      // interpolatePath expects fromLink and toLink (for animation)
      // If we pass the same link for both and t=0, it just calculates geometry for that link
      const path = interpolator.interpolatePath(link, link, 0);

      // Verify path geometry is a stored Float32Array
      // We can't easily check the exact arc path points without parsing the array,
      // but we can check if it generated a long arc (many segments) vs short arc.

      // However, calculating "segmentCount" is internal.
      // A better check might be to verify if the path points are in the expected range.
      // If it took the short path (crossing 0), points would be between -10 deg and +10 deg.
      // If it took the long path, points should exist near 180 deg.

      // Path format: [x, y, z, x, y, z, ...]
      let hasFarPoint = false;
      for (let i = 0; i < path.length; i += 3) {
        const x = path[i];
        const y = path[i+1];
        const angle = Math.atan2(y, x);
        const deg = angle * 180 / Math.PI;

        // If we find a point near 180 (-150 to +150 approx), it took the long way
        if (Math.abs(deg) > 150) {
          hasFarPoint = true;
          break;
        }
      }

      expect(hasFarPoint).to.be.true;
    });

    it('should NOT invert path arc when it does not cross root', () => {
      // 45° to 135° (standard arc)
      const startAngle = 45 * Math.PI / 180;
      const endAngle = 135 * Math.PI / 180;

      const link = {
        polarData: {
          source: { angle: startAngle, radius: 100 },
          target: { angle: endAngle, radius: 100 }
        }
      };

      const path = interpolator.interpolatePath(link, link, 0);

      // Should NOT have points near -180/180
      let hasFarPoint = false;
      for (let i = 0; i < path.length; i += 3) {
        const x = path[i];
        const y = path[i+1];
        const angle = Math.atan2(y, x);
        const deg = angle * 180 / Math.PI;

        if (Math.abs(deg) > 170) {
          hasFarPoint = true;
          break;
        }
      }

      expect(hasFarPoint).to.be.false;
    });
  });
    });
  });
});
