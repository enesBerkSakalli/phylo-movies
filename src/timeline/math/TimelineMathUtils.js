import { TIMELINE_CONSTANTS } from '../constants.js';

/**
 * Timeline math utilities for progress/time conversion and duration calculations.
 */
export class TimelineMathUtils {
  static EPSILON_MS = 1;

  static progressToTime(progress, totalDuration) {
    if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
      return 0;
    }
    return this.clampProgress(progress) * totalDuration;
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

  static calculateSegmentDurations(segments) {
    return segments.map((segment) => this.calculateSegmentDuration(segment));
  }

  static calculateSegmentDuration(segment) {
    if (!Array.isArray(segment?.timing) || segment.timing.length === 0) {
      throw new Error('[TimelineMathUtils] timeline segment timing is required');
    }
    return segment.timing.reduce(
      (total, { durationMs }) => total + (durationMs > 0 ? durationMs : 0),
      0
    );
  }
}
