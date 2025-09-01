import { TIMELINE_RENDERER_MODE } from '../constants.js';
import { DeckTimelineRenderer } from './DeckTimelineRenderer.js';

export function createTimelineRenderer(timelineData, segments) {
  const mode = TIMELINE_RENDERER_MODE;
  if (mode === 'deck') {
    return new DeckTimelineRenderer(timelineData, segments);
  }
  // Lazy-import vis renderer only if explicitly requested (to avoid pulling vis CSS by default)
  // VIS mode not imported; using deck renderer
  return new DeckTimelineRenderer(timelineData, segments);
}
