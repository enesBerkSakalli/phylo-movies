import { LINK_LIFECYCLES, createLifecycleClocks } from './TransitionChangeModel.js';
import {
  normalizePosition3,
  polarToPosition,
  positionFromPolar,
} from '../../utils/polarGeometry.js';
import { twoPointFloat32Path } from '../utils/pathFormat.js';
import { pointsMatch } from './pointUtils.js';
import { clamp01 } from '../../../domain/math/mathUtils.js';

const ZERO_LENGTH_EPSILON = 1e-6;

export class PolarLinkInterpolator {
  constructor({ elementMatcher, pathInterpolator, nodeInterpolator }) {
    this.elementMatcher = elementMatcher;
    this.pathInterpolator = pathInterpolator;
    this.nodeInterpolator = nodeInterpolator;
    this._datumPool = new Map();
  }

  interpolateLinks(fromLinks, toLinks, timeFactor, options = {}) {
    if (options?.transitionChangeModel) {
      return this._interpolateLifecycleAwareLinks(fromLinks, toLinks, timeFactor, options);
    }

    return this.elementMatcher.interpolateElements(
      fromLinks,
      toLinks,
      timeFactor,
      (fromLink, toLink, t, velocityEntry) =>
        this._interpolateLinkDatum(fromLink, toLink, t, options, velocityEntry),
      options
    );
  }

  _interpolateLifecycleAwareLinks(fromLinks, toLinks, timeFactor, options = {}) {
    const fromMap = options.fromMap || this.elementMatcher._createElementMap(fromLinks);
    const toMap = options.toMap || this.elementMatcher._createElementMap(toLinks);
    const velocityMap = options.velocityMap || null;
    const model = options.transitionChangeModel;
    const clocks =
      options.lifecycleClocks || createLifecycleClocks(options.rawTimeFactor ?? timeFactor);
    const entries = [];
    const incomingLifecycleEntryByTarget = new Map();
    const resolvedEntries = new Map();
    const resolvingEntries = new Set();
    const processedFromKeys = new Set();

    const addEntry = (matchKey, fromLink, toLink, fallbackLifecycle, flags = {}) => {
      const link = toLink || fromLink;
      const change = model.getLinkChange(link) || model.getLinkChange(matchKey);
      const lifecycle = change?.lifecycle || fallbackLifecycle;
      const clock = getLifecycleClock(lifecycle, clocks, timeFactor);
      const lengthScale = getLifecycleLengthScale(lifecycle, timeFactor);
      const entry = {
        matchKey,
        fromLink,
        toLink,
        lifecycle,
        clock,
        lengthScale,
        velocityEntry: velocityMap?.get(matchKey) ?? null,
        change,
        ...flags,
      };

      entries.push(entry);

      const targetId = linkEndpointNodeId(entry, 'target');
      if (targetId && lengthScale !== null) {
        incomingLifecycleEntryByTarget.set(targetId, entry);
      }

      return entry;
    };

    for (const [matchKey, toLink] of toMap) {
      const fromLink = fromMap.get(matchKey);

      if (fromLink) {
        processedFromKeys.add(matchKey);
        addEntry(matchKey, fromLink, toLink, LINK_LIFECYCLES.UNCHANGED);
      } else {
        addEntry(matchKey, null, toLink, LINK_LIFECYCLES.ENTERING, { isEntering: true });
      }
    }

    for (const [matchKey, fromLink] of fromMap) {
      if (processedFromKeys.has(matchKey)) continue;

      addEntry(matchKey, fromLink, null, LINK_LIFECYCLES.EXITING, { isExiting: true });
    }

    const resolveEntry = (entry) => {
      if (resolvedEntries.has(entry.matchKey)) return resolvedEntries.get(entry.matchKey);
      if (resolvingEntries.has(entry.matchKey)) {
        return this._computeLifecycleEntry(entry, timeFactor, options);
      }

      resolvingEntries.add(entry.matchKey);
      const sourceId = linkEndpointNodeId(entry, 'source');
      const parentEntry = sourceId ? incomingLifecycleEntryByTarget.get(sourceId) : null;
      const parentDatum =
        parentEntry &&
        parentEntry.matchKey !== entry.matchKey &&
        shouldAttachLifecycleEndpoints(parentEntry.lifecycle, entry.lifecycle)
          ? resolveEntry(parentEntry)
          : null;
      const computed = this._computeLifecycleEntry(entry, timeFactor, {
        ...options,
        ...(parentDatum?.targetPosition
          ? { sourcePositionOverride: parentDatum.targetPosition }
          : {}),
      });
      resolvingEntries.delete(entry.matchKey);
      resolvedEntries.set(entry.matchKey, computed);
      return computed;
    };

    const resolvedLinks = [];
    for (const entry of entries) {
      resolvedLinks.push(resolveEntry(entry));
    }
    return this._attachChildSourcesToRenderedParents(resolvedLinks, options);
  }

