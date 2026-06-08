import { ElementMatcher } from './ElementMatcher.js';
import { PolarPathInterpolator } from './path/PolarPathInterpolator.js';
import { PolarNodeInterpolator } from './nodes/PolarNodeInterpolator.js';
import { PolarLabelInterpolator } from './labels/PolarLabelInterpolator.js';
import { PolarExtensionInterpolator } from './extensions/PolarExtensionInterpolator.js';
import { PolarLinkInterpolator } from './PolarLinkInterpolator.js';
import { OuterRadiusInterpolator } from './OuterRadiusInterpolator.js';
import {
  computeAngularDistances,
  buildGlobalVelocityMaps,
  getGlobalAngularMaxAngle,
} from './VelocityNormalizer.js';
import { ANIMATION_STAGES } from './stages/animationStageDetector.js';
import { LINK_LIFECYCLES } from './TransitionChangeModel.js';
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
      nodeInterpolator: this.nodeInterpolator,
    });
    this._elementMapCache = new WeakMap();
    this._polarAngleMapCache = new WeakMap();
    this._angularDistanceCache = new WeakMap();
    this._angularDistanceMaxCache = new WeakMap();
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
    const isReorder =
      !interpolationOptions.stage || interpolationOptions.stage === ANIMATION_STAGES.REORDER;

    if (isReorder) {
      measureFrameStep('treeInterpolator.velocityMaps', () => {
        const rootAngle = this._rootAngle;

        // Angular distances for all element types
        const angularDistanceMaps = {
          nodes: this._getAngularDistances(nodeFromMap, nodeToMap, rootAngle),
          labels: this._getAngularDistances(labelFromMap, labelToMap, rootAngle),
          links: this._getAngularDistances(
            this._polarAngleMap(linkFromMap),
            this._polarAngleMap(linkToMap),
            rootAngle
          ),
          extensions: this._getAngularDistances(
            this._polarAngleMap(extFromMap),
            this._polarAngleMap(extToMap),
            rootAngle
          ),
        };

        // Build velocity maps with a single global angular maximum across all types
        const globalMaxAngle = this._getGlobalAngularDistanceMax(angularDistanceMaps);
        ({ velocityMaps } = buildGlobalVelocityMaps(angularDistanceMaps, t, { globalMaxAngle }));
      });
    }

    const maxRadius = this.outerRadiusInterpolator.interpolateMaxRadius(dataFrom, dataTo, t);
    const { labelRadius, extensionRadius } = this.outerRadiusInterpolator.interpolateRadii(
      dataFrom,
      dataTo,
      t,
      maxRadius
    );

    // Interpolate each element type
    const interpolatedNodes = measureFrameStep('treeInterpolator.nodes', () =>
      this._interpolateNodes(dataFrom.nodes, dataTo.nodes, t, {
        fromMap: nodeFromMap,
        toMap: nodeToMap,
        velocityMap: velocityMaps?.nodes ?? null,
        ...structuralOpacity,
      })
    );
    const interpolatedLinks = measureFrameStep('treeInterpolator.links', () =>
      this.linkInterpolator.interpolateLinks(dataFrom.links, dataTo.links, t, {
        fromMap: linkFromMap,
        toMap: linkToMap,
        velocityMap: velocityMaps?.links ?? null,
        ...structuralOpacity,
        nodeFromMap,
        nodeToMap,
        nodeVelocityMap: velocityMaps?.nodes ?? null,
        transitionChangeModel: interpolationOptions.transitionChangeModel,
        rawTimeFactor: interpolationOptions.rawTimeFactor,
        linkGeometryMode: interpolationOptions.linkGeometryMode,
      })
    );
    const interpolatedLabels = measureFrameStep('treeInterpolator.labels', () =>
      this._interpolateLabels(dataFrom.labels, dataTo.labels, t, {
        fromMap: labelFromMap,
        toMap: labelToMap,
        velocityMap: velocityMaps?.labels ?? null,
        labelRadius: Number.isFinite(labelRadius) ? labelRadius : null,
        ...structuralOpacity,
      })
    );
    const interpolatedExtensions = measureFrameStep('treeInterpolator.extensions', () =>
      this._interpolateExtensions(dataFrom.extensions, dataTo.extensions, t, {
        fromMap: extFromMap,
        toMap: extToMap,
        velocityMap: velocityMaps?.extensions ?? null,
        extensionRadius: Number.isFinite(extensionRadius) ? extensionRadius : null,
        ...structuralOpacity,
      })
    );

    const lifecycleAnnotatedNodes = annotateEnteringLinkTargetNodes(
      interpolatedNodes,
      interpolatedLinks
    );
    const endpointAlignedNodes = measureFrameStep('treeInterpolator.endpointAlign', () =>
      alignNodesToRenderedLinkTargets(lifecycleAnnotatedNodes, interpolatedLinks)
    );

    return {
      max_radius: maxRadius,
      nodes: endpointAlignedNodes,
      links: interpolatedLinks,
      labels: interpolatedLabels,
      extensions: interpolatedExtensions,
    };
  }

  /**
   * Extract angle-only pseudo-nodes from link/extension maps
   * so that velocity maps can compute angular distances.
   * Uses the target-end angle from polarData.
   * @private
   */
  _polarAngleMap(elementMap) {
    const cached = this._polarAngleMapCache.get(elementMap);
    if (cached) return cached;

    const result = new Map();
    for (const [id, el] of elementMap) {
      result.set(id, {
        angle: el.polarData?.target?.angle ?? 0,
      });
    }
    this._polarAngleMapCache.set(elementMap, result);
    return result;
  }

  _getAngularDistances(fromMap, toMap, rootAngle = 0) {
    let toCache = this._angularDistanceCache.get(fromMap);
    if (!toCache) {
      toCache = new WeakMap();
      this._angularDistanceCache.set(fromMap, toCache);
    }

    let rootAngleCache = toCache.get(toMap);
    if (!rootAngleCache) {
      rootAngleCache = new Map();
      toCache.set(toMap, rootAngleCache);
    }

    const cacheKey = Number.isFinite(rootAngle) ? rootAngle : 0;
    const cached = rootAngleCache.get(cacheKey);
    if (cached) return cached;

    const distances = computeAngularDistances(fromMap, toMap, cacheKey);
    rootAngleCache.set(cacheKey, distances);
    return distances;
  }

  _getElementMap(elements) {
    const cached = this._elementMapCache.get(elements);
    if (cached) return cached;

    const map = this.elementMatcher._createElementMap(elements);
    this._elementMapCache.set(elements, map);
    return map;
  }

  _getGlobalAngularDistanceMax(angularDistanceMaps) {
    const { nodes, labels, links, extensions } = angularDistanceMaps || {};
    if (!nodes || !labels || !links || !extensions) {
      return getGlobalAngularMaxAngle(angularDistanceMaps || {});
    }

    let labelsCache = this._angularDistanceMaxCache.get(nodes);
    if (!labelsCache) {
      labelsCache = new WeakMap();
      this._angularDistanceMaxCache.set(nodes, labelsCache);
    }

    let linksCache = labelsCache.get(labels);
    if (!linksCache) {
      linksCache = new WeakMap();
      labelsCache.set(labels, linksCache);
    }

    let extensionsCache = linksCache.get(links);
    if (!extensionsCache) {
      extensionsCache = new WeakMap();
      linksCache.set(links, extensionsCache);
    }

    if (extensionsCache.has(extensions)) {
      return extensionsCache.get(extensions);
    }

    const globalMaxAngle = getGlobalAngularMaxAngle(angularDistanceMaps);
    extensionsCache.set(extensions, globalMaxAngle);
    return globalMaxAngle;
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
      (fromNode, toNode, t, velocityEntry) =>
        this.nodeInterpolator.interpolateNode(fromNode, toNode, t, velocityEntry),
      options
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
      (fromLabel, toLabel, t, velocityEntry) =>
        this.labelInterpolator.interpolateLabel(fromLabel, toLabel, t, {
          velocityEntry,
          radiusOverride: options?.labelRadius,
        }),
      options
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
      (fromExt, toExt, t, velocityEntry) =>
        this.extensionInterpolator.interpolateExtension(fromExt, toExt, t, {
          velocityEntry,
          targetRadiusOverride: options?.extensionRadius,
        }),
      options
    );
  }

  /**
   * Clear all interpolator caches (call when switching tree pairs)
   */
  resetCaches() {
    this.pathInterpolator?.resetPathBufferPool?.();
    this.labelInterpolator?.resetCache?.();
    this.extensionInterpolator?.resetCache?.();
    this._elementMapCache = new WeakMap();
    this._polarAngleMapCache = new WeakMap();
    this._angularDistanceCache = new WeakMap();
    this._angularDistanceMaxCache = new WeakMap();
  }
}

