import { calculateInterpolatedBranchCoordinates } from '../../layout/RadialTreeGeometry.js';

/** Default number of segments for arc generation */
export const ARC_SEGMENT_COUNT = 16;

/**
 * PathInterpolator - Handles path interpolation for tree branches
 * Supports both polar (radial) and linear interpolation strategies
 */
export class PathInterpolator {
  constructor() {
    this.segmentCount = ARC_SEGMENT_COUNT;
  }

  /**
   * Interpolate between two paths using appropriate strategy
   * @param {Array} fromPath - Source path points
   * @param {Array} toPath - Target path points
   * @param {number} timeFactor - Interpolation factor (0-1)
   * @param {Object} fromLink - Source link data (optional, for polar interpolation)
   * @param {Object} toLink - Target link data (optional, for polar interpolation)
   * @returns {Array} Interpolated path points
   */
  interpolatePath(fromPath, toPath, timeFactor, fromLink = null, toLink = null) {
    // Try polar interpolation first if data is available
    if (this._canUsePolarInterpolation(fromLink, toLink)) {
      try {
        return this._polarInterpolatePath(fromLink, toLink, timeFactor);
      } catch (error) {
        console.warn('[PathInterpolator] Polar interpolation failed, falling back to linear:', error);
      }
    }

    // Fallback to linear interpolation
    return this.linearInterpolatePath(fromPath, toPath, timeFactor);
  }

  /**
   * Check if polar interpolation is possible
   * @private
   */
  _canUsePolarInterpolation(fromLink, toLink) {
    return fromLink && toLink &&
           fromLink.polarData && toLink.polarData &&
           fromLink.polarData.source && fromLink.polarData.target &&
           toLink.polarData.source && toLink.polarData.target;
  }

  /**
   * Perform polar interpolation for radial tree layouts
   * @private
   */
  _polarInterpolatePath(fromLink, toLink, timeFactor) {
    // Create link data structure for calculateInterpolatedBranchCoordinates
    const linkData = {
      source: {
        angle: toLink.polarData.source.angle,
        radius: toLink.polarData.source.radius,
        x: toLink.sourcePosition[0],
        y: toLink.sourcePosition[1]
      },
      target: {
        angle: toLink.polarData.target.angle,
        radius: toLink.polarData.target.radius,
        x: toLink.targetPosition[0],
        y: toLink.targetPosition[1]
      }
    };

    // Use the same polar interpolation as SVG renderer
    const coordinates = calculateInterpolatedBranchCoordinates(
      linkData,
      timeFactor,
      fromLink.polarData.source.angle,
      fromLink.polarData.source.radius,
      fromLink.polarData.target.angle,
      fromLink.polarData.target.radius
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
      return [
        [movePoint.x, movePoint.y, 0],
        [lineEndPoint.x, lineEndPoint.y, 0]
      ];
    }

    // Generate arc points
    const points = [];
    const { radius, startAngle, endAngle, center } = arcProperties;

    // Start with move point
    points.push([movePoint.x, movePoint.y, 0]);

    // Arc segment - generate smooth curve points with shortest path
    for (let i = 0; i <= this.segmentCount; i++) {
      const t = i / this.segmentCount;

      // Use shortest angle interpolation
      const angleDiff = this._shortestAngleDifference(startAngle, endAngle);
      const angle = startAngle + angleDiff * t;

      const x = center.x + radius * Math.cos(angle);
      const y = center.y + radius * Math.sin(angle);
      points.push([x, y, 0]);
    }

    // Final line segment
    points.push([lineEndPoint.x, lineEndPoint.y, 0]);

    return points;
  }

  /**
   * Linear interpolation between two paths
   * @param {Array} fromPath - Source path points
   * @param {Array} toPath - Target path points
   * @param {number} timeFactor - Interpolation factor (0-1)
   * @returns {Array} Interpolated path points
   */
  linearInterpolatePath(fromPath, toPath, timeFactor) {
    if (!fromPath || !toPath) return toPath || fromPath || [];

    // Ensure paths have same number of points for smooth interpolation
    const maxLength = Math.max(fromPath.length, toPath.length);
    const normalizedFrom = this._normalizePath(fromPath, maxLength);
    const normalizedTo = this._normalizePath(toPath, maxLength);

    // Interpolate each point
    return normalizedFrom.map((fromPoint, i) => {
      const toPoint = normalizedTo[i];
      return this._interpolatePoint(fromPoint, toPoint, timeFactor);
    });
  }

  /**
   * Normalize path to have specific number of points
   * @private
   */
  _normalizePath(path, targetLength) {
    if (path.length === targetLength) return path;
    if (path.length === 0) return Array(targetLength).fill([0, 0, 0]);
    if (path.length === 1) return Array(targetLength).fill(path[0]);

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
    return [
      fromPoint[0] + (toPoint[0] - fromPoint[0]) * t,
      fromPoint[1] + (toPoint[1] - fromPoint[1]) * t,
      fromPoint[2] + (toPoint[2] - fromPoint[2]) * t
    ];
  }



  /**
   * Set segment count for arc generation
   * @param {number} count - Number of segments
   */
  setSegmentCount(count) {
    this.segmentCount = Math.max(4, count);
  }

  /**
   * Calculate shortest angle difference between two angles in radians
   * @param {number} fromAngle - Source angle in radians
   * @param {number} toAngle - Target angle in radians
   * @returns {number} Shortest angle difference in radians
   * @private
   */
  _shortestAngleDifference(fromAngle, toAngle) {
    const TAU = Math.PI * 2;
    let diff = (toAngle - fromAngle) % TAU;
    if (diff > Math.PI) diff -= TAU;
    if (diff <= -Math.PI) diff += TAU;
    return diff;
  }
}
