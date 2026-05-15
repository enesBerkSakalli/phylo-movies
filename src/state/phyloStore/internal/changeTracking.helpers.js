import {
  flattenSplitSets,
  toSubtreeKey,
  getBackendSplitMapValue,
  parseSubtreeTrackingEntry,
  collectUniqueSubtrees,
  collectUniqueEdges
} from '../../../treeVisualisation/utils/splitMatching.js';
import { findPreviousAnchorSequenceIndex, findNextAnchorSequenceIndex } from '../../../domain/indexing/IndexMapping.js';
import { selectFullTreeIndices, selectTreePairKeyAtIndex } from '../selectors/treeSelectors.js';

// ============================================================================
// SYSTEM HELPERS (Rendering, Persistence, Storage)
// ============================================================================

export function calculateChangePreviews(state) {
  const { upcomingChangesEnabled, currentTreeIndex, pivotEdgeTracking } = state;

  if (!upcomingChangesEnabled) {
    return { upcoming: [], completed: [] };
  }

  const anchors = selectFullTreeIndices(state);
  if (!anchors.length || !pivotEdgeTracking?.length) {
    return { upcoming: [], completed: [] };
  }

  const prevAnchor = findPreviousAnchorSequenceIndex(anchors, currentTreeIndex);
  const nextAnchor = findNextAnchorSequenceIndex(anchors, currentTreeIndex);
  const currentEdge = pivotEdgeTracking[currentTreeIndex];
  // Must use toSubtreeKey to match how collectUniqueEdges generates keys (was JSON.stringify which caused mismatch)
  const currentKey = currentEdge?.length > 0 ? toSubtreeKey(currentEdge) : null;

  const completed = collectUniqueEdges(pivotEdgeTracking, prevAnchor + 1, currentTreeIndex, currentKey);

  if (nextAnchor === null) {
    return { upcoming: [], completed };
  }

  const upcoming = collectUniqueEdges(pivotEdgeTracking, currentTreeIndex + 1, nextAnchor, currentKey);

  return { upcoming, completed };
}

export function renderTreeControllers(state) {
  if (state?.playing) return;

  const controllers = state?.treeControllers;
  if (!Array.isArray(controllers)) return;
  controllers.forEach((c) => c?.renderAllElements?.());
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
  const { currentTreeIndex, transitionResolver, markedSubtreeScope } = state;
  const index = indexOverride ?? currentTreeIndex;

  if (transitionResolver?.isFullTree?.(index)) return [];

  if (markedSubtreeScope === 'current') {
    let subtree = getSubtreeAtIndex(state, index);

    // If no subtree data at current index (interpolated frame), try mapping to source tree
    if ((!subtree || subtree.length === 0) && transitionResolver?.getSourceGlobalIndex) {
      const sourceIndex = transitionResolver.getSourceGlobalIndex(index);
      if (sourceIndex !== index) {
        subtree = getSubtreeAtIndex(state, sourceIndex);
      }
    }

    // Normalize before returning to ensure we don't return raw ambiguous arrays
    return parseSubtreeTrackingEntry(subtree);
  }

  // "all" mode intentionally uses pair-level jump solutions for the active
  // pivot edge, not just the subtree currently moving at this frame.
  return getAffectedSubtreesForPivotEdge(state, index);
}

export function getSubtreeAtIndex(state, index) {
  const subtree = state.subtreeTracking?.[index];
  return Array.isArray(subtree) ? subtree : [];
}

export function getMovingSubtreeAtIndex(state, index) {
  const subtree = state.subtreeTracking?.[index];
  return parseSubtreeTrackingEntry(subtree);
}

export function getAffectedSubtreesForPivotEdge(state, index) {
  const edge = state.pivotEdgeTracking?.[index];
  if (!Array.isArray(edge) || edge.length === 0) return [];

  const pairKey = selectTreePairKeyAtIndex(state, index);
  if (!pairKey) return [];
  // Keep this tied to jumping_subtree_solutions: comparison connectors and
  // all-mode highlighting both rely on the full lattice solution set.
  const solutions = state.pairSolutions?.[pairKey]?.jumping_subtree_solutions;
  if (!solutions) return [];

  return flattenSplitSets(getBackendSplitMapValue(solutions, edge));
}

/**
 * Retrieves the history of subtrees for a given index, relative to the last anchor frame.
 */
export function getSubtreeHistoryAtIndex(state, index) {
  if (state.transitionResolver?.isFullTree?.(index)) return [];
  const tracking = state.subtreeTracking;
  if (!Array.isArray(tracking) || tracking.length === 0) return [];

  const anchors = selectFullTreeIndices(state);
  if (!anchors.length) return [];

  const prevAnchor = findPreviousAnchorSequenceIndex(anchors, index);
  const start = Math.max(prevAnchor + 1, 0);
  const end = Math.min(index, tracking.length);
  if (end <= start) return [];

  // Generate exclude keys from current frame data
  const current = tracking[index];
  const excludeKeys = new Set();

  if (Array.isArray(current) && current.length > 0) {
    const currentSubtrees = parseSubtreeTrackingEntry(current);
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
  if (state.transitionResolver?.isFullTree?.(index)) return { source: [], dest: [] };

  const pivotEdge = state.pivotEdgeTracking?.[index];
  const subtrees = state.subtreeTracking?.[index];

  // Guard clauses for missing data
  if (!Array.isArray(pivotEdge) || pivotEdge.length === 0) return { source: [], dest: [] };
  if (!Array.isArray(subtrees) || subtrees.length === 0) return { source: [], dest: [] };

  // Retrieve Pair Solutions
  const pairKey = selectTreePairKeyAtIndex(state, index);
  const pairSolution = pairKey ? state.pairSolutions?.[pairKey] : null;
  if (!pairSolution) return { source: [], dest: [] };

  // Get mappings
  const sourceMap = pairSolution.solution_to_source_map || {};
  const destMap = pairSolution.solution_to_destination_map || {};

  // Find the edge in the source and destination context
  const sourceEdgeMap = getBackendSplitMapValue(sourceMap, pivotEdge);
  const destEdgeMap = getBackendSplitMapValue(destMap, pivotEdge);
  if (!sourceEdgeMap || !destEdgeMap) return { source: [], dest: [] };

  // Identify moving components to filter them out
  const subtreeList = parseSubtreeTrackingEntry(subtrees);
  const movingSet = new Set(subtreeList.flat(Infinity));

  // Process subtrees to find their source/dest counterparts
  return resolveEdgeMappings(subtreeList, sourceEdgeMap, destEdgeMap, movingSet);
}

/**
 * Helper to iterate subtrees and resolve their source/dest edges,
 * trimming out any nodes that are currently moving.
 */
function resolveEdgeMappings(subtreeList, sourceEdgeMap, destEdgeMap, movingSet) {
  const sourceEdges = [];
  const destEdges = [];

  for (const subtree of subtreeList) {
    const sourceEdge = getBackendSplitMapValue(sourceEdgeMap, subtree);
    const destEdge = getBackendSplitMapValue(destEdgeMap, subtree);

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
  return Array.isArray(edge) ? edge.filter((leaf) => !movingSet.has(leaf)) : [];
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
