const NONE = Object.freeze([]);

/**
 * Backend temporal events by pair and event type, in frame order.
 *
 * @returns {(pairId: string, eventType: string) => Object[]}
 */
export function groupEvents(pairs, events) {
  const byPairAndType = new Map(pairs.map((pair) => [pair.pair_id, new Map()]));

  events.forEach((event) => {
    const byType = byPairAndType.get(event.pair_id);
    if (!byType.has(event.event_type)) byType.set(event.event_type, []);
    byType.get(event.event_type).push(event);
  });
  byPairAndType.forEach((byType) => byType.forEach((group) => group.sort(compareTemporalEvents)));

  return (pairId, eventType) => byPairAndType.get(pairId)?.get(eventType) ?? NONE;
}

function compareTemporalEvents(a, b) {
  const frameStartDifference = a.frame_range[0] - b.frame_range[0];
  if (frameStartDifference !== 0) return frameStartDifference;

  const frameEndDifference = a.frame_range[1] - b.frame_range[1];
  if (frameEndDifference !== 0) return frameEndDifference;

  return a.event_id.localeCompare(b.event_id);
}
