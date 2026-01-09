import { ElementMatcher } from './ElementMatcher.js';
import { PathInterpolator } from './PathInterpolator.js';
import { unwrapAngle } from '../../../domain/math/mathUtils.js';

/**
 * TreeInterpolator - Orchestrates tree data interpolation
 * Handles the high-level interpolation between two tree states
 */
export class TreeInterpolator {
  constructor() {
    this.elementMatcher = new ElementMatcher();
    this.pathInterpolator = new PathInterpolator();
    this._angleCache = {
      nodes: new Map(),
      labels: new Map()
    };
    this._rotationCache = {
      labels: new Map()
    };
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
        position: this._interpolatePosition(fromNode, toNode, t, this._angleCache.nodes),
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
        sourcePosition: this._interpolatePosition(fromLink.source, toLink.source, t),
        targetPosition: this._interpolatePosition(fromLink.target, toLink.target, t),
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
        // to move labels along arcs.
        const interpolatedPosition = this._interpolatePosition(
          fromLabel,
          toLabel,
          t,
          this._angleCache.labels
        );

        return {
          ...to,
          position: interpolatedPosition,
          rotation: this._interpolateRotation(
            from.rotation,
            to.rotation,
            t,
            toLabel?.id ?? fromLabel?.id,
            this._rotationCache.labels
          ),
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
   * Interpolate 3D position with polar-aware interpolation
   * @private
   */
  _interpolatePosition(fromNode, toNode, t, angleCache = null) {
    // If nodes are missing, return origin (should not happen in valid flow)
    if (!fromNode || !toNode) return [0, 0, 0];

    // Interpolate in polar coordinates with angle continuity
    const fromR = (typeof fromNode.polarRadius === 'number') ? fromNode.polarRadius : fromNode.radius;
    const toR = (typeof toNode.polarRadius === 'number') ? toNode.polarRadius : toNode.radius;
    const interpolatedRadius = this._interpolateScalar(fromR || 0, toR || 0, t);

    const cacheId = toNode?.id ?? fromNode?.id;
    const cachedAngle = cacheId != null && angleCache ? angleCache.get(cacheId) : null;

    const fromAngle = unwrapAngle(fromNode.angle || 0, cachedAngle);
    const toAngle = unwrapAngle(toNode.angle || 0, fromAngle);
    const interpolatedAngle = fromAngle + (toAngle - fromAngle) * t;

    if (cacheId != null && angleCache && t === 1 && Number.isFinite(toAngle)) {
      angleCache.set(cacheId, toAngle);
    }

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
   * Interpolate rotation with continuity-aware angle unwrapping
   * Uses radians and preserves direction across wrap boundaries
   * @private
   */
  _interpolateRotation(fromAngle, toAngle, t, cacheId = null, rotationCache = null) {
    const baseFrom = Number.isFinite(fromAngle) ? fromAngle : 0;
    const baseTo = Number.isFinite(toAngle) ? toAngle : baseFrom;
    const cached = cacheId != null && rotationCache ? rotationCache.get(cacheId) : null;
    const from = unwrapAngle(baseFrom, cached);
    const to = unwrapAngle(baseTo, from);
    const interpolated = from + (to - from) * t;

    if (cacheId != null && rotationCache && t === 1 && Number.isFinite(to)) {
      rotationCache.set(cacheId, to);
    }

    return interpolated;
  }



  resetCaches() {
    this._angleCache.nodes.clear();
    this._angleCache.labels.clear();
    this._rotationCache.labels.clear();
    this.pathInterpolator?.resetCaches?.();
  }
}