  _computeLifecycleEntry(entry, timeFactor, options = {}) {
    const fromLink = entry.fromLink || entry.toLink;
    const toLink = entry.toLink || entry.fromLink;
    const entryOptions = {
      ...options,
      lifecycle: entry.lifecycle,
      transitionPhase: entry.clock,
      velocityEntry: entry.velocityEntry,
      change: entry.change,
    };
    const computed =
      entry.lengthScale !== null
        ? this._interpolateLifecycleScaledLink(
            fromLink,
            toLink,
            timeFactor,
            entry.lengthScale,
            entryOptions
          )
        : this._interpolateLinkDatum(fromLink, toLink, timeFactor, entryOptions);

    if (entry.isEntering) {
      return {
        ...computed,
        opacity: enteringStructuralOpacity(toLink, options),
        isEntering: true,
      };
    }

    if (entry.isExiting) {
      return {
        ...computed,
        opacity: exitingStructuralOpacity(fromLink, options),
        isExiting: true,
      };
    }

    return computed;
  }

  _interpolateLifecycleScaledLink(fromLink, toLink, frameT, lengthScale, options = {}) {
    const sourcePosition =
      options.sourcePositionOverride ||
      this._interpolateLinkEndpointPosition(fromLink, toLink, 'source', frameT, options);
    const targetFramePosition = this._interpolateLinkEndpointPosition(
      fromLink,
      toLink,
      'target',
      frameT,
      options
    );
    const targetReferencePosition =
      this._lifecycleTargetReferencePosition(fromLink, toLink, options.lifecycle, options) ||
      targetFramePosition;

    if (
      usesCartesianEndpointScaling(sourcePosition, targetFramePosition, targetReferencePosition)
    ) {
      const targetPosition = scaleAlongCartesianEndpoint(
        sourcePosition,
        targetFramePosition,
        targetReferencePosition,
        lengthScale
      );
      return this._createLinkDatumFromPositions(toLink, sourcePosition, targetPosition, options);
    }

    const sourceRadius = Math.hypot(sourcePosition[0], sourcePosition[1]);
    const targetReferenceRadius = Math.hypot(
      targetReferencePosition[0],
      targetReferencePosition[1]
    );
    const targetAngle = Math.atan2(targetFramePosition[1], targetFramePosition[0]);
    const branchLength = Math.max(0, targetReferenceRadius - sourceRadius);
    const scaledBranchLength = branchLength * clamp01(lengthScale);
    const targetPosition =
      scaledBranchLength <= ZERO_LENGTH_EPSILON
        ? sourcePosition
        : positionFromPolar(sourceRadius + scaledBranchLength, targetAngle, targetFramePosition[2]);

    return this._createLinkDatumFromPositions(toLink, sourcePosition, targetPosition, options);
  }

  _lifecycleTargetReferencePosition(fromLink, toLink, lifecycle, options = {}) {
    const referenceLink = lifecycleTargetReferenceLink(fromLink, toLink, lifecycle);
    if (!referenceLink) return null;

    const targetMap = lifecycleUsesTargetTreeReference(lifecycle)
      ? options.nodeToMap
      : options.nodeFromMap;
    const targetId = referenceLink.targetId;
    const endpointElement = targetId ? targetMap?.get(targetId) : null;

    if (endpointElement) return endpointElement.position || polarToPosition(endpointElement);

    return linkEndpointPosition(referenceLink, 'target');
  }

  _interpolateLinkEndpointPosition(
    fromLink,
    toLink,
    endpoint,
    frameT,
    options = {},
    velocityEntry = options.velocityEntry ?? null
  ) {
    const idField = endpoint === 'source' ? 'sourceId' : 'targetId';
    const nodeId = toLink?.[idField] || fromLink?.[idField];
    const fromNode = nodeId ? options.nodeFromMap?.get(nodeId) : null;
    const toNode = nodeId ? options.nodeToMap?.get(nodeId) : null;

    if (fromNode && toNode) {
      return this.nodeInterpolator.interpolatePosition(
        fromNode,
        toNode,
        frameT,
        options.nodeVelocityMap?.get(nodeId) ?? null
      );
    }

    if (toNode) return toNode.position || polarToPosition(toNode);
    if (fromNode) return fromNode.position || polarToPosition(fromNode);

    const polarEndpoint = endpoint === 'source' ? 'source' : 'target';
    return this.nodeInterpolator.interpolatePosition(
      fromLink?.polarData?.[polarEndpoint],
      toLink?.polarData?.[polarEndpoint],
      frameT,
      velocityEntry
    );
  }

