export function timeToSegmentIndex(ms, cumulativeDurations) {
  if (!cumulativeDurations?.length) return -1;
  let lo = 0, hi = cumulativeDurations.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (ms < cumulativeDurations[mid]) {
      ans = mid; hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  return ans;
}
