/**
 * TimelineUI - Handles UI updates for timeline components
 */

import { DOM_ELEMENTS, PHASE_NAMES } from './constants.js';

export class TimelineUI {
    constructor() {
        this.elements = this._queryElements();
    }

    /**
     * Query and cache DOM elements
     * @private
     * @returns {Object} Cached DOM elements
     */
    _queryElements() {
        const elements = {};
        Object.entries(DOM_ELEMENTS).forEach(([key, id]) => {
            elements[key] = document.getElementById(id);
            if (!elements[key]) {
                console.warn(`[TimelineUI] Element '${id}' not found`);
            }
        });
        return elements;
    }

    /**
     * Update timeline metrics display
     * @param {number} totalSegments - Total number of segments
     */
    updateMetrics(totalSegments) {
        if (this.elements.movieTimelineCount) {
            this.elements.movieTimelineCount.textContent = totalSegments.toString();
        }
    }

    /**
     * Update comprehensive position display with both segment and tree information
     * @param {number} currentSegment - Current segment position (1-based)
     * @param {number} totalSegments - Total number of segments
     * @param {number} progress - Timeline progress (0-1)
     * @param {number} currentTree - Current tree index (1-based)
     * @param {number} totalTrees - Total number of trees
     * @param {number} treeInSegment - Position within current segment (1-based)
     * @param {number} treesInSegment - Total trees in current segment
     */
    updatePosition(currentSegment, totalSegments, progress, currentTree = null, totalTrees = null, treeInSegment = null, treesInSegment = null) {
        if (!this.elements.currentPositionInfo) return;

        const progressPercent = Math.round(progress * 100);

        // Base segment information
        let displayText = `Segment ${currentSegment} / ${totalSegments} (Timeline: ${progressPercent}%)`;

        // Add detailed tree information if provided
        if (currentTree !== null && totalTrees !== null && treeInSegment !== null && treesInSegment !== null) {
            displayText += ` | Tree ${currentTree}/${totalTrees} (${treeInSegment}/${treesInSegment} in segment)`;
        }

        this.elements.currentPositionInfo.textContent = displayText;
    }

    /**
     * Update detailed position display with tree information
     * @deprecated Use updatePosition with all parameters instead
     * @param {number} currentTree - Current tree index (1-based)
     * @param {number} totalTrees - Total number of trees
     * @param {number} treeInSegment - Position within current segment (1-based)
     * @param {number} treesInSegment - Total trees in current segment
     */
    updateDetailedPosition(currentTree, totalTrees, treeInSegment, treesInSegment) {
        // This method is now deprecated - the comprehensive information should be set via updatePosition
        console.warn('[TimelineUI] updateDetailedPosition is deprecated. Use updatePosition with all parameters instead.');
    }

    /**
     * Update interpolation status display
     * @param {string} phase - Current phase
     */
    updateInterpolationStatus(phase) {
        if (!this.elements.interpolationStatus) return;

        const phaseDisplay = PHASE_NAMES[phase] || 'Unknown';
        this.elements.interpolationStatus.textContent = phaseDisplay;
    }

    /**
     * Update position info for interpolated state
     * @param {Object} fromSegment - Source segment
     * @param {Object} toSegment - Target segment
     * @param {number} progress - Interpolation progress (0-1)
     */
    updateInterpolationPosition(fromSegment, toSegment, progress) {
        if (!this.elements.currentPositionInfo) return;

        const fromPhase = PHASE_NAMES[fromSegment.phase] || 'Unknown';
        const toPhase = PHASE_NAMES[toSegment.phase] || 'Unknown';
        const progressPercent = Math.round(progress * 100);

        this.elements.currentPositionInfo.textContent =
            `Over-interpolating ${fromPhase}→${toPhase} (${progressPercent}%)`;
    }

    /**
     * Clear all UI elements
     */
    clear() {
        const elementsToClear = [
            'movieTimelineCount',
            'currentPositionInfo',
            'interpolationStatus'
        ];

        elementsToClear.forEach(key => {
            const element = this.elements[key];
            if (element) {
                element.textContent = '';
            }
        });
    }

    /**
     * Setup button event handlers
     * @param {Object} handlers - Object mapping button names to handler functions
     */
    setupButtonHandlers(handlers) {
        const buttonMapping = {
            zoomInBtn: handlers.zoomIn,
            zoomOutBtn: handlers.zoomOut,
            fitToWindowBtn: handlers.fitToWindow,
            scrollToStartBtn: handlers.scrollToStart,
            scrollToEndBtn: handlers.scrollToEnd
        };

        Object.entries(buttonMapping).forEach(([elementKey, handler]) => {
            const element = this.elements[elementKey];
            if (element && handler) {
                element.addEventListener('click', handler);
            }
        });
    }

    /**
     * Validate that required elements exist
     * @returns {Array} Array of missing element IDs
     */
    validateElements() {
        const requiredElements = [
            'movieTimelineCount',
            'currentPositionInfo',
            'interpolationStatus'
        ];

        return requiredElements.filter(key => !this.elements[key]);
    }
}