  _interpolateLinkDatum(fromLink, toLink, t, options = {}, velocityEntry = options.velocityEntry) {
    const sourcePosition = this._interpolateLinkEndpointPosition(
      fromLink,
      toLink,
      'source',
      t,
      options,
      velocityEntry
    );
    const targetPosition = this._interpolateLinkEndpointPosition(
      fromLink,
      toLink,
      'target',
      t,
      options,
      velocityEntry
    );

    return this._createLinkDatumFromPositions(toLink, sourcePosition, targetPosition, {
      linkGeometryMode: options.linkGeometryMode,
      lifecycle: options.lifecycle || LINK_LIFECYCLES.UNCHANGED,
      transitionPhase: options.transitionPhase ?? t,
    });
  }

  _createLinkDatumFromPositions(link, sourcePosition, targetPosition, options = {}) {
    const poolKey = link?.id ?? link?.splitKey ?? null;
    const result = poolKey == null ? {} : (this._datumPool.get(poolKey) ?? {});
    const polarData = result.polarData || {};
    const sourcePolar = polarData.source || {};
    const targetPolar = polarData.target || {};
    Object.assign(polarData, link.polarData);
    Object.assign(sourcePolar, link.polarData?.source);
    Object.assign(targetPolar, link.polarData?.target);
    writePolarFromPosition(sourcePolar, sourcePosition);
    writePolarFromPosition(targetPolar, targetPosition);
    polarData.source = sourcePolar;
    polarData.target = targetPolar;
    const radialLength = Math.max(0, targetPolar.radius - sourcePolar.radius);

    const path =
      options.linkGeometryMode === 'straight'
        ? twoPointFloat32Path(sourcePosition, targetPosition)
        : this.pathInterpolator.createPathFromPolarData(polarData, {
            linkGeometryMode: options.linkGeometryMode,
            pathPoolKey: link?.id != null ? `link:${link.id}` : null,
          });

    // Pooled datums outlive a transition, so clear the lifecycle-only fields before merging:
    // Object.assign never removes keys the new source omits, which would otherwise leave a link
    // stuck at the opacity/flags it carried while entering or exiting.
    result.opacity = undefined;
    result.isEntering = false;
    result.isExiting = false;
    Object.assign(result, link, {
      path,
      sourcePosition,
      targetPosition,
      polarData,
      radialLength,
      lifecycle: options.lifecycle || LINK_LIFECYCLES.UNCHANGED,
      transitionPhase: options.transitionPhase ?? 1,
    });
    if (poolKey != null) this._datumPool.set(poolKey, result);
    return result;
  }

  _attachChildSourcesToRenderedParents(links, options = {}) {
    const parentLinkByTargetId = new Map();
    for (const link of links) {
      if (link?.targetId) parentLinkByTargetId.set(link.targetId, link);
    }

    let result = null;
    for (let index = 0; index < links.length; index += 1) {
      const link = links[index];
      const parentLink = link?.sourceId ? parentLinkByTargetId.get(link.sourceId) : null;
      if (!parentLink?.targetPosition || parentLink.id === link.id) {
        result?.push(link);
        continue;
      }

      if (pointsMatch(link.sourcePosition, parentLink.targetPosition)) {
        result?.push(link);
        continue;
      }

      const adjustedLink = this._createLinkDatumFromPositions(
        link,
        parentLink.targetPosition,
        link.targetPosition,
        {
          lifecycle: link.lifecycle,
          transitionPhase: link.transitionPhase,
          linkGeometryMode: options.linkGeometryMode,
        }
      );

      if (!result) {
        result = links.slice(0, index);
      }
      result.push(adjustedLink);
    }

    return result ?? links;
  }

  resetCache() {
    this._datumPool.clear();
  }
}

function getLifecycleClock(lifecycle, clocks, fallback) {
  switch (lifecycle) {
    case LINK_LIFECYCLES.ENTERING:
    case LINK_LIFECYCLES.REVIVING:
      return clocks.expandT;
    case LINK_LIFECYCLES.EXITING:
    case LINK_LIFECYCLES.ZEROING:
      return clocks.collapseT;
    case LINK_LIFECYCLES.LENGTH_CHANGING:
    case LINK_LIFECYCLES.UNCHANGED:
    default:
      return clocks.moveT ?? fallback;
  }
}

/**
 * Length scaling runs on the raw frame clock, not the staged lifecycle clocks: the staged clocks
 * hold a branch at full length for part of the frame and snap it, which read as a flicker. The
 * staged clock still drives `transitionPhase`.
 */
function getLifecycleLengthScale(lifecycle, frameTimeFactor) {
  switch (lifecycle) {
    case LINK_LIFECYCLES.ENTERING:
    case LINK_LIFECYCLES.REVIVING:
      return frameTimeFactor;
    case LINK_LIFECYCLES.EXITING:
    case LINK_LIFECYCLES.ZEROING:
      return 1 - frameTimeFactor;
    default:
      return null;
  }
}

