import { ElementMatcher } from './ElementMatcher.js';
import { PolarPathInterpolator } from './path/PolarPathInterpolator.js';
import { PolarNodeInterpolator } from './nodes/PolarNodeInterpolator.js';
import { PolarLabelInterpolator } from './labels/PolarLabelInterpolator.js';
import { PolarExtensionInterpolator } from './extensions/PolarExtensionInterpolator.js';
import { computeAngularDistances, buildGlobalVelocityMaps } from './VelocityNormalizer.js';
import { ANIMATION_STAGES } from './stages/animationStageDetector.js';

/**
 * TreeInterpolator - Orchestrates tree data interpolation
 * Handles the high-level interpolation between two tree states
 */
export class TreeInterpolator {
  constructor() {
    this.elementMatcher = new ElementMatcher();
    this.pathInterpolator = new PolarPathInterpolator();
    this.nodeInterpolator = new PolarNodeInterpolator();
    this.labelInterpolator = new PolarLabelInterpolator();
    this.extensionInterpolator = new PolarExtensionInterpolator();
  }

  /**
   * Interpolate between two tree data states
   * @param {Object} dataFrom - Source tree data
   * @param {Object} dataTo - Target tree data
   * @param {number} timeFactor - Interpolation factor (0-1)
   * @returns {Object} Interpolated tree data
   */
  interpolateTreeData(dataFrom, dataTo, timeFactor, branchTransformation = 'none', stage = null) {
    // Ensure timeFactor is clamped
    const t = Math.max(0, Math.min(1, timeFactor));

    // Build element maps for all types
    const nodeFromMap = this.elementMatcher._createElementMap(dataFrom.nodes);
    const nodeToMap = this.elementMatcher._createElementMap(dataTo.nodes);
    const labelFromMap = this.elementMatcher._createElementMap(dataFrom.labels);
    const labelToMap = this.elementMatcher._createElementMap(dataTo.labels);
    const linkFromMap = this.elementMatcher._createElementMap(dataFrom.links);
    const linkToMap = this.elementMatcher._createElementMap(dataTo.links);
    const extFromMap = this.elementMatcher._createElementMap(dataFrom.extensions);
    const extToMap = this.elementMatcher._createElementMap(dataTo.extensions);

    // Velocity normalisation: only during REORDER and only for angle.
    // Radial interpolation stays on the base eased timeline.
    let velocityMaps = null;
    const isReorder = !stage || stage === ANIMATION_STAGES.REORDER;

    if (isReorder) {
      const rootAngle = this.nodeInterpolator._rootAngle;

      // Angular distances for all element types
      const angularDistanceMaps = {
        nodes: computeAngularDistances(nodeFromMap, nodeToMap, rootAngle),
        labels: computeAngularDistances(labelFromMap, labelToMap, rootAngle),
        links: computeAngularDistances(
          this._polarAngleMap(linkFromMap), this._polarAngleMap(linkToMap), rootAngle
        ),
        extensions: computeAngularDistances(
          this._polarAngleMap(extFromMap), this._polarAngleMap(extToMap), rootAngle
        ),
      };

      // Build velocity maps with a single global angular maximum across all types
      ({ velocityMaps } = buildGlobalVelocityMaps(angularDistanceMaps, t));
    }

    // Interpolate each element type
    const interpolatedNodes = this._interpolateNodes(dataFrom.nodes, dataTo.nodes, t, {
      fromMap: nodeFromMap, toMap: nodeToMap, velocityMap: velocityMaps?.nodes ?? null
    });
    const interpolatedLinks = this._interpolateLinks(dataFrom.links, dataTo.links, t, branchTransformation, {
      fromMap: linkFromMap, toMap: linkToMap, velocityMap: velocityMaps?.links ?? null
    });
    const interpolatedLabels = this._interpolateLabels(dataFrom.labels, dataTo.labels, t, {
      fromMap: labelFromMap, toMap: labelToMap, velocityMap: velocityMaps?.labels ?? null
    });
    const interpolatedExtensions = this._interpolateExtensions(
      dataFrom.extensions,
      dataTo.extensions,
      t,
      branchTransformation,
      { fromMap: extFromMap, toMap: extToMap, velocityMap: velocityMaps?.extensions ?? null }
    );

    return {
      nodes: interpolatedNodes,
      links: interpolatedLinks,
      labels: interpolatedLabels,
      extensions: interpolatedExtensions
    };
  }

  /**
   * Extract angle-only pseudo-nodes from link/extension maps
   * so that buildVelocityMap can compute angular distances.
   * Uses the target-end angle from polarData.
   * @private
   */
  _polarAngleMap(elementMap) {
    const result = new Map();
    for (const [id, el] of elementMap) {
      result.set(id, {
        angle: el.polarData?.target?.angle ?? 0
      });
    }
    return result;
  }

  /**
   * Interpolate nodes between two states
   * @private
   */
  _interpolateNodes(fromNodes, toNodes, timeFactor, options) {
    return this.elementMatcher.interpolateElements(
      fromNodes,
      toNodes,
      timeFactor,
      (from, to, t, fromNode, toNode, velocityEntry) =>
        this.nodeInterpolator.interpolateNode(fromNode, toNode, t, velocityEntry),
      options,
    );
  }

  /**
   * Interpolate links with polar-aware path interpolation
   * @private
   */
  _interpolateLinks(fromLinks, toLinks, timeFactor, branchTransformation = 'none', options) {
    return this.elementMatcher.interpolateElements(
      fromLinks,
      toLinks,
      timeFactor,
      (from, to, t, fromLink, toLink, velocityEntry) => ({
        ...to,
        path: this.pathInterpolator.interpolatePath(fromLink, toLink, t, velocityEntry),
        sourcePosition: this.nodeInterpolator.interpolatePosition(fromLink.source, toLink.source, t, velocityEntry),
        targetPosition: this.nodeInterpolator.interpolatePosition(fromLink.target, toLink.target, t, velocityEntry),
        // Preserve highlighting and metadata
        polarData: to.polarData,
        split_indices: to.split_indices,
        children: to.children,
        targetName: to.targetName
      }),
      options,
    );
  }

  /**
   * Interpolate labels between two states
   * @private
   */
  _interpolateLabels(fromLabels, toLabels, timeFactor, options) {
    return this.elementMatcher.interpolateElements(
      fromLabels,
      toLabels,
      timeFactor,
      (from, to, t, fromLabel, toLabel, velocityEntry) =>
        this.labelInterpolator.interpolateLabel(fromLabel, toLabel, t, velocityEntry),
      options,
    );
  }

  /**
   * Interpolate extensions between two states
   * @private
   */
  _interpolateExtensions(fromExtensions, toExtensions, timeFactor, branchTransformation, options) {
    return this.elementMatcher.interpolateElements(
      fromExtensions,
      toExtensions,
      timeFactor,
      (from, to, t, fromExt, toExt, velocityEntry) =>
        this.extensionInterpolator.interpolateExtension(fromExt, toExt, t, velocityEntry),
      options,
    );
  }

  /**
   * Clear all interpolator caches (call when switching tree pairs)
   */
  resetCaches() {
    this.pathInterpolator?.resetCaches?.();
    this.nodeInterpolator?.resetCache?.();
    this.labelInterpolator?.resetCache?.();
    this.extensionInterpolator?.resetCache?.();
  }
}
