import { getSegmentBounds, timeToSegmentIndex } from './utils/segmentTiming.js';

const HOVER_CLEAR_DELAY_MS = 150;
const SCRUB_GRAB_PX = 24;

/**
 * Turns pointer and keyboard events on the strip into callbacks. It holds no selection: it asks
 * the view where things are and reports what the user meant.
 *
 * @param {TimelineView} view
 * @param {Object} callbacks
 * @param {(ms: number, phase: 'start'|'move'|'end') => void} callbacks.onScrub - handle drag
 * @param {(segmentIndex: number|null, ms: number) => void} callbacks.onSelect - click, key or pick
 * @param {(segmentIndex: number|null) => void} callbacks.onHover - pointer over a segment; null
 *   150 ms after it left, so the tooltip survives a pass over the gap between two segments
 * @param {(segmentIndex: number) => void} callbacks.onInspect - double-click on a transition
 * @returns {() => void} detach
 */
export function attachTimelineInput(view, { onScrub, onSelect, onHover, onInspect }) {
  const { timeline } = view;
  const { segments } = timeline;
  const target = view.deck.canvas ?? view.canvas;

  let dragging = false; // the handle is held
  let grabbed = false; // the click that ends a handle drag selects nothing
  let hovered = null;
  let hoverTimer = null;

  const localX = (event) => event.clientX - view.container.getBoundingClientRect().left;
  const msAt = (event) => view.xToMs(localX(event));

  // A click on an input tree may mean the transition beside it: the nearest centre wins.
  const segmentAt = (event) => {
    const ms = msAt(event);
    const found = timeToSegmentIndex(ms, timeline);
    if (found < 0) return { ms, index: null };

    const centre = (i) => {
      const { start, end } = getSegmentBounds(i, timeline);
      return Math.abs(ms - (start + end) / 2);
    };
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

  const onMouseMove = (event) => {
    if (dragging) return scrubTo(event, 'move');

    // Hover reports the segment under the pointer, not the nearest centre
    const found = timeToSegmentIndex(msAt(event), timeline);
    const index = found < 0 ? null : found;
    if (index !== null || hovered !== null) hover(index);
  };

  const onMouseDown = (event) => {
    dragging = grabbed = Math.abs(localX(event) - view.msToX(view.scrubberMs)) < SCRUB_GRAB_PX;
    if (dragging) onScrub(view.scrubberMs, 'start');
  };

  const onMouseUp = () => {
    if (!dragging) return;
    dragging = false;
    onScrub(view.scrubberMs, 'end');
  };

  const onClick = (event) => {
    if (grabbed) {
      grabbed = false;
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
    const current = view.selected ?? Math.max(0, timeToSegmentIndex(view.scrubberMs, timeline));
    const wanted = { Home: 0, End: last, ArrowLeft: current - 1, ArrowRight: current + 1 }[
      event.key
    ];
    if (wanted === undefined) return;

    event.preventDefault();
    const index = Math.max(0, Math.min(last, wanted));
    const { start, end } = getSegmentBounds(index, timeline);
    view.setCustomTime((start + end) / 2);
    onSelect(index, view.scrubberMs);
  };

  const onWheel = (event) => {
    view.zoom(event.deltaY < 0 ? 0.8 : 1.2, msAt(event));
    event.preventDefault();
  };

  const onMouseLeave = () => {
    if (hovered !== null) hover(null);
  };

  const listeners = [
    [target, 'mousemove', onMouseMove],
    [target, 'mousedown', onMouseDown],
    [window, 'mouseup', onMouseUp],
    [target, 'click', onClick],
    [target, 'dblclick', onDoubleClick],
    [target, 'keydown', onKeyDown],
    [target, 'wheel', onWheel, { passive: false }],
    [target, 'mouseleave', onMouseLeave],
  ];
  listeners.forEach(([element, type, handler, options]) =>
    element.addEventListener(type, handler, options)
  );
  view.onPick = onSelect;

  return () => {
    clearTimeout(hoverTimer);
    view.onPick = null;
    listeners.forEach(([element, type, handler, options]) =>
      element.removeEventListener(type, handler, options)
    );
  };
}
