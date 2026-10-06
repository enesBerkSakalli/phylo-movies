import { inspectedSegmentIndex, stepAt } from './timeline.js';
import { TIMELINE_THEME } from './stripGeometry.js';

const HOVER_CLEAR_DELAY_MS = 150;
// The playhead is grabbed by its knob (finger-sized for touch) or a few px of its line; a press
// anywhere else is a click, so it can select the transitions around the playhead.
const SCRUB_LINE_GRAB_PX = 4;
const SCRUB_KNOB_GRAB_PX = 8;
const SCRUB_KNOB_TOUCH_GRAB_PX = 12;
const PAN_SLOP_PX = 4; // a press that moves less is a click
const WHEEL_LINE_PX = 16;
const KNOB_CENTRE_Y = TIMELINE_THEME.scrubberKnobDepth / 2; // from the top of the strip
const ZOOM_IN = 0.8; // each + key or wheel notch shows 20% less time
const ZOOM_OUT = 1.2;

/**
 * Turns pointer and keyboard events on the strip into callbacks. It holds no selection: it asks
 * the view where things are and reports what the user meant. Pointer events, so a finger drags
 * the handle as a mouse does; only the mouse hovers. A drag on empty strip pans a zoomed view.
 * Keys: PageUp/PageDown, Home/End, Enter and + - 0 are the strip's own; Space, the arrows and
 * Shift+arrows go to the app-wide playback shortcuts (playbackShortcuts), which act from the
 * playhead and which the strip leaves alone.
 *
 * @param {TimelineView} view
 * @param {Object} callbacks
 * @param {(ms: number, phase: 'start'|'move'|'end') => void} callbacks.onScrub - handle drag
 * @param {(segmentIndex: number, ms: number) => void} callbacks.onSelect - click or key
 * @param {(segmentIndex: number|null) => void} callbacks.onHover - pointer over a segment; null
 *   150 ms after it left, so the tooltip survives a pass over the gap between two segments
 * @param {(segmentIndex: number) => void} callbacks.onInspect - double-click on a transition
 * @returns {() => void} detach
 */
