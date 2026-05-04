import { ElementMatcher } from './ElementMatcher.js';
import { PolarPathInterpolator } from './path/PolarPathInterpolator.js';
import { PolarNodeInterpolator } from './nodes/PolarNodeInterpolator.js';
import { PolarLabelInterpolator } from './labels/PolarLabelInterpolator.js';
import { PolarExtensionInterpolator } from './extensions/PolarExtensionInterpolator.js';
import { computeAngularDistances, buildGlobalVelocityMaps } from './VelocityNormalizer.js';
import { ANIMATION_STAGES } from './stages/animationStageDetector.js';
import { measureFrameStep } from '../../performance/frameInstrumentation.js';

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
    return measureFrameStep('treeInterpolator.interpolateTreeData', () =>
      this._interpolateTreeData(dataFrom, dataTo, timeFactor, branchTransformation, stage)
    );
  }

  _interpolateTreeData(dataFrom, dataTo, timeFactor, branchTransformation = 'none', stage = null) {
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
    const maxRadius = this._interpolateFinite(dataFrom.max_radius, dataTo.max_radius, t);
    const labelRadius = this._interpolateLabelRadius(dataFrom, dataTo, t, maxRadius);

    return {
      max_radius: maxRadius,
      nodes: interpolatedNodes,
      links: interpolatedLinks,
      labels: Number.isFinite(labelRadius)
        ? this._applyLabelRadius(interpolatedLabels, labelRadius)
        : interpolatedLabels,
      extensions: Number.isFinite(labelRadius)
        ? this._applyExtensionTargetRadius(interpolatedExtensions, labelRadius)
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

  _interpolateLabelRadius(dataFrom, dataTo, t, maxRadius) {
    const fromOffset = this._labelOffsetFromTreeRadius(dataFrom);
    const toOffset = this._labelOffsetFromTreeRadius(dataTo);
    const offset = this._interpolateFinite(fromOffset, toOffset, t);

    if (Number.isFinite(maxRadius) && Number.isFinite(offset)) {
      return maxRadius + offset;
    }

    return this._interpolateFinite(
      this._outerLabelRadius(dataFrom),
      this._outerLabelRadius(dataTo),
      t
    );
  }

  _labelOffsetFromTreeRadius(data) {
    const maxRadius = Number(data?.max_radius);
    const labelRadius = this._outerLabelRadius(data);
    if (!Number.isFinite(maxRadius) || !Number.isFinite(labelRadius)) return null;
    return labelRadius - maxRadius;
  }

  _outerLabelRadius(data) {
    const labels = data?.labels || [];
    for (const label of labels) {
      const radius = this._radiusFromElement(label);
      if (Number.isFinite(radius)) return radius;
    }

    const extensions = data?.extensions || [];
    for (const extension of extensions) {
      const radius = this._extensionTargetRadius(extension);
      if (Number.isFinite(radius)) return radius;
    }

    return null;
  }

  _radiusFromElement(element) {
    const polarRadius = Number(element?.polarPosition ?? element?.radius);
    if (Number.isFinite(polarRadius)) return polarRadius;

    const position = element?.position;
    if (Array.isArray(position) && Number.isFinite(position[0]) && Number.isFinite(position[1])) {
      return Math.hypot(position[0], position[1]);
    }

    return null;
  }

  _extensionTargetRadius(extension) {
    const polarRadius = Number(extension?.polarData?.target?.radius);
    if (Number.isFinite(polarRadius)) return polarRadius;

    const targetPosition = extension?.targetPosition;
    if (Array.isArray(targetPosition) && Number.isFinite(targetPosition[0]) && Number.isFinite(targetPosition[1])) {
      return Math.hypot(targetPosition[0], targetPosition[1]);
    }

    const point = this._lastPathPoint(extension?.path);
    if (point) return Math.hypot(point[0], point[1]);

    return null;
  }

  _applyLabelRadius(labels, radius) {
    return labels.map((label) => {
      const angle = this._angleFromPosition(label.position, label.angle);
      const z = Array.isArray(label.position) && Number.isFinite(label.position[2]) ? label.position[2] : 0;

      return {
        ...label,
        angle,
        polarPosition: radius,
        distance: radius,
        position: [
          radius * Math.cos(angle),
          radius * Math.sin(angle),
          z
        ]
      };
    });
  }

  _applyExtensionTargetRadius(extensions, radius) {
    return extensions.map((extension) => {
      const path = extension.path;
      const targetPoint = this._lastPathPoint(path);
      const angle = this._angleFromPosition(targetPoint, extension.polarData?.target?.angle);
      const targetPosition = [
        radius * Math.cos(angle),
        radius * Math.sin(angle),
        targetPoint?.[2] ?? 0
      ];

      return {
        ...extension,
        path: this._replaceLastPathPoint(path, targetPosition),
        targetPosition,
        polarData: {
          ...extension.polarData,
          target: {
            ...extension.polarData?.target,
            angle,
            radius
          }
        }
      };
    });
  }

  _interpolateFinite(from, to, t) {
    const fromValue = from == null ? NaN : Number(from);
    const toValue = to == null ? NaN : Number(to);
    const hasFrom = Number.isFinite(fromValue);
    const hasTo = Number.isFinite(toValue);

    if (hasFrom && hasTo) return fromValue + (toValue - fromValue) * t;
    if (hasTo) return toValue;
    if (hasFrom) return fromValue;
    return null;
  }

  _angleFromPosition(position, fallback = 0) {
    if (Array.isArray(position) && Number.isFinite(position[0]) && Number.isFinite(position[1])) {
      return Math.atan2(position[1], position[0]);
    }
    return Number.isFinite(fallback) ? fallback : 0;
  }

  _lastPathPoint(path) {
    if (!path) return null;

    if (ArrayBuffer.isView(path) && path.length >= 3) {
      return [path[path.length - 3], path[path.length - 2], path[path.length - 1]];
    }

    if (Array.isArray(path) && path.length > 0) {
      const last = path[path.length - 1];
      return Array.isArray(last) ? last : null;
    }

    return null;
  }

  _replaceLastPathPoint(path, point) {
    if (!path) return path;

    if (ArrayBuffer.isView(path) && path.length >= 3) {
      const copy = new path.constructor(path);
      copy[copy.length - 3] = point[0];
      copy[copy.length - 2] = point[1];
      copy[copy.length - 1] = point[2] ?? 0;
      return copy;
    }

    if (Array.isArray(path) && path.length > 0) {
      const copy = path.map((item) => Array.isArray(item) ? [...item] : item);
      copy[copy.length - 1] = point;
      return copy;
    }

    return path;
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
        sourcePosition: this.nodeInterpolator.interpolatePosition(fromLink.polarData?.source, toLink.polarData?.source, t, velocityEntry),
        targetPosition: this.nodeInterpolator.interpolatePosition(fromLink.polarData?.target, toLink.polarData?.target, t, velocityEntry),
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
