import { TimelineInterval } from '../time/TimelineInterval.js';
import { TransitionFrame } from '../time/TransitionFrame.js';

export class TimelineTimingResolver {
    static hasSemanticTiming(segment) {
        return Array.isArray(segment?.timing) && segment.timing.length > 0;
    }

    static calculateTimingDuration(segment) {
        if (!this.hasSemanticTiming(segment)) {
            return null;
        }

        return segment.timing.reduce((total, interval) => {
            return total + TimelineInterval.durationMs(interval);
        }, 0);
    }

    static resolveInterval(timing, localTime) {
        let elapsed = 0;

        for (let i = 0; i < timing.length; i++) {
            const interval = timing[i];
            const duration = TimelineInterval.durationMs(interval);
            const end = elapsed + duration;
            const isLast = i === timing.length - 1;

            if (localTime < end || isLast) {
                return {
                    interval,
                    elapsed,
                    duration,
                    timeInInterval: Math.max(0, Math.min(localTime - elapsed, duration))
                };
            }

            elapsed = end;
        }

        return null;
    }

    static getTimeForTreeIndex(segment, treeIndex, segmentDuration, epsilonMs) {
        let elapsed = 0;

        for (const interval of segment.timing) {
            const duration = TimelineInterval.durationMs(interval);

            if (TimelineInterval.isMotion(interval)) {
                if (interval.fromIndex === treeIndex) {
                    return elapsed;
                }
                if (interval.toIndex === treeIndex) {
                    const targetTime = elapsed + duration;
                    return targetTime >= segmentDuration
                        ? Math.max(0, segmentDuration - epsilonMs)
                        : targetTime;
                }
            } else if (TimelineInterval.isHold(interval) && interval.holdIndex === treeIndex) {
                return elapsed;
            }

            elapsed += duration;
        }

        return null;
    }

    static getTransitionFrame(segment, localTime, treeList, createStaticFrame, clampProgress) {
        const resolved = this.resolveInterval(segment.timing, localTime);
        const interval = resolved?.interval;

        if (!interval) {
            const fallbackIndex = segment.interpolationData?.[0]?.originalIndex ?? 0;
            return createStaticFrame(fallbackIndex, treeList);
        }

        if (TimelineInterval.isHold(interval)) {
            return createStaticFrame(interval.holdIndex, treeList, {
                holdKind: interval.holdKind
            });
        }

        const fromIndex = interval.fromIndex;
        const toIndex = interval.toIndex;
        const timeFactor = resolved.duration > 0
            ? clampProgress(resolved.timeInInterval / resolved.duration)
            : 1;

        return TransitionFrame.from({
            sourceTree: treeList[fromIndex],
            targetTree: treeList[toIndex],
            transitionProgress: timeFactor,
            sourceTreeIndex: fromIndex,
            targetTreeIndex: toIndex
        });
    }

    static getTargetTree(segment, localTime, segmentIndex, segmentProgress, bias, clampProgress) {
        const resolved = this.resolveInterval(segment.timing, localTime);
        const interval = resolved?.interval;

        if (!interval) {
            return {
                treeIndex: segment.interpolationData?.[0]?.originalIndex ?? null,
                segmentIndex,
                segmentProgress: clampProgress(segmentProgress)
            };
        }

        if (TimelineInterval.isHold(interval)) {
            return {
                treeIndex: interval.holdIndex,
                segmentIndex,
                segmentProgress: clampProgress(segmentProgress)
            };
        }

        const timeFactor = resolved.duration > 0
            ? clampProgress(resolved.timeInInterval / resolved.duration)
            : 1;
        const transitionFrame = TransitionFrame.from({
            sourceTreeIndex: interval.fromIndex,
            targetTreeIndex: interval.toIndex,
            transitionProgress: timeFactor
        });
        const treeIndex = bias === 'forward'
            ? interval.toIndex
            : (bias === 'backward'
                ? interval.fromIndex
                : transitionFrame.cursorTreeIndex);

        return {
            treeIndex,
            segmentIndex,
            segmentProgress: clampProgress(segmentProgress)
        };
    }
}
