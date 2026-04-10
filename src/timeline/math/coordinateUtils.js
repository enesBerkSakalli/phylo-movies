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
// ZOOM CALCULATIONS
// ==========================================================================

export function calculateZoomScale(rangeStart, rangeEnd, totalDuration) {
  const span = Math.max(1, rangeEnd - rangeStart);
  const total = Math.max(1, totalDuration);
  const ratio = total / span;
  return Math.max(0.5, Math.min(1.3, Math.sqrt(ratio)));
}
