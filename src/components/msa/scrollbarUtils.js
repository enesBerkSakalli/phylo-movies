const MIN_THUMB_PERCENT = 10;

export function calculateScrollbarGeometry({ rows, cols, visibleRange }) {
  if (!rows || !cols || !visibleRange) {
    return emptyGeometry();
  }

  const { r0, r1, c0, c1 } = visibleRange;
  const visibleCols = c1 - c0 + 1;
  const visibleRows = r1 - r0 + 1;

  const hThumbWidth = Math.min(100, Math.max(MIN_THUMB_PERCENT, (visibleCols / cols) * 100));
  const hThumbLeft = Math.min(100 - hThumbWidth, (c0 / cols) * 100);

  const vThumbHeight = Math.min(100, Math.max(MIN_THUMB_PERCENT, (visibleRows / rows) * 100));
  const vThumbTop = Math.min(100 - vThumbHeight, (r0 / rows) * 100);

  return { rows, cols, r0, r1, c0, c1, hThumbWidth, hThumbLeft, vThumbHeight, vThumbTop };
}

export function getTrackClickTarget({
  pointerClientPosition,
  trackStart,
  trackSize,
  itemCount,
}) {
  if (!itemCount || !trackSize) return 0;

  const clickRatio = (pointerClientPosition - trackStart) / trackSize;
  return clamp(Math.floor(clickRatio * itemCount), 0, itemCount - 1);
}

export function getKeyboardScrollTarget({
  axis,
  key,
  rangeStart,
  rangeEnd,
  itemCount,
}) {
  if (!itemCount) return null;

  const visibleItems = Math.max(1, rangeEnd - rangeStart + 1);
  let target;

  if (key === 'Home') {
    target = 0;
  } else if (key === 'End') {
    target = itemCount - 1;
  } else if (axis === 'horizontal') {
    target = getHorizontalKeyboardTarget(key, rangeStart, visibleItems);
  } else if (axis === 'vertical') {
    target = getVerticalKeyboardTarget(key, rangeStart, visibleItems);
  }

  return Number.isFinite(target) ? clamp(target, 0, itemCount - 1) : null;
}

function getHorizontalKeyboardTarget(key, rangeStart, visibleItems) {
  switch (key) {
    case 'ArrowLeft':
      return rangeStart - 1;
    case 'ArrowRight':
      return rangeStart + 1;
    case 'PageUp':
    case 'PageLeft':
      return rangeStart - visibleItems;
    case 'PageDown':
    case 'PageRight':
      return rangeStart + visibleItems;
    default:
      return null;
  }
}

function getVerticalKeyboardTarget(key, rangeStart, visibleItems) {
  switch (key) {
    case 'ArrowUp':
      return rangeStart - 1;
    case 'ArrowDown':
      return rangeStart + 1;
    case 'PageUp':
      return rangeStart - visibleItems;
    case 'PageDown':
      return rangeStart + visibleItems;
    default:
      return null;
  }
}

function emptyGeometry() {
  return {
    rows: 0,
    cols: 0,
    r0: 0,
    r1: 0,
    c0: 0,
    c1: 0,
    hThumbWidth: 0,
    hThumbLeft: 0,
    vThumbHeight: 0,
    vThumbTop: 0,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
