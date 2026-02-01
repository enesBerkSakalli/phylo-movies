/**
 * PolarLabelInterpolator - Interpolates label positions and rotations
 * Handles smooth interpolation of tree labels in radial layouts
 */
import { unwrapAngle } from '../../../../domain/math/mathUtils.js';

export class PolarLabelInterpolator {
  constructor() {
    this._angleCache = new Map();
    this._rotationCache = new Map();
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

    // Unwrap angles for continuous interpolation (prevents spinning)
    const cacheId = toLabel?.id ?? fromLabel?.id;
    const cachedAngle = cacheId != null ? this._angleCache.get(cacheId) : null;

    const fromAngle = unwrapAngle(fromLabel.angle || 0, cachedAngle);
    const toAngle = unwrapAngle(toLabel.angle || 0, fromAngle);
    const interpolatedAngle = fromAngle + (toAngle - fromAngle) * t;

    // Cache final angle for next frame
    if (cacheId != null && t === 1 && Number.isFinite(toAngle)) {
      this._angleCache.set(cacheId, toAngle);
    }

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
