/**
 * PolarLabelInterpolator - Interpolates label positions and rotations
 * Handles smooth interpolation of tree labels in radial layouts
 */
import { unwrapAngle } from '../../../../domain/math/mathUtils.js';
import {
  angleFromPosition,
  interpolatePolarPosition,
  labelRotation,
  labelTextAnchor,
  positionFromPolar,
  shouldFlipLabel,
} from '../../../utils/polarGeometry.js';

export class PolarLabelInterpolator {
  constructor() {
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
  interpolateLabel(fromLabel, toLabel, t, options = {}) {
    const velocityEntry = options?.velocityEntry ?? null;
    const radiusOverride = options?.radiusOverride;
    const hasRadiusOverride = Number.isFinite(radiusOverride);
    const angularT = velocityEntry?.angularT ?? t;
    const interpolatedPosition = this._interpolatePosition(fromLabel, toLabel, t, velocityEntry);
    const motionOpacity = 1;
    const angle = hasRadiusOverride
      ? angleFromPosition(interpolatedPosition, toLabel.angle)
      : toLabel.angle;
    const z =
      Array.isArray(interpolatedPosition) && Number.isFinite(interpolatedPosition[2])
        ? interpolatedPosition[2]
        : 0;
    const needsFlip = hasRadiusOverride ? shouldFlipLabel(angle) : false;

    return {
      ...toLabel,
      position: hasRadiusOverride
        ? positionFromPolar(radiusOverride, angle, z)
        : interpolatedPosition,
      motionOpacity,
      ...(hasRadiusOverride
        ? {
            angle,
            polarPosition: radiusOverride,
            distance: radiusOverride,
            rotation: labelRotation(angle, needsFlip),
            textAnchor: labelTextAnchor(needsFlip),
          }
        : {
            rotation: this._interpolateRotation(
              fromLabel.rotation,
              toLabel.rotation,
              angularT,
              toLabel?.id ?? fromLabel?.id
            ),
          }),
      // Preserve properties from the target element
      text: toLabel.text,
      ...(hasRadiusOverride ? {} : { textAnchor: toLabel.textAnchor }),
    };
  }

  /**
   * Interpolate 3D position using polar coordinates
   * @private
   */
  _interpolatePosition(fromLabel, toLabel, t, velocityEntry = null) {
    return interpolatePolarPosition(fromLabel, toLabel, t, {
      velocityEntry,
      rootAngle: this._rootAngle,
    });
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
    this._rotationCache.clear();
  }
}
