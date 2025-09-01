/**
 * MovieTimelineManager - Modular timeline management
 * Uses a renderer abstraction (deck.gl implementation by default)
 */

import { TIMELINE_CONSTANTS } from './constants.js';
import { TimelineDataProcessor } from './TimelineDataProcessor.js';
import { TimelineUI } from './TimelineUI.js';
import { ScrubberAPI } from './ScrubberAPI.js';
import { TimelineMathUtils } from './TimelineMathUtils.js';
import { useAppStore } from '../core/store.js';
import { calculateWindow } from '../utils/windowUtils.js';
import { getIndexMappings, getMSAFrameIndex, getPhaseMetadata } from '../core/IndexMapping.js';
import { TimelineTooltip } from './tooltip/TimelineTooltip.js';
import { buildTimelineTooltipContent } from './tooltip/buildTooltipContent.js';
import { createTimelineRenderer } from './renderers/TimelineRendererFactory.js';

export class MovieTimelineManager {
    constructor(movieData, transitionIndexResolver) {
        this.movieData = movieData;
        this.transitionResolver = transitionIndexResolver;
        this.isTimelinePlaying = false;

        // Create modular components
        this.ui = new TimelineUI();

        // Initialize scrubber API directly
        this.scrubberAPI = null;

        // Process timeline data using existing resolver
        this.segments = TimelineDataProcessor.createSegments(movieData);
        this.timelineData = TimelineDataProcessor.createTimelineData(this.segments);
        // Cache durations for reuse
        this.segmentDurations = this.timelineData.segmentDurations;

        // Scrubbing state
        this.isScrubbing = false;
        this.lastScrubTime = 0;
        this.scrubRequestId = null;
        this.scrubEndTimeout = null; // Fallback timeout for scrubbing
        this.SCRUB_THROTTLE_MS = TIMELINE_CONSTANTS.SCRUB_THROTTLE_MS; // ~60fps

        this._initialize();
    }

    /**
     * Initialize the timeline
     * @private
     */
    _initialize() {
        // Update UI metrics with centralized mapping
        const { totalSequenceLength } = getIndexMappings();
        this.ui.updateMetrics(totalSequenceLength, this.segments.length);

        // Sync initial playback state from store
        const { playing } = useAppStore.getState();
        this.isTimelinePlaying = playing;

        // Create timeline via renderer abstraction
        this._createTimeline();

        // Setup event handlers
        this._setupEvents();

        // Setup UI controls
        this._setupUIControls();

        // Initialize scrubber API directly
        this._initializeScrubberAPI();

        // Initialize rich tooltip overlay
        this.tooltip = new TimelineTooltip();

        // Subscribe to store changes for real-time UI updates
        this.unsubscribeFromStore = useAppStore.subscribe(
            (state, prevState) => {
                // Skip all timeline updates during user scrubbing to prevent snap-back
                if (this.isScrubbing) {
                    return;
                }

                // Update the timeline UI whenever the tree index changes, regardless of playback state.
                if (state.currentTreeIndex !== prevState.currentTreeIndex) {
                    // Use rAF to sync with browser's rendering cycle for performance
                    requestAnimationFrame(() => this.updateCurrentPosition());
                }

                // Update when segment progress changes (during interpolation)
                if (state.segmentProgress !== prevState.segmentProgress) {
                    requestAnimationFrame(() => this.updateCurrentPosition());
                }

                // Also update when playback state changes to sync timeline state
                if (state.playing !== prevState.playing) {
                    this.isTimelinePlaying = state.playing;
                    // Force a position update when playback starts/stops
                    requestAnimationFrame(() => this.updateCurrentPosition());
                }

                // Legend handling removed from timeline (managed by TaxaColoring)
            }
        );

        // Initialize current position with DOM readiness check
        requestAnimationFrame(() => {
            // Double-check UI elements are available before first update
            this.ui.validateElements();
            this.updateCurrentPosition();
        });
    }

    /**
     * Initialize the scrubber API directly
     * @private
     */
    _initializeScrubberAPI() {
        try {
            const { treeController } = useAppStore.getState();
            if (!treeController) return;

            this.scrubberAPI = new ScrubberAPI(
                treeController,
                this.transitionResolver,
                this // Pass the timeline manager instance
            );

        } catch (error) {}
    }

