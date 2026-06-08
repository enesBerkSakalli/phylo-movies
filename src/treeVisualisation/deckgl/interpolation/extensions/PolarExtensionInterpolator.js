/**
 * PolarExtensionInterpolator - Interpolates extension paths
 * Extensions are radial lines from leaf nodes to outer radius
 */
import { PolarPathInterpolator } from '../path/PolarPathInterpolator.js';
import { firstPathPoint, lastPathPoint, positionFromPolar } from '../../../utils/polarGeometry.js';

export class PolarExtensionInterpolator {
  constructor() {
    this.pathInterpolator = new PolarPathInterpolator();
  }

  /**
   * Set the root angle for crossing detection
   * @param {number} angle - Root angle in radians (default 0)
   */
  setRootAngle(angle) {
    this.pathInterpolator.setRootAngle(angle);
  }

  /**
   * Interpolate extension data between two states
   * @param {Object} fromExt - Source extension data
   * @param {Object} toExt - Target extension data
   * @param {number} t - Interpolation factor (0-1)
   * @returns {Object} Interpolated extension data
   */
  interpolateExtension(fromExt, toExt, t, options = {}) {
    const id = toExt?.id ?? fromExt?.id;
    const polarData = this.pathInterpolator.interpolatePolarData(fromExt, toExt, t, {
      velocityEntry: options?.velocityEntry ?? null,
      targetRadiusOverride: options?.targetRadiusOverride,
    });
    const path = this.pathInterpolator.createPathFromPolarData(polarData, {
      pathPoolKey: id != null ? `ext:${id}` : null,
    });
    const sourcePosition =
      firstPathPoint(path) ?? positionFromPolar(polarData.source.radius, polarData.source.angle, 0);
    const targetPosition =
      lastPathPoint(path) ?? positionFromPolar(polarData.target.radius, polarData.target.angle, 0);

    return {
      ...toExt,
      path,
      sourcePosition,
      targetPosition,
      polarData: {
        ...toExt.polarData,
        source: {
          ...toExt.polarData?.source,
          ...polarData.source,
        },
        target: {
          ...toExt.polarData?.target,
          ...polarData.target,
        },
      },
    };
  }

  /**
   * Clear caches (call when switching tree pairs)
   */
  resetCache() {
    this.pathInterpolator?.resetPathBufferPool?.();
  }
}
