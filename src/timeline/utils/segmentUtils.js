export function getTargetSegmentIndex(initialSegIndex, clickMs, segments, cumulativeDurations) {
  const segment = segments[initialSegIndex];
  // If the initially clicked segment is not a full tree (anchor), it's unambiguous.
  if (!segment?.isFullTree) {
    return initialSegIndex;
  }

  // For anchor segments, calculate if the click is closer to the anchor center
  // or to an adjacent connection center
  const segStart = initialSegIndex > 0 ? cumulativeDurations[initialSegIndex - 1] : 0;
  const segEnd = cumulativeDurations[initialSegIndex];
  const anchorCenter = (segStart + segEnd) / 2;
  const anchorDist = Math.abs(clickMs - anchorCenter);

  let targetIndex = initialSegIndex;
  let minDist = anchorDist;

  // Check the previous segment (left connection)
  if (initialSegIndex > 0 && !segments[initialSegIndex - 1]?.isFullTree) {
    const prevStart = initialSegIndex > 1 ? cumulativeDurations[initialSegIndex - 2] : 0;
    const prevEnd = cumulativeDurations[initialSegIndex - 1];
    const prevCenter = (prevStart + prevEnd) / 2;
    const prevDist = Math.abs(clickMs - prevCenter);

    if (prevDist < minDist) {
      minDist = prevDist;
      targetIndex = initialSegIndex - 1;
    }
  }

  // Check the next segment (right connection)
  if (initialSegIndex < segments.length - 1 && !segments[initialSegIndex + 1]?.isFullTree) {
    const nextStart = segEnd;
    const nextEnd = cumulativeDurations[initialSegIndex + 1];
    const nextCenter = (nextStart + nextEnd) / 2;
    const nextDist = Math.abs(clickMs - nextCenter);

    if (nextDist < minDist) {
      targetIndex = initialSegIndex + 1;
    }
  }

  return targetIndex;
}