    /**
     * Create timeline instance via renderer abstraction
     * @private
     */
    _createTimeline() {
        // Find or create container
        let container = document.getElementById('timelineContainer');
        if (!container) {
            const timelineContainer = document.querySelector('.interpolation-timeline-container');
            if (!timelineContainer) return;

            container = document.createElement('div');
            container.id = 'timelineContainer';
            container.className = 'timeline-visual-layer';
            timelineContainer.appendChild(container);
        }

        // Create renderer-backed timeline
        this.timeline = createTimelineRenderer(this.timelineData, this.segments).init(container);

        // Scrubber is initialized by the renderer itself
    }

    /**
     * Setup event handlers from the renderer
     * @private
     */
    _setupEvents() {
        if (!this.timeline) return;

        // Handle scrubbing via timechange event (normalize Date → ms)
        this.timeline.on('timechange', (properties) => {
            if (properties.id === 'scrubber') {
                const ms = properties.time instanceof Date ? properties.time.getTime() : properties.time;
                this._handleScrubbing(ms);
            }
        });

        // Handle segment clicks
        this.timeline.on('click', (properties) => {
            if (properties.item) {
                this._handleSegmentClick(properties.item - TIMELINE_CONSTANTS.INDEX_OFFSET_UI); // Convert to 0-based index
            }
        });

        // Handle scrubbing start/end (normalize Date → ms)
        this.timeline.on('timechanged', (properties) => {
            if (properties.id === 'scrubber') {
                const ms = properties.time instanceof Date ? properties.time.getTime() : properties.time;
                this._endScrubbing({ ...properties, time: ms });
            }
        });

        // Note: selection events also map to clicks in renderer; we only
        // handle explicit 'click' to avoid duplicate navigation.

        // Enhanced tooltip using custom overlay matching NodeContextMenu style
        this.timeline.on('itemover', (props) => {
            const id = props.item;
            const segIndex = (id ?? 1) - TIMELINE_CONSTANTS.INDEX_OFFSET_UI; // id is 1-based
            const seg = this.segments[segIndex];
            if (!seg) return;
            const { clientX, clientY } = props.event?.srcEvent || props.event || { clientX: 0, clientY: 0 };
            const state = useAppStore.getState();
            const html = buildTimelineTooltipContent(
              seg,
              segIndex,
              this.segments.length,
              state,
              (indices) => this._getLeafNamesByIndices(indices)
            );
            this.tooltip.show(html, clientX, clientY);
        });
        this.timeline.on('itemout', () => {
            this.tooltip.hide();
        });
        this.timeline.on('mouseMove', (props) => {
            const { clientX, clientY } = props.event?.srcEvent || props.event || { clientX: 0, clientY: 0 };
            this.tooltip.updatePosition(clientX, clientY);
        });
    }

    /**
     * Handle scrubbing interaction with direct scrubber API
     * @private
     * @param {number} timeMs - Current time in milliseconds
     */
    async _handleScrubbing(timeMs) {
        // Don't treat programmatic updates during playback as user scrubbing
        if (this.isTimelinePlaying) {
            return;
        }

        if (!this.isScrubbing) {
            await this._startScrubbing(timeMs);
        } else {
            await this._updateScrubbing(timeMs);
        }
    }

    /**
     * Start scrubbing mode using scrubber API directly
     * @private
     * @param {number} timeMs - Initial time in milliseconds
     */
    async _startScrubbing(timeMs) {
        this.isScrubbing = true;


        // Add visual feedback class to scrubber
        const scrubberElement = document.querySelector('.deck-scrubber');
        if (scrubberElement) {
            scrubberElement.classList.add('scrubbing');
        }

        // Clear any existing scrubbing timeout
        if (this.scrubEndTimeout) {
            clearTimeout(this.scrubEndTimeout);
        }

        const progress = this._timeToProgress(timeMs);
        await this.scrubberAPI.startScrubbing(progress);
    }

