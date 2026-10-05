/**
 * TimelineDataProcessor - Handles data transformation for timeline visualization.
 *
 * Terminology:
 * - input tree: observed tree from a sliding window or bootstrap replicate
 * - transition frame: generated interpolated state between source and target input trees
 * - timeline segment: selectable run on the scrubber, either an input tree or a piece of one
 *   pair's transition; it plays backend frames `firstFrame..lastFrame`
 */
import { TIMING_PROFILE } from '../constants.js';
import { TimelineMathUtils } from '../math/TimelineMathUtils.js';
import { TimelineEventIndex } from './TimelineEventIndex.js';
import { isInputFrame } from '../../domain/backend/inputFrame.js';
import {
  flattenSplitSets,
  getBackendSplitMapValue,
  toBackendSplitKey,
} from '../../domain/tree/splits.js';

export class TimelineDataProcessor {
  /**
   * Create timeline segments from normalized backend movie data.
   * @param {Object} movieData - Validated backend movie data
   * @returns {Array} Timeline segments
   */
  static createSegments(movieData) {
    const { frames, pairs } = movieData;
    const eventIndex = TimelineEventIndex.from({
      pairs,
      temporalEvents: movieData.temporal_events,
    });
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

  /**
   * Creates timeline data structures from segments.
   * @param {Array} segments - Timeline segments from createSegments()
   * @returns {{totalDuration: number, segmentDurations: number[], cumulativeDurations: number[]}} Timeline metadata
   */
  static createTimelineData(segments) {
    if (segments.length === 0) {
      return {
        totalDuration: 0,
        segmentDurations: [],
        cumulativeDurations: [],
      };
    }

    const segmentDurations = TimelineMathUtils.calculateSegmentDurations(segments);
    const cumulativeDurations = (() => {
      const arr = new Array(segmentDurations.length);
      let acc = 0;
      for (let i = 0; i < segmentDurations.length; i++) {
        acc += segmentDurations[i];
        arr[i] = acc;
      }
      return arr;
    })();

    const totalDuration = segmentDurations.reduce((sum, duration) => sum + duration, 0);

    return {
      totalDuration,
      segmentDurations,
      cumulativeDurations,
    };
  }
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
