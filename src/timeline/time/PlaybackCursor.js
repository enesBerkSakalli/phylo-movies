import { TIMELINE_AXIS } from './TimelineAxis.js';
import { TimelinePoint } from './TimelinePoint.js';
import { resolveCursorTreeIndex } from '../../domain/indexing/treeIndexSemantics.js';

const clamp01 = (value) => {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
};

export class PlaybackCursor {
    static fromPlayhead({
        animationProgress = 0,
        timelineProgress = null,
        currentTreeIndex = 0
    } = {}) {
        const safeTreeIndex = Number.isFinite(currentTreeIndex)
            ? Math.max(0, Math.floor(currentTreeIndex))
            : 0;
        const normalizedTimelineProgress = normalizeOptionalProgress(timelineProgress);
        const pointValues = {
            [TIMELINE_AXIS.FRAME_INDEX]: safeTreeIndex
        };

        if (normalizedTimelineProgress !== null) {
            pointValues[TIMELINE_AXIS.TIMELINE_PROGRESS] = normalizedTimelineProgress;
        }

        return new PlaybackCursor({
            point: TimelinePoint.from(pointValues),
            animationProgress: clamp01(animationProgress),
            timelineProgress: normalizedTimelineProgress,
            currentTreeIndex: safeTreeIndex
        });
    }

    static fromInterpolation({
        timelineProgress,
        fromIndex,
        toIndex,
        timeFactor,
        treeCount,
        holdKind = null
    }) {
        const safeFrom = Number.isInteger(fromIndex) ? fromIndex : 0;
        const safeTo = Number.isInteger(toIndex) ? toIndex : safeFrom;
        const safeT = clamp01(timeFactor);
        const exactFrameIndex = safeFrom + ((safeTo - safeFrom) * safeT);
        const animationProgress = Number.isFinite(treeCount) && treeCount > 1
            ? clamp01(exactFrameIndex / (treeCount - 1))
            : 1;
        const currentTreeIndex = resolveCursorTreeIndex(safeFrom, safeTo, safeT);

        return new PlaybackCursor({
            point: TimelinePoint.from({
                [TIMELINE_AXIS.FRAME_INDEX]: exactFrameIndex,
                [TIMELINE_AXIS.TIMELINE_PROGRESS]: clamp01(timelineProgress)
            }),
            animationProgress,
            timelineProgress: clamp01(timelineProgress),
            currentTreeIndex,
            holdKind
        });
    }

    constructor({
        point,
        animationProgress,
        timelineProgress,
        currentTreeIndex,
        holdKind = null
    }) {
        this.point = point;
        this.animationProgress = clamp01(animationProgress);
        this.timelineProgress = normalizeOptionalProgress(timelineProgress);
        this.currentTreeIndex = Number.isInteger(currentTreeIndex) ? currentTreeIndex : 0;
        this.holdKind = holdKind;
    }

    toPlayhead() {
        return {
            animationProgress: this.animationProgress,
            timelineProgress: this.timelineProgress
        };
    }

    toPlaybackState() {
        return {
            animationProgress: this.animationProgress,
            timelineProgress: this.timelineProgress,
            currentTreeIndex: this.currentTreeIndex,
            holdKind: this.holdKind
        };
    }

    toJSON() {
        return {
            point: this.point?.toJSON?.() ?? null,
            ...this.toPlaybackState()
        };
    }
}

function normalizeOptionalProgress(value) {
    return Number.isFinite(value) ? clamp01(value) : null;
}
