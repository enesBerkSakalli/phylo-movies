/**
 * Event handling utilities for timeline components
 */

/**
 * Handles click events on the timeline
 * @param {DeckTimelineRenderer} renderer - The timeline renderer instance
 * @param {MouseEvent} event - The click event
 */
export function handleTimelineClick(renderer, event) {
  const rect = renderer.container.getBoundingClientRect();
  const x = event.clientX - rect.left;
  let ms = renderer._xToMs(x);
  let segIndex = renderer._timeToSegmentIndex(ms);

  if (segIndex >= 0 && segIndex < renderer.segments.length) {
    segIndex = renderer._getTargetSegmentIndex(segIndex, ms);

    const id = segIndex + 1;
    renderer._emit('click', { item: id, event });
    renderer._selectedId = id;
    renderer._scheduleUpdate();
  }
}

/**
 * Zooms in on the timeline
 * @param {DeckTimelineRenderer} renderer - The timeline renderer instance
 * @param {number} pct - The zoom percentage (0.05 to 0.95)
 */
export function handleTimelineZoomIn(renderer, pct) {
  const factor = Math.max(0.05, Math.min(0.95, pct || 0.3));
  const span = renderer._rangeEnd - renderer._rangeStart;
  const newSpan = Math.max(1, span * (1 - factor));
  const center = (renderer._rangeStart + renderer._rangeEnd) / 2;
  renderer._rangeStart = Math.max(0, center - newSpan / 2);
  renderer._rangeEnd = Math.min(renderer._totalDuration, center + newSpan / 2);
  renderer._scheduleUpdate();
}

/**
 * Zooms out on the timeline
 * @param {DeckTimelineRenderer} renderer - The timeline renderer instance
 * @param {number} pct - The zoom percentage (0.05 to 0.95)
 */
export function handleTimelineZoomOut(renderer, pct) {
  const span = renderer._rangeEnd - renderer._rangeStart;
  const newSpan = Math.min(renderer._totalDuration, span * (1 + pct));
  const center = (renderer._rangeStart + renderer._rangeEnd) / 2;
  renderer._rangeStart = Math.max(0, center - newSpan / 2);
  renderer._rangeEnd = Math.min(renderer._totalDuration, center + newSpan / 2);
  renderer._scheduleUpdate();
}

export function handleTimelineFit(renderer) {
  renderer._rangeStart = 0;
  renderer._rangeEnd = renderer._totalDuration;
  renderer._scheduleUpdate();
}

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
    }
    if (id != null) {
      renderer._emit('itemover', { item: id, event });
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
  renderer._emit('timechange', { id: 'scrubber', time: new Date(renderer._scrubberMs) });
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
    renderer._emit('timechanged', { id: 'scrubber', time: new Date(renderer._scrubberMs) });
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
    renderer._lastHoverId = null;
    renderer._scheduleUpdate();
  }
}
