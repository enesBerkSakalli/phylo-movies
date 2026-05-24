import { TIMELINE_AXIS } from './TimelineAxis.js';
import { TimelinePoint } from './TimelinePoint.js';

const clamp01 = (value) => {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
};

export class PlaybackCursor {
    static fromPlayhead({
        animationProgress = 0,
        timelineProgress = null,
        frameIndex = 0
    } = {}) {
        const safeFrameIndex = Number.isFinite(frameIndex)
            ? Math.max(0, Math.floor(frameIndex))
            : 0;
        const normalizedTimelineProgress = normalizeOptionalProgress(timelineProgress);
        const pointValues = {
            [TIMELINE_AXIS.FRAME_INDEX]: safeFrameIndex
        };

        if (normalizedTimelineProgress !== null) {
            pointValues[TIMELINE_AXIS.TIMELINE_PROGRESS] = normalizedTimelineProgress;
        }

        return new PlaybackCursor({
            point: TimelinePoint.from(pointValues),
            animationProgress: clamp01(animationProgress),
            timelineProgress: normalizedTimelineProgress,
            frameIndex: safeFrameIndex
        });
    }

    static fromTransitionFrame(transitionFrame, { treeCount, timelineProgress = transitionFrame?.timelineProgress } = {}) {
        const exactFrameIndex = transitionFrame.sourceTreeIndex +
            ((transitionFrame.targetTreeIndex - transitionFrame.sourceTreeIndex) * transitionFrame.transitionProgress);
        // animationProgress is the legacy linear frame axis. timelineProgress is
        // weighted movie time and remains the canonical scrub/playback axis.
        const animationProgress = Number.isFinite(treeCount) && treeCount > 1
            ? clamp01(exactFrameIndex / (treeCount - 1))
            : 1;
        const normalizedTimelineProgress = normalizeOptionalProgress(timelineProgress) ?? 0;

        return new PlaybackCursor({
            point: TimelinePoint.from({
                [TIMELINE_AXIS.FRAME_INDEX]: exactFrameIndex,
                [TIMELINE_AXIS.TIMELINE_PROGRESS]: normalizedTimelineProgress
            }),
            animationProgress,
            timelineProgress: normalizedTimelineProgress,
            frameIndex: transitionFrame.cursorTreeIndex,
            holdKind: transitionFrame.holdKind
        });
    }

    constructor({
        point,
        animationProgress,
        timelineProgress,
        frameIndex,
        holdKind = null
    }) {
        this.point = point;
        this.animationProgress = clamp01(animationProgress);
        this.timelineProgress = normalizeOptionalProgress(timelineProgress);
        this.frameIndex = Number.isInteger(frameIndex) ? frameIndex : 0;
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
            frameIndex: this.frameIndex,
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