function lifecycleTargetReferenceLink(fromLink, toLink, lifecycle) {
  switch (lifecycle) {
    case LINK_LIFECYCLES.ENTERING:
    case LINK_LIFECYCLES.REVIVING:
      return toLink || fromLink || null;
    case LINK_LIFECYCLES.EXITING:
    case LINK_LIFECYCLES.ZEROING:
      return fromLink || toLink || null;
    default:
      return null;
  }
}

function lifecycleUsesTargetTreeReference(lifecycle) {
  switch (lifecycle) {
    case LINK_LIFECYCLES.ENTERING:
    case LINK_LIFECYCLES.REVIVING:
      return true;
    default:
      return false;
  }
}

function linkEndpointPosition(link, endpoint) {
  const explicitPosition = endpoint === 'source' ? link?.sourcePosition : link?.targetPosition;
  if (
    Array.isArray(explicitPosition) &&
    Number.isFinite(explicitPosition[0]) &&
    Number.isFinite(explicitPosition[1])
  ) {
    return explicitPosition;
  }

  const polar = link?.polarData?.[endpoint];
  const radius = Number(polar?.radius);
  const angle = Number(polar?.angle);
  if (Number.isFinite(radius) && Number.isFinite(angle)) {
    return positionFromPolar(radius, angle, 0);
  }

  return null;
}

function linkEndpointNodeId(entry, endpoint) {
  const idField = endpoint === 'source' ? 'sourceId' : 'targetId';
  return entry.toLink?.[idField] || entry.fromLink?.[idField] || null;
}

function writePolarFromPosition(target, position) {
  const x = Number(position?.[0]);
  const y = Number(position?.[1]);
  const finiteX = Number.isFinite(x) ? x : 0;
  const finiteY = Number.isFinite(y) ? y : 0;
  target.angle = Math.atan2(finiteY, finiteX);
  target.radius = Math.hypot(finiteX, finiteY);
}

function shouldAttachLifecycleEndpoints(parentLifecycle, childLifecycle) {
  const parentDirection = lifecycleDirection(parentLifecycle);
  return parentDirection !== null && parentDirection === lifecycleDirection(childLifecycle);
}

function usesCartesianEndpointScaling(...positions) {
  return positions.some((position) => Math.abs(Number(position?.[2]) || 0) > ZERO_LENGTH_EPSILON);
}

function scaleAlongCartesianEndpoint(
  sourcePosition,
  targetFramePosition,
  targetReferencePosition,
  t
) {
  const source = normalizePosition3(sourcePosition) || [0, 0, 0];
  const targetFrame = normalizePosition3(targetFramePosition) || [0, 0, 0];
  const targetReference = normalizePosition3(targetReferencePosition) || [0, 0, 0];
  const referenceDelta = [
    targetReference[0] - source[0],
    targetReference[1] - source[1],
    targetReference[2] - source[2],
  ];
  const frameDelta = [
    targetFrame[0] - source[0],
    targetFrame[1] - source[1],
    targetFrame[2] - source[2],
  ];
  const referenceLength = Math.hypot(referenceDelta[0], referenceDelta[1], referenceDelta[2]);
  const frameLength = Math.hypot(frameDelta[0], frameDelta[1], frameDelta[2]);
  const scale = clamp01(t);
  if (referenceLength <= ZERO_LENGTH_EPSILON || frameLength <= ZERO_LENGTH_EPSILON || scale <= 0) {
    return source;
  }
  const targetLength = referenceLength * scale;
  return [
    source[0] + (frameDelta[0] / frameLength) * targetLength,
    source[1] + (frameDelta[1] / frameLength) * targetLength,
    source[2] + (frameDelta[2] / frameLength) * targetLength,
  ];
}

function lifecycleDirection(lifecycle) {
  switch (lifecycle) {
    case LINK_LIFECYCLES.ENTERING:
    case LINK_LIFECYCLES.REVIVING:
      return 'growing';
    case LINK_LIFECYCLES.EXITING:
    case LINK_LIFECYCLES.ZEROING:
      return 'shrinking';
    default:
      return null;
  }
}

function baseOpacity(link) {
  return Number.isFinite(link?.opacity) ? link.opacity : 1;
}

function enteringStructuralOpacity(element, options) {
  if (!options?.hasExplicitEnterTimeFactor) return baseOpacity(element);
  return baseOpacity(element) * clamp01(options.enterTimeFactor);
}

function exitingStructuralOpacity(element, options) {
  if (!options?.hasExplicitExitTimeFactor) return baseOpacity(element);
  return baseOpacity(element) * (1 - clamp01(options.exitTimeFactor));
}
