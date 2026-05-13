/**
 * PolarNodeInterpolator - Interpolates node positions using polar coordinates
 * Handles smooth interpolation of tree nodes in radial layouts
 */
import { Z_NODE } from '../../constants/zOffsets.js';
import { interpolatePolarPosition, interpolateScalar } from '../../../utils/polarGeometry.js';

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
  interpolateNode(fromNode, toNode, t, velocityEntry = null) {
    const position = this.interpolatePosition(fromNode, toNode, t, velocityEntry);
    return {
      ...toNode,
      position,
      renderPosition: [position[0], position[1], (position[2] ?? 0) + Z_NODE],
      radius: interpolateScalar(fromNode.radius, toNode.radius, t),
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
  interpolatePosition(fromNode, toNode, t, velocityEntry = null) {
    return interpolatePolarPosition(fromNode, toNode, t, {
      velocityEntry,
      rootAngle: this._rootAngle
    });
  }

  /**
   * Clear angle cache (call when switching tree pairs)
   */
  resetCache() {
    this._angleCache.clear();
  }
}
