export function getTargetSegmentIndex(initialSegIndex, clickMs, segments, cumulativeDurations) {
  const segment = segments[initialSegIndex];
  // If the initially clicked segment is not a full tree (anchor), it's unambiguous.
  if (!segment?.isFullTree) {
    return initialSegIndex;
  }

  // If it is an anchor, we need to decide if the user meant to click
  // one of the adjacent connections instead.
  const segEnd = cumulativeDurations[initialSegIndex];

  let targetIndex = initialSegIndex;

  // Check the previous segment (left connection)
  if (initialSegIndex > 0 && !segments[initialSegIndex - 1]?.isFullTree) {
    const prevEnd = initialSegIndex > 1 ? cumulativeDurations[initialSegIndex - 2] : 0;
    // Calculate distance from click to the center of the previous connection
    const prevDist = Math.abs(clickMs - (cumulativeDurations[initialSegIndex - 1] + prevEnd) / 2);
    targetIndex = initialSegIndex - 1; // Tentatively select the previous connection

    // Check the next segment (right connection)
    if (initialSegIndex < segments.length - 1 && !segments[initialSegIndex + 1]?.isFullTree) {
      const nextEnd = cumulativeDurations[initialSegIndex + 1];
      // Calculate distance from click to the center of the next connection
      const nextDist = Math.abs(clickMs - (segEnd + nextEnd) / 2);
      // If the next connection is closer, select it instead
      if (nextDist < prevDist) {
        targetIndex = initialSegIndex + 1;
      }
    }
  } else if (initialSegIndex < segments.length - 1 && !segments[initialSegIndex + 1]?.isFullTree) {
    // If only the next segment is a connection, it's the only other possibility
    targetIndex = initialSegIndex + 1;
  }

  return targetIndex;
}
