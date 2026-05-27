import { getSplitKey } from '../../../domain/tree/splits.js';

export const LINK_LIFECYCLES = Object.freeze({
  UNCHANGED: 'unchanged',
  ENTERING: 'entering',
  EXITING: 'exiting',
  ZEROING: 'zeroing',
  REVIVING: 'reviving',
  LENGTH_CHANGING: 'lengthChanging',
});

const DEFAULT_ZERO_EPSILON = 1e-6;
const COLLAPSE_LIFECYCLES = new Set([LINK_LIFECYCLES.EXITING, LINK_LIFECYCLES.ZEROING]);
const EXPAND_LIFECYCLES = new Set([LINK_LIFECYCLES.ENTERING, LINK_LIFECYCLES.REVIVING]);

export function buildTransitionChangeModel(dataFrom, dataTo, options = {}) {
  const zeroEpsilon = Number.isFinite(options.zeroEpsilon)
    ? Math.max(0, options.zeroEpsilon)
    : DEFAULT_ZERO_EPSILON;
  const fromLinks = createLinkMap(dataFrom?.links);
  const toLinks = createLinkMap(dataTo?.links);
  const linkChanges = new Map();
  const ids = new Set([...fromLinks.keys(), ...toLinks.keys()]);

  let hasLifecycleChanges = false;

  for (const id of ids) {
    const fromLink = fromLinks.get(id) || null;
    const toLink = toLinks.get(id) || null;
    const fromLength = getVisibleBranchLength(fromLink);
    const toLength = getVisibleBranchLength(toLink);
    const lifecycle = classifyLinkLifecycle(fromLink, toLink, fromLength, toLength, zeroEpsilon);

    if (lifecycle !== LINK_LIFECYCLES.UNCHANGED) {
      hasLifecycleChanges = true;
    }

    linkChanges.set(id, {
      id,
      splitKey: id,
      lifecycle,
      fromLink,
      toLink,
      fromLength,
      toLength,
    });
  }

  const result = {
    zeroEpsilon,
    linkChanges,
    hasLifecycleChanges,
    getLinkChange(linkOrKey) {
      return linkChanges.get(resolveLinkKey(linkOrKey)) || null;
    },
    getLinkLifecycle(linkOrKey) {
      return this.getLinkChange(linkOrKey)?.lifecycle || LINK_LIFECYCLES.UNCHANGED;
    },
  };
  result.lifecycleSummary = summarizeTransitionLifecycles(result);
  return result;
}

export function createLifecycleClocks(timeFactor) {
  const t = clamp01(timeFactor);
  return {
    focusT: phase(t, 0.0, 0.15),
    collapseT: phase(t, 0.15, 0.4),
    moveT: phase(t, 0.3, 0.75),
    expandT: phase(t, 0.55, 0.9),
    settleT: phase(t, 0.85, 1.0),
  };
}

export function summarizeTransitionLifecycles(transitionChangeModel) {
  const counts = {
    [LINK_LIFECYCLES.UNCHANGED]: 0,
    [LINK_LIFECYCLES.ENTERING]: 0,
    [LINK_LIFECYCLES.EXITING]: 0,
    [LINK_LIFECYCLES.ZEROING]: 0,
    [LINK_LIFECYCLES.REVIVING]: 0,
    [LINK_LIFECYCLES.LENGTH_CHANGING]: 0,
  };

  for (const change of iterateLinkChanges(transitionChangeModel)) {
    const lifecycle = change?.lifecycle || LINK_LIFECYCLES.UNCHANGED;
    counts[lifecycle] = (counts[lifecycle] ?? 0) + 1;
  }

  const hasCollapseChanges = [...COLLAPSE_LIFECYCLES].some((lifecycle) => counts[lifecycle] > 0);
  const hasExpandChanges = [...EXPAND_LIFECYCLES].some((lifecycle) => counts[lifecycle] > 0);

  return {
    counts,
    hasCollapseChanges,
    hasExpandChanges,
    hasStructuralChanges: hasCollapseChanges || hasExpandChanges,
    hasLengthChanges: counts[LINK_LIFECYCLES.LENGTH_CHANGING] > 0,
  };
}

export function phase(timeFactor, start, end) {
  const t = clamp01(timeFactor);
  if (end <= start) return t >= end ? 1 : 0;
  return clamp01((t - start) / (end - start));
}

export function getVisibleBranchLength(link) {
  if (!link) return 0;
  const radialLength = Number(link.radialLength);
  if (Number.isFinite(radialLength)) return Math.max(0, radialLength);

  const sourceRadius = Number(link.polarData?.source?.radius);
  const targetRadius = Number(link.polarData?.target?.radius);
  if (Number.isFinite(sourceRadius) && Number.isFinite(targetRadius)) {
    return Math.max(0, targetRadius - sourceRadius);
  }

  return 0;
}

function iterateLinkChanges(transitionChangeModel) {
  const changes = transitionChangeModel?.linkChanges;
  if (!changes) return [];
  if (changes instanceof Map) return changes.values();
  if (Array.isArray(changes)) return changes;
  if (typeof changes.values === 'function') return changes.values();
  return [];
}

function createLinkMap(links) {
  const map = new Map();
  if (!Array.isArray(links)) return map;

  for (const link of links) {
    const key = resolveLinkKey(link);
    if (key) map.set(key, link);
  }
  return map;
}

function classifyLinkLifecycle(fromLink, toLink, fromLength, toLength, zeroEpsilon) {
  if (!fromLink && toLink) return LINK_LIFECYCLES.ENTERING;
  if (fromLink && !toLink) return LINK_LIFECYCLES.EXITING;
  if (!fromLink && !toLink) return LINK_LIFECYCLES.UNCHANGED;

  const fromZero = fromLength <= zeroEpsilon;
  const toZero = toLength <= zeroEpsilon;
  if (!fromZero && toZero) return LINK_LIFECYCLES.ZEROING;
  if (fromZero && !toZero) return LINK_LIFECYCLES.REVIVING;
  if (Math.abs(fromLength - toLength) > zeroEpsilon) return LINK_LIFECYCLES.LENGTH_CHANGING;
  return LINK_LIFECYCLES.UNCHANGED;
}

function resolveLinkKey(linkOrKey) {
  if (typeof linkOrKey === 'string') return linkOrKey;
  return linkOrKey?.splitKey || getSplitKey(linkOrKey) || linkOrKey?.id || null;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}
