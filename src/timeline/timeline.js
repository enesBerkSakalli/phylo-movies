/**
 * The movie as one flat list of steps on a single clock, movie ms.
 *
 * A step is `{start, end, from, to, hold?, segment}`: frame `from` moves to frame `to`
 * between `start` and `end`; `from === to` is a hold on that frame (`hold` names why).
 * Steps are contiguous and sorted, built once from the segments' timing.
 */
export function buildSteps(segments) {
  const steps = [];
  let start = 0;
  segments.forEach((segment, index) => {
    for (const interval of segment.timing) {
      const duration = interval.durationMs;
      if (!(duration > 0)) continue;
      const hold = interval.type === 'hold';
      const end = start + duration;
      steps.push({
        start,
        end,
        from: hold ? interval.holdIndex : interval.fromIndex,
        to: hold ? interval.holdIndex : interval.toIndex,
        hold: hold ? interval.holdKind : undefined,
        segment: index,
      });
      start = end;
    }
  });
  return steps;
}

/** The step with `start <= ms < end`; the last step from the movie's end on. */
export function stepAt(steps, ms) {
  let lo = 0;
  let hi = steps.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (ms < steps[mid].end) hi = mid;
    else lo = mid + 1;
  }
  return steps[lo];
}

/**
 * Where a frame sits on the clock, as `{step, ms}` or null when it is never shown.
 * Forward: the input-tree hold if the frame has one, else its first appearance.
 * `last`: its last appearance. A frame reached by a motion is anchored at the motion's
 * end, any other appearance at the step's start.
 */
export function cursorForFrame(steps, frameIndex, last = false) {
  const shown = steps.filter((step) => step.from === frameIndex || step.to === frameIndex);
  const step = last
    ? shown[shown.length - 1]
    : (shown.find((candidate) => candidate.hold === 'input_tree') ?? shown[0]);
  if (!step) return null;
  return { step, ms: step.from === frameIndex ? step.start : step.end };
}
