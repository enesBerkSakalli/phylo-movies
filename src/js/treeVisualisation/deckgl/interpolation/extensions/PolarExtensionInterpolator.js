/**
 * PolarExtensionInterpolator - Interpolates extension paths
 * Extensions are radial lines from leaf nodes to outer radius
 */
import { PolarPathInterpolator } from '../path/PolarPathInterpolator.js';

export class PolarExtensionInterpolator {
  constructor() {
    this.pathInterpolator = new PolarPathInterpolator();
  }

  /**
   * Interpolate extension data between two states
   * @param {Object} fromExt - Source extension data
   * @param {Object} toExt - Target extension data
   * @param {number} t - Interpolation factor (0-1)
   * @returns {Object} Interpolated extension data
   */
  interpolateExtension(fromExt, toExt, t) {
    return {
      ...toExt,
      path: this.pathInterpolator.interpolatePath(fromExt, toExt, t),
      leaf: toExt.leaf // Preserve leaf reference
    };
  }

  /**
   * Clear caches (call when switching tree pairs)
   */
  resetCache() {
    this.pathInterpolator?.resetCaches?.();
  }
}
