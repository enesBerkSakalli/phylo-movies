/**
 * PolarLabelInterpolator - Interpolates label positions and rotations
 * Handles smooth interpolation of tree labels in radial layouts
 */
import { unwrapAngle, shortestAngle, crossesAngle, longArcDelta } from '../../../../domain/math/mathUtils.js';

export class PolarLabelInterpolator {
  constructor() {
    this._angleCache = new Map();
    this._rotationCache = new Map();
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
   * Interpolate label data between two states
   * @param {Object} fromLabel - Source label data
   * @param {Object} toLabel - Target label data
   * @param {number} t - Interpolation factor (0-1)
   * @returns {Object} Interpolated label data
   */
  interpolateLabel(fromLabel, toLabel, t) {
    const interpolatedPosition = this._interpolatePosition(fromLabel, toLabel, t);
    const motionOpacity = 1;

    return {
      ...toLabel,
      position: interpolatedPosition,
      motionOpacity,
      rotation: this._interpolateRotation(
        fromLabel.rotation,
        toLabel.rotation,
        t,
        toLabel?.id ?? fromLabel?.id
      ),
      // Preserve properties from the target element
      text: toLabel.text,
      textAnchor: toLabel.textAnchor,
      leaf: toLabel.leaf
    };
  }

  /**
   * Interpolate 3D position using polar coordinates
   * @private
   */
  _interpolatePosition(fromLabel, toLabel, t) {
    if (!fromLabel || !toLabel) return [0, 0, 0];

    // Use polarPosition (distance from center) for position interpolation
    const fromR = fromLabel.polarPosition ?? fromLabel.radius ?? 0;
    const toR = toLabel.polarPosition ?? toLabel.radius ?? 0;
    const interpolatedRadius = fromR + (toR - fromR) * t;

    // Get angles
    const fromAngle = fromLabel.angle || 0;
    const toAngleRaw = toLabel.angle || 0;

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
    const z = 0;

    return [x, y, z];
  }

  /**
   * Interpolate rotation with continuity-aware angle unwrapping
   * @private
   */
  _interpolateRotation(fromAngle, toAngle, t, cacheId = null) {
    const baseFrom = Number.isFinite(fromAngle) ? fromAngle : 0;
    const baseTo = Number.isFinite(toAngle) ? toAngle : baseFrom;
    const cached = cacheId != null ? this._rotationCache.get(cacheId) : null;
    const from = unwrapAngle(baseFrom, cached);
    const to = unwrapAngle(baseTo, from);
    const interpolated = from + (to - from) * t;

    if (cacheId != null && t === 1 && Number.isFinite(to)) {
      this._rotationCache.set(cacheId, to);
    }

    return interpolated;
  }

  /**
   * Clear caches (call when switching tree pairs)
   */
  resetCache() {
    this._angleCache.clear();
    this._rotationCache.clear();
  }
}
