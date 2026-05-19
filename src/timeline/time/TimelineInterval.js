export const TIMELINE_INTERVAL_TYPE = {
    MOTION: 'motion',
    HOLD: 'hold'
};

export const TIMELINE_HOLD_KIND = {
    INPUT_TREE: 'input_tree',
    MOVER: 'mover',
    PIVOT: 'pivot'
};

export class TimelineInterval {
    static motion({ fromIndex, toIndex, durationMs }) {
        return {
            type: TIMELINE_INTERVAL_TYPE.MOTION,
            fromIndex,
            toIndex,
            durationMs
        };
    }

    static hold({ holdIndex, holdKind, durationMs }) {
        return {
            type: TIMELINE_INTERVAL_TYPE.HOLD,
            holdIndex,
            holdKind,
            durationMs
        };
    }

    static isMotion(interval) {
        return interval?.type === TIMELINE_INTERVAL_TYPE.MOTION;
    }

    static isHold(interval) {
        return interval?.type === TIMELINE_INTERVAL_TYPE.HOLD;
    }

    static durationMs(interval) {
        const duration = Number(interval?.durationMs);
        return Number.isFinite(duration) && duration > 0 ? duration : 0;
    }
}
