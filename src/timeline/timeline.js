/**
 * The movie as plain data: segments and one flat list of steps on a single clock, movie ms.
 *
 * - input tree: observed tree from a sliding window or bootstrap replicate
 * - timeline segment: selectable run on the scrubber, either an input tree or a piece of one
 *   pair's transition; it plays backend frames `firstFrame..lastFrame`
 * - step: `{start, end, from, to, hold?, segment}`: frame `from` moves to frame `to` between
 *   `start` and `end`; `from === to` is a hold on that frame (`hold` names why). Steps are
 *   contiguous and sorted, built once from the segments' timing.
 */
import { TIMING_PROFILE } from './constants.js';
import { TimelineEventIndex } from './data/TimelineEventIndex.js';
import { isInputFrame } from '../domain/backend/inputFrame.js';
import { resolveCursorTreeIndex } from '../domain/indexing/treeIndexSemantics.js';
import {
  flattenSplitSets,
  getBackendSplitMapValue,
  toBackendSplitKey,
} from '../domain/tree/splits.js';

/**
 * Everything the player reads about the movie, without any tree or UI state.
 * @param {Object} movieData - Validated backend movie data
 */
export function buildTimeline(movieData) {
  const segments = createSegments(movieData);
  const steps = buildSteps(segments);
  const segmentDurations = segments.map(({ timing }) =>
    timing.reduce((sum, { durationMs }) => sum + (durationMs > 0 ? durationMs : 0), 0)
  );
  let totalDuration = 0;
  const cumulativeDurations = segmentDurations.map((duration) => (totalDuration += duration));

  const { frames } = movieData;
  const pairById = new Map(movieData.pairs.map((pair) => [pair.pair_id, pair]));
  const clampMs = (ms) => (Number.isFinite(ms) ? Math.max(0, Math.min(ms, totalDuration)) : 0);

  const cursor = (frameIndex, movieTimeMs, step = null) => {
    const frame = frames[frameIndex];
    if (!frame) return null;

    const pair = pairById.get(frame.pair_id);
    const sourceInputTreeIndex = pair ? pair.source_input_tree_index : frame.input_tree_index;
    const moving = step !== null && step.from !== step.to;
    const role = !step
      ? null
      : !moving
        ? 'hold'
        : frameIndex === step.from
          ? 'motion_source'
          : 'motion_target';
    return {
      frameIndex,
      inputTreeIndex: frame.input_tree_index,
      sourceFrameIndex: frame.source_frame_index ?? frameIndex,
      msaWindowIndex: sourceInputTreeIndex,
      isObservedInput: frame.is_observed_input,
      sourceInputTreeIndex,
      targetInputTreeIndex: pair ? pair.target_input_tree_index : null,
      movieTimeMs,
      segmentIndex: step?.segment ?? null,
      occurrenceRole: role,
      holdKind: step?.hold ?? null,
      motionSourceFrameIndex: moving ? step.from : null,
      motionTargetFrameIndex: moving ? step.to : null,
    };
  };

  return {
    segments,
    steps,
    totalDuration,
    cumulativeDurations,

    /** What the tree renderer draws at `movieTimeMs`: two tree indices and how far between them. */
    frameAt(movieTimeMs) {
      const ms = clampMs(movieTimeMs);
      const step = stepAt(steps, ms);
      if (!step) return null;
      const { start, end, from, to, hold } = step;
      return {
        sourceTreeIndex: from,
        targetTreeIndex: to,
        transitionProgress: from === to ? 0 : (ms - start) / (end - start),
        holdKind: hold,
      };
    },

    cursorAt(movieTimeMs) {
      const ms = clampMs(movieTimeMs);
      const step = stepAt(steps, ms);
      if (!step) return null;
      const progress = (ms - step.start) / (step.end - step.start);
      return cursor(resolveCursorTreeIndex(step.from, step.to, progress), ms, step);
    },

    cursorForFrame: (frameIndex, { occurrence } = {}) => {
      const found = cursorForFrame(steps, frameIndex, occurrence === 'last');
      return cursor(frameIndex, found?.ms ?? 0, found?.step);
    },
  };
}

