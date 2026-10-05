import { stepAt } from './timeline.js';

const HOVER_CLEAR_DELAY_MS = 150;
const SCRUB_GRAB_PX = 24;
const PAN_SLOP_PX = 4; // a press that moves less is a click
const WHEEL_LINE_PX = 16;

/**
 * Turns pointer and keyboard events on the strip into callbacks. It holds no selection: it asks
 * the view where things are and reports what the user meant. Pointer events, so a finger drags
 * the handle as a mouse does; only the mouse hovers. A drag on empty strip pans a zoomed view.
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
    const x = localX(event);
    const onHandle = Math.abs(x - view.msToX(view.scrubberMs)) < SCRUB_GRAB_PX;
    dragged = onHandle;
    // Empty strip pans a zoomed view; with everything in view only a click means anything there
    if (!onHandle && !view.zoomed) return;

    drag = { id: event.pointerId, pan: !onHandle, x };
    // Held by the strip, the drag goes on when the pointer leaves it
    target.setPointerCapture?.(event.pointerId);
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

  const onKeyDown = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    const last = segments.length - 1;
    const current = view.selected ?? stepAt(steps, view.scrubberMs).segment;
    const wanted = { Home: 0, End: last, ArrowLeft: current - 1, ArrowRight: current + 1 }[
      event.key
    ];
    if (wanted === undefined) return;

    event.preventDefault();
    const index = Math.max(0, Math.min(last, wanted));
    const { start, end } = segments[index];
    view.setCustomTime((start + end) / 2);
    onSelect(index, view.scrubberMs);
  };

  // Shift+wheel and sideways swipes pan; the plain wheel zooms about the pointer
  const onWheel = (event) => {
    event.preventDefault();
    if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      const px = (event.deltaX || event.deltaY) * (event.deltaMode === 1 ? WHEEL_LINE_PX : 1);
      view.pan(view.xToMs(px) - view.xToMs(0));
    } else {
      view.zoom(event.deltaY < 0 ? 0.8 : 1.2, msAt(event));
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
