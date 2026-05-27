import { getSegmentBounds } from './segmentTiming.js';

export function getTargetSegmentIndex(initialSegIndex, clickMs, segments, cumulativeDurations) {
  const segment = segments[initialSegIndex];
  // If the initially clicked segment is not a full input tree, it's unambiguous.
  if (!segment?.isInputTreeSegment) {
    return initialSegIndex;
  }

  // For input-tree segments, calculate if the click is closer to the input-tree center
  // or to an adjacent connection center
  const timelineData = { cumulativeDurations };
  const bounds = getSegmentBounds(initialSegIndex, timelineData);
  if (!bounds) return initialSegIndex;

  const inputTreeCenter = (bounds.start + bounds.end) / 2;
  const inputTreeDist = Math.abs(clickMs - inputTreeCenter);

  let targetIndex = initialSegIndex;
  let minDist = inputTreeDist;

  // Check the previous segment (left connection)
  if (initialSegIndex > 0 && !segments[initialSegIndex - 1]?.isInputTreeSegment) {
    const prevBounds = getSegmentBounds(initialSegIndex - 1, timelineData);
    const prevDist = prevBounds
      ? Math.abs(clickMs - (prevBounds.start + prevBounds.end) / 2)
      : null;

    if (prevDist !== null && prevDist < minDist) {
      minDist = prevDist;
      targetIndex = initialSegIndex - 1;
    }
  }

  // Check the next segment (right connection)
  if (initialSegIndex < segments.length - 1 && !segments[initialSegIndex + 1]?.isInputTreeSegment) {
    const nextBounds = getSegmentBounds(initialSegIndex + 1, timelineData);
    const nextDist = nextBounds
      ? Math.abs(clickMs - (nextBounds.start + nextBounds.end) / 2)
      : null;

    if (nextDist !== null && nextDist < minDist) {
      targetIndex = initialSegIndex + 1;
    }
  }

  return targetIndex;
}
