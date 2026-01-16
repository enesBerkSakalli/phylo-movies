import { calculateInterpolatedBranchCoordinates } from '../../layout/RadialTreeGeometry.js';
import { unwrapAngle, shortestAngle } from '../../../domain/math/mathUtils.js';

/** Default number of segments for arc generation */
export const ARC_SEGMENT_COUNT = 16;

/**
 * PathInterpolator - Handles path interpolation for tree branches
 * Supports both polar (radial) and linear interpolation strategies
 */
export class PathInterpolator {
  constructor() {
    this.segmentCount = ARC_SEGMENT_COUNT;
    this._angleCache = new Map();
    this._normalizationCache = new Map();
  }

  /**
   * Interpolate between two paths using appropriate strategy
   * @param {Array} fromPath - Source path points
   * @param {Array} toPath - Target path points
   * @param {number} timeFactor - Interpolation factor (0-1)
   * @param {Object} fromLink - Source link data (optional, for polar interpolation)
   * @param {Object} toLink - Target link data (optional, for polar interpolation)
   * @returns {Float32Array} Interpolated path points in flat format [x0, y0, z0, x1, y1, z1, ...]
   */
  interpolatePath(fromPath, toPath, timeFactor, fromLink = null, toLink = null) {
    const t = Math.max(0, Math.min(1, timeFactor));
    // Try polar interpolation first if data is available
    if (this._canUsePolarInterpolation(fromLink, toLink)) {
      try {
        return this._polarInterpolatePath(fromLink, toLink, t);
      } catch (error) {
        console.warn('[PathInterpolator] Polar interpolation failed, falling back to linear:', error);
      }
    }

    // Fallback to linear interpolation
    return this.linearInterpolatePath(fromPath, toPath, t, fromLink, toLink);
  }

  /**
   * Check if polar interpolation is possible
   * @private
   */
  _canUsePolarInterpolation(fromLink, toLink) {
    const hasFinite = (value) => Number.isFinite(value);
    const hasPosition = (pos) =>
      Array.isArray(pos) &&
      pos.length >= 2 &&
      hasFinite(pos[0]) &&
      hasFinite(pos[1]);

    return !!(
      fromLink &&
      toLink &&
      fromLink.polarData &&
      toLink.polarData &&
      fromLink.polarData.source &&
      fromLink.polarData.target &&
      toLink.polarData.source &&
      toLink.polarData.target &&
      hasFinite(fromLink.polarData.source.angle) &&
      hasFinite(fromLink.polarData.source.radius) &&
      hasFinite(fromLink.polarData.target.angle) &&
      hasFinite(fromLink.polarData.target.radius) &&
      hasFinite(toLink.polarData.source.angle) &&
      hasFinite(toLink.polarData.source.radius) &&
      hasFinite(toLink.polarData.target.angle) &&
      hasFinite(toLink.polarData.target.radius) &&
      hasPosition(toLink.sourcePosition) &&
      hasPosition(toLink.targetPosition)
    );
  }

  /**
   * Perform polar interpolation for radial tree layouts
   * @private
   */
  _polarInterpolatePath(fromLink, toLink, timeFactor) {
    const t = Math.max(0, Math.min(1, timeFactor));
    const linkId = toLink?.id ?? fromLink?.id;
    const cached = linkId != null ? this._angleCache.get(linkId) : null;
    const fromSourceAngle = unwrapAngle(fromLink.polarData.source.angle, cached?.sourceAngle);
    const fromTargetAngle = unwrapAngle(fromLink.polarData.target.angle, cached?.targetAngle);
    const toSourceAngle = unwrapAngle(toLink.polarData.source.angle, fromSourceAngle);
    const toTargetAngle = unwrapAngle(toLink.polarData.target.angle, fromTargetAngle);

    if (linkId != null && t === 1 && Number.isFinite(toSourceAngle) && Number.isFinite(toTargetAngle)) {
      this._angleCache.set(linkId, {
        sourceAngle: toSourceAngle,
        targetAngle: toTargetAngle
      });
    }

    // Create link data structure for calculateInterpolatedBranchCoordinates
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

    // Use the same polar interpolation as SVG renderer
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

    // Convert coordinates to path points
    return this._coordinatesToPath(coordinates);
  }