function normalizeInterpolationOptions(options = {}) {
  const input = options && typeof options === 'object' && !Array.isArray(options) ? options : {};
  return {
    stage: input.stage ?? null,
    transitionChangeModel: input.transitionChangeModel ?? null,
    rawTimeFactor: Number.isFinite(input.rawTimeFactor) ? input.rawTimeFactor : null,
    enterTimeFactor: Number.isFinite(input.enterTimeFactor) ? input.enterTimeFactor : null,
    exitTimeFactor: Number.isFinite(input.exitTimeFactor) ? input.exitTimeFactor : null,
    hasExplicitEnterTimeFactor: Number.isFinite(input.enterTimeFactor),
    hasExplicitExitTimeFactor: Number.isFinite(input.exitTimeFactor),
    linkGeometryMode: input.linkGeometryMode || 'radial-elbow',
  };
}

function structuralOpacityOptions(options) {
  const result = {
    hasExplicitEnterTimeFactor: options.hasExplicitEnterTimeFactor,
    hasExplicitExitTimeFactor: options.hasExplicitExitTimeFactor,
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

function annotateEnteringLinkTargetNodes(nodes, links) {
  if (!Array.isArray(nodes) || nodes.length === 0 || !Array.isArray(links) || links.length === 0) {
    return nodes;
  }

  let enteringLinkByTargetId = null;
  for (const link of links) {
    if (!link?.targetId || !isExpandingLifecycleLink(link)) continue;
    enteringLinkByTargetId ??= new Map();
    enteringLinkByTargetId.set(link.targetId, link);
  }

  if (!enteringLinkByTargetId) return nodes;

  let changed = false;
  const annotated = nodes.map((node) => {
    const enteringLink = enteringLinkByTargetId.get(node?.id);
    if (!enteringLink) return node;

    changed = true;
    return {
      ...node,
      isEntering: true,
      lifecycle: enteringLink.lifecycle || node.lifecycle || LINK_LIFECYCLES.ENTERING,
      transitionPhase: Number.isFinite(enteringLink.transitionPhase)
        ? enteringLink.transitionPhase
        : node.transitionPhase,
    };
  });

  return changed ? annotated : nodes;
}

function isExpandingLifecycleLink(link) {
  return (
    link?.isEntering === true ||
    link?.lifecycle === LINK_LIFECYCLES.ENTERING ||
    link?.lifecycle === LINK_LIFECYCLES.REVIVING
  );
}

function alignNodesToRenderedLinkTargets(nodes, links) {
  if (!Array.isArray(nodes) || nodes.length === 0 || !Array.isArray(links) || links.length === 0) {
    return nodes;
  }

  let targetPositionByNodeId = null;
  for (const link of links) {
    if (!link?.targetId || !isFinitePoint(link.targetPosition)) continue;
    targetPositionByNodeId ??= new Map();
    targetPositionByNodeId.set(link.targetId, link.targetPosition);
  }

  if (!targetPositionByNodeId) return nodes;

  let changed = false;
  const alignedNodes = nodes.map((node) => {
    const linkTargetPosition = targetPositionByNodeId.get(node?.id);
    if (!linkTargetPosition) return node;

    changed = true;
    const position = [
      linkTargetPosition[0],
      linkTargetPosition[1],
      Number.isFinite(linkTargetPosition[2]) ? linkTargetPosition[2] : 0,
    ];

    return {
      ...node,
      position,
      renderPosition: [position[0], position[1], position[2] + Z_NODE],
      angle: Math.atan2(position[1], position[0]),
      polarPosition: Math.hypot(position[0], position[1]),
    };
  });

  return changed ? alignedNodes : nodes;
}

function isFinitePoint(point) {
  return Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1]);
}
