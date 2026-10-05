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

/** The segment playing at `ms` (of several ending together, the last), or -1 from the movie's end on. */
export function timeToSegmentIndex(ms, timelineData) {
  const ends = timelineData?.cumulativeDurations;
  if (!ends?.length) return -1;

  let lo = 0;
  let hi = ends.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (ms < ends[mid]) {
      ans = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }

  while (ans !== -1 && ends[ans + 1] === ends[ans]) ans++;
  return ans;
}
