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

  // If we found a valid index, scan forward to include any consecutive
  // segments with the same cumulative duration (0-duration anchors)
  if (ans !== -1) {
    const targetTime = cumulativeDurations[ans];
    while (ans + 1 < cumulativeDurations.length &&
           cumulativeDurations[ans + 1] === targetTime) {
      ans++;
    }
  }

  return ans;
}
