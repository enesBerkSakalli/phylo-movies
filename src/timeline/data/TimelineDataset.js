import { TimelineDataProcessor } from './TimelineDataProcessor.js';
import { buildTimelineFrameViews } from './TimelineFrameView.js';
import { buildTimelineOccurrences } from './TimelineOccurrences.js';
import { TimelineMathUtils } from '../math/TimelineMathUtils.js';

const EMPTY_OCCURRENCES = Object.freeze([]);

export class TimelineDataset {
    static fromMovieData(movieData, options = {}) {
        const segments = options.segments ? options.segments : TimelineDataProcessor.createSegments(movieData);
        const timelineData = options.timelineData ? options.timelineData : TimelineDataProcessor.createTimelineData(segments);
        const frameViews = buildTimelineFrameViews(movieData);
        const { occurrences, occurrencesByFrameIndex } = buildTimelineOccurrences({
            segments,
            timelineData,
            frameViews,
        });

        return new TimelineDataset({
            segments,
            timelineData,
            frameViews,
            occurrences,
            occurrencesByFrameIndex,
            pairs: movieData.pairs,
            treeList: movieData.interpolated_trees,
        });
    }

    constructor({
        segments,
        timelineData,
        frameViews,
        occurrences,
        occurrencesByFrameIndex,
        pairs,
        treeList,
    }) {
        this.segments = segments;
        this.timelineData = timelineData;
        this.frameViews = frameViews;
        this.occurrences = occurrences;
        this.occurrencesByFrameIndex = occurrencesByFrameIndex;
        this.pairs = pairs;
        this.treeList = Array.isArray(treeList) ? treeList : [];
        this._inputFrameIndices = null;
        this._inputFrameIndexSet = null;
    }

    hasTimeline() {
        return Array.isArray(this.segments) &&
            this.segments.length > 0 &&
            Number.isFinite(this.timelineData?.totalDuration) &&
            this.timelineData.totalDuration > 0;
    }

    getFrameView(frameIndex) {
        return Number.isInteger(frameIndex) ? this.frameViews[frameIndex] ?? null : null;
    }

    getOccurrencesForFrame(frameIndex) {
        const occurrences = this.occurrencesByFrameIndex.get(frameIndex);
        return occurrences ? occurrences : EMPTY_OCCURRENCES;
    }

    getInputFrameIndices() {
        if (!this._inputFrameIndices) {
            this._inputFrameIndices = this.frameViews
                .filter((frame) => frame.isObservedInput === true)
                .map((frame) => frame.frameIndex);
            this._inputFrameIndexSet = new Set(this._inputFrameIndices);
        }
        return this._inputFrameIndices;
    }

    getPairs() {
        return this.pairs;
    }

    getPairFrameRanges() {
        return this.pairs.map((pair) => [pair.source_frame_index, pair.target_frame_index]);
    }

    getSegment(segmentIndex) {
        return Number.isInteger(segmentIndex) ? this.segments[segmentIndex] : null;
    }

    getFramePositionInSegment(segmentIndex, frameIndex) {
        const segment = this.getSegment(segmentIndex);
        if (!segment) {
            return {
                treeInSegment: 1,
                treesInSegment: 1,
            };
        }
        return TimelineMathUtils.calculateFramePositionInSegment(segment, frameIndex);
    }

    getTimelineProgressForLinearTreeProgress(progress, treeCount) {
        return TimelineMathUtils.getTimelineProgressForLinearTreeProgress(
            progress,
            treeCount,
            this.segments,
            this.timelineData
        );
    }

    getTransitionFrameAtTimelineProgress(progress) {
        if (!this.hasTimeline()) return null;
        return TimelineMathUtils.getTransitionFrameForTimelineProgress(
            progress,
            this.segments,
            this.timelineData,
            this.treeList
        );
    }

    getTimelineProgressAtMovieTime(movieTimeMs) {
        return progressForTime(movieTimeMs, this.timelineData.totalDuration);
    }

    isInputFrame(frameIndex) {
        if (!Number.isInteger(frameIndex)) return false;
        if (!this._inputFrameIndexSet) {
            this._inputFrameIndexSet = new Set(this.getInputFrameIndices());
        }
        return this._inputFrameIndexSet.has(frameIndex);
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

    getCursorInSegmentAtMovieTime(segmentIndex, movieTimeMs, options = {}) {
        const bounds = this.getSegmentBounds(segmentIndex);
        if (!bounds || bounds.end < bounds.start) {
            throw new Error('[TimelineDataset] segment timing bounds are required');
        }

        const boundedTime = boundTimeToSegment(movieTimeMs, bounds.start, bounds.end);
        const cursor = this.getCursorAtMovieTime(boundedTime, options);

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
        const frameRow = this.getFrameView(frameIndex);
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

function boundTimeToSegment(movieTimeMs, segmentStart, segmentEnd) {
    const duration = segmentEnd - segmentStart;
    if (duration <= TimelineMathUtils.EPSILON_MS) {
        return segmentStart;
    }

    const start = segmentStart + TimelineMathUtils.EPSILON_MS;
    const end = segmentEnd - TimelineMathUtils.EPSILON_MS;
    return Math.max(start, Math.min(movieTimeMs, end));
}
