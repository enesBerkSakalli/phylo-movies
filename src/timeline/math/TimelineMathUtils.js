import { TIMELINE_CONSTANTS } from '../constants.js';
import { TimelineTimingResolver } from './TimelineTimingResolver.js';
import { getSegmentBounds, timeToSegmentIndex } from '../utils/segmentTiming.js';
import { TransitionFrame } from '../time/TransitionFrame.js';

/**
 * Timeline math utilities for progress/time conversion, segment lookup, and duration calculations.
 */
export class TimelineMathUtils {
  // ==========================================================================
  // CONSTANTS
  // ==========================================================================

  static EPSILON_MS = 1;

  // ==========================================================================
  // PROGRESS / TIME CONVERSION
  // ==========================================================================

  static progressToTime(progress, totalDuration) {
    if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
      return 0;
    }
    return this.clampProgress(progress) * totalDuration;
  }

  static timeToProgress(time, totalDuration) {
    if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
      return TIMELINE_CONSTANTS.DEFAULT_PROGRESS;
    }
    return this.clampProgress(time / totalDuration);
  }

  static clampProgress(progress) {
    if (!Number.isFinite(progress)) {
      return TIMELINE_CONSTANTS.DEFAULT_PROGRESS;
    }
    return Math.max(
      TIMELINE_CONSTANTS.MIN_PROGRESS,
      Math.min(TIMELINE_CONSTANTS.MAX_PROGRESS, progress)
    );
  }

  // ==========================================================================
  // SEGMENT LOOKUP
  // ==========================================================================

  static findSegmentForFrameIndex(segments, frameIndex) {
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

      if (!TimelineTimingResolver.hasSemanticTiming(segment)) {
        throw new Error('[TimelineMathUtils] timeline segment timing is required');
      }

      const segmentDuration = this.calculateSegmentDuration(segment);
      const timeInSegment = TimelineTimingResolver.getTimeForFrameIndex(
        segment,
        frameIndex,
        segmentDuration,
        this.EPSILON_MS
      );
      if (timeInSegment !== null) {
        return { segmentIndex: i, timeInSegment, segment };
      }
    }

    return {
      segmentIndex: TIMELINE_CONSTANTS.DEFAULT_SEGMENT_INDEX,
      timeInSegment: TIMELINE_CONSTANTS.DEFAULT_PROGRESS,
      segment: null,
    };
  }

  // ==========================================================================
  // FRAME INDEX RESOLUTION
  // ==========================================================================

  static getTargetFrameForTime(
    segments,
    currentTime,
    segmentDurations,
    bias = 'nearest',
    cumulativeDurations = null
  ) {
    if (
      !Array.isArray(segments) ||
      segments.length === 0 ||
      !Array.isArray(segmentDurations) ||
      segmentDurations.length === 0
    ) {
      return {
        frameIndex: null,
        segmentIndex: TIMELINE_CONSTANTS.DEFAULT_SEGMENT_INDEX,
        segmentProgress: TIMELINE_CONSTANTS.DEFAULT_PROGRESS,
      };
    }

    const timelineData = {
      segmentDurations,
      cumulativeDurations: cumulativeDurations || this._buildCumulative(segmentDurations),
    };
    const segmentIndex = timeToSegmentIndex(currentTime, timelineData, {
      preferLastAtSameTime: false,
      includeEnd: true,
    });
    const bounds = getSegmentBounds(segmentIndex, timelineData);
    const segmentStartTime = bounds?.start ?? 0;
    const segmentDuration = segmentDurations[segmentIndex];
    const segment = segments[segmentIndex];

    if (!segment || !Number.isFinite(segmentDuration) || segmentDuration <= 0) {
      return {
        frameIndex: null,
        segmentIndex: TIMELINE_CONSTANTS.DEFAULT_SEGMENT_INDEX,
        segmentProgress: TIMELINE_CONSTANTS.DEFAULT_PROGRESS,
      };
    }

    const clampedTime = Math.max(
      segmentStartTime + this.EPSILON_MS,
      Math.min(currentTime, segmentStartTime + segmentDuration - this.EPSILON_MS)
    );
    const segmentProgress = (clampedTime - segmentStartTime) / segmentDuration;

    if (TimelineTimingResolver.hasSemanticTiming(segment)) {
      return TimelineTimingResolver.getTargetFrame(
        segment,
        clampedTime - segmentStartTime,
        segmentIndex,
        segmentProgress,
        bias,
        this.clampProgress.bind(this)
      );
    }

    throw new Error('[TimelineMathUtils] timeline segment timing is required');
  }

  static calculateFramePositionInSegment(segment, frameIndex) {
    const treesInSegment = segment.interpolationData.length;

    if (treesInSegment > 1) {
      const foundIndex = segment.interpolationData.findIndex(
        (item) => item.originalIndex === frameIndex
      );
      const treeInSegment =
        foundIndex !== -1
          ? foundIndex + TIMELINE_CONSTANTS.INDEX_OFFSET_UI
          : TIMELINE_CONSTANTS.DEFAULT_TREE_IN_SEGMENT;
      return { treeInSegment, treesInSegment };
    }

    return {
      treeInSegment: TIMELINE_CONSTANTS.DEFAULT_TREE_IN_SEGMENT,
      treesInSegment: TIMELINE_CONSTANTS.DEFAULT_TREES_IN_SEGMENT,
    };
  }

  // ==========================================================================
  // DURATION CALCULATIONS
  // ==========================================================================

  static calculateSegmentDurations(segments) {
    return segments.map((segment) => this.calculateSegmentDuration(segment));
  }

  static calculateSegmentDuration(segment) {
    const semanticDuration = TimelineTimingResolver.calculateTimingDuration(segment);
    if (semanticDuration === null) {
      throw new Error('[TimelineMathUtils] timeline segment timing is required');
    }
    return semanticDuration;
  }

  // ==========================================================================
  // TRANSITION FRAMES
  // ==========================================================================

  static getTransitionFrameForProgress(progress, treeList) {
    if (!Array.isArray(treeList) || treeList.length === 0) {
      return TransitionFrame.from({
        sourceTree: null,
        targetTree: null,
        transitionProgress: 0,
        sourceTreeIndex: -1,
        targetTreeIndex: -1,
      });
    }

    const clampedProgress = this.clampProgress(progress);
    const totalTrees = treeList.length;
    const exactIndex = clampedProgress * (totalTrees - 1);
    const fromIndex = Math.floor(exactIndex);
    const toIndex = Math.min(fromIndex + 1, totalTrees - 1);

    return TransitionFrame.from({
      sourceTree: treeList[fromIndex],
      targetTree: treeList[toIndex],
      transitionProgress: exactIndex - fromIndex,
      sourceTreeIndex: fromIndex,
      targetTreeIndex: toIndex,
    });
  }

  static getTransitionFrameForTimelineProgress(progress, segments, timelineData, treeList) {
    if (
      !Array.isArray(segments) ||
      segments.length === 0 ||
      !Array.isArray(treeList) ||
      treeList.length === 0 ||
      !timelineData ||
      !Number.isFinite(timelineData.totalDuration) ||
      timelineData.totalDuration <= 0
    ) {
      return null;
    }

    const currentTime = this.progressToTime(progress, timelineData.totalDuration);
    const segmentIndex = timeToSegmentIndex(currentTime, timelineData, {
      preferLastAtSameTime: false,
      includeEnd: true,
    });
    const segment = segments[segmentIndex];

    if (!segment) {
      throw new Error('[TimelineMathUtils] timeline segment is required');
    }

    const bounds = getSegmentBounds(segmentIndex, timelineData);
    const segmentStart = bounds?.start ?? 0;
    const segmentDuration = timelineData.segmentDurations[segmentIndex];
    const localTime = Math.max(
      0,
      Math.min(currentTime - segmentStart, Number.isFinite(segmentDuration) ? segmentDuration : 0)
    );

    if (!TimelineTimingResolver.hasSemanticTiming(segment)) {
      throw new Error('[TimelineMathUtils] timeline segment timing is required');
    }

    return TimelineTimingResolver.getTransitionFrame(
      segment,
      localTime,
      treeList,
      this._createStaticTransitionFrame.bind(this),
      this.clampProgress.bind(this)
    );
  }

  static getTimelineProgressAtFrame(segments, timelineData, frameIndex) {
    if (
      !Number.isInteger(frameIndex) ||
      !Array.isArray(segments) ||
      !timelineData ||
      !Number.isFinite(timelineData.totalDuration) ||
      timelineData.totalDuration <= 0
    ) {
      return null;
    }

    const lookup = this.findSegmentForFrameIndex(segments, frameIndex);
    if (lookup.segmentIndex < 0 || !lookup.segment) {
      return null;
    }

    const bounds = getSegmentBounds(lookup.segmentIndex, timelineData);
    if (!bounds) return null;
    return this.timeToProgress(bounds.start + lookup.timeInSegment, timelineData.totalDuration);
  }

  static getTimelineProgressForLinearTreeProgress(progress, treeCount, segments, timelineData) {
    if (!Number.isFinite(treeCount) || treeCount <= 1) {
      return this.getTimelineProgressAtFrame(segments, timelineData, 0);
    }

    const clampedProgress = this.clampProgress(progress);
    const exactFrameIndex = clampedProgress * (treeCount - 1);
    const fromIndex = Math.floor(exactFrameIndex);
    const toIndex = Math.min(fromIndex + 1, treeCount - 1);
    const timeFactor = exactFrameIndex - fromIndex;

    const fromProgress = this.getTimelineProgressAtFrame(segments, timelineData, fromIndex);
    const toProgress = this.getTimelineProgressAtFrame(segments, timelineData, toIndex);

    if (fromProgress == null || toProgress == null) {
      throw new Error('[TimelineMathUtils] timeline progress for frame index is required');
    }

    return fromProgress + (toProgress - fromProgress) * timeFactor;
  }

  // ==========================================================================
  // BINARY SEARCH HELPERS
  // ==========================================================================

  static _buildCumulative(segmentDurations) {
    const arr = new Array(segmentDurations.length);
    let acc = 0;
    for (let i = 0; i < segmentDurations.length; i++) {
      acc += segmentDurations[i];
      arr[i] = acc;
    }
    return arr;
  }

  static _createStaticTransitionFrame(idx, treeList, extra = {}) {
    const tree = treeList?.[idx];
    return TransitionFrame.from({
      sourceTree: tree,
      targetTree: tree,
      transitionProgress: 0,
      sourceTreeIndex: idx,
      targetTreeIndex: idx,
      ...extra,
    });
  }
}
