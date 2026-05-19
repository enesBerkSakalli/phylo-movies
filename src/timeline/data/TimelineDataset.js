import { TimelineDataProcessor } from './TimelineDataProcessor.js';
import { buildTimelineFrameRows } from './TimelineFrameRows.js';
import { buildTimelineOccurrences } from './TimelineOccurrences.js';
import { TimelineMathUtils } from '../math/TimelineMathUtils.js';

export class TimelineDataset {
    static fromMovieData(movieData, options = {}) {
        const segments = options.segments ?? TimelineDataProcessor.createSegments(movieData);
        const timelineData = options.timelineData ?? TimelineDataProcessor.createTimelineData(segments);
        const frameRows = buildTimelineFrameRows(movieData);
        const { occurrences, occurrencesByFrameIndex } = buildTimelineOccurrences({
            segments,
            timelineData,
            frameRows,
        });

        return new TimelineDataset({
            segments,
            timelineData,
            frameRows,
            occurrences,
            occurrencesByFrameIndex,
        });
    }

    constructor({
        segments,
        timelineData,
        frameRows,
        occurrences,
        occurrencesByFrameIndex,
    }) {
        this.segments = segments;
        this.timelineData = timelineData;
        this.frameRows = frameRows;
        this.occurrences = occurrences;
        this.occurrencesByFrameIndex = occurrencesByFrameIndex;
    }

    getFrameRow(frameIndex) {
        return Number.isInteger(frameIndex) ? this.frameRows[frameIndex] ?? null : null;
    }

    getOccurrencesForFrame(frameIndex) {
        if (!Number.isInteger(frameIndex)) return [];
        return this.occurrencesByFrameIndex.get(frameIndex) ?? [];
    }

    getCursorAtTimelineProgress(timelineProgress, options = {}) {
        const progress = clamp01(timelineProgress);
        return this.getCursorAtMovieTime(progress * this.timelineData.totalDuration, options);
    }

    getCursorAtMovieTime(movieTimeMs, options = {}) {
        const clampedTime = clampTime(movieTimeMs, this.timelineData.totalDuration);
        const target = TimelineMathUtils.getTargetFrameForTime(
            this.segments,
            clampedTime,
            this.timelineData.segmentDurations,
            options.bias ?? 'nearest',
            this.timelineData.cumulativeDurations
        );

        if (!Number.isInteger(target.frameIndex)) return null;

        const occurrence = this.findOccurrenceAtMovieTime({
            frameIndex: target.frameIndex,
            movieTimeMs: clampedTime,
            segmentIndex: target.segmentIndex,
        });

        return this.buildCursor({
            frameIndex: target.frameIndex,
            movieTimeMs: clampedTime,
            segmentIndex: target.segmentIndex,
            segmentProgress: target.segmentProgress,
            occurrence,
        });
    }

    getCursorForFrame(frameIndex, options = {}) {
        const occurrences = this.getOccurrencesForFrame(frameIndex);
        if (occurrences.length === 0) {
            return this.buildCursor({ frameIndex, movieTimeMs: 0 });
        }

        const occurrence = selectOccurrence(occurrences, options.occurrence);
        return this.buildCursor({
            frameIndex,
            movieTimeMs: occurrence.movieTimeStartMs,
            segmentIndex: occurrence.segmentIndex,
            occurrence,
        });
    }

    findOccurrenceAtMovieTime({ frameIndex, movieTimeMs, segmentIndex }) {
        const occurrences = this.getOccurrencesForFrame(frameIndex);
        return occurrences.find((occurrence) => (
            occurrence.segmentIndex === segmentIndex &&
            movieTimeMs >= occurrence.movieTimeStartMs &&
            movieTimeMs <= occurrence.movieTimeEndMs
        )) ?? occurrences.find((occurrence) => (
            movieTimeMs >= occurrence.movieTimeStartMs &&
            movieTimeMs <= occurrence.movieTimeEndMs
        )) ?? null;
    }

    buildCursor({
        frameIndex,
        movieTimeMs,
        segmentIndex = null,
        segmentProgress = null,
        occurrence = null,
    }) {
        const frameRow = this.getFrameRow(frameIndex);
        if (!frameRow) return null;

        const timelineProgress = progressForTime(movieTimeMs, this.timelineData.totalDuration);
        return {
            ...frameRow,
            movieTimeMs,
            timelineProgress,
            segmentIndex,
            segmentProgress,
            occurrenceIndex: occurrence?.occurrenceIndex ?? null,
            occurrenceInFrameIndex: occurrence?.occurrenceInFrameIndex ?? null,
            occurrenceRole: occurrence?.role ?? null,
            holdKind: occurrence?.holdKind ?? null,
        };
    }
}

function selectOccurrence(occurrences, occurrenceSelector = 'first') {
    if (occurrenceSelector === 'last') {
        return occurrences[occurrences.length - 1];
    }
    if (Number.isInteger(occurrenceSelector)) {
        return occurrences[Math.max(0, Math.min(occurrenceSelector, occurrences.length - 1))];
    }
    return occurrences[0];
}

function clamp01(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
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
