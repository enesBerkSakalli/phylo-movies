/**
 * Timeline constants and configuration
 */

export const TIMELINE_CONSTANTS = {
    UNIT_DURATION_MS: 1000, // 1 second per tree
    ANCHOR_DURATION_MULTIPLIER: 0.5, // Anchor points are 0.5x width - visual markers, not scrubbable
    MIN_ZOOM_MS: 100,       // 0.1 second
    ZOOM_PERCENTAGE_UI: 0.3,
    TIMELINE_HEIGHT: '35px',
    MAX_ZOOM_FACTOR: 2,
    
    // Scrubbing configuration
    SCRUB_THROTTLE_MS: 16,        // ~60fps throttling for scrubbing
    SCRUB_END_TIMEOUT_MS: 500,    // Fallback timeout for ending scrubbing
    
    // UI defaults
    DEFAULT_TREE_INDEX: 0,
    DEFAULT_SEGMENT_INDEX: -1,
    DEFAULT_PROGRESS: 0,
    MIN_PROGRESS: 0,
    MAX_PROGRESS: 1,
    
    // Position calculations
    DEFAULT_TREE_IN_SEGMENT: 1,
    DEFAULT_TREES_IN_SEGMENT: 1,
    
    // Index conversions
    INDEX_OFFSET_UI: 1,           // Convert 0-based to 1-based for UI display
    
    // Tooltip configuration
    MAX_TOOLTIP_LEAVES: 5,        // Maximum leaves to show in tooltips
    
    // Complexity scoring weights
    DURATION_COMPLEXITY_WEIGHT: 0.6,  // Weight for duration in complexity score
    EDGE_COMPLEXITY_WEIGHT: 0.4,      // Weight for edge count in complexity score
    DEFAULT_COMPLEXITY: 0.5,           // Default complexity value
    
    // Edge count defaults
    DEFAULT_MAX_EDGES: 15,            // Default max edges if not specified
    FALLBACK_MAX_EDGES: 10,           // Fallback for max edge count
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
    },

    // Map number of subtrees to a color class (simpler and more interpretable)
    getInterpolationClassBySubtrees: function(count) {
        if (count <= 1) return 'timeline-interp-minimal';
        if (count === 2) return 'timeline-interp-light';
        if (count === 3) return 'timeline-interp-moderate';
        if (count === 4) return 'timeline-interp-heavy';
        return 'timeline-interp-massive';
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

// Renderer mode: 'vis' (default) or 'deck'
export const TIMELINE_RENDERER_MODE = 'deck';

// Deck renderer uses internal options; no external timeline config needed

export class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}
