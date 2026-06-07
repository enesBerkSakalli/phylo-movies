import { isLinkInSubtree, isNodeInSubtree } from '../../../../domain/tree/splits.js';
import { getLifecycleLinkHighlight } from './links/linkUtils.js';

export const TREE_HIGHLIGHT_ROLE = Object.freeze({
  LIFECYCLE: 'lifecycle',
  ACTIVE_MOVER: 'activeMover',
  PIVOT_EDGE: 'pivotEdge',
  COMPLETED_CHANGE: 'completedChange',
  UPCOMING_CHANGE: 'upcomingChange',
  SUBTREE_HIGHLIGHT: 'subtreeHighlight',
  HISTORY_SUBTREE: 'historySubtree',
  BASE: 'base',
});

export function resolveTreeElementHighlight(entity, cached, elementType = 'link') {
  const cm = cached?.colorManager ?? null;
  const context = resolveContext(entity, cm);

  // Visual precedence is intentionally narrow: lifecycle animation wins, then
  // the current active mover, then the active pivot edge, then broader subtree context.
  if (elementType === 'link') {
    const lifecycle = getLifecycleLinkHighlight(entity);
    if (lifecycle) {
      return {
        role: TREE_HIGHLIGHT_ROLE.LIFECYCLE,
        lifecycleKind: lifecycle.kind,
        rgb: lifecycle.rgb,
        context,
      };
    }
  }

  if (isActiveMover(entity, cached, elementType)) {
    return { role: TREE_HIGHLIGHT_ROLE.ACTIVE_MOVER, context };
  }

  if (isPivotEdge(entity, cm, elementType)) {
    return { role: TREE_HIGHLIGHT_ROLE.PIVOT_EDGE, context };
  }

  if (cached?.upcomingChangesEnabled) {
    if (isCompletedChange(entity, cm, elementType)) {
      return { role: TREE_HIGHLIGHT_ROLE.COMPLETED_CHANGE, context };
    }
    if (isUpcomingChange(entity, cm, elementType)) {
      return { role: TREE_HIGHLIGHT_ROLE.UPCOMING_CHANGE, context };
    }
  }

  if (isSubtreeHighlight(entity, cached, elementType)) {
    return { role: TREE_HIGHLIGHT_ROLE.SUBTREE_HIGHLIGHT, context };
  }

  if (isHistorySubtree(entity, cm, elementType)) {
    return { role: TREE_HIGHLIGHT_ROLE.HISTORY_SUBTREE, context };
  }

  return { role: TREE_HIGHLIGHT_ROLE.BASE, context };
}

function resolveContext(entity, cm) {
  return {
    sourceAttachment: Boolean(cm?.isNodeSourceEdge?.(entity)),
    destinationAttachment: Boolean(cm?.isNodeDestinationEdge?.(entity)),
  };
}

function isActiveMover(entity, cached, elementType) {
  if (cached?.subtreeHighlightsEnabled === false) {
    return false;
  }

  return elementType === 'node'
    ? Boolean(cached?.colorManager?.isNodeInActiveMoverSubtree?.(entity))
    : Boolean(cached?.colorManager?.isLinkInActiveMoverSubtree?.(entity));
}

function isSubtreeHighlight(entity, cached, elementType) {
  if (cached?.subtreeHighlightsEnabled === false || !cached?.highlightedSubtreeData?.length) {
    return false;
  }

  return elementType === 'node'
    ? isNodeInSubtree(entity, cached.highlightedSubtreeData)
    : isLinkInSubtree(entity, cached.highlightedSubtreeData);
}

function isPivotEdge(entity, cm, elementType) {
  return elementType === 'node'
    ? Boolean(cm?.isNodePivotEdge?.(entity))
    : Boolean(cm?.isPivotEdge?.(entity));
}

function isCompletedChange(entity, cm, elementType) {
  return elementType === 'node'
    ? Boolean(cm?.isNodeCompletedChangeEdge?.(entity))
    : Boolean(cm?.isCompletedChangeEdge?.(entity));
}

function isUpcomingChange(entity, cm, elementType) {
  return elementType === 'node'
    ? Boolean(cm?.isNodeUpcomingChangeEdge?.(entity))
    : Boolean(cm?.isUpcomingChangeEdge?.(entity));
}

function isHistorySubtree(entity, cm, elementType) {
  return elementType === 'node'
    ? Boolean(cm?.isNodeHistorySubtree?.(entity))
    : Boolean(cm?.isLinkHistorySubtree?.(entity));
}
