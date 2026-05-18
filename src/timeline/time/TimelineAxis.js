export const TIMELINE_AXIS_TYPE = {
    SEQUENCE: 'sequence',
    DURATION_MS: 'duration_ms',
    NORMALIZED: 'normalized'
};

export const TIMELINE_AXIS = {
    FRAME_INDEX: 'frame_index',
    ANCHOR_INDEX: 'anchor_index',
    PAIR_STEP: 'pair_step',
    MOVIE_TIME_MS: 'movie_time_ms',
    TIMELINE_PROGRESS: 'timeline_progress',
    MSA_COLUMN: 'msa_column'
};

export const TIMELINE_AXIS_DEFINITIONS = Object.freeze({
    [TIMELINE_AXIS.FRAME_INDEX]: Object.freeze({
        name: TIMELINE_AXIS.FRAME_INDEX,
        type: TIMELINE_AXIS_TYPE.SEQUENCE
    }),
    [TIMELINE_AXIS.ANCHOR_INDEX]: Object.freeze({
        name: TIMELINE_AXIS.ANCHOR_INDEX,
        type: TIMELINE_AXIS_TYPE.SEQUENCE
    }),
    [TIMELINE_AXIS.PAIR_STEP]: Object.freeze({
        name: TIMELINE_AXIS.PAIR_STEP,
        type: TIMELINE_AXIS_TYPE.SEQUENCE
    }),
    [TIMELINE_AXIS.MOVIE_TIME_MS]: Object.freeze({
        name: TIMELINE_AXIS.MOVIE_TIME_MS,
        type: TIMELINE_AXIS_TYPE.DURATION_MS
    }),
    [TIMELINE_AXIS.TIMELINE_PROGRESS]: Object.freeze({
        name: TIMELINE_AXIS.TIMELINE_PROGRESS,
        type: TIMELINE_AXIS_TYPE.NORMALIZED
    }),
    [TIMELINE_AXIS.MSA_COLUMN]: Object.freeze({
        name: TIMELINE_AXIS.MSA_COLUMN,
        type: TIMELINE_AXIS_TYPE.SEQUENCE
    })
});

export function getTimelineAxis(name) {
    return TIMELINE_AXIS_DEFINITIONS[name] ?? null;
}

export function isKnownTimelineAxis(name) {
    return Boolean(getTimelineAxis(name));
}
