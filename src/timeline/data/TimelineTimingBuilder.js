import { TIMING_PROFILE } from '../constants.js';
import { toBackendSplitKey } from '../../domain/tree/splits.js';
import { TimelineInterval, TIMELINE_HOLD_KIND } from '../time/TimelineInterval.js';

export class TimelineTimingBuilder {
    static buildInputTreeTiming(globalIndex) {
        if (!Number.isInteger(globalIndex)) {
            return [];
        }

        return [TimelineInterval.hold({
            holdIndex: globalIndex,
            holdKind: TIMELINE_HOLD_KIND.INPUT_TREE,
            durationMs: TIMING_PROFILE.inputTreeHoldMs
        })];
    }

    static buildTransitionTiming({
        interpolationData,
        pairKey,
        splitEvent = null,
        sourceGlobalIndex = null,
        tree_pair_solutions = null
    }) {
        if (!Array.isArray(interpolationData) || interpolationData.length === 0) {
            return [];
        }

        const frameIndices = interpolationData
            .map(entry => entry?.originalIndex)
            .filter(Number.isInteger);
        const frameIndexSet = new Set(frameIndices);
        const holdsByIndex = new Map();

        if (splitEvent?.step_range_global?.length >= 2) {
            this._addHoldInterval(
                holdsByIndex,
                splitEvent.step_range_global[1],
                TIMELINE_HOLD_KIND.PIVOT,
                TIMING_PROFILE.pivotHoldMs,
                frameIndexSet
            );
        }

        const pairSolution = typeof pairKey === 'string'
            ? tree_pair_solutions?.[pairKey]
            : null;
        const moveEvents = Array.isArray(pairSolution?.spr_move_events)
            ? pairSolution.spr_move_events
            : [];
        const pivotKey = Array.isArray(splitEvent?.split)
            ? toBackendSplitKey(splitEvent.split)
            : null;

        for (const moveEvent of moveEvents) {
            if (pivotKey && toBackendSplitKey(moveEvent?.pivot_edge) !== pivotKey) {
                continue;
            }

            const moveRange = moveEvent?.step_range;
            if (!Array.isArray(moveRange) || moveRange.length < 2) {
                continue;
            }

            const holdIndex = this._localPairStepToGlobalIndex(
                moveRange[1],
                splitEvent,
                sourceGlobalIndex
            );
            this._addHoldInterval(
                holdsByIndex,
                holdIndex,
                TIMELINE_HOLD_KIND.MOVER,
                TIMING_PROFILE.moverHoldMs,
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

            const hold = holdsByIndex.get(toIndex);
            if (hold) {
                timing.push(hold);
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

        const localRange = splitEvent?.step_range_local;
        const globalRange = splitEvent?.step_range_global;
        if (
            Array.isArray(localRange) &&
            localRange.length >= 2 &&
            Array.isArray(globalRange) &&
            globalRange.length >= 2 &&
            Number.isInteger(localRange[0]) &&
            Number.isInteger(globalRange[0])
        ) {
            return globalRange[0] + (localStep - localRange[0]);
        }

        return null;
    }

    static _addHoldInterval(holdsByIndex, holdIndex, holdKind, durationMs, frameIndexSet) {
        if (
            !Number.isInteger(holdIndex) ||
            !frameIndexSet.has(holdIndex) ||
            !Number.isFinite(durationMs) ||
            durationMs <= 0
        ) {
            return;
        }

        const existing = holdsByIndex.get(holdIndex);
        if (!existing || durationMs > existing.durationMs) {
            holdsByIndex.set(holdIndex, TimelineInterval.hold({
                holdIndex,
                holdKind,
                durationMs
            }));
        }
    }
}
