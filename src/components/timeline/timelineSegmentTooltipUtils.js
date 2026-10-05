/**
 * Extracts affected subtree groups from segment data.
 *
 * @param {Array} affectedSubtrees - Affected subtree groups with leaf indices.
 * @param {Function} getLeafNamesByIndices - Converts indices to leaf names.
 * @returns {Array<string[]>} Leaf name arrays for each subtree group.
 */
export function extractAffectedSubtreeGroups(affectedSubtrees, getLeafNamesByIndices) {
  if (!affectedSubtrees?.length || !getLeafNamesByIndices) {
    return [];
  }

  const subtreeGroups = [];

  for (const item of affectedSubtrees) {
    if (!Array.isArray(item)) continue;

    const firstElement = item[0];
    if (Array.isArray(firstElement)) {
      for (const group of item) {
        if (Array.isArray(group) && group.length > 0) {
          const leafNames = getLeafNamesByIndices(group);
          if (leafNames?.length > 0) subtreeGroups.push(leafNames);
        }
      }
    } else if (item.length > 0) {
      const leafNames = getLeafNamesByIndices(item);
      if (leafNames?.length > 0) subtreeGroups.push(leafNames);
    }
  }

  return subtreeGroups;
}

export function formatPivotEdgePreview(pivotEdge, maxVisible = 4) {
  if (!Array.isArray(pivotEdge) || pivotEdge.length === 0) return null;

  const visible = pivotEdge.slice(0, maxVisible).join(', ');
  const hiddenCount = pivotEdge.length - maxVisible;
  return hiddenCount > 0 ? `${visible} +${hiddenCount}` : visible;
}

export function formatTransitionHeading(segment, pairCount) {
  return `Transition ${segment.pairOrdinal + 1} of ${pairCount} · Tree ${segment.sourceInputTreeIndex + 1} → ${segment.targetInputTreeIndex + 1}`;
}

/**
 * One pair's RF distances and what changed, in the words the tooltip shows.
 *
 * @param {Object} [change] - An entry of pairChanges.byPairId.
 * @returns {{metrics: string|null, change: string}|null}
 */
export function formatPairFacts(change) {
  if (!change) return null;

  const metrics = Number.isFinite(change.rf)
    ? `RF ${change.rf.toFixed(2)} · weighted RF ${(change.weightedRf ?? 0).toFixed(2)}`
    : null;
  if (change.kind === 'branch-lengths') return { metrics, change: 'Branch lengths only' };
  if (change.kind === 'unchanged') return { metrics, change: 'No change' };

  const moves = `${change.sprMoveCount} SPR ${change.sprMoveCount === 1 ? 'move' : 'moves'}`;
  const taxa = `${change.movedTaxaCount} ${change.movedTaxaCount === 1 ? 'taxon' : 'taxa'} moved`;
  return { metrics, change: `${moves} · ${taxa}` };
}

/**
 * The 1-based steps of its pair that a transition segment covers; step i is frame
 * (source + i), matching the status strip. Null when the pair generates no frames.
 */
export function getSegmentStepRange(segment) {
  const source = segment.sourceGlobalIndex;
  const total = segment.targetGlobalIndex - source - 1;
  if (!(total >= 1)) return null;

  // Fulfillment segments begin on the frame the previous segment ended on.
  const firstStep = segment.globalStart - source + (segment.localStepStart === null ? 1 : 0);
  return {
    start: Math.max(1, firstStep),
    end: Math.min(total, segment.globalEnd - source),
    total,
  };
}

/** Which of a pair's several split events a segment is; null when the pair has just one. */
export function getSplitEventPosition(segment, temporalEvents) {
  const events = (temporalEvents ?? []).filter(
    (event) => event.event_type === 'split_change' && event.pair_id === segment.pairId
  );
  const index = events.findIndex((event) => event.frame_range[0] === segment.globalStart);
  return events.length > 1 && index >= 0 ? { index: index + 1, count: events.length } : null;
}

/** Left edge that keeps a tooltip centred on the pointer, margin px inside the viewport. */
export function clampTooltipLeft(anchorX, width, viewportWidth, margin = 8) {
  return Math.max(margin, Math.min(anchorX - width / 2, viewportWidth - margin - width));
}