    /**
     * Update scrubbing position using scrubber API directly
     * @private
     * @param {number} timeMs - Current time in milliseconds
     */
    async _updateScrubbing(timeMs) {
        if (!this.scrubberAPI) {
            return;
        }

        // Throttle high-frequency scrubbing events for performance
        const now = performance.now();
        if (now - this.lastScrubTime < this.SCRUB_THROTTLE_MS) {
            // Cancel any pending scrub update
            if (this.scrubRequestId) {
                cancelAnimationFrame(this.scrubRequestId);
            }

            // Schedule throttled update
            this.scrubRequestId = requestAnimationFrame(async () => {
                await this._updateScrubbing(timeMs);
            });
            return;
        }

        const progress = this._timeToProgress(timeMs);

        try {
            await this.scrubberAPI.updatePosition(progress);
            this.lastScrubTime = now;

            // Set a fallback timeout to end scrubbing if timechanged event doesn't fire
            if (this.scrubEndTimeout) {
                clearTimeout(this.scrubEndTimeout);
            }
            this.scrubEndTimeout = setTimeout(async () => {
                if (!this.isScrubbing) return;
                try {
                    const finalProgress = this._timeToProgress(timeMs);
                    await this.scrubberAPI.endScrubbing(finalProgress);

                    // Compute final tree index and update store
                    const { treeIndex: finalTreeIndex } = TimelineMathUtils.getTargetTreeForTime(
                        this.segments,
                        timeMs,
                        this.segmentDurations
                    );
                    const { currentTreeIndex } = useAppStore.getState();
                    const direction = finalTreeIndex === currentTreeIndex ? 'jump' :
                                     (finalTreeIndex > currentTreeIndex ? 'forward' : 'backward');
                    useAppStore.getState().goToPosition(finalTreeIndex, direction);

                    // Visual cleanup
                    const scrubberElement = document.querySelector('.deck-scrubber');
                    if (scrubberElement) {
                        scrubberElement.classList.remove('scrubbing');
                    }
                } catch (e) { } finally {
                    this.isScrubbing = false;
                    this.scrubEndTimeout = null;
                }
            }, TIMELINE_CONSTANTS.SCRUB_END_TIMEOUT_MS); // 500ms timeout

        } catch (error) {}
    }

    /**
     * End scrubbing mode using scrubber API directly
     * @private
     * @param {Object} properties - The properties object from the timechanged event.
     */
    async _endScrubbing(properties) {
        // This check is important to only run this logic when a scrub was actually happening.
        if (!this.isScrubbing) {
            return;
        }



        const finalTime = typeof properties.time === 'number' ? properties.time : (properties.time?.getTime?.() ?? 0);
        const finalProgress = this._timeToProgress(finalTime);

        // Let the ScrubberAPI render the final frame and resume store subscriptions
        await this.scrubberAPI.endScrubbing(finalProgress);

        // Calculate the definitive tree index for the final position
        // Use TimelineMathUtils to get the actual tree index, not segment index
        const { treeIndex: finalTreeIndex } = TimelineMathUtils.getTargetTreeForTime(
            this.segments,
            finalTime,
            this.segmentDurations
        );

        // Determine navigation direction based on current vs final position
        const { currentTreeIndex } = useAppStore.getState();
        const direction = finalTreeIndex === currentTreeIndex ? 'jump' :
                         (finalTreeIndex > currentTreeIndex ? 'forward' : 'backward');

        // Update the global state with the final position and correct direction
        useAppStore.getState().goToPosition(finalTreeIndex, direction);

        // Reset the scrubbing state flag for the manager
        this.isScrubbing = false;

        // Remove the scrubbing class from the scrubber element for visual feedback
        const scrubberElement = document.querySelector('.deck-scrubber');
        if (scrubberElement) {
            scrubberElement.classList.remove('scrubbing');
        }

        // Clear any pending timeout
        if (this.scrubEndTimeout) {
            clearTimeout(this.scrubEndTimeout);
            this.scrubEndTimeout = null;
        }
    }


    /**
     * Calculate time position for a given segment index
     * @private
     * @param {number} segmentIndex - The segment index
     * @param {number} timeInSegment - Additional time within the segment
     * @returns {number} Total time in milliseconds
     */
    _calculateTimeForSegment(segmentIndex, timeInSegment = TIMELINE_CONSTANTS.DEFAULT_PROGRESS) {
        const segmentDurations = this.segmentDurations;
        return TimelineMathUtils.calculateTimeForSegment(this.segments, segmentIndex, timeInSegment, segmentDurations);
    }

