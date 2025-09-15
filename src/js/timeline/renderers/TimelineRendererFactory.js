import { DeckTimelineRenderer } from './DeckTimelineRenderer.js';

export function createTimelineRenderer(timelineData, segments) {
  return new DeckTimelineRenderer(timelineData, segments);
}
