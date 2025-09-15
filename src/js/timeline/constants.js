export const TIMELINE_CONSTANTS = {
    UNIT_DURATION_MS: 1000,
    MIN_ZOOM_MS: 100,
    ZOOM_PERCENTAGE_UI: 0.3,
    TIMELINE_HEIGHT: '35px',
    MAX_ZOOM_FACTOR: 2,
    SCRUB_THROTTLE_MS: 16,
    SCRUB_END_TIMEOUT_MS: 500,
    DEFAULT_TREE_INDEX: 0,
    DEFAULT_SEGMENT_INDEX: -1,
    DEFAULT_PROGRESS: 0,
    MIN_PROGRESS: 0,
    MAX_PROGRESS: 1,
    DEFAULT_TREE_IN_SEGMENT: 1,
    DEFAULT_TREES_IN_SEGMENT: 1,
    INDEX_OFFSET_UI: 1,
    MAX_TOOLTIP_LEAVES: 5,
    DURATION_COMPLEXITY_WEIGHT: 0.6,
    EDGE_COMPLEXITY_WEIGHT: 0.4,
    DEFAULT_COMPLEXITY: 0.5,
    DEFAULT_MAX_EDGES: 15,
    FALLBACK_MAX_EDGES: 10,
};


export const PHASE_NAMES = {
    DOWN_PHASE: 'Down',
    COLLAPSE_PHASE: 'Collapse',
    REORDER_PHASE: 'Reorder',
    PRE_SNAP_PHASE: 'Pre-Snap',
    SNAP_PHASE: 'Snap',
    ORIGINAL: 'Original'
};

export const DOM_ELEMENTS = {
    movieTimelineCount: 'movieTimelineCount',
    currentPositionInfo: 'currentPositionInfo',
    interpolationStatus: 'interpolationStatus',
    zoomInBtn: 'zoomInBtn',
    zoomOutBtn: 'zoomOutBtn',
    fitToWindowBtn: 'fitToWindowBtn',
    scrollToStartBtn: 'scrollToStartBtn',
    scrollToEndBtn: 'scrollToEndBtn',
    // HUD Elements
    hudPositionInfo: 'hudPositionInfo',
    hudSegmentInfo: 'hudSegmentInfo',
    hudWindowStart: 'hudWindowStart',
    hudWindowMid: 'hudWindowMid',
    hudWindowEnd: 'hudWindowEnd'
};