    /**
     * Validate segment and index
     * @private
     * @param {number} segmentIndex - Segment index to validate
     * @returns {Object|null} Valid segment or null if invalid
     */
    _validateSegment(segmentIndex) {
        if (segmentIndex === TIMELINE_CONSTANTS.DEFAULT_SEGMENT_INDEX || segmentIndex >= this.segments.length || !this.segments[segmentIndex]) {
            return null;
        }
        return this.segments[segmentIndex];
    }

    /**
     * Convert timeline time to progress (0-1)
     * @private
     * @param {number} time - Timeline time in milliseconds
     * @returns {number} Progress value between 0 and 1
     */
    _timeToProgress(time) {
        return TimelineMathUtils.timeToProgress(time, this.timelineData?.totalDuration || 0);
    }


    /**
     * Handle segment click navigation
     * @private
     * @param {number} segmentIndex - Clicked segment index
     */
    _handleSegmentClick(segmentIndex) {
        const segment = this._validateSegment(segmentIndex);
        if (!segment) return;

        // For anchor points (full trees), stay on the anchor
        // For interpolation segments, navigate to the first tree in the group
        let targetTreeIndex;
        if (segment.isFullTree) {
            // Anchor point - use its tree index directly
            targetTreeIndex = segment.interpolationData[0].originalIndex;
        } else if (segment.hasInterpolation && segment.interpolationData?.length > 0) {
            // Interpolation segment - go to first tree
            targetTreeIndex = segment.interpolationData[0].originalIndex;
        } else {
            // Fallback
            targetTreeIndex = segment.interpolationData?.[0]?.originalIndex || segment.index;
        }

        // Calculate proper progress for this segment and update store timeline state
        const { segmentIndex: foundSegmentIndex, timeInSegment } = TimelineMathUtils.findSegmentForTreeIndex(this.segments, targetTreeIndex);
        if (foundSegmentIndex !== TIMELINE_CONSTANTS.DEFAULT_SEGMENT_INDEX) {
            const currentTime = this._calculateTimeForSegment(foundSegmentIndex, timeInSegment);
            // Keep timeline state in sync via store update below

            // Update store timeline state for the clicked segment
            const resolvedSeg = this.segments[foundSegmentIndex];
            this._updateStoreTimelineState(currentTime, resolvedSeg);
        }

        // Navigate to position with direction detection
        const { currentTreeIndex } = useAppStore.getState();
        const direction = targetTreeIndex === currentTreeIndex ? 'jump' : (targetTreeIndex > currentTreeIndex ? 'forward' : 'backward');
        useAppStore.getState().goToPosition(targetTreeIndex, direction);
    }



    /**
     * Updates store timeline state consistently across all operations
     * @private
     * @param {number} time - Current time in milliseconds
     * @param {Object} fromSegment - Current segment (or source segment during interpolation)
     * @param {Object} [toSegment] - Target segment (if interpolating)
     * @param {number} [segmentProgress] - Progress within segment (0-1)
     * @param {number} [currentTreeIndex] - Current tree index for precise positioning
     */
    _updateStoreTimelineState(time, fromSegment, toSegment = null, segmentProgress = TIMELINE_CONSTANTS.DEFAULT_PROGRESS, currentTreeIndex = null) {
        const progress = time / this.timelineData.totalDuration;

        // Find which segment we're primarily in
        const primarySegment = toSegment || fromSegment;
        const segmentIndex = this.segments.findIndex(seg => seg === primarySegment);

        if (segmentIndex === TIMELINE_CONSTANTS.DEFAULT_SEGMENT_INDEX) return;

        // Calculate tree position within segment
        let treeInSegmentValue = TIMELINE_CONSTANTS.DEFAULT_TREE_IN_SEGMENT;
        let treesInSegmentValue = TIMELINE_CONSTANTS.DEFAULT_TREES_IN_SEGMENT;

        if (primarySegment.hasInterpolation && primarySegment.interpolationData?.length > 1) {
            treesInSegmentValue = primarySegment.interpolationData.length;

            // If we have currentTreeIndex, use precise calculation
            if (currentTreeIndex !== null) {
                const { treeInSegment } = TimelineMathUtils.calculateTreePositionInSegment(primarySegment, currentTreeIndex);
                treeInSegmentValue = treeInSegment;
            } else {
                // Use segment progress to determine position within segment
                treeInSegmentValue = Math.max(TIMELINE_CONSTANTS.DEFAULT_TREE_IN_SEGMENT, Math.ceil(segmentProgress * treesInSegmentValue));
            }
        }

        // Update store with timeline state using existing variables
        useAppStore.getState().updateTimelineState({
            currentSegmentIndex: segmentIndex,
            totalSegments: this.segments.length,
            treeInSegment: treeInSegmentValue,
            treesInSegment: treesInSegmentValue,
            timelineProgress: progress
        });

        // Also update segment progress for interpolation (avoid churn)
        const prev = useAppStore.getState().segmentProgress;
        if (!Number.isFinite(prev) || Math.abs((segmentProgress ?? 0) - prev) > 1e-6) {
            useAppStore.getState().setSegmentProgress(segmentProgress);
        }
    }

