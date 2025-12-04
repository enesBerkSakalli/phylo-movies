import { useAppStore } from '../../core/store.js';

export function handleTimelineMouseMove(renderer, event) {
  if (renderer._isScrubbing) return;
  const rect = renderer.container.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const ms = renderer._xToMs(x);
  const segIndex = renderer._timeToSegmentIndex(ms);
  const id = segIndex >= 0 ? segIndex + 1 : null;

  if (id !== renderer._lastHoverId) {
    if (renderer._lastHoverId != null) {
      renderer._emit('itemout', {});
      // Update store for React tooltip
      useAppStore.getState().setHoveredSegment(null, null);
    }
    if (id != null) {
      renderer._emit('itemover', { item: id, event });
      // Update store for React tooltip
      const segment = renderer.segments[segIndex];
      useAppStore.getState().setHoveredSegment(segIndex, segment);
    }
    renderer._lastHoverId = id;
    renderer._scheduleUpdate();
  }
  renderer._emit('mouseMove', { event });
}

/**
 * Handles scrub move events during dragging
 * @param {DeckTimelineRenderer} renderer - The timeline renderer instance
 * @param {MouseEvent} event - The mouse move event during scrubbing
 */
export function handleTimelineScrubMove(renderer, event) {
  const rect = renderer.container.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const ms = Math.max(0, Math.min(renderer._xToMs(x), renderer._totalDuration));

  renderer._scrubberMs = ms;
  renderer._emit('timechange', { id: 'scrubber', time: ms });
  renderer._scheduleUpdate();
}

/**
 * Handles mouse move events (scrubbing or regular movement)
 */
export function handleTimelineMouseMoveOrScrub(renderer, event) {
  if (renderer._isScrubbing) {
    handleTimelineScrubMove(renderer, event);
  } else {
    handleTimelineMouseMove(renderer, event);
  }
}

export function handleTimelineMouseDown(renderer, event) {
  const rect = renderer.container.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const clickMs = renderer._xToMs(x);
  const scrubX = renderer._msToX(renderer._scrubberMs);
  const dist = Math.abs(x - scrubX);

  if (dist < renderer._scrubThresholdPx) {
    renderer.setScrubbing(true);
    // No longer need to add/remove listeners here; the main listeners will handle it.
  }
}

/**
 * Handles mouse up events for stopping scrubbing
 */
export function handleTimelineMouseUp(renderer) {
  if (renderer._isScrubbing) {
    renderer.setScrubbing(false);
    renderer._emit('timechanged', { id: 'scrubber', time: renderer._scrubberMs });
  }
}

/**
 * Handles mouse wheel events for zooming
 */
export function handleTimelineWheel(renderer, event) {
  const rect = renderer.container.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const msCenter = renderer._xToMs(x);
  const span = renderer._rangeEnd - renderer._rangeStart;
  const delta = Math.sign(event.deltaY) < 0 ? -0.2 : 0.2;
  const newSpan = Math.max(1, Math.min(renderer._totalDuration, span * (1 + delta)));
  renderer._rangeStart = Math.max(0, msCenter - newSpan / 2);
  renderer._rangeEnd = Math.min(renderer._totalDuration, msCenter + newSpan / 2);
  renderer._scheduleUpdate();
  event.preventDefault();
}

/**
 * Handles mouse leave events for clearing hover state
 */
export function handleTimelineMouseLeave(renderer) {
  if (renderer._lastHoverId != null) {
    renderer._emit('itemout', {});
    // Update store for React tooltip
    useAppStore.getState().setHoveredSegment(null, null);
    renderer._lastHoverId = null;
    renderer._scheduleUpdate();
  }
}
