import { LINK_LIFECYCLES, createLifecycleClocks } from './TransitionChangeModel.js';
import { polarToPosition, positionFromPolar, positionToPolar } from '../../utils/polarGeometry.js';
import { measureFrameStep } from '../../performance/frameInstrumentation.js';

const ZERO_LENGTH_EPSILON = 1e-6;

export class PolarLinkInterpolator {
  constructor({ elementMatcher, pathInterpolator, nodeInterpolator }) {
    this.elementMatcher = elementMatcher;
    this.pathInterpolator = pathInterpolator;
    this.nodeInterpolator = nodeInterpolator;
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
        this._interpolateLinkDatum(fromLink, toLink, t, {
          ...options,
          velocityEntry,
        }),
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
    const processedFromIds = new Set();

    const addEntry = (id, fromLink, toLink, fallbackLifecycle, flags = {}) => {
      const link = toLink || fromLink;
      const change = model.getLinkChange(link) || model.getLinkChange(id);
      const lifecycle = change?.lifecycle || fallbackLifecycle;
      const clock = getLifecycleClock(lifecycle, clocks, timeFactor);
      const lengthScale = getLifecycleLengthScale(lifecycle, clock, timeFactor);
      const entry = {
        id,
        fromLink,
        toLink,
        lifecycle,
        clock,
        lengthScale,
        velocityEntry: velocityMap?.get(id) ?? null,
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

    for (const [id, toLink] of toMap) {
      const fromLink = fromMap.get(id);

      if (fromLink) {
        processedFromIds.add(id);
        addEntry(id, fromLink, toLink, LINK_LIFECYCLES.UNCHANGED);
      } else {
        addEntry(id, null, toLink, LINK_LIFECYCLES.ENTERING, { isEntering: true });
      }
    }

    for (const [id, fromLink] of fromMap) {
      if (processedFromIds.has(id)) continue;

      addEntry(id, fromLink, null, LINK_LIFECYCLES.EXITING, { isExiting: true });
    }

    const resolveEntry = (entry) => {
      if (resolvedEntries.has(entry.id)) return resolvedEntries.get(entry.id);
      if (resolvingEntries.has(entry.id)) {
        return this._computeLifecycleEntry(entry, timeFactor, options);
      }

      resolvingEntries.add(entry.id);
      const sourceId = linkEndpointNodeId(entry, 'source');
      const parentEntry = sourceId ? incomingLifecycleEntryByTarget.get(sourceId) : null;
      const parentDatum =
        parentEntry &&
        parentEntry.id !== entry.id &&
        shouldAttachLifecycleEndpoints(parentEntry.lifecycle, entry.lifecycle)
          ? resolveEntry(parentEntry)
          : null;
      const computed = this._computeLifecycleEntry(entry, timeFactor, {
        ...options,
        ...(parentDatum?.targetPosition
          ? { sourcePositionOverride: parentDatum.targetPosition }
          : {}),
      });
      resolvingEntries.delete(entry.id);
      resolvedEntries.set(entry.id, computed);
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

    const sourceRadius = Math.hypot(sourcePosition[0], sourcePosition[1]);
    const targetReferenceRadius = Math.hypot(
      targetReferencePosition[0],
      targetReferencePosition[1]
    );
    const targetAngle = Math.atan2(targetFramePosition[1], targetFramePosition[0]);
    const branchLength = Math.max(0, targetReferenceRadius - sourceRadius);
    const scaledBranchLength = branchLength * clampTime(lengthScale);
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

  _interpolateLinkEndpointPosition(fromLink, toLink, endpoint, frameT, options = {}) {
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
      options.velocityEntry ?? null
    );
  }

  _interpolateLinkDatum(fromLink, toLink, t, options = {}) {
    const sourcePosition = this._interpolateLinkEndpointPosition(
      fromLink,
      toLink,
      'source',
      t,
      options
    );
    const targetPosition = this._interpolateLinkEndpointPosition(
      fromLink,
      toLink,
      'target',
      t,
      options
    );

    return this._createLinkDatumFromPositions(toLink, sourcePosition, targetPosition, {
      ...options,
      lifecycle: options.lifecycle || LINK_LIFECYCLES.UNCHANGED,
      transitionPhase: options.transitionPhase ?? t,
    });
  }

  _createLinkDatumFromPositions(link, sourcePosition, targetPosition, options = {}) {
    // positionedLink is a throwaway used only to feed interpolatePath, which reads
    // nothing but `.polarData`. Avoid spreading the whole link object here; build
    // the minimal shape instead to cut per-frame garbage.
    const positionedLink = measureFrameStep('link.datumAssembly', () => {
      const sourcePolar = positionToPolar(sourcePosition);
      const targetPolar = positionToPolar(targetPosition);
      return {
        radialLength: Math.max(0, targetPolar.radius - sourcePolar.radius),
        polarData: {
          ...link.polarData,
          source: sourcePolar,
          target: targetPolar,
        },
      };
    });

    const path = this.pathInterpolator.createPathFromPolarData(positionedLink.polarData, {
      linkGeometryMode: options.linkGeometryMode,
      pathPoolKey: link?.id != null ? `link:${link.id}` : null,
    });

    return measureFrameStep('link.datumSpread', () => ({
      ...link,
      path,
      sourcePosition,
      targetPosition,
      polarData: positionedLink.polarData,
      radialLength: positionedLink.radialLength,
      split_indices: link.split_indices,
      splitKey: link.splitKey,
      children: link.children,
      targetName: link.targetName,
      lifecycle: options.lifecycle || LINK_LIFECYCLES.UNCHANGED,
      transitionPhase: options.transitionPhase ?? 1,
    }));
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

function getLifecycleLengthScale(lifecycle, clock, frameTimeFactor) {
  switch (lifecycle) {
    case LINK_LIFECYCLES.ENTERING:
      return frameTimeFactor;
    case LINK_LIFECYCLES.REVIVING:
      return frameTimeFactor;
    case LINK_LIFECYCLES.EXITING:
      return 1 - frameTimeFactor;
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

function shouldAttachLifecycleEndpoints(parentLifecycle, childLifecycle) {
  const parentDirection = lifecycleDirection(parentLifecycle);
  return parentDirection !== null && parentDirection === lifecycleDirection(childLifecycle);
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
  return baseOpacity(element) * clampTime(options.enterTimeFactor);
}

function exitingStructuralOpacity(element, options) {
  if (!options?.hasExplicitExitTimeFactor) return baseOpacity(element);
  return baseOpacity(element) * (1 - clampTime(options.exitTimeFactor));
}

function clampTime(timeFactor) {
  return Math.max(0, Math.min(1, Number.isFinite(timeFactor) ? timeFactor : 0));
}

function pointsMatch(a, b, epsilon = 1e-6) {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    Math.abs((a[0] ?? 0) - (b[0] ?? 0)) <= epsilon &&
    Math.abs((a[1] ?? 0) - (b[1] ?? 0)) <= epsilon &&
    Math.abs((a[2] ?? 0) - (b[2] ?? 0)) <= epsilon
  );
}