function buildSteps(segments) {
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

/** The segments of a movie: one per input tree, and between trees the pair's transition pieces. */
export function createSegments(movieData) {
  const { frames, pairs } = movieData;
  const eventIndex = TimelineEventIndex.from({ pairs, temporalEvents: movieData.temporal_events });
  const metricsByPairId = new Map(movieData.pair_metrics.rows.map((row) => [row.pair_id, row]));
  const inputFrames = frames.filter(isInputFrame);
  const segments = [];

  inputFrames.forEach((frame, index) => {
    segments.push(inputTreeSegment(frame));
    if (index === inputFrames.length - 1) return;

    const pair = pairs[index];
    segments.push(
      ...pairSegments(
        pair,
        eventIndex.getEventsForPair(pair.pair_id, 'split_change'),
        eventIndex.getEventsForPair(pair.pair_id, 'spr_move'),
        metricsByPairId.get(pair.pair_id)
      )
    );
  });

  return segments;
}

const hold = (holdIndex, holdKind, durationMs) => ({
  type: 'hold',
  holdIndex,
  holdKind,
  durationMs,
});

function inputTreeSegment(frame) {
  const frameIndex = frame.frame_index;
  return {
    isInputTreeSegment: true,
    subtreeMoveCount: 0,
    globalIndex: frameIndex,
    originalTreeIndex: frame.input_tree_index,
    firstFrame: frameIndex,
    lastFrame: frameIndex,
    timing: [hold(frameIndex, 'input_tree', TIMING_PROFILE.inputTreeHoldMs)],
  };
}

// A pair is one branch-length-only run when it has no split events, else one segment per
// split event with a fulfillment segment for every gap between them.
function pairSegments(pair, splitEvents, sprEvents, metric) {
  const { source_frame_index: source, target_frame_index: target } = pair;

  if (splitEvents.length === 0) {
    const isNoOp =
      pair.generated_frame_range === null &&
      metric.robinson_foulds === 0 &&
      metric.weighted_robinson_foulds === 0;
    return [transitionSegment(pair, source, target, { isNoOp })];
  }

  const segments = [];
  let covered = source;
  splitEvents.forEach((event, index) => {
    const [start, end] = event.frame_range;
    // With several split events, the last also plays the closing motion onto the target.
    const foldsTarget =
      index === splitEvents.length - 1 &&
      splitEvents.length > 1 &&
      end >= pair.generated_frame_range?.[1] &&
      end < target;
    const last = foldsTarget ? target : end;

    if (covered < start - 1) segments.push(transitionSegment(pair, covered, start - 1));
    segments.push(transitionSegment(pair, Math.max(source, start - 1), last, { event, sprEvents }));
    covered = Math.max(covered, last);
  });
  if (covered < target) segments.push(transitionSegment(pair, covered, target));

  return segments;
}

function transitionSegment(
  pair,
  firstFrame,
  lastFrame,
  { event = null, sprEvents = [], isNoOp = false } = {}
) {
  const affectedSubtrees = event
    ? getBackendSplitMapValue(pair.solution.affected_subtrees_by_split, event.split)
    : null;

  return {
    isInputTreeSegment: false,
    pairId: pair.pair_id,
    pairOrdinal: pair.pair_ordinal,
    sourceInputTreeIndex: pair.source_input_tree_index,
    targetInputTreeIndex: pair.target_input_tree_index,
    sourceGlobalIndex: pair.source_frame_index,
    targetGlobalIndex: pair.target_frame_index,
    pivotEdge: event ? event.split : [],
    affectedSubtrees,
    subtreeMoveCount: new Set(flattenSplitSets(affectedSubtrees).flat()).size,
    localStepStart: event ? event.local_step_range[0] : null,
    globalStart: event ? event.frame_range[0] : firstFrame,
    globalEnd: event ? event.frame_range[1] : lastFrame,
    firstFrame,
    lastFrame,
    timing: isNoOp
      ? [hold(lastFrame, 'no_op_pair', TIMING_PROFILE.noOpPairHoldMs)]
      : transitionTiming(pair, firstFrame, lastFrame, event, sprEvents),
  };
}

// One motion per frame step. A hold lands after the motion that reaches its frame: first the
// movers of this pivot's SPR moves, then the pivot itself. Several holds may share a frame.
function transitionTiming(pair, firstFrame, lastFrame, event, sprEvents) {
  const holds = event
    ? [
        ...sprEvents
          .filter((move) => toBackendSplitKey(move.pivot_edge) === toBackendSplitKey(event.split))
          .map((move) =>
            hold(
              pair.source_frame_index + move.local_step_range[1] + 1,
              'mover',
              TIMING_PROFILE.moverHoldMs
            )
          ),
        hold(event.frame_range[1], 'pivot', TIMING_PROFILE.pivotHoldMs),
      ]
    : [];
  const timing = [];

  for (let to = firstFrame + 1; to <= lastFrame; to += 1) {
    timing.push({
      type: 'motion',
      fromIndex: to - 1,
      toIndex: to,
      durationMs: TIMING_PROFILE.motionStepMs,
    });
    timing.push(...holds.filter((entry) => entry.holdIndex === to));
  }
  return timing;
}
