// ==========================================================================
// TIME / PIXEL CONVERSION
// ==========================================================================

export function msToX(ms, rangeStart, rangeEnd, width) {
  const t = (ms - rangeStart) / Math.max(1, rangeEnd - rangeStart);
  return t * width;
}

export function xToMs(x, rangeStart, rangeEnd, width) {
  const t = x / Math.max(1, width);
  return rangeStart + t * (rangeEnd - rangeStart);
}

// ==========================================================================
// VISIBLE RANGE: ranges are [start, end] in ms, always inside [0, total]
// ==========================================================================

/** The range moved by deltaMs, stopping at either end of the timeline. */
export function panRange(start, end, total, deltaMs) {
  const span = end - start;
  const newStart = Math.max(0, Math.min(total - span, start + deltaMs));
  return [newStart, newStart + span];
}

/** The range scaled by `factor` (under 1 zooms in); `anchorMs` keeps its place in the view. */
export function zoomRange(start, end, total, factor, anchorMs) {
  const span = Math.max(1, Math.min(total, (end - start) * factor));
  const newStart = anchorMs - ((anchorMs - start) * span) / (end - start);
  return panRange(newStart, newStart + span, total, 0);
}

/**
 * Where the range goes as the playhead moves: nowhere, unless it crosses an edge from inside, then
 * one page, the playhead landing a tenth of the view in from the edge it left by. A playhead that
 * was already out of view is not chased.
 */
export function followRange(start, end, total, fromMs, toMs) {
  const inside = (ms) => ms >= start && ms <= end;
  if (!inside(fromMs) || inside(toMs)) return [start, end];

  const lead = toMs > end ? 0.1 : 0.9;
  return panRange(start, end, total, toMs - lead * (end - start) - start);
}

// ==========================================================================
// ZOOM CALCULATIONS
// ==========================================================================

export function calculateZoomScale(rangeStart, rangeEnd, totalDuration) {
  const span = Math.max(1, rangeEnd - rangeStart);
  const total = Math.max(1, totalDuration);
  const ratio = total / span;
  return Math.max(0.5, Math.min(1.3, Math.sqrt(ratio)));
}
