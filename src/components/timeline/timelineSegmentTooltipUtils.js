import { flattenSplitSets } from '../../domain/tree/splits.js';

/** Leaf names of each moved subtree, given the leaf names by index. */
export function extractAffectedSubtreeGroups(affectedSubtrees, leafNamesByIndex) {
  return flattenSplitSets(affectedSubtrees)
    .map((group) => group.map((index) => leafNamesByIndex[index]).filter(Boolean))
    .filter((names) => names.length > 0);
}

/** A subtree as one short tooltip badge: its name, both names, or the first name and a count. */
export function formatSubtreeNames(names) {
  if (names.length <= 2) return names.join(', ');
  return `${names[0]}, +${names.length - 1}`;
}

export function formatPivotEdgePreview(pivotEdge) {
  if (!Array.isArray(pivotEdge) || pivotEdge.length === 0) return null;

  const visible = pivotEdge.slice(0, 4).join(', ');
  const hiddenCount = pivotEdge.length - 4;
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
