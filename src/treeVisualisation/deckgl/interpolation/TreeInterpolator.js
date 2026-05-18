import { ElementMatcher } from './ElementMatcher.js';
import { PolarPathInterpolator } from './path/PolarPathInterpolator.js';
import { PolarNodeInterpolator } from './nodes/PolarNodeInterpolator.js';
import { PolarLabelInterpolator } from './labels/PolarLabelInterpolator.js';
import { PolarExtensionInterpolator } from './extensions/PolarExtensionInterpolator.js';
import { PolarLinkInterpolator } from './PolarLinkInterpolator.js';
import { OuterRadiusInterpolator } from './OuterRadiusInterpolator.js';
import { computeAngularDistances, buildGlobalVelocityMaps } from './VelocityNormalizer.js';
import { ANIMATION_STAGES } from './stages/animationStageDetector.js';
import { measureFrameStep } from '../../performance/frameInstrumentation.js';
import { Z_NODE } from '../constants/zOffsets.js';

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
    this.outerRadiusInterpolator = new OuterRadiusInterpolator();
    this.linkInterpolator = new PolarLinkInterpolator({
      elementMatcher: this.elementMatcher,
      pathInterpolator: this.pathInterpolator,
      nodeInterpolator: this.nodeInterpolator
    });
    this._elementMapCache = new WeakMap();
    this._rootAngle = 0;
  }

  setRootAngle(angle) {
    this._rootAngle = Number.isFinite(angle) ? angle : 0;
    this.pathInterpolator.setRootAngle(this._rootAngle);
    this.nodeInterpolator.setRootAngle(this._rootAngle);
    this.labelInterpolator.setRootAngle(this._rootAngle);
    this.extensionInterpolator.setRootAngle(this._rootAngle);
  }

  /**
   * Interpolate between two tree data states
   * @param {Object} dataFrom - Source tree data
   * @param {Object} dataTo - Target tree data
   * @param {number} timeFactor - Interpolation factor (0-1)
   * @param {Object} options - Interpolation options
   * @returns {Object} Interpolated tree data
   */
  interpolateTreeData(dataFrom, dataTo, timeFactor, options = {}) {
    return measureFrameStep('treeInterpolator.interpolateTreeData', () =>
      this._interpolateTreeData(dataFrom, dataTo, timeFactor, options)
    );
  }

  _interpolateTreeData(dataFrom, dataTo, timeFactor, options = {}) {
    const interpolationOptions = normalizeInterpolationOptions(options);
    // Ensure timeFactor is clamped
    const t = Math.max(0, Math.min(1, timeFactor));
    const structuralOpacity = structuralOpacityOptions(interpolationOptions);

    // Cached layout data is reused across animation frames; its id maps can be reused too.
    const nodeFromMap = this._getElementMap(dataFrom.nodes);
    const nodeToMap = this._getElementMap(dataTo.nodes);
    const labelFromMap = this._getElementMap(dataFrom.labels);
    const labelToMap = this._getElementMap(dataTo.labels);
    const linkFromMap = this._getElementMap(dataFrom.links);
    const linkToMap = this._getElementMap(dataTo.links);
    const extFromMap = this._getElementMap(dataFrom.extensions);
    const extToMap = this._getElementMap(dataTo.extensions);

    // Velocity normalisation: only during REORDER and only for angle.
    // Radial interpolation stays on the base eased timeline.
    let velocityMaps = null;
    const isReorder = !interpolationOptions.stage || interpolationOptions.stage === ANIMATION_STAGES.REORDER;

    if (isReorder) {
      const rootAngle = this._rootAngle;

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
      fromMap: nodeFromMap,
      toMap: nodeToMap,
      velocityMap: velocityMaps?.nodes ?? null,
      ...structuralOpacity
    });
    const interpolatedLinks = this.linkInterpolator.interpolateLinks(dataFrom.links, dataTo.links, t, {
      fromMap: linkFromMap,
      toMap: linkToMap,
      velocityMap: velocityMaps?.links ?? null,
      ...structuralOpacity,
      nodeFromMap,
      nodeToMap,
      nodeVelocityMap: velocityMaps?.nodes ?? null,
      transitionChangeModel: interpolationOptions.transitionChangeModel,
      rawTimeFactor: interpolationOptions.rawTimeFactor,
      linkGeometryMode: interpolationOptions.linkGeometryMode
    });
    const interpolatedLabels = this._interpolateLabels(dataFrom.labels, dataTo.labels, t, {
      fromMap: labelFromMap,
      toMap: labelToMap,
      velocityMap: velocityMaps?.labels ?? null,
      ...structuralOpacity
    });
    const interpolatedExtensions = this._interpolateExtensions(
      dataFrom.extensions,
      dataTo.extensions,
      t,
      {
        fromMap: extFromMap,
        toMap: extToMap,
        velocityMap: velocityMaps?.extensions ?? null,
        ...structuralOpacity
      }
    );
    const maxRadius = this.outerRadiusInterpolator.interpolateMaxRadius(dataFrom, dataTo, t);
    const { labelRadius, extensionRadius } = this.outerRadiusInterpolator.interpolateRadii(dataFrom, dataTo, t, maxRadius);

    const endpointAlignedNodes = alignNodesToRenderedLinkTargets(interpolatedNodes, interpolatedLinks);

    return {
      max_radius: maxRadius,
      nodes: endpointAlignedNodes,
      links: interpolatedLinks,
      labels: Number.isFinite(labelRadius)
        ? this.outerRadiusInterpolator.applyLabelRadius(interpolatedLabels, labelRadius)
        : interpolatedLabels,
      extensions: Number.isFinite(extensionRadius)
        ? this.outerRadiusInterpolator.applyExtensionTargetRadius(interpolatedExtensions, extensionRadius)
        : interpolatedExtensions
    };
  }

  /**
   * Extract angle-only pseudo-nodes from link/extension maps
   * so that velocity maps can compute angular distances.
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

  _getElementMap(elements) {
    const cached = this._elementMapCache.get(elements);
    if (cached) return cached;

    const map = this.elementMatcher._createElementMap(elements);
    this._elementMapCache.set(elements, map);
    return map;
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
  _interpolateExtensions(fromExtensions, toExtensions, timeFactor, options) {
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
    this._elementMapCache = new WeakMap();
  }
}

function normalizeInterpolationOptions(options = {}) {
  const input = options && typeof options === 'object' && !Array.isArray(options) ? options : {};
  return {
    stage: input.stage ?? null,
    transitionChangeModel: input.transitionChangeModel ?? null,
    rawTimeFactor: Number.isFinite(input.rawTimeFactor)
      ? input.rawTimeFactor
      : null,
    enterTimeFactor: Number.isFinite(input.enterTimeFactor)
      ? input.enterTimeFactor
      : null,
    exitTimeFactor: Number.isFinite(input.exitTimeFactor)
      ? input.exitTimeFactor
      : null,
    hasExplicitEnterTimeFactor: Number.isFinite(input.enterTimeFactor),
    hasExplicitExitTimeFactor: Number.isFinite(input.exitTimeFactor),
    linkGeometryMode: input.linkGeometryMode || 'radial-elbow'
  };
}

function structuralOpacityOptions(options) {
  const result = {
    hasExplicitEnterTimeFactor: options.hasExplicitEnterTimeFactor,
    hasExplicitExitTimeFactor: options.hasExplicitExitTimeFactor
  };

  if (options.hasExplicitEnterTimeFactor) {
    result.enterTimeFactor = options.enterTimeFactor;
  } else if (options.transitionChangeModel) {
    result.enterTimeFactor = 1;
  }

  if (options.hasExplicitExitTimeFactor) {
    result.exitTimeFactor = options.exitTimeFactor;
  } else if (options.transitionChangeModel) {
    result.exitTimeFactor = 0;
  }

  return result;
}

function alignNodesToRenderedLinkTargets(nodes, links) {
  const targetPositionByNodeId = new Map();

  for (const link of links || []) {
    if (!link?.targetId || !isFinitePoint(link.targetPosition)) continue;
    targetPositionByNodeId.set(link.targetId, link.targetPosition);
  }

  if (targetPositionByNodeId.size === 0) return nodes;

  let changed = false;
  const alignedNodes = nodes.map((node) => {
    const linkTargetPosition = targetPositionByNodeId.get(node?.id);
    if (!linkTargetPosition) return node;

    changed = true;
    const position = [
      linkTargetPosition[0],
      linkTargetPosition[1],
      Number.isFinite(linkTargetPosition[2]) ? linkTargetPosition[2] : 0
    ];

    return {
      ...node,
      position,
      renderPosition: [position[0], position[1], position[2] + Z_NODE],
      angle: Math.atan2(position[1], position[0]),
      polarPosition: Math.hypot(position[0], position[1])
    };
  });

  return changed ? alignedNodes : nodes;
}

function isFinitePoint(point) {
  return Array.isArray(point) &&
    Number.isFinite(point[0]) &&
    Number.isFinite(point[1]);
}
