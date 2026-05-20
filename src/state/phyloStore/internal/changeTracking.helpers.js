import {
  flattenSplitSets,
  toSubtreeKey,
  getBackendSplitMapValue,
  parseSubtreeHighlightEntry,
  collectUniqueSubtrees,
  collectUniqueEdges
} from '../../../domain/tree/splits.js';
import { findPreviousInputTreeSequenceIndex, findNextInputTreeSequenceIndex } from '../../../domain/indexing/treeIndexSemantics.js';
import { selectInputFrameIndices, selectPairById, selectTimelineFrameAtIndex } from '../selectors/treeSelectors.js';

// ============================================================================
// SYSTEM HELPERS (Rendering, Persistence, Storage)
// ============================================================================

export function calculateChangePreviews(state, indexOverride = null) {
  const { upcomingChangesEnabled, frameIndex: stateFrameIndex, pivotEdgeTracking } = state;
  const frameIndex = Number.isInteger(indexOverride) ? indexOverride : stateFrameIndex;

  if (!upcomingChangesEnabled) {
    return { upcoming: [], completed: [] };
  }

  const inputTreeIndices = selectInputFrameIndices(state);
  if (!inputTreeIndices.length || !pivotEdgeTracking.length) {
    return { upcoming: [], completed: [] };
  }

  const previousInputTreeIndex = findPreviousInputTreeSequenceIndex(inputTreeIndices, frameIndex);
  const nextInputTreeIndex = findNextInputTreeSequenceIndex(inputTreeIndices, frameIndex);
  const currentEdge = pivotEdgeTracking[frameIndex];
  // Must use toSubtreeKey to match how collectUniqueEdges generates keys (was JSON.stringify which caused mismatch)
  const currentKey = Array.isArray(currentEdge) && currentEdge.length > 0
    ? toSubtreeKey(currentEdge)
    : null;

  const completed = collectUniqueEdges(pivotEdgeTracking, previousInputTreeIndex + 1, frameIndex, currentKey);

  if (nextInputTreeIndex === null) {
    return { upcoming: [], completed };
  }

  const upcoming = collectUniqueEdges(pivotEdgeTracking, frameIndex + 1, nextInputTreeIndex, currentKey);

  return { upcoming, completed };
}

export function renderTreeControllers(state) {
  if (state.playing) return;

  state.treeControllers.forEach((controller) => controller.renderAllElements());
}

export function toManualMarkedSets(nodes) {
  return Array.isArray(nodes) && nodes.length ? [new Set(nodes)] : [];
}

export function clearEdgePreviews(colorManager) {
  colorManager?.updateUpcomingChangeEdges?.([]);
  colorManager?.updateCompletedChangeEdges?.([]);
}

// ============================================================================
// STATE SELECTORS & LOGIC
// ============================================================================

export function resolveMarkedSubtrees(state, indexOverride = null) {
  const { frameIndex, markedSubtreeScope } = state;
  const index = indexOverride ?? frameIndex;

  if (isInputFrame(state, index)) return [];

  if (markedSubtreeScope === 'current') {
    const subtree = getSubtreeAtIndex(state, index);

    // Normalize before returning to ensure we don't return raw ambiguous arrays
    return parseSubtreeHighlightEntry(subtree);
  }

  // "all" mode intentionally uses pair-level affected subtrees for the active
  // pivot edge, not just the subtree currently moving at this frame.
  return getAffectedSubtreesForPivotEdge(state, index);
}

export function getSubtreeAtIndex(state, index) {
  const subtree = state.subtreeHighlightTracking[index];
  return Array.isArray(subtree) ? subtree : [];
}

export function getMovingSubtreeAtIndex(state, index) {
  const subtree = state.subtreeHighlightTracking[index];
  return parseSubtreeHighlightEntry(subtree);
}

export function getAffectedSubtreesForPivotEdge(state, index) {
  const edge = state.pivotEdgeTracking[index];
  if (!Array.isArray(edge) || edge.length === 0) return [];

  const pairId = selectTimelineFrameAtIndex(state, index)?.pair_id ?? null;
  if (!pairId) return [];
  const affectedSubtreesBySplit = selectPairById(state)[pairId].solution.affected_subtrees_by_split;

  return flattenSplitSets(getBackendSplitMapValue(affectedSubtreesBySplit, edge));
}

