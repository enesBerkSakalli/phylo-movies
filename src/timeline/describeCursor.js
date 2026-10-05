// Movie time as m:ss.s
const formatMovieTime = (ms) => {
  const seconds = Math.round(ms / 100) / 10;
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, '0')}`;
};

/**
 * Where the playhead is, in words: the one description behind the status strip (`text`, `step`,
 * `tooltip`, `time`; `short` is a transition's text and step for a phone) and the slider's
 * aria-valuetext (`aria`). The segment under the cursor decides, not the nearest frame: halfway
 * through a motion that lands on an input tree that frame already is the input tree, but the
 * playhead is still in the transition.
 * @returns {{text: string, short?: string, from: number, to?: number, step?: string, aria: string,
 *   tooltip: string, time: string} | null} `from` is the input tree's number, or the transition's
 *   source tree, which then has its target `to`; null when the cursor is on no segment
 */
export function describeCursor(timeline, cursor) {
  const { segments } = timeline;
  const segment = segments[cursor?.segmentIndex];
  if (!segment) return null;

  const time = formatMovieTime(cursor.movieTimeMs);
  const treeCount = segments.at(-1).originalTreeIndex + 1;

  if (segment.isInputTreeSegment) {
    const tree = segment.originalTreeIndex + 1;
    return {
      text: `Input tree ${tree}`,
      from: tree,
      aria: `Input tree ${tree} of ${treeCount}`,
      tooltip: 'An observed tree from one alignment window or uploaded tree set.',
      time,
    };
  }

  const from = segment.sourceInputTreeIndex + 1;
  const to = segment.targetInputTreeIndex + 1;
  // Generated frames between the two input trees; a pair that only changes branch lengths has none.
  const steps = segment.targetGlobalIndex - segment.sourceGlobalIndex - 1;
  const done = Math.max(1, Math.min(steps, cursor.frameIndex - segment.sourceGlobalIndex));
  const step = steps < 1 ? '' : `step ${done} of ${steps}`;
  return {
    text: `Tree ${from} → ${to}`,
    short: `${from}→${to}${steps < 1 ? '' : ` · ${done}/${steps}`}`,
    from,
    to,
    step,
    aria: `Transition ${segment.pairOrdinal + 1} of ${treeCount - 1}: tree ${from} to tree ${to}${step && `, ${step}`}`,
    tooltip: 'Generated frames between neighboring input trees.',
    time,
  };
}
