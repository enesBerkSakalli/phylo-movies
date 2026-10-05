import { groupEvents } from './groupEvents.js';

/**
 * What changed between each pair of consecutive input trees, in the terms a researcher reads:
 * the transition (1-based trees), its RF distances, and the SPR moves that make it up.
 * The pair, not the playback segment, is the unit of change.
 */
export function buildPairChangeProfile({ pairs, pairMetrics, temporalEvents }) {
  const metricsByPairId = new Map(pairMetrics.rows.map((row) => [row.pair_id, row]));
  const eventsOf = groupEvents(pairs, temporalEvents);

  const byPairId = new Map();
  let maxRf = 0;
  for (const pair of pairs) {
    const metrics = metricsByPairId.get(pair.pair_id);
    const rf = metrics?.robinson_foulds ?? null;
    const weightedRf = metrics?.weighted_robinson_foulds ?? null;
    const sprMoves = eventsOf(pair.pair_id, 'spr_move').map((event) => ({
      frameStart: event.frame_range[0],
      frameEnd: event.frame_range[1],
      taxaCount: event.driver_subtree?.length ?? 0,
    }));
    maxRf = Math.max(maxRf, rf ?? 0);
    byPairId.set(pair.pair_id, {
      pairId: pair.pair_id,
      pairOrdinal: pair.pair_ordinal,
      sourceTree: pair.source_input_tree_index + 1,
      targetTree: pair.target_input_tree_index + 1,
      rf,
      weightedRf,
      kind: changeKind(pair, rf, weightedRf),
      sprMoves,
      sprMoveCount: sprMoves.length,
      movedTaxaCount: sprMoves.reduce((total, move) => total + move.taxaCount, 0),
    });
  }
  return { byPairId, maxRf };
}

function changeKind(pair, rf, weightedRf) {
  if (pair.generated_frame_range != null || rf > 0) return 'topology';
  return weightedRf > 0 ? 'branch-lengths' : 'unchanged';
}
