/**
 * TimelineUI - Handles UI updates for timeline components
 */

import { DOM_ELEMENTS, PHASE_NAMES } from './constants.js';

export class TimelineUI {
    constructor() {
        this.elements = this._queryElements();
    }

    /**
     * Query and cache DOM elements with retry mechanism
     * @private
     * @returns {Object} Cached DOM elements
     */
    _queryElements() {
        const elements = {};
        Object.entries(DOM_ELEMENTS).forEach(([key, id]) => {
            elements[key] = document.getElementById(id);
        });
        return elements;
    }

    /**
     * Refresh DOM element cache (useful if DOM is updated after initialization)
     */
    refreshElements() {
        this.elements = this._queryElements();
        return this.validateElements();
    }

    /**
     * Update timeline metrics display
     * @param {number} totalTrees - Total number of trees
     * @param {number} totalSegments - Total number of segments (optional)
     */
    updateMetrics(totalTrees, totalSegments = null) {
        if (!this.elements.movieTimelineCount) {
            this.refreshElements();
        }

        if (this.elements.movieTimelineCount) {
            // Format the display to match HTML structure
            const displayText = totalSegments !== null
                ? `${totalTrees} trees (${totalSegments} segments)`
                : `${totalTrees} trees`;
            this.elements.movieTimelineCount.textContent = displayText;
        } else {
            console.error('[TimelineUI] Failed to update metrics - element still not found');
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
        if (!this.elements.currentPositionInfo) {
            this.refreshElements();
        }

        if (!this.elements.currentPositionInfo) {
            return;
        }

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
     * Update interpolation status display
     * @param {string} phase - Current phase
     */
    updateInterpolationStatus(phase) {
        if (!this.elements.interpolationStatus) {
            console.warn('[TimelineUI] interpolationStatus element not available, attempting refresh...');
            this.refreshElements();
        }

        if (!this.elements.interpolationStatus) {
            console.error('[TimelineUI] Failed to update interpolation status - element not found');
            return;
        }

        const phaseDisplay = PHASE_NAMES[phase] || 'Unknown';
        this.elements.interpolationStatus.textContent = phaseDisplay;
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
