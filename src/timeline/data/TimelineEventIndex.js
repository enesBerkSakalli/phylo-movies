const EMPTY_EVENTS = Object.freeze([]);

/**
 * Semantic temporal-event index built from backend temporal_events rows.
 *
 * Playback timing is an ordered duration model. This index preserves event
 * identity for analytics and future event/lane views.
 */
export class TimelineEventIndex {
  static from({ pairs, temporalEvents }) {
    const eventsByPairAndType = new Map(pairs.map((pair) => [pair.pair_id, new Map()]));

    temporalEvents.forEach((event) => {
      const eventsByType = eventsByPairAndType.get(event.pair_id);
      let events = eventsByType.get(event.event_type);
      if (!events) {
        events = [];
        eventsByType.set(event.event_type, events);
      }
      events.push(event);
    });

    eventsByPairAndType.forEach((eventsByType) => {
      eventsByType.forEach((events) => {
        events.sort(compareTemporalEvents);
      });
    });

    return new TimelineEventIndex(eventsByPairAndType);
  }

  constructor(eventsByPairAndType) {
    this.eventsByPairAndType = eventsByPairAndType;
  }

  getEventsForPair(pairId, eventType) {
    return this.eventsByPairAndType.get(pairId)?.get(eventType) ?? EMPTY_EVENTS;
  }

  countEventsForPair(pairId, eventType) {
    return this.getEventsForPair(pairId, eventType).length;
  }
}

function compareTemporalEvents(a, b) {
  const frameStartDifference = a.frame_range[0] - b.frame_range[0];
  if (frameStartDifference !== 0) return frameStartDifference;

  const frameEndDifference = a.frame_range[1] - b.frame_range[1];
  if (frameEndDifference !== 0) return frameEndDifference;

  return a.event_id.localeCompare(b.event_id);
}
