/**
 * PolarPathInterpolator - Interpolates paths using polar coordinates
 * Used for animating tree branches and extensions in radial layouts
 */
import { calculateInterpolatedBranchCoordinates } from '../../../layout/RadialTreeGeometry.js';
import { unwrapAngle, shortestAngle } from '../../../../domain/math/mathUtils.js';
import { ARC_SEGMENT_COUNT } from '../../builders/geometry/links/LinkGeometryBuilder.js';

export class PolarPathInterpolator {
  constructor() {
    this.segmentCount = ARC_SEGMENT_COUNT;
    this._angleCache = new Map();
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
    const linkId = toLink?.id ?? fromLink?.id;

    // Unwrap angles for continuous interpolation (prevents spinning)
    const cached = linkId != null ? this._angleCache.get(linkId) : null;
    const fromSourceAngle = unwrapAngle(fromLink.polarData.source.angle, cached?.sourceAngle);
    const fromTargetAngle = unwrapAngle(fromLink.polarData.target.angle, cached?.targetAngle);
    const toSourceAngle = unwrapAngle(toLink.polarData.source.angle, fromSourceAngle);
    const toTargetAngle = unwrapAngle(toLink.polarData.target.angle, fromTargetAngle);

    // Cache final angles for next frame
    if (linkId != null && t === 1 && Number.isFinite(toSourceAngle) && Number.isFinite(toTargetAngle)) {
      this._angleCache.set(linkId, {
        sourceAngle: toSourceAngle,
        targetAngle: toTargetAngle
      });
    }

    // Build link data for geometry calculation
    const linkData = {
      source: {
        angle: toSourceAngle,
        radius: toLink.polarData.source.radius,
        x: toLink.sourcePosition[0],
        y: toLink.sourcePosition[1]
      },
      target: {
        angle: toTargetAngle,
        radius: toLink.polarData.target.radius,
        x: toLink.targetPosition[0],
        y: toLink.targetPosition[1]
      }
    };

    // Calculate interpolated branch coordinates
    const coordinates = calculateInterpolatedBranchCoordinates(
      linkData,
      t,
      fromSourceAngle,
      fromLink.polarData.source.radius,
      fromTargetAngle,
      fromLink.polarData.target.radius,
      undefined,
      { useShortestAngle: false }
    );

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
