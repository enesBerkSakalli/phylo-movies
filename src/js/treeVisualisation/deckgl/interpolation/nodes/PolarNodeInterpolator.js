/**
 * PolarNodeInterpolator - Interpolates node positions using polar coordinates
 * Handles smooth interpolation of tree nodes in radial layouts
 */
import { shortestAngle, crossesAngle, longArcDelta } from '../../../../domain/math/mathUtils.js';

export class PolarNodeInterpolator {
  constructor() {
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
   * Interpolate node data between two states
   * @param {Object} fromNode - Source node data
   * @param {Object} toNode - Target node data
   * @param {number} t - Interpolation factor (0-1)
   * @returns {Object} Interpolated node data
   */
  interpolateNode(fromNode, toNode, t) {
    return {
      ...toNode,
      position: this.interpolatePosition(fromNode, toNode, t),
      radius: this._interpolateScalar(fromNode.radius, toNode.radius, t),
      // Preserve properties from target
      name: toNode.name,
      isLeaf: toNode.isLeaf,
      split_indices: toNode.split_indices
    };
  }

  /**
   * Interpolate 3D position using polar coordinates
   * Enables smooth arc-based movement in radial layouts.
   * Avoids crossing through the root (0°) by taking the long arc when necessary.
   * @param {Object} fromNode - Source node with position/angle data
   * @param {Object} toNode - Target node with position/angle data
   * @param {number} t - Interpolation factor (0-1)
   * @returns {Array} [x, y, z] interpolated position
   */
  interpolatePosition(fromNode, toNode, t) {
    if (!fromNode || !toNode) return [0, 0, 0];

    // Use polarPosition (distance from center) for position interpolation
    // Fallback to radius for backwards compatibility
    const fromR = fromNode.polarPosition ?? fromNode.radius ?? 0;
    const toR = toNode.polarPosition ?? toNode.radius ?? 0;
    const interpolatedRadius = this._interpolateScalar(fromR, toR, t);

    // Get angles
    const fromAngle = fromNode.angle || 0;
    const toAngleRaw = toNode.angle || 0;

    // Calculate shortest angular delta
    const shortDelta = shortestAngle(fromAngle, toAngleRaw);

    // Check if the short path would cross through the root (0°)
    // If so, take the long arc instead to avoid visual crossing
    const shortEndAngle = fromAngle + shortDelta;
    const crossesRoot = crossesAngle(fromAngle, shortEndAngle, this._rootAngle);

    // Use long arc if crossing root, otherwise use short arc
    const delta = crossesRoot ? longArcDelta(shortDelta) : shortDelta;
    const interpolatedAngle = fromAngle + delta * t;

    // Convert back to Cartesian coordinates
    const x = interpolatedRadius * Math.cos(interpolatedAngle);
    const y = interpolatedRadius * Math.sin(interpolatedAngle);
    const z = 0; // 2D tree in 3D space

    return [x, y, z];
  }

  /**
   * Interpolate scalar value
   * @private
   */
  _interpolateScalar(from, to, t) {
    const fromVal = Number.isFinite(from) ? from : 0;
    const toVal = Number.isFinite(to) ? to : fromVal;
    return fromVal + (toVal - fromVal) * t;
  }

  /**
   * Clear angle cache (call when switching tree pairs)
   */
  resetCache() {
    this._angleCache.clear();
  }
}
