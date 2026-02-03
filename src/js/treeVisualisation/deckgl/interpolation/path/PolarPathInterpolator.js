/**
 * PolarPathInterpolator - Interpolates paths using polar coordinates
 * Used for animating tree branches and extensions in radial layouts
 */
import { calculateInterpolatedBranchCoordinates } from '../../../layout/RadialTreeGeometry.js';
import { shortestAngle, crossesAngle, longArcDelta } from '../../../../domain/math/mathUtils.js';
import { ARC_SEGMENT_COUNT } from '../../builders/geometry/links/LinkGeometryBuilder.js';

export class PolarPathInterpolator {
  constructor() {
    this.segmentCount = ARC_SEGMENT_COUNT;
    this._angleCache = new Map();
    // Root angle (where tree root is positioned) - default 0
    this._rootAngle = 0;
  }

  /**
   * Set the root angle for crossing detection
   * @param {number} angle - Root angle in radians (default 0)
   */
  setRootAngle(angle) {
    this._rootAngle = angle ?? 0;
  }

  /**
   * Calculate the correct delta for angle interpolation, avoiding root crossing.
   * @private
   */
  _getAngleDelta(fromAngle, toAngle) {
    const shortDelta = shortestAngle(fromAngle, toAngle);
    const shortEndAngle = fromAngle + shortDelta;
    const crossesRoot = crossesAngle(fromAngle, shortEndAngle, this._rootAngle);
    return crossesRoot ? longArcDelta(shortDelta) : shortDelta;
  }

  /**
   * Interpolate between two link states using polar coordinates
   * @param {Object} fromLink - Source link data with polarData
   * @param {Object} toLink - Target link data with polarData
   * @param {number} timeFactor - Interpolation factor (0-1)
   * @returns {Float32Array} Interpolated path points
   * @throws {Error} If polarData is missing
   */
  interpolatePath(fromLink, toLink, timeFactor) {
    // Fail-fast: polar data is required
    if (!fromLink?.polarData || !toLink?.polarData) {
      throw new Error(`Missing polarData for link interpolation: ${toLink?.id ?? fromLink?.id}`);
    }

    const t = Math.max(0, Math.min(1, timeFactor));

    // Get source angles
    const fromSourceAngle = fromLink.polarData.source.angle;
    const toSourceAngle = toLink.polarData.source.angle;

    // Get target angles
    const fromTargetAngle = fromLink.polarData.target.angle;
    const toTargetAngle = toLink.polarData.target.angle;

    // Calculate deltas that avoid crossing the root
    const sourceDelta = this._getAngleDelta(fromSourceAngle, toSourceAngle);
    const targetDelta = this._getAngleDelta(fromTargetAngle, toTargetAngle);

    // Calculate interpolated angles
    const interpSourceAngle = fromSourceAngle + sourceDelta * t;
    const interpTargetAngle = fromTargetAngle + targetDelta * t;

    // Interpolate radii
    const interpSourceRadius = fromLink.polarData.source.radius +
      (toLink.polarData.source.radius - fromLink.polarData.source.radius) * t;
    const interpTargetRadius = fromLink.polarData.target.radius +
      (toLink.polarData.target.radius - fromLink.polarData.target.radius) * t;

    // Build link data for geometry calculation with interpolated values
    const linkData = {
      source: {
        angle: interpSourceAngle,
        radius: interpSourceRadius,
        x: interpSourceRadius * Math.cos(interpSourceAngle),
        y: interpSourceRadius * Math.sin(interpSourceAngle)
      },
      target: {
        angle: interpTargetAngle,
        radius: interpTargetRadius,
        x: interpTargetRadius * Math.cos(interpTargetAngle),
        y: interpTargetRadius * Math.sin(interpTargetAngle)
      }
    };

    // Use static branch coordinates calculation (t=1, no further interpolation needed)
    const coordinates = calculateInterpolatedBranchCoordinates(
      linkData,
      1.0, // Already interpolated
      interpSourceAngle,
      interpSourceRadius,
      interpTargetAngle,
      interpTargetRadius,
      undefined,
      { useShortestAngle: true } // OK to use shortest for arc within branch
    );

    // Apply strict root crossing check on the generated geometry
    if (coordinates.arcProperties) {
      const { startAngle, angleDiff } = coordinates.arcProperties;
      const endAngle = startAngle + angleDiff;

      // If the generated arc cuts through the root gap, invert it to go the long way
      if (crossesAngle(startAngle, endAngle, this._rootAngle)) {
        coordinates.arcProperties.angleDiff = longArcDelta(angleDiff);
      }
    }

    return this._coordinatesToPath(coordinates);
  }

  /**
   * Convert branch coordinates to flat path array
   * @private
   */
  _coordinatesToPath(coordinates) {
    const { movePoint, arcEndPoint, lineEndPoint, arcProperties } = coordinates;

    // Straight line (no arc)
    if (!arcProperties) {
      const result = new Float32Array(6);
      result[0] = movePoint.x;
      result[1] = movePoint.y;
      result[2] = 0;
      result[3] = lineEndPoint.x;
      result[4] = lineEndPoint.y;
      result[5] = 0;
      return result;
    }

    // Arc + radial line
    const { radius, startAngle, center, angleDiff: arcAngleDiff } = arcProperties;
    const angleDiff = Number.isFinite(arcAngleDiff)
      ? arcAngleDiff
      : shortestAngle(startAngle, arcProperties.endAngle);

    // Dynamic segment count based on arc length
    const arcLength = Math.abs(angleDiff * radius);
    const segmentCount = Math.min(100, Math.max(this.segmentCount, Math.ceil(arcLength / 15)));

    const totalPoints = segmentCount + 2;
    const result = new Float32Array(totalPoints * 3);

    // Move point
    result[0] = movePoint.x;
    result[1] = movePoint.y;
    result[2] = 0;

    // Arc segments
    for (let i = 1; i <= segmentCount; i++) {
      const t = i / segmentCount;
      const angle = startAngle + angleDiff * t;
      const idx = i * 3;
      result[idx] = center.x + radius * Math.cos(angle);
      result[idx + 1] = center.y + radius * Math.sin(angle);
      result[idx + 2] = 0;
    }

    // Snap last arc point to exact end
    if (arcEndPoint) {
      const idx = segmentCount * 3;
      result[idx] = arcEndPoint.x;
      result[idx + 1] = arcEndPoint.y;
    }

    // Final line endpoint
    const lastIdx = (totalPoints - 1) * 3;
    result[lastIdx] = lineEndPoint.x;
    result[lastIdx + 1] = lineEndPoint.y;
    result[lastIdx + 2] = 0;

    return result;
  }

  /**
   * Set segment count for arc generation
   */
  setSegmentCount(count) {
    this.segmentCount = Math.max(4, Math.floor(count) || ARC_SEGMENT_COUNT);
  }

  /**
   * Clear angle cache (call when switching tree pairs)
   */
  resetCaches() {
    this._angleCache.clear();
  }
}
