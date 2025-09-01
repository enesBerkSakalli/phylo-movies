import { ElementMatcher } from './ElementMatcher.js';
import { PathInterpolator } from './PathInterpolator.js';

/**
 * TreeInterpolator - Orchestrates tree data interpolation
 * Handles the high-level interpolation between two tree states
 */
export class TreeInterpolator {
  constructor() {
    this.elementMatcher = new ElementMatcher();
    this.pathInterpolator = new PathInterpolator();
  }

  /**
   * Interpolate between two tree data states
   * @param {Object} dataFrom - Source tree data
   * @param {Object} dataTo - Target tree data
   * @param {number} timeFactor - Interpolation factor (0-1)
   * @returns {Object} Interpolated tree data
   */
  interpolateTreeData(dataFrom, dataTo, timeFactor) {
    // Ensure timeFactor is clamped
    const t = Math.max(0, Math.min(1, timeFactor));

    // Interpolate each element type
    const interpolatedNodes = this._interpolateNodes(dataFrom.nodes, dataTo.nodes, t);
    const interpolatedLinks = this._interpolateLinks(dataFrom.links, dataTo.links, t);
    const interpolatedLabels = this._interpolateLabels(dataFrom.labels, dataTo.labels, t);
    const interpolatedExtensions = this._interpolateExtensions(dataFrom.extensions, dataTo.extensions, t);

    return {
      nodes: interpolatedNodes,
      links: interpolatedLinks,
      labels: interpolatedLabels,
      extensions: interpolatedExtensions
    };
  }

  /**
   * Interpolate nodes between two states
   * @private
   */
  _interpolateNodes(fromNodes, toNodes, timeFactor) {
    return this.elementMatcher.interpolateElements(
      fromNodes,
      toNodes,
      timeFactor,
      (from, to, t, fromNode, toNode) => ({
        ...to,
        position: this._interpolatePosition(from.position, to.position, t, fromNode, toNode),
        radius: this._interpolateScalar(from.radius, to.radius, t),
        // Preserve other properties from target
        name: to.name,
        isLeaf: to.isLeaf,
        split_indices: to.split_indices
      }),
      'nodes'
    );
  }

  /**
   * Interpolate links with polar-aware path interpolation
   * @private
   */
  _interpolateLinks(fromLinks, toLinks, timeFactor) {
    return this.elementMatcher.interpolateElements(
      fromLinks,
      toLinks,
      timeFactor,
      (from, to, t, fromLink, toLink) => ({
        ...to,
        path: this.pathInterpolator.interpolatePath(
          from.path,
          to.path,
          t,
          fromLink,
          toLink
        ),
        sourcePosition: this._interpolatePosition(from.sourcePosition, to.sourcePosition, t),
        targetPosition: this._interpolatePosition(from.targetPosition, to.targetPosition, t),
        // Preserve highlighting and metadata
        polarData: to.polarData,
        split_indices: to.split_indices,
        children: to.children,
        targetName: to.targetName
      }),
      'links' // Pass element type to enable special handling
    );
  }

  /**
   * Interpolate labels with a clearer, delegated approach.
   * This version simplifies the logic by always attempting polar interpolation
   * and letting the `_interpolatePosition` function handle the fallback to linear.
   * @private
   */
  _interpolateLabels(fromLabels, toLabels, timeFactor) {
    return this.elementMatcher.interpolateElements(
      fromLabels,
      toLabels,
      timeFactor,
      (from, to, t, fromLabel, toLabel) => {
        // Prefer polar interpolation using label-level angle + polarRadius
        // to move labels along arcs. Falls back to linear if unavailable.
        const interpolatedPosition = this._interpolatePosition(
          from.position,
          to.position,
          t,
          fromLabel,
          toLabel
        );

        return {
          ...to,
          position: interpolatedPosition,
          rotation: this._interpolateRotation(from.rotation, to.rotation, t),
          // Preserve properties from the target element
          text: to.text,
          textAnchor: to.textAnchor,
          leaf: to.leaf
        };
      },
      'labels'
    );
  }

  /**
   * Interpolate extensions by delegating path logic to the PathInterpolator.
   * This simplifies the function and centralizes the path interpolation strategy.
   * @private
   */
  _interpolateExtensions(fromExtensions, toExtensions, timeFactor) {
    return this.elementMatcher.interpolateElements(
      fromExtensions,
      toExtensions,
      timeFactor,
      (from, to, t, fromExt, toExt) => {
        // Delegate the entire path interpolation to the specialized class.
        // It will handle the polar vs. linear decision internally.
        const interpolatedPath = this.pathInterpolator.interpolatePath(
          from.path,
          to.path,
          t,
          fromExt, // Pass the full extension object
          toExt    // Pass the full extension object
        );

        return {
          ...to,
          path: interpolatedPath,
          leaf: to.leaf // Preserve leaf reference
        };
      },
      'extensions'
    );
  }

  /**
   * Interpolate 3D position with polar-aware shortest path
   * @private
   */
  _interpolatePosition(fromPos, toPos, t, fromNode = null, toNode = null) {
    // Try polar interpolation if node data with polar coordinates is available
    if (this._canUsePolarInterpolation(fromNode, toNode)) {
      return this._interpolatePositionPolar(fromNode, toNode, t);
    }

    // Fallback to standard linear interpolation for Cartesian coordinates
    return [
      fromPos[0] + (toPos[0] - fromPos[0]) * t,
      fromPos[1] + (toPos[1] - fromPos[1]) * t,
      fromPos[2] + (toPos[2] - fromPos[2]) * t
    ];
  }

  /**
   * Check if polar interpolation is possible for nodes
   * @private
   */
  _canUsePolarInterpolation(fromNode, toNode) {
    if (!fromNode || !toNode) return false;

    const fromAngle = fromNode.angle;
    const toAngle = toNode.angle;
    const fromR = (typeof fromNode.polarRadius === 'number') ? fromNode.polarRadius : fromNode.radius;
    const toR = (typeof toNode.polarRadius === 'number') ? toNode.polarRadius : toNode.radius;

    return typeof fromAngle === 'number' && typeof toAngle === 'number' &&
           typeof fromR === 'number' && typeof toR === 'number' &&
           !isNaN(fromAngle) && !isNaN(toAngle) &&
           !isNaN(fromR) && !isNaN(toR);
  }

  /**
   * Perform polar interpolation for node positions
   * @private
   */
  _interpolatePositionPolar(fromNode, toNode, t) {
    // Interpolate in polar coordinates using shortest angle path
    const fromR = (typeof fromNode.polarRadius === 'number') ? fromNode.polarRadius : fromNode.radius;
    const toR = (typeof toNode.polarRadius === 'number') ? toNode.polarRadius : toNode.radius;
    const interpolatedRadius = this._interpolateScalar(fromR, toR, t);
    const interpolatedAngle = this._interpolateRotation(fromNode.angle, toNode.angle, t);

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
    return from + (to - from) * t;
  }

  /**
   * Interpolate rotation with proper angle wrapping
   * Uses radians and ensures shortest path interpolation
   * @private
   */
  _interpolateRotation(fromAngle, toAngle, t) {
    // Calculate shortest angle difference in radians
    const TAU = Math.PI * 2;
    let diff = (toAngle - fromAngle) % TAU;

    // Normalize to shortest path [-π, π]
    if (diff > Math.PI) diff -= TAU;
    if (diff <= -Math.PI) diff += TAU;

    return fromAngle + diff * t;
  }
}
