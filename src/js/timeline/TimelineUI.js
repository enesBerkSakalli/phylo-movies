import { DOM_ELEMENTS } from './constants.js';

export class TimelineUI {
    constructor() {
        this.elements = this._queryElements();
    }

    /**
     * Parse tree pair key and format transition display text
     * @param {string} treePairKey - Key like "pair_1_2"
     * @param {number} transitionProgress - Progress 0-1
     * @returns {Object} { fromTo: string, percent: number, formattedText: string }
     */
    _formatTransitionText(treePairKey, transitionProgress = 0) {
        const percent = transitionProgress != null ? Math.round(transitionProgress * 100) : 0;
        let fromTo = '';
        console.log('[TimelineUI] _formatTransitionText called with treePairKey:', treePairKey, 'transitionProgress:', transitionProgress, 'percent:', percent);
        if (typeof treePairKey === 'string') {
            const match = treePairKey.match(/pair_(\d+)_(\d+)/);
            if (match) {
                const fromTree = parseInt(match[1], 10) + 1;
                const toTree = parseInt(match[2], 10) + 1;
                fromTo = `Tree ${fromTree} → ${toTree}`;
            }
        }

        const formattedText = fromTo ? `${fromTo} (${percent}%)` : `Interpolation: ${percent}%`;

        return { fromTo, percent, formattedText };
    }

    /**
     * Create visual indicator for position within segment
     * @param {number} current - Current position (1-based)
     * @param {number} total - Total positions
     * @param {string} filledChar - Character for filled positions
     * @param {string} emptyChar - Character for empty positions
     * @returns {string} Visual indicator like "●●●○○"
     */
    _createVisualIndicator(current, total, filledChar = '●', emptyChar = '○') {
        if (total <= 1) return ''; // No indicator needed for single position

        // Clamp current to valid range
        const clampedCurrent = Math.max(1, Math.min(current, total));

        let indicator = '';
        for (let i = 1; i <= total; i++) {
            indicator += i <= clampedCurrent ? filledChar : emptyChar;
        }

        return indicator;
    }

    /**
     * Create Material Web progress bar element for segment position
     * @param {number} current - Current position (1-based)
     * @param {number} total - Total positions
     * @returns {HTMLElement|null} Material Web progress element or null if not needed
     */
    _createMaterialProgressBar(current, total) {
        if (total <= 1) return null; // No progress bar needed for single position

        // Clamp current to valid range
        const clampedCurrent = Math.max(1, Math.min(current, total));

        // Calculate progress value (0-1 range)
        const progress = (clampedCurrent - 1) / (total - 1);

        // Create md-linear-progress element
        const progressBar = document.createElement('md-linear-progress');
        progressBar.value = progress;
        progressBar.setAttribute('aria-label', `Step ${clampedCurrent} of ${total}`);

        // Set custom styling for prominent display
        progressBar.style.cssText = `
            width: 80px;
            height: 6px;
            --md-linear-progress-track-height: 6px;
            --md-linear-progress-active-indicator-height: 6px;
            --md-linear-progress-track-shape: 6px;
            vertical-align: middle;
            margin-inline: 6px;
        `;

        return progressBar;
    }

    /**
     * Create Material Web progress bar element for overall timeline progress
     * @param {number} timelineProgress - Timeline progress (0-1 range)
     * @returns {HTMLElement|null} Material Web progress element
     */
    _createTimelineProgressBar(timelineProgress) {
        // Clamp progress to valid range
        const clampedProgress = Math.max(0, Math.min(1, timelineProgress));

        // Create md-linear-progress element
        const progressBar = document.createElement('md-linear-progress');
        progressBar.value = clampedProgress;
        progressBar.setAttribute('aria-label', `Timeline progress ${Math.round(clampedProgress * 100)}%`);

        // Set custom styling for prominent display
        progressBar.style.cssText = `
            width: 80px;
            height: 6px;
            --md-linear-progress-track-height: 6px;
            --md-linear-progress-active-indicator-height: 6px;
            --md-linear-progress-track-shape: 6px;
            vertical-align: middle;
            margin-inline: 6px;
        `;

        return progressBar;
    }