    /**
     * Get leaf names by their indices using sorted_leaves array
     * @private
     * @param {Array<number>} indices - Array of leaf indices
     * @returns {Array<string>} Array of leaf names
     */
    _getLeafNamesByIndices(indices) {
        // Use sorted_leaves from movieData to map indices to names
        const { movieData } = this;
        const sortedLeaves = movieData?.sorted_leaves;

        if (!sortedLeaves || !Array.isArray(sortedLeaves)) return [];

        const leafNames = [];
        for (const idx of indices) {
            if (Number.isInteger(idx) && idx >= 0 && idx < sortedLeaves.length) {
                leafNames.push(sortedLeaves[idx]);
            }
        }

        return leafNames;
    }

    /**
     * Setup UI controls: delegate to the renderer
     * @private
     */
    _setupUIControls() {
        this.ui.setupButtonHandlers({
            zoomIn: () => this.timeline?.zoomIn(TIMELINE_CONSTANTS.ZOOM_PERCENTAGE_UI),
            zoomOut: () => this.timeline?.zoomOut(TIMELINE_CONSTANTS.ZOOM_PERCENTAGE_UI),
            fitToWindow: () => this.timeline?.fit(),
            scrollToStart: () => this.timeline?.moveTo(TIMELINE_CONSTANTS.DEFAULT_PROGRESS),
            scrollToEnd: () => this.timeline?.moveTo(this.timelineData.totalDuration)
        });
    }

    /**
     * Update current position (called by external systems)
     */
    updateCurrentPosition() {
        const { currentTreeIndex } = useAppStore.getState();
        const metadata = getPhaseMetadata();

        // Find which segment contains the current tree index and calculate proper time
        const { segmentIndex, timeInSegment } = TimelineMathUtils.findSegmentForTreeIndex(this.segments, currentTreeIndex);

        // Validate segment
        const segment = this._validateSegment(segmentIndex);
        if (!segment) return;

        // Calculate time using helper method
        let currentTime = this._calculateTimeForSegment(segmentIndex, timeInSegment);

        // Calculate actual progress within this specific segment
        let calculatedSegmentProgress = 0;
        if (segment.hasInterpolation && segment.interpolationData?.length > 1) {
            // Find which position we are within this segment's interpolation data
            const positionInSegment = segment.interpolationData.findIndex(
                item => item.originalIndex === currentTreeIndex
            );
            if (positionInSegment !== -1) {
                // Calculate progress: if segment has 5 trees, position 0 = 0%, position 4 = 100%
                calculatedSegmentProgress = segment.interpolationData.length > 1 ?
                    positionInSegment / (segment.interpolationData.length - 1) : 0;
            }

            // Update the time calculation based on the calculated progress
            const segmentDurations = this.segmentDurations;
            const segmentLength = segment.interpolationData.length * TIMELINE_CONSTANTS.UNIT_DURATION_MS;
            const interpolatedTimeInSegment = calculatedSegmentProgress * segmentLength;
            currentTime = TimelineMathUtils.calculateTimeForSegment(this.segments, segmentIndex, interpolatedTimeInSegment, segmentDurations);
        }

        const progress = currentTime / this.timelineData.totalDuration;

        // Update scrubber position when not manually scrubbing
        // This should work during playback AND when programmatically navigating
        if (!this.isScrubbing) {
            // Keep timeline state in sync via store update below

            // Update timeline scrubber position
            this.timeline?.setCustomTime(currentTime, 'scrubber');

            // Highlight current segment
            this.timeline?.setSelection([segmentIndex + TIMELINE_CONSTANTS.INDEX_OFFSET_UI]);
        }

        // Update store with current timeline state - this handles all store updates
        this._updateStoreTimelineState(currentTime, segment, null, calculatedSegmentProgress, currentTreeIndex);

        // Get updated values from store for UI display
        const storeState = useAppStore.getState();
        const { totalSequenceLength: totalTrees } = getIndexMappings(storeState);

        // Update UI with comprehensive position information from store
        this.ui.updatePosition(
            storeState.currentSegmentIndex + TIMELINE_CONSTANTS.INDEX_OFFSET_UI, // 1-based for UI
            storeState.totalSegments,
            storeState.timelineProgress,
            currentTreeIndex + TIMELINE_CONSTANTS.INDEX_OFFSET_UI,
            totalTrees,
            storeState.treeInSegment,
            storeState.treesInSegment
        );

        // Prepare transition context for display
        let transitionInfo = null;
        let changingLeaves = null;
        let transitionProgress = null;

        if (segment) {
            if (segment.isFullTree) {
                // For full trees, indicate it's a complete/stable tree
                transitionInfo = {
                    isFullTree: true,
                    isTransition: false
                };
            } else if (segment.hasInterpolation && segment.interpolationData?.length > 1) {
                // For interpolations, calculate progress within the transition
                transitionInfo = {
                    isFullTree: false,
                    isTransition: true
                };

                // Use the calculated segment progress for accurate percentage display
                transitionProgress = calculatedSegmentProgress;

                // Extract changing leaf names from activeChangeEdge
                if (segment.activeChangeEdge && Array.isArray(segment.activeChangeEdge)) {
                    changingLeaves = this._getLeafNamesByIndices(segment.activeChangeEdge);
                }
            }
        }

        this.ui.updateInterpolationStatus(metadata?.phase, transitionInfo, changingLeaves, transitionProgress);

        // Update MSA window chip only when on a full tree segment
        if (segment?.isFullTree) {
            this._updateMSAWindowChip();
        }
    }

