import { TimelineDataProcessor } from './TimelineDataProcessor.js';
import { TimelineMathUtils } from '../math/TimelineMathUtils.js';
import { TransitionFrame } from '../time/TransitionFrame.js';
import { buildSteps, cursorForFrame, stepAt } from '../timeline.js';
import { selectInputFrameIndicesFromRows } from '../../domain/backend/inputFrame.js';
import { resolveCursorTreeIndex } from '../../domain/indexing/treeIndexSemantics.js';
import { clamp01 } from '../../domain/math/mathUtils.js';

export class TimelineDataset {
  static fromMovieData(movieData, options = {}) {
    const segments = options.segments
      ? options.segments
      : TimelineDataProcessor.createSegments(movieData);
    const timelineData = options.timelineData
      ? options.timelineData
      : TimelineDataProcessor.createTimelineData(segments);

    return new TimelineDataset({
      segments,
      timelineData,
      frames: movieData.frames,
      pairs: movieData.pairs,
      treeList: options.treeList ?? movieData.interpolated_trees,
    });
  }

  constructor({ segments, timelineData, frames, pairs, treeList }) {
    this.segments = segments;
    this.timelineData = timelineData;
    this.frames = frames;
    this.pairById = new Map(pairs.map((pair) => [pair.pair_id, pair]));
    this.steps = buildSteps(segments);
    this.treeList = Array.isArray(treeList) ? treeList : [];
    this._inputFrameIndices = null;
  }

  hasTimeline() {
    return (
      Array.isArray(this.segments) &&
      this.segments.length > 0 &&
      Number.isFinite(this.timelineData?.totalDuration) &&
      this.timelineData.totalDuration > 0
    );
  }

  getInputFrameIndices() {
    this._inputFrameIndices ??= selectInputFrameIndicesFromRows(this.frames);
    return this._inputFrameIndices;
  }

  getSegment(segmentIndex) {
    return Number.isInteger(segmentIndex) ? this.segments[segmentIndex] : null;
  }

  getTransitionFrameAtTimelineProgress(progress) {
    if (!this.hasTimeline() || this.treeList.length === 0) return null;
    const ms = TimelineMathUtils.progressToTime(progress, this.timelineData.totalDuration);
    const { start, end, from, to, hold } = stepAt(this.steps, ms);
    return TransitionFrame.from({
      sourceTree: this.treeList[from],
      targetTree: this.treeList[to],
      sourceTreeIndex: from,
      targetTreeIndex: to,
      transitionProgress: from === to ? 0 : (ms - start) / (end - start),
      holdKind: hold,
    });
  }

  getTimelineProgressAtMovieTime(movieTimeMs) {
    return progressForTime(movieTimeMs, this.timelineData.totalDuration);
  }

  getCursorAtTimelineProgress(timelineProgress) {
    const progress = clamp01(timelineProgress);
    return this.getCursorAtMovieTime(progress * this.timelineData.totalDuration);
  }

  getCursorAtMovieTime(movieTimeMs) {
    const ms = clampTime(movieTimeMs, this.timelineData.totalDuration);
    const step = stepAt(this.steps, ms);
    if (!step) return null;

    const frameIndex = resolveCursorTreeIndex(
      step.from,
      step.to,
      (ms - step.start) / (step.end - step.start)
    );
    return this.buildCursor({ frameIndex, movieTimeMs: ms, step });
  }

  getCursorInSegmentAtMovieTime(segmentIndex, movieTimeMs) {
    const bounds = this.getSegmentBounds(segmentIndex);
    if (!bounds || bounds.end < bounds.start) {
      throw new Error('[TimelineDataset] segment timing bounds are required');
    }

    const boundedTime = boundTimeToSegment(movieTimeMs, bounds.start, bounds.end);
    const cursor = this.getCursorAtMovieTime(boundedTime);

    if (cursor?.segmentIndex !== segmentIndex || !Number.isInteger(cursor?.frameIndex)) {
      throw new Error('[TimelineDataset] movie time resolved outside its segment');
    }

    return cursor;
  }

  getSegmentBounds(segmentIndex) {
    if (!Number.isInteger(segmentIndex) || segmentIndex < 0) return null;
    const end = this.timelineData.cumulativeDurations?.[segmentIndex];
    if (!Number.isFinite(end)) return null;
    const start = segmentIndex === 0 ? 0 : this.timelineData.cumulativeDurations[segmentIndex - 1];
    if (!Number.isFinite(start)) return null;
    return { start, end, duration: end - start };
  }

  getCursorForFrame(frameIndex, options = {}) {
    const found = cursorForFrame(this.steps, frameIndex, options.occurrence === 'last');
    return this.buildCursor({ frameIndex, movieTimeMs: found?.ms ?? 0, step: found?.step });
  }

  buildCursor({ frameIndex, movieTimeMs, step = null }) {
    const frame = this.frames[frameIndex];
    if (!frame) return null;

    const pair = this.pairById.get(frame.pair_id);
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
      timelineProgress: progressForTime(movieTimeMs, this.timelineData.totalDuration),
      segmentIndex: step?.segment ?? null,
      occurrenceRole: role,
      holdKind: step?.hold ?? null,
      motionSourceFrameIndex: moving ? step.from : null,
      motionTargetFrameIndex: moving ? step.to : null,
    };
  }
}

function clampTime(value, totalDuration) {
  if (!Number.isFinite(value)) return 0;
  if (!Number.isFinite(totalDuration) || totalDuration <= 0) return 0;
  return Math.max(0, Math.min(value, totalDuration));
}

function progressForTime(movieTimeMs, totalDuration) {
  if (!Number.isFinite(totalDuration) || totalDuration <= 0) return 0;
  return clamp01(movieTimeMs / totalDuration);
}

function boundTimeToSegment(movieTimeMs, segmentStart, segmentEnd) {
  const duration = segmentEnd - segmentStart;
  if (duration <= TimelineMathUtils.EPSILON_MS) {
    return segmentStart;
  }

  const start = segmentStart + TimelineMathUtils.EPSILON_MS;
  const end = segmentEnd - TimelineMathUtils.EPSILON_MS;
  return Math.max(start, Math.min(movieTimeMs, end));
}
