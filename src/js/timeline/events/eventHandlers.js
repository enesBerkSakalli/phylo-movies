import { useAppStore } from '../../core/store.js';

let hoverTimeout = null;

/**
 * Handles mouse movement over the timeline when not scrubbing.
 * Detects which segment is being hovered and updates the store accordingly.
 * Emits 'itemover'/'itemout' events and 'mouseMove' on every move.
 */
function handleTimelineMouseMove(renderer, event) {
  const rect = renderer.container.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const ms = renderer._xToMs(x);
  const segIndex = renderer._timeToSegmentIndex(ms);
  const id = segIndex >= 0 ? segIndex + 1 : null;

  if (id !== renderer._lastHoverId) {
    if (renderer._lastHoverId != null) {
      renderer._emit('itemout', {});
      clearTimeout(hoverTimeout);
      hoverTimeout = setTimeout(() => {
        useAppStore.getState().setHoveredSegment(null, null);
      }, 150);
    }
    if (id != null) {
      clearTimeout(hoverTimeout);
      renderer._emit('itemover', { item: id, event });

      const segment = renderer.segments[segIndex];
      const segmentStartMs = renderer.timelineData.cumulativeDurations[segIndex] - renderer.timelineData.segmentDurations[segIndex];
      const segmentEndMs = renderer.timelineData.cumulativeDurations[segIndex];
      const startX = renderer._msToX(segmentStartMs);
      const endX = renderer._msToX(segmentEndMs);
      const centerX = (startX + endX) / 2;

      const position = {
        x: rect.left + centerX,
        y: rect.top
      };

      useAppStore.getState().setHoveredSegment(segIndex, segment, position);
    }
    renderer._lastHoverId = id;
    renderer._scheduleUpdate();
  }
  renderer._emit('mouseMove', { event });
}

/**
 * Handles mouse movement during an active scrub operation.
 * Updates scrubber position and emits 'timechange' event.
 */
function handleTimelineScrubMove(renderer, event) {
  const rect = renderer.container.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const ms = Math.max(0, Math.min(renderer._xToMs(x), renderer._totalDuration));

  renderer._scrubberMs = ms;
  renderer._emit('timechange', { id: 'scrubber', time: ms });
  renderer._scheduleUpdate();
}

/**
 * Routes mouse move events to either scrub or hover handler based on scrubbing state.
 */
export function handleTimelineMouseMoveOrScrub(renderer, event) {
  if (renderer._isScrubbing) {
    handleTimelineScrubMove(renderer, event);
  } else {
    handleTimelineMouseMove(renderer, event);
  }
}

/**
 * Handles mousedown to detect scrubber grab. Initiates scrubbing if click is near scrubber.
 */
export function handleTimelineMouseDown(renderer, event) {
  const rect = renderer.container.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const scrubX = renderer._msToX(renderer._scrubberMs);
  const dist = Math.abs(x - scrubX);

  if (dist < renderer._scrubThresholdPx) {
    renderer._wasScrubbingOnMouseDown = true;
    renderer.setScrubbing(true);
  } else {
    renderer._wasScrubbingOnMouseDown = false;
  }
}

/**
 * Handles mouseup to end scrubbing. Emits 'timechanged' event with final position.
 */
export function handleTimelineMouseUp(renderer) {
  if (renderer._isScrubbing) {
    renderer.setScrubbing(false);
    renderer._emit('timechanged', { id: 'scrubber', time: renderer._scrubberMs });
  }
}

/**
 * Handles mouse wheel for timeline zoom. Zooms centered on cursor position.
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
 * Handles mouse leave to clear hover state with debounce.
 */
export function handleTimelineMouseLeave(renderer) {
  if (renderer._lastHoverId != null) {
    renderer._emit('itemout', {});
    clearTimeout(hoverTimeout);
    hoverTimeout = setTimeout(() => {
      useAppStore.getState().setHoveredSegment(null, null);
    }, 150);
    renderer._lastHoverId = null;
    renderer._scheduleUpdate();
  }
}