    /**
     * Update the MSA window chip labels (start/mid/end) based on current position.
     * Uses full-tree anchoring and falls back to distance index when needed.
     * Clean, side-effect-free aside from DOM text updates.
     * @private
     */
    _updateMSAWindowChip() {
        const {
            transitionResolver,
            msaWindowSize,
            msaStepSize,
            msaColumnCount,
            syncMSAEnabled
        } = useAppStore.getState();

        if (!syncMSAEnabled || !transitionResolver || msaColumnCount <= 0) return;

        // Prefer the index of the current full tree; fallback to distance index
        const frameIndex = getMSAFrameIndex();
        if (frameIndex < 0) return;

        const { startPosition, midPosition, endPosition } =
            calculateWindow(frameIndex, msaStepSize, msaWindowSize, msaColumnCount);

        const startEl = document.getElementById('windowStart');
        const midEl = document.getElementById('windowMid');
        const endEl = document.getElementById('windowEnd');

        if (!startEl || !midEl || !endEl) return;

        startEl.textContent = String(startPosition);
        midEl.textContent = String(midPosition);
        endEl.textContent = String(endPosition);

        // Accessibility
        startEl.setAttribute('aria-label', `Window start: position ${startPosition}`);
        midEl.setAttribute('aria-label', `Window center: position ${midPosition}`);
        endEl.setAttribute('aria-label', `Window end: position ${endPosition}`);
    }


    /**
     * Clean up and destroy the timeline
     */
    destroy() {
        // Clean up performance optimization timers
        if (this.scrubRequestId) {
            cancelAnimationFrame(this.scrubRequestId);
        }

        // Clean up scrubbing timeout
        if (this.scrubEndTimeout) {
            clearTimeout(this.scrubEndTimeout);
        }

        // Unsubscribe from store changes
        if (this.unsubscribeFromStore) {
            this.unsubscribeFromStore();
        }

        // Destroy timeline renderer resources
        this.timeline?.destroy();

        // Clear UI
        this.ui?.clear();

        // Destroy scrubber API
        this.scrubberAPI?.destroy();

        // Clear references
        this.timeline = null;
        this.segments = null;
        this.timelineData = null;
        this.ui = null;
        this.scrubberAPI = null;
        this.scrubRequestId = null;
    }
}
