import { TimelineInterval } from '../time/TimelineInterval.js';

export function buildTimelineOccurrences({ segments, timelineData, frameViews }) {
  const occurrences = [];
  const occurrencesByFrameIndex = new Map();
  const frameViewsByIndex = new Map(
    (Array.isArray(frameViews) ? frameViews : []).map((row) => [row.frameIndex, row])
  );
  const totalDuration = Number.isFinite(timelineData?.totalDuration)
    ? timelineData.totalDuration
    : 0;

  for (let segmentIndex = 0; segmentIndex < (segments?.length ?? 0); segmentIndex++) {
    const segment = segments[segmentIndex];
    const segmentStart =
      segmentIndex === 0 ? 0 : (timelineData?.cumulativeDurations?.[segmentIndex - 1] ?? 0);
    if (!Array.isArray(segment?.timing) || segment.timing.length === 0) {
      throw new Error('[TimelineOccurrences] timeline segment timing is required');
    }

    let elapsed = 0;
    segment.timing.forEach((interval, intervalIndex) => {
      const duration = TimelineInterval.durationMs(interval);
      if (duration <= 0) return;

      const movieTimeStartMs = segmentStart + elapsed;
      const movieTimeEndMs = movieTimeStartMs + duration;
      const base = {
        segmentIndex,
        intervalIndex,
        intervalType: interval.type,
        movieTimeStartMs,
        movieTimeEndMs,
        movieTimeMs: movieTimeStartMs,
        timelineProgressStart: progressForTime(movieTimeStartMs, totalDuration),
        timelineProgressEnd: progressForTime(movieTimeEndMs, totalDuration),
      };

      if (TimelineInterval.isMotion(interval)) {
        addOccurrence({
          occurrences,
          occurrencesByFrameIndex,
          frameViewsByIndex,
          frameIndex: interval.fromIndex,
          role: 'motion_source',
          targetFrameIndex: interval.toIndex,
          peerFrameIndex: interval.toIndex,
          ...base,
        });
        addOccurrence({
          occurrences,
          occurrencesByFrameIndex,
          frameViewsByIndex,
          frameIndex: interval.toIndex,
          role: 'motion_target',
          sourceMotionFrameIndex: interval.fromIndex,
          peerFrameIndex: interval.fromIndex,
          ...base,
        });
      } else if (TimelineInterval.isHold(interval)) {
        addOccurrence({
          occurrences,
          occurrencesByFrameIndex,
          frameViewsByIndex,
          frameIndex: interval.holdIndex,
          role: 'hold',
          holdKind: interval.holdKind,
          ...base,
        });
      }

      elapsed += duration;
    });
  }

  return { occurrences, occurrencesByFrameIndex };
}

function addOccurrence({
  occurrences,
  occurrencesByFrameIndex,
  frameViewsByIndex,
  frameIndex,
  ...fields
}) {
  if (!Number.isInteger(frameIndex)) return;

  const frameRow = frameViewsByIndex.get(frameIndex) ?? { frameIndex };
  const frameOccurrences = occurrencesByFrameIndex.get(frameIndex) ?? [];
  const occurrence = {
    occurrenceIndex: occurrences.length,
    occurrenceInFrameIndex: frameOccurrences.length,
    ...frameRow,
    frameIndex,
    ...fields,
  };

  occurrences.push(occurrence);
  frameOccurrences.push(occurrence);
  occurrencesByFrameIndex.set(frameIndex, frameOccurrences);
}

function progressForTime(movieTimeMs, totalDuration) {
  if (!Number.isFinite(totalDuration) || totalDuration <= 0) return 0;
  return Math.max(0, Math.min(1, movieTimeMs / totalDuration));
}
