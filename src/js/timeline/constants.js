/**
 * Timeline constants and configuration
 */

export const TIMELINE_CONSTANTS = {
    UNIT_DURATION_MS: 1000, // 1 second per tree
    MIN_ZOOM_MS: 100,       // 0.1 second
    ZOOM_PERCENTAGE: 0.2,
    ZOOM_PERCENTAGE_UI: 0.3,
    SCROLL_PERCENTAGE: 0.1,
    ANIMATION_DURATION: {
        SHORT: 200,
        MEDIUM: 300,
        LONG: 500
    },
    EASING: 'easeInOutQuad',
    TIMELINE_HEIGHT: '32px',
    MAX_ZOOM_FACTOR: 2,
    SEGMENT_PROGRESS_THRESHOLD: 0.5,
    KEYBOARD_SPEED: 0.1,         // Keyboard navigation speed
    ZOOM_FRICTION: 8,            // Higher = slower zoom
    MOVE_THRESHOLD: 5,           // Touch drag threshold
    LONG_PRESS_TIME: 500         // Long press duration for touch
};

/**
 * Optimized vis-timeline configuration options
 */
export const TIMELINE_OPTIONS = {
    // Basic configuration
    BASIC: {
        height: '32px',
        orientation: 'top',
        showCurrentTime: false,
        showMajorLabels: false,
        showMinorLabels: false,
        editable: false,
        stack: false,
        autoResize: true,
        verticalScroll: false,
        horizontalScroll: true
    },

    // Performance optimizations
    PERFORMANCE: {
        clickToUse: false
        // Note: animateZoom and animation options removed - not supported in vis-timeline 7.7.4
    },

    // User interaction settings
    INTERACTION: {
        moveable: true,
        zoomable: true,
        zoomKey: 'ctrlKey',
        selectable: false // Using custom click handling
        // Note: keyboard option removed - not supported in vis-timeline 7.7.4
    },

    // Touch/mobile support
    TOUCH: {
        touchEnabled: true,
        moveThreshold: 5,
        pinchToZoom: true,
        longSelectPressTime: 500,
        multiselect: false
    },

    // Advanced zoom configuration
    ZOOM_ADVANCED: {
        zoomFriction: 8, // Higher = slower zoom
        zoom: function(scale, center) {
            // Custom zoom logic if needed
            return scale;
        }
    },

    // Custom time formatting (removed moment function - causes vis-timeline errors)
    TIME_FORMAT: {
        // Note: moment function removed as it conflicts with vis-timeline's internal moment usage
        // Use format options instead if needed
    },

    // Layout and styling
    LAYOUT: {
        margin: {
            item: { horizontal: 0, vertical: 2 },
            axis: 0
        },
        timeAxis: {
            scale: 'millisecond'
            // Let vis-timeline calculate optimal steps
        }
    },

    // Tooltip configuration
    TOOLTIP: {
        tooltip: {
            followMouse: true,
            overflowMethod: 'cap'
        }
    },

    // Rolling mode (for continuous updates)
    ROLLING: {
        rollingMode: {
            follow: false,
            offset: 0.5
        }
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

export const COLOR_CLASSES = [
    'tree-pair-color-1',
    'tree-pair-color-2',
    'tree-pair-color-3',
    'tree-pair-color-4',
    'tree-pair-color-5',
    'tree-pair-color-6'
];

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
 * Helper function to create timeline options based on configuration needs
 * @param {Object} timelineData - Timeline data with totalDuration
 * @param {string} mode - 'default', 'minimal', 'touch', or 'performance'
 * @returns {Object} Complete vis-timeline options object
 */
export function createTimelineOptions(timelineData, mode = 'default') {
    const baseOptions = {
        ...TIMELINE_OPTIONS.BASIC,
        min: 0,
        max: timelineData.totalDuration,
        start: 0,
        end: timelineData.totalDuration,
        ...TIMELINE_OPTIONS.LAYOUT
    };

    switch (mode) {
        case 'minimal':
            return {
                ...baseOptions,
                zoomKey: 'ctrlKey',
                clickToUse: false
            };

        case 'touch':
            return {
                ...baseOptions,
                ...TIMELINE_OPTIONS.INTERACTION,
                ...TIMELINE_OPTIONS.TOUCH,
                ...TIMELINE_OPTIONS.PERFORMANCE,
                zoomMin: TIMELINE_CONSTANTS.MIN_ZOOM_MS,
                zoomMax: timelineData.totalDuration * TIMELINE_CONSTANTS.MAX_ZOOM_FACTOR
            };

        case 'performance':
            return {
                ...baseOptions,
                ...TIMELINE_OPTIONS.INTERACTION,
                ...TIMELINE_OPTIONS.PERFORMANCE,
                ...TIMELINE_OPTIONS.ZOOM_ADVANCED,
                zoomMin: TIMELINE_CONSTANTS.MIN_ZOOM_MS,
                zoomMax: timelineData.totalDuration * TIMELINE_CONSTANTS.MAX_ZOOM_FACTOR
            };

        case 'advanced':
            return {
                ...baseOptions,
                ...TIMELINE_OPTIONS.INTERACTION,
                ...TIMELINE_OPTIONS.PERFORMANCE,
                ...TIMELINE_OPTIONS.ZOOM_ADVANCED,
                zoomMin: 10, // 10ms minimum zoom as in your example
                zoomMax: timelineData.totalDuration * 2
            };

        default: // 'default'
            return {
                ...baseOptions,
                ...TIMELINE_OPTIONS.INTERACTION,
                ...TIMELINE_OPTIONS.PERFORMANCE,
                zoomMin: TIMELINE_CONSTANTS.MIN_ZOOM_MS,
                zoomMax: timelineData.totalDuration * TIMELINE_CONSTANTS.MAX_ZOOM_FACTOR
            };
    }
}

export class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}