/**
 * Retrieves the history of subtrees for a given index, relative to the last input tree.
 */
export function getSubtreeHistoryAtIndex(state, index) {
  if (isInputFrame(state, index)) return [];
  const tracking = state.subtreeHighlightTracking;
  if (tracking.length === 0) return [];

  const inputTreeIndices = selectInputFrameIndices(state);
  if (!inputTreeIndices.length) return [];

  const previousInputTreeIndex = findPreviousInputTreeSequenceIndex(inputTreeIndices, index);
  const start = Math.max(previousInputTreeIndex + 1, 0);
  const end = Math.min(index, tracking.length);
  if (end <= start) return [];

  // Generate exclude keys from current frame data
  const current = tracking[index];
  const excludeKeys = new Set();

  if (Array.isArray(current) && current.length > 0) {
    const currentSubtrees = parseSubtreeHighlightEntry(current);
    for (const s of currentSubtrees) {
      excludeKeys.add(toSubtreeKey(s));
    }
  }

  // Return separate subtrees (do NOT flat() them into one merged list)
  return collectUniqueSubtrees(tracking, start, end, excludeKeys);
}

/**
 * Calculates the source and destination edges for the active change at a specific index.
 * Filters out moving nodes from the edge definitions.
 */
export function getSourceDestinationEdgesAtIndex(state, index) {
  if (isInputFrame(state, index)) return { source: [], dest: [] };

  const pivotEdge = state.pivotEdgeTracking[index];
  const subtrees = state.subtreeHighlightTracking[index];

  if (!Array.isArray(pivotEdge) || pivotEdge.length === 0) return { source: [], dest: [] };
  if (!Array.isArray(subtrees) || subtrees.length === 0) return { source: [], dest: [] };

  const pairId = selectTimelineFrameAtIndex(state, index)?.pair_id ?? null;
  if (!pairId) return { source: [], dest: [] };

  const attachmentEdgesBySplit = selectPairById(state)[pairId].solution.attachment_edges_by_split;
  const attachmentEdgesForPivot = getBackendSplitMapValue(attachmentEdgesBySplit, pivotEdge);
  if (!attachmentEdgesForPivot) return { source: [], dest: [] };

  // Identify moving components to filter them out
  const subtreeList = parseSubtreeHighlightEntry(subtrees);
  const movingSet = new Set(subtreeList.flat(Infinity));

  // Process subtrees to find their source/dest counterparts
  return resolveEdgeMappings(subtreeList, attachmentEdgesForPivot, movingSet);
}

/**
 * Helper to iterate subtrees and resolve their source/dest edges,
 * trimming out any nodes that are currently moving.
 */
function resolveEdgeMappings(subtreeList, attachmentEdgesForPivot, movingSet) {
  const sourceEdges = [];
  const destEdges = [];

  for (const subtree of subtreeList) {
    const attachmentEdges = getBackendSplitMapValue(attachmentEdgesForPivot, subtree);
    const sourceEdge = attachmentEdges.source;
    const destEdge = attachmentEdges.destination;

    if (sourceEdge) {
      const trimmed = filterMovingNodes(sourceEdge, movingSet);
      if (trimmed.length) sourceEdges.push(trimmed);
    }

    if (destEdge) {
      const trimmed = filterMovingNodes(destEdge, movingSet);
      if (trimmed.length) destEdges.push(trimmed);
    }
  }

  return { source: sourceEdges, dest: destEdges };
}

function filterMovingNodes(edge, movingSet) {
  return edge.filter((leaf) => !movingSet.has(leaf));
}

function isInputFrame(state, index) {
  return selectInputFrameIndices(state).includes(index);
}

export function toSubtreeSets(input) {
  if (!Array.isArray(input)) return [];
  if (input.length === 0) return [];

  return input.map((s) => {
    if (s instanceof Set) return s;
    if (Array.isArray(s)) return new Set(s);
    return new Set();
  });
}
