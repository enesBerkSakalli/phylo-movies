import { TIMING_PROFILE } from '../constants.js';
import { toBackendSplitKey } from '../../domain/tree/splits.js';
import { TimelineInterval, TIMELINE_HOLD_KIND } from '../time/TimelineInterval.js';

export class TimelineTimingBuilder {
    /**
     * Build playback intervals only. Multiple holds may land on the same frame;
     * semantic SPR/event identity still comes from temporal_events via
     * TimelineEventIndex, not from segment.timing.
     */
    static buildInputTreeTiming(globalIndex) {
        return [TimelineInterval.hold({
            holdIndex: globalIndex,
            holdKind: TIMELINE_HOLD_KIND.INPUT_TREE,
            durationMs: TIMING_PROFILE.inputTreeHoldMs
        })];
    }

    static buildTransitionTiming({
        interpolationData,
        pairId,
        isNoOpPair = false,
        splitEvent = null,
        sourceGlobalIndex = null,
        sprEvents = []
    }) {
        const frameIndices = interpolationData
            .map(entry => entry.originalIndex)
            .filter(Number.isInteger);
        const frameIndexSet = new Set(frameIndices);
        const holdIntervalsByIndex = new Map();

        if (isNoOpPair) {
            return [TimelineInterval.hold({
                holdIndex: frameIndices[frameIndices.length - 1],
                holdKind: TIMELINE_HOLD_KIND.NO_OP_PAIR,
                durationMs: TIMING_PROFILE.noOpPairHoldMs
            })];
        }

        const moveEvents = sprEvents;
        const pivotKey = splitEvent === null ? null : toBackendSplitKey(splitEvent.split);

        const timingMoveEvents = moveEvents.filter((moveEvent) => (
            moveEvent.pair_id === pairId &&
            (pivotKey === null || toBackendSplitKey(moveEvent.pivot_edge) === pivotKey)
        ));

        for (const moveEvent of timingMoveEvents) {
            const moveRange = moveEvent.local_step_range;
            const holdIndex = this._localPairStepToGlobalIndex(
                moveRange[1],
                splitEvent,
                sourceGlobalIndex
            );
            this._addHoldInterval(
                holdIntervalsByIndex,
                holdIndex,
                TIMELINE_HOLD_KIND.MOVER,
                TIMING_PROFILE.moverHoldMs,
                frameIndexSet
            );
        }

        if (splitEvent !== null) {
            this._addHoldInterval(
                holdIntervalsByIndex,
                splitEvent.frame_range[1],
                TIMELINE_HOLD_KIND.PIVOT,
                TIMING_PROFILE.pivotHoldMs,
                frameIndexSet
            );
        }

        const timing = [];
        for (let i = 1; i < frameIndices.length; i++) {
            const fromIndex = frameIndices[i - 1];
            const toIndex = frameIndices[i];

            timing.push(TimelineInterval.motion({
                fromIndex,
                toIndex,
                durationMs: TIMING_PROFILE.motionStepMs
            }));

            const holds = holdIntervalsByIndex.get(toIndex);
            if (holds) {
                timing.push(...holds);
            }
        }

        return timing;
    }

    static _localPairStepToGlobalIndex(localStep, splitEvent, sourceGlobalIndex) {
        if (!Number.isInteger(localStep)) {
            return null;
        }

        if (Number.isInteger(sourceGlobalIndex)) {
            return sourceGlobalIndex + localStep + 1;
        }

        const localRange = splitEvent.local_step_range;
        const globalRange = splitEvent.frame_range;
        return globalRange[0] + (localStep - localRange[0]);
    }

    static _addHoldInterval(holdIntervalsByIndex, holdIndex, holdKind, durationMs, frameIndexSet) {
        if (
            !Number.isInteger(holdIndex) ||
            !frameIndexSet.has(holdIndex) ||
            !Number.isFinite(durationMs) ||
            durationMs <= 0
        ) {
            return;
        }

        const hold = TimelineInterval.hold({
            holdIndex,
            holdKind,
            durationMs
        });
        const existing = holdIntervalsByIndex.get(holdIndex);
        if (existing) {
            existing.push(hold);
        } else {
            holdIntervalsByIndex.set(holdIndex, [hold]);
        }
    }
}
