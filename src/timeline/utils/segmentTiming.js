import { TIMELINE_CONSTANTS } from '../constants.js';

export function getSegmentBounds(segmentIndex, timelineData) {
  const cumulativeDurations = timelineData?.cumulativeDurations;
  if (!Number.isInteger(segmentIndex) || !Array.isArray(cumulativeDurations)) {
    return null;
  }
  if (segmentIndex < 0 || segmentIndex >= cumulativeDurations.length) {
    return null;
  }

  const start = segmentIndex === 0 ? 0 : cumulativeDurations[segmentIndex - 1];
  const end = cumulativeDurations[segmentIndex];
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return null;
  }

  return {
    start,
    end,
    duration: end - start,
  };
}

export function timeToSegmentIndex(ms, timelineData, options = {}) {
  const cumulativeDurations = Array.isArray(timelineData)
    ? timelineData
    : timelineData?.cumulativeDurations;

  if (!cumulativeDurations?.length) return -1;
  const { preferLastAtSameTime = true, includeEnd = false } = options;

  const lastIndex = cumulativeDurations.length - 1;
  const timelineEnd = cumulativeDurations[lastIndex];
  if (includeEnd && Number.isFinite(timelineEnd) && ms >= timelineEnd) {
    return lastIndex;
  }

  let lo = 0;
  let hi = lastIndex;
  let ans = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (ms < cumulativeDurations[mid]) {
      ans = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }

  if (preferLastAtSameTime && ans !== -1) {
    const targetTime = cumulativeDurations[ans];
    while (ans + 1 < cumulativeDurations.length && cumulativeDurations[ans + 1] === targetTime) {
      ans++;
    }
  }

  return ans;
}

export function toTimelineItemId(segmentIndex) {
  return Number.isInteger(segmentIndex) ? segmentIndex + TIMELINE_CONSTANTS.INDEX_OFFSET_UI : null;
}

export function toSegmentIndex(itemId) {
  return Number.isInteger(itemId) ? itemId - TIMELINE_CONSTANTS.INDEX_OFFSET_UI : null;
}
