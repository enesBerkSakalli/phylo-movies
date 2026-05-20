export function normalizeViewerRegion(startCol, endCol, columnCount = 0) {
  const start = Number(startCol);
  const end = Number(endCol);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;

  const min = Math.min(start, end);
  const max = Math.max(start, end);
  const upperBound = Number.isFinite(columnCount) && columnCount > 0
    ? columnCount
    : Number.MAX_SAFE_INTEGER;

  return {
    startCol: clamp(Math.round(min), 1, upperBound),
    endCol: clamp(Math.round(max), 1, upperBound),
  };
}

export function resolveRegionTargetColumn(region, align = 'center') {
  if (!region) return null;
  const startCol = Number(region.startCol);
  const endCol = Number(region.endCol);
  if (!Number.isFinite(startCol) || !Number.isFinite(endCol)) return null;

  switch (align) {
    case 'start':
      return startCol - 1;
    case 'end':
      return endCol - 1;
    case 'center':
    default:
      return ((startCol + endCol) / 2) - 0.5;
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