    _queryElements() {
        const elements = {};
        Object.entries(DOM_ELEMENTS).forEach(([key, id]) => {
            elements[key] = document.getElementById(id);
        });
        return elements;
    }

    refreshElements() {
        this.elements = this._queryElements();
        return this.validateElements();
    }

    updateMetrics(_totalTrees, _totalSegments = null) { /* no-op; React handles metrics */ }

    updatePositionDisplay({ progress, currentTree, totalTrees, treeInSegment, treesInSegment }) {
        const reactHudMounted = !!document.querySelector('.phylo-hud[data-react-component="hud"]');
        const progressPercent = Math.round(progress * 100);
        let displayText = `${progressPercent}%`;

        // Helper function to update a position element
        const updatePositionElement = (element) => {
            if (!element) return;

            element.innerHTML = '';

            if (currentTree !== null && totalTrees !== null && totalTrees > 1) {
                // Create progress bar using OVERALL timeline progress, not segment progress
                const progressBar = this._createTimelineProgressBar(progress);

                if (progressBar) {
                    const container = document.createElement('span');
                    container.style.cssText = 'display: inline-flex; align-items: center; gap: 8px;';

                    container.appendChild(progressBar);

                    const percentSpan = document.createElement('span');
                    percentSpan.textContent = displayText;
                    container.appendChild(percentSpan);

                    element.appendChild(container);
                } else {
                    element.textContent = displayText;
                }
            } else {
                element.textContent = displayText;
            }
        };

        // Update HUD position display unless React HUD is mounted
        if (!reactHudMounted) {
            updatePositionElement(this.elements.hudPositionInfo);
        }
    }

    updateSegmentInfo(segment, transitionProgress, storeState) {
        let text = '';
        const reactHudMounted = !!document.querySelector('.phylo-hud[data-react-component="hud"]');

        if (segment?.isFullTree) {
            const getNearestAnchorChartIndex = storeState.getNearestAnchorChartIndex?.bind(storeState) || null;
            const nearest = typeof getNearestAnchorChartIndex === 'function' ? (getNearestAnchorChartIndex() + 1) : null;
            text = nearest ? `Original tree ${nearest}` : 'Original tree';
        } else if (segment?.hasInterpolation) {
            const { formattedText } = this._formatTransitionText(segment.treePairKey, transitionProgress);
            text = formattedText;
        } else {
            text = 'Interpolation: 0%';
        }

        // Update HUD segment info unless React HUD is mounted
        if (!reactHudMounted && this.elements.hudSegmentInfo) {
            this.elements.hudSegmentInfo.textContent = text;
        }
    }

    updateTransitionIndicator(segment, changingLeaves, transitionProgress) {
        if (!this.elements.transitionIndicator) {
            this.refreshElements();
            if (!this.elements.transitionIndicator) return;
        }

        const line1 = this.elements.tiLine1;
        const line2 = this.elements.tiLine2;

        if (segment?.hasInterpolation && line1 && line2) {
            const { fromTo, percent } = this._formatTransitionText(segment.treePairKey, transitionProgress);
            line1.textContent = fromTo ? `${fromTo} • ${percent}%` : `Interpolation • ${percent}%`;

            const movingCount = Array.isArray(changingLeaves) ? changingLeaves.length : 0;
            line2.textContent = movingCount > 0 ? `Changing: ${movingCount} leaves` : 'Changing: none';

            this.elements.transitionIndicator.style.display = 'block';
        } else if (this.elements.transitionIndicator) {
            this.elements.transitionIndicator.style.display = 'none';
        }
    }


    clear() {
        const elementsToClear = [
            'movieTimelineCount',
            'currentPositionInfo'
        ];

        elementsToClear.forEach(key => {
            const element = this.elements[key];
            if (element) {
                element.textContent = '';
            }
        });
    }
    // Timeline controls are managed by React; no button handlers here

    validateElements() {
        const requiredElements = [
            'movieTimelineCount',
            'currentPositionInfo'
        ];

        return requiredElements.filter(key => !this.elements[key]);
    }
}
