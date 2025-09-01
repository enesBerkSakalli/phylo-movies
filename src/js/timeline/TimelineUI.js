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
            // element not yet available
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

        // Clean display without tree names
        let displayText = '';

        // Show position and progress
        if (currentTree !== null && totalTrees !== null) {
            // Primary display: position / total with progress
            displayText = `${currentTree} / ${totalTrees}`;

            // Add step info only if in multi-step transition
            if (treesInSegment > 1) {
                displayText += ` (step ${treeInSegment}/${treesInSegment})`;
            }

            // Add overall progress
            displayText += ` • ${progressPercent}%`;
        } else {
            // Fallback display
            displayText = `Position: ${progressPercent}%`;
        }

        this.elements.currentPositionInfo.textContent = displayText;
    }

    // Legend UI is handled independently (TaxaColoring component)

    /**
     * Update interpolation status display with transition context
     * @param {string} phase - Current phase
     * @param {Object} transitionInfo - Optional transition information
     * @param {Array} changingLeaves - Optional array of leaf names that are changing
     * @param {number} transitionProgress - Progress within transition (0-1)
     */
    updateInterpolationStatus(phase, transitionInfo = null, changingLeaves = null, transitionProgress = null) {
        if (!this.elements.interpolationStatus) {
            // interpolationStatus element not yet available; try refresh
            this.refreshElements();
        }

        if (!this.elements.interpolationStatus) {
            // failed to update interpolation status; element missing
            return;
        }

        let statusText = '';

        // Check if this is a transition or a stable/complete tree
        if (transitionInfo && transitionInfo.isTransition) {
            // Show transition with percentage
            const percentage = transitionProgress !== null ?
                Math.round(transitionProgress * 100) : 0;

            if (changingLeaves && changingLeaves.length > 0) {
                // Show percentage with moving leaves
                const displayLeaves = changingLeaves.slice(0, 3);
                const leafText = displayLeaves.join(', ');
                const moreText = changingLeaves.length > 3 ? ` +${changingLeaves.length - 3}` : '';
                statusText = `${percentage}% • Moving: ${leafText}${moreText}`;
            } else {
                // Just show transition percentage
                statusText = `Transition: ${percentage}%`;
            }
        } else if (transitionInfo && transitionInfo.isFullTree) {
            // Show stable/complete tree state - emphasize as anchor/pillar
            statusText = '[ ANCHOR POINT ]';
        } else if (phase) {
            // Fallback to phase display
            const phaseDisplay = PHASE_NAMES[phase] || phase;
            statusText = phaseDisplay;
        } else {
            // Default message
            statusText = 'Loading...';
        }

        this.elements.interpolationStatus.textContent = statusText;
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
