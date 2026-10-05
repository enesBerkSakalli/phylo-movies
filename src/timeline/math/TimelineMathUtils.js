/**
 * Timeline math utilities for duration calculations.
 */
export class TimelineMathUtils {
  static EPSILON_MS = 1;

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
