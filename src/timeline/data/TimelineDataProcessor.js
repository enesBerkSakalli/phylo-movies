/**
 * TimelineDataProcessor - Handles data transformation for timeline visualization.
 *
 * Terminology:
 * - input tree: observed tree from a sliding window or bootstrap replicate
 * - transition frame: generated interpolated state between source and target input trees
 * - timeline segment: scrubber interval containing either an input tree or transition frames
 */
import { TimelineMathUtils } from '../math/TimelineMathUtils.js';
import { TimelineEventIndex } from './TimelineEventIndex.js';
import { TimelineSegmentBuilder } from './TimelineSegmentBuilder.js';

export class TimelineDataProcessor {
  /**
   * Create timeline segments from normalized backend movie data.
   * @param {Object} movieData - Validated backend movie data
   * @returns {Array} Timeline segments
   */
  static createSegments(movieData) {
    return this._createSegmentsFromRows({
      frames: movieData.frames,
      pairs: movieData.pairs,
      temporalEvents: movieData.temporal_events,
      pairMetricRows: movieData.pair_metrics.rows,
      interpolatedTrees: movieData.interpolated_trees,
    });
  }

  static _createSegmentsFromRows({
    frames,
    pairs,
    temporalEvents,
    pairMetricRows,
    interpolatedTrees,
  }) {
    const segments = [];
    const eventIndex = TimelineEventIndex.from({ pairs, temporalEvents });
    const pairMetricsById = new Map(pairMetricRows.map((row) => [row.pair_id, row]));

    const inputFrames = frames
      .filter((frame) => frame.frame_type === 'input_tree' || frame.is_observed_input === true)
      .sort((a, b) => a.frame_index - b.frame_index);

    for (let index = 0; index < inputFrames.length - 1; index += 1) {
      const frame = inputFrames[index];
      this._appendInputTreeSegment(frame, frames, interpolatedTrees, segments);
      const pair = pairs[index];

      this._appendPairTransitionSegments({
        pair,
        pairMetric: pairMetricsById.get(pair.pair_id),
        splitEvents: eventIndex.getEventsForPair(pair.pair_id, 'split_change'),
        sprEvents: eventIndex.getEventsForPair(pair.pair_id, 'spr_move'),
        frames,
        interpolatedTrees,
        segments,
      });
    }
    this._appendInputTreeSegment(
      inputFrames[inputFrames.length - 1],
      frames,
      interpolatedTrees,
      segments
    );

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

  static _appendInputTreeSegment(frame, _frames, interpolatedTrees, segments) {
    segments.push(
      TimelineSegmentBuilder.buildInputTreeSegment({
        segmentIndex: segments.length,
        frame,
        interpolatedTrees,
      })
    );
  }

  static _appendPairTransitionSegments({
    pair,
    pairMetric,
    splitEvents,
    sprEvents,
    frames,
    interpolatedTrees,
    segments,
  }) {
    if (splitEvents.length === 0) {
      segments.push(
        TimelineSegmentBuilder.buildBranchLengthOnlySegment({
          segmentIndex: segments.length,
          pair,
          isNoOpPair: isExactNoOpPair(pair, pairMetric),
          frames,
          interpolatedTrees,
        })
      );
      return;
    }

    let coveredThroughFrameIndex = pair.source_frame_index;
    for (const event of splitEvents) {
      const eventStart = event.frame_range[0];
      const eventEnd = event.frame_range[1];
      const gapEnd = eventStart - 1;
      if (coveredThroughFrameIndex < gapEnd) {
        segments.push(
          TimelineSegmentBuilder.buildFulfillmentSegment({
            segmentIndex: segments.length,
            pair,
            startFrameIndex: coveredThroughFrameIndex,
            endFrameIndex: gapEnd,
            frames,
            interpolatedTrees,
          })
        );
      }

      segments.push(
        TimelineSegmentBuilder.buildSplitEventSegment({
          segmentIndex: segments.length,
          event,
          pair,
          sprEvents,
          frames,
          interpolatedTrees,
        })
      );
      coveredThroughFrameIndex = Math.max(coveredThroughFrameIndex, eventEnd);
    }

    if (coveredThroughFrameIndex < pair.target_frame_index) {
      segments.push(
        TimelineSegmentBuilder.buildFulfillmentSegment({
          segmentIndex: segments.length,
          pair,
          startFrameIndex: coveredThroughFrameIndex,
          endFrameIndex: pair.target_frame_index,
          frames,
          interpolatedTrees,
        })
      );
    }
  }
}

function isExactNoOpPair(pair, pairMetric) {
  return (
    pair.generated_frame_range === null &&
    pairMetric.robinson_foulds === 0 &&
    pairMetric.weighted_robinson_foulds === 0
  );
}
