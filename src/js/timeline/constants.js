/**
 * Timeline constants and configuration
 */

export const TIMELINE_CONSTANTS = {
    UNIT_DURATION_MS: 1000, // 1 second per tree
    MIN_ZOOM_MS: 100,       // 0.1 second
    ZOOM_PERCENTAGE_UI: 0.3,
    TIMELINE_HEIGHT: '32px',
    MAX_ZOOM_FACTOR: 2
};

/**
 * Simplified vis-timeline configuration - leveraging native capabilities
 */
export const TIMELINE_OPTIONS = {
    // Core display settings
    height: '32px',
    orientation: 'top',
    showCurrentTime: false,
    showMajorLabels: false,
    showMinorLabels: false,
    editable: false,
    stack: false,
    autoResize: true,

    // Interaction settings
    moveable: true,
    zoomable: true,
    zoomKey: 'ctrlKey',
    selectable: false,
    clickToUse: false,

    // Disable clustering entirely
    cluster: false,

    // Native tooltip configuration
    tooltip: {
        followMouse: true,
        overflowMethod: 'cap'
    },

    // Layout optimization
    margin: {
        item: { horizontal: 0, vertical: 2 },
        axis: 0
    },

    // Time axis configuration
    timeAxis: {
        scale: 'millisecond'
    }
};

export const PHASE_NAMES = {
    DOWN_PHASE: 'Down',
    COLLAPSE_PHASE: 'Collapse',
    REORDER_PHASE: 'Reorder',
    PRE_SNAP_PHASE: 'Pre-Snap',
    SNAP_PHASE: 'Snap',
    ORIGINAL: 'Original'
};

// Color strategy for timeline segments
export const COLOR_CLASSES = {
    // Full trees (stable states - both end and start points)
    FULL_TREE: 'timeline-full-tree',              // Dark blue - stable/anchor points
    
    // Method that considers both duration and edge complexity
    getInterpolationClassByComplexity: function(complexityScore) {
        // complexityScore: 0 = simplest (short duration, many edges), 1 = most complex (long duration, few edges)
        if (complexityScore <= 0.2) return 'timeline-interp-minimal';      // Light green/blue - simplest
        if (complexityScore <= 0.4) return 'timeline-interp-light';        // Yellow - light complexity
        if (complexityScore <= 0.6) return 'timeline-interp-moderate';     // Orange - moderate complexity
        if (complexityScore <= 0.8) return 'timeline-interp-heavy';        // Red-orange - heavy complexity
        return 'timeline-interp-massive';                                   // Dark red - most complex
    }
};

export const DOM_ELEMENTS = {
    movieTimelineCount: 'movieTimelineCount',
    currentPositionInfo: 'currentPositionInfo',
    interpolationStatus: 'interpolationStatus',
    zoomInBtn: 'zoomInBtn',
    zoomOutBtn: 'zoomOutBtn',
    fitToWindowBtn: 'fitToWindowBtn',
    scrollToStartBtn: 'scrollToStartBtn',
    scrollToEndBtn: 'scrollToEndBtn'
};

/**
 * Helper function to create timeline options with dynamic clustering
 * @param {Object} timelineData - Timeline data with totalDuration
 * @returns {Object} Complete vis-timeline options object
 */
export function createTimelineOptions(timelineData) {
    const baseOptions = { ...TIMELINE_OPTIONS };

    // Show the entire timeline initially
    return {
        ...baseOptions,
        min: 0,
        max: timelineData.totalDuration,
        start: 0,
        end: timelineData.totalDuration,
        zoomMin: TIMELINE_CONSTANTS.MIN_ZOOM_MS,
        zoomMax: timelineData.totalDuration * TIMELINE_CONSTANTS.MAX_ZOOM_FACTOR
    };
}

export class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}