export function attachTimelineInput(view, { onScrub, onSelect, onHover, onInspect }) {
  const { timeline } = view;
  const { segments, steps } = timeline;
  // The focusable wrapper: it hears the keys, and the pointer events that bubble up from deck's canvas
  const target = view.canvas;

  let drag = null; // the pointer holding the handle ('scrub') or the zoomed strip ('pan')
  let dragged = false; // the click that ends a drag selects nothing
  let hovered = null;
  let hoverTimer = null;

  const localX = (event) => event.clientX - view.container.getBoundingClientRect().left;
  const localY = (event) => event.clientY - view.container.getBoundingClientRect().top;
  const msAt = (event) => view.xToMs(localX(event));

  // A click on an input tree may mean the transition beside it: the nearest centre wins.
  const segmentAt = (event) => {
    const ms = msAt(event);
    const found = stepAt(steps, ms).segment;
    const centre = (i) => Math.abs(ms - (segments[i].start + segments[i].end) / 2);
    const candidates = [found, found - 1, found + 1].filter(
      (i) =>
        i === found ||
        (segments[found].isInputTreeSegment && segments[i]?.isInputTreeSegment === false)
    );
    return { ms, index: candidates.reduce((best, i) => (centre(i) < centre(best) ? i : best)) };
  };

  const hover = (index) => {
    hovered = index;
    clearTimeout(hoverTimer);
    if (index === null) hoverTimer = setTimeout(() => onHover(null), HOVER_CLEAR_DELAY_MS);
    else onHover(index);
  };

  const scrubTo = (event, phase) => {
    view.setCustomTime(msAt(event));
    onScrub(view.scrubberMs, phase);
  };

  // The strip follows the pointer once it has moved past the slop.
  const panTo = (event) => {
    const x = localX(event);
    if (!dragged && Math.abs(x - drag.x) < PAN_SLOP_PX) return;
    dragged = true;
    view.pan(view.xToMs(drag.x) - view.xToMs(x));
    drag.x = x;
  };

  const onPointerMove = (event) => {
    if (drag) {
      if (event.pointerId !== drag.id) return;
      return drag.pan ? panTo(event) : scrubTo(event, 'move');
    }
    if (event.pointerType !== 'mouse') return;

    // Hover reports the segment under the pointer, not the nearest centre
    hover(stepAt(steps, msAt(event)).segment);
  };

  const onPointerDown = (event) => {
    if (drag) return;
    target.focus({ preventScroll: true }); // the keys work after a click, and :focus-visible stays off
    const x = localX(event);
    const fromLine = Math.abs(x - view.msToX(view.scrubberMs));
    const knobReach = event.pointerType === 'touch' ? SCRUB_KNOB_TOUCH_GRAB_PX : SCRUB_KNOB_GRAB_PX;
    const onHandle =
      fromLine < SCRUB_LINE_GRAB_PX ||
      Math.hypot(fromLine, localY(event) - KNOB_CENTRE_Y) < knobReach;
    dragged = onHandle;
    // Empty strip pans a zoomed view; with everything in view only a click means anything there,
    // so a drag there scrubs nothing and pans nothing (its release still clicks)
    if (!onHandle && !view.zoomed) return;

    drag = { id: event.pointerId, pan: !onHandle, x };
    // Held by the strip, the drag goes on when the pointer leaves it
    try {
      target.setPointerCapture?.(event.pointerId);
    } catch {
      // The pointer is already gone (NotFoundError); the drag works without capture
    }
    if (onHandle) onScrub(view.scrubberMs, 'start');
  };

  const onPointerEnd = (event) => {
    if (event.pointerId !== drag?.id) return;
    const { pan } = drag;
    drag = null;
    if (!pan) onScrub(view.scrubberMs, 'end');
  };

  const onClick = (event) => {
    if (dragged) {
      dragged = false;
      return;
    }
    const { ms, index } = segmentAt(event);
    onSelect(index, ms);
  };

  // The clicks before a double-click already selected the transition.
  const onDoubleClick = (event) => {
    const { ms, index } = segmentAt(event);
    if (index === null || segments[index].isInputTreeSegment) return;

    onSelect(index, ms);
    onInspect(index);
  };

  const playheadSegment = () => stepAt(steps, view.scrubberMs).segment;

  const goToSegment = (wanted) => {
    const index = Math.max(0, Math.min(segments.length - 1, wanted));
    const { start, end } = segments[index];
    view.setCustomTime((start + end) / 2);
    onSelect(index, view.scrubberMs);
  };

  // The nearest transition before (-1) or after (1) the playhead; an input tree is no stop.
  const goToTransition = (direction) => {
    for (let i = playheadSegment() + direction; segments[i]; i += direction) {
      if (!segments[i].isInputTreeSegment) return goToSegment(i);
    }
  };

  // The same segment as the Inspect button; picking the one under the playhead pins it.
  const inspect = () => {
    const index = inspectedSegmentIndex(segments, view.selected, playheadSegment());
    if (index === null || segments[index].isInputTreeSegment) return;

    if (index !== view.selected) onSelect(index, view.scrubberMs);
    onInspect(index);
  };

  const onKeyDown = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    const action = {
      PageUp: () => goToTransition(-1),
      PageDown: () => goToTransition(1),
      Home: () => goToSegment(0),
      End: () => goToSegment(segments.length - 1),
      Enter: inspect,
      '+': () => view.zoom(ZOOM_IN),
      '=': () => view.zoom(ZOOM_IN),
      '-': () => view.zoom(ZOOM_OUT),
      0: () => view.fit(),
    }[event.key];
    if (!action) return;

    event.preventDefault();
    action();
  };

  // Shift+wheel and sideways swipes pan; the plain wheel zooms about the pointer
  const onWheel = (event) => {
    event.preventDefault();
    if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      const px = (event.deltaX || event.deltaY) * (event.deltaMode === 1 ? WHEEL_LINE_PX : 1);
      view.pan(view.xToMs(px) - view.xToMs(0));
    } else {
      view.zoom(event.deltaY < 0 ? ZOOM_IN : ZOOM_OUT, msAt(event));
    }
  };

  const onPointerLeave = () => {
    if (hovered !== null) hover(null);
  };

  const listeners = [
    [target, 'pointermove', onPointerMove],
    [target, 'pointerdown', onPointerDown],
    [target, 'pointerup', onPointerEnd],
    [target, 'pointercancel', onPointerEnd],
    [target, 'click', onClick],
    [target, 'dblclick', onDoubleClick],
    [target, 'keydown', onKeyDown],
    [target, 'wheel', onWheel, { passive: false }],
    [target, 'pointerleave', onPointerLeave],
  ];
  listeners.forEach(([element, type, handler, options]) =>
    element.addEventListener(type, handler, options)
  );

  return () => {
    clearTimeout(hoverTimer);
    listeners.forEach(([element, type, handler, options]) =>
      element.removeEventListener(type, handler, options)
    );
  };
}