  /**
   * Convert branch coordinates to path format
   * @private
   */
  _coordinatesToPath(coordinates) {
    const { movePoint, arcEndPoint, lineEndPoint, arcProperties } = coordinates;

    if (!arcProperties) {
      // Straight line
      const result = new Float32Array(6);
      result[0] = movePoint.x;
      result[1] = movePoint.y;
      result[2] = 0;
      result[3] = lineEndPoint.x;
      result[4] = lineEndPoint.y;
      result[5] = 0;
      return result;
    }

    // Generate arc points
    const { radius, startAngle, endAngle, center, angleDiff: arcAngleDiff } = arcProperties;

    // Calculate dynamic segment count based on arc length
    const angleDiff = Number.isFinite(arcAngleDiff)
      ? arcAngleDiff
      : shortestAngle(startAngle, endAngle);

    const arcLength = Math.abs(angleDiff * radius);
    const targetPixelsPerSegment = 15;
    const dynamicSegmentCount = Math.min(
      100, // Reduced hard limit for performance
      Math.max(
        this.segmentCount, // Use base count as minimum
        Math.ceil(arcLength / targetPixelsPerSegment)
      )
    );

    // Initial move point + dynamic segments + final line endpoint
    // Total points = 1 (move) + dynamicSegmentCount + 1 (final)
    const totalPoints = dynamicSegmentCount + 2;
    const result = new Float32Array(totalPoints * 3);

    // 1. Move point
    result[0] = movePoint.x;
    result[1] = movePoint.y;
    result[2] = 0;

    // 2. Arc segments
    for (let i = 1; i <= dynamicSegmentCount; i++) {
      const t = i / dynamicSegmentCount;
      const angle = startAngle + angleDiff * t;
      const x = center.x + radius * Math.cos(angle);
      const y = center.y + radius * Math.sin(angle);

      const idx = i * 3;
      result[idx] = x;
      result[idx + 1] = y;
      result[idx + 2] = 0;
    }

    // Adjust last arc point to match arcEndPoint exactly if provided
    if (arcEndPoint) {
      const idx = dynamicSegmentCount * 3;
      result[idx] = arcEndPoint.x;
      result[idx + 1] = arcEndPoint.y;
      result[idx + 2] = 0;
    }

    // 3. Final line segment
    const lastIdx = (totalPoints - 1) * 3;
    result[lastIdx] = lineEndPoint.x;
    result[lastIdx + 1] = lineEndPoint.y;
    result[lastIdx + 2] = 0;

    return result;
  }

  /**
   * Linear interpolation between two paths
   * @param {Array} fromPath - Source path points
   * @param {Array} toPath - Target path points
   * @param {number} timeFactor - Interpolation factor (0-1)
   * @param {Object} fromLink - Source link context
   * @param {Object} toLink - Target link context
   * @returns {Float32Array} Interpolated path points
   */
  linearInterpolatePath(fromPath, toPath, timeFactor, fromLink = null, toLink = null) {
    if (!fromPath || !toPath) {
      const path = toPath || fromPath || [];
      return path instanceof Float32Array ? path : this._toFlatTypedArray(path);
    }

    const t = Math.max(0, Math.min(1, timeFactor));

    let fFlat, tFlat;

    // Use cache if context objects are provided
    const cacheKey = fromLink || toLink;
    if (cacheKey && this._normalizationCache.has(cacheKey)) {
      const cached = this._normalizationCache.get(cacheKey);
      fFlat = cached.fFlat;
      tFlat = cached.tFlat;
    } else {
      // Ensure paths have same number of points for smooth interpolation
      const maxLength = Math.max(fromPath.length, toPath.length);
      const nFrom = this._normalizePath(fromPath, maxLength);
      const nTo = this._normalizePath(toPath, maxLength);

      fFlat = this._toFlatTypedArray(nFrom);
      tFlat = this._toFlatTypedArray(nTo);

      if (cacheKey) {
        this._normalizationCache.set(cacheKey, { fFlat, tFlat });
      }
    }

    // Interpolate each coordinate directly into a new Float32Array
    const count = fFlat.length;
    const result = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      result[i] = fFlat[i] + (tFlat[i] - fFlat[i]) * t;
    }

    return result;
  }

  /**
   * Convert point arrays to flat Float32Array
   * @private
   */
  _toFlatTypedArray(path) {
    if (!path || path.length === 0) return new Float32Array(0);
    const result = new Float32Array(path.length * 3);
    for (let i = 0; i < path.length; i++) {
      const p = path[i];
      result[i * 3] = p[0];
      result[i * 3 + 1] = p[1];
      result[i * 3 + 2] = p[2] || 0;
    }
    return result;
  }

  /**
   * Normalize path to have specific number of points
   * @private
   */
  _normalizePath(path, targetLength) {
    if (path.length === targetLength) return path;
    if (path.length === 0) return Array.from({ length: targetLength }, () => [0, 0, 0]);
    if (path.length === 1) return Array.from({ length: targetLength }, () => [...path[0]]);

    const normalized = [];
    const step = (path.length - 1) / (targetLength - 1);

    for (let i = 0; i < targetLength; i++) {
      const index = i * step;
      const lowIndex = Math.floor(index);
      const highIndex = Math.ceil(index);
      const fraction = index - lowIndex;

      if (highIndex >= path.length) {
        normalized.push(path[path.length - 1]);
      } else if (fraction === 0) {
        normalized.push(path[lowIndex]);
      } else {
        // Interpolate between two points
        const low = path[lowIndex];
        const high = path[highIndex];
        normalized.push(this._interpolatePoint(low, high, fraction));
      }
    }

    return normalized;
  }

  /**
   * Interpolate between two 3D points
   * @private
   */
  _interpolatePoint(fromPoint, toPoint, t) {
    const fromZ = Number.isFinite(fromPoint[2]) ? fromPoint[2] : 0;
    const toZ = Number.isFinite(toPoint[2]) ? toPoint[2] : 0;
    return [
      fromPoint[0] + (toPoint[0] - fromPoint[0]) * t,
      fromPoint[1] + (toPoint[1] - fromPoint[1]) * t,
      fromZ + (toZ - fromZ) * t
    ];
  }

  /**
   * Set segment count for arc generation
   * @param {number} count - Number of segments
   */
  setSegmentCount(count) {
    const next = Number.isFinite(count) ? Math.floor(count) : this.segmentCount;
    this.segmentCount = Math.max(4, next);
  }

  resetCaches() {
    this._angleCache.clear();
    this._normalizationCache.clear();
  }

  clearNormalizationCache() {
    this._normalizationCache.clear();
  }

}
