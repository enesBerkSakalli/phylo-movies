import { clamp } from '../math/mathUtils.js';

export function normalizeMsaRegionRange(start, end, columnCount) {
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return null;
  }

  const min = Math.min(start, end);
  const max = Math.max(start, end);
  const limit = columnCount || Number.MAX_SAFE_INTEGER;

  return {
    start: clamp(min, 1, limit),
    end: clamp(max, 1, limit),
  };
}
