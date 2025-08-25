/**
 * Refactored MovieTimelineManager - Modular timeline management using vis-timeline
 * Leverages existing TransitionIndexResolver and removes redundant implementations
 */

import { Timeline, DataSet } from 'vis-timeline/standalone';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import '../../css/movie-timeline.css';
import '../../css/timeline-segments.css';

import { TIMELINE_CONSTANTS, createTimelineOptions } from './constants.js';
import { TimelineDataProcessor } from './TimelineDataProcessor.js';
import { TimelineUI } from './TimelineUI.js';
import { ScrubberAPI } from './ScrubberAPI.js';
import { useAppStore } from '../core/store.js';

export class MovieTimelineManager {
    constructor(movieData, transitionIndexResolver) {
        this.movieData = movieData;
        this.transitionResolver = transitionIndexResolver;
        this.isTimelinePlaying = false;
        this.lastTimelineProgress = 0;

        // Create modular components
        this.ui = new TimelineUI();

        // Initialize scrubber API directly
        this.scrubberAPI = null;

        // Process timeline data using existing resolver
        this.segments = TimelineDataProcessor.createSegments(movieData, transitionIndexResolver);
        this.timelineData = TimelineDataProcessor.createTimelineData(this.segments);

        // Scrubbing state
        this.isScrubbing = false;
        this.lastScrubTime = 0;
        this.scrubRequestId = null;
        this.scrubEndTimeout = null; // Fallback timeout for scrubbing
        this.SCRUB_THROTTLE_MS = 16; // ~60fps

        this._initialize();
    }

    /**
     * Initialize the timeline
     * @private
     */
    _initialize() {
        // Update UI metrics with correct data
        const totalTrees = this.movieData.tree_metadata?.length || 0;

        this.ui.updateMetrics(totalTrees, this.segments.length);

        // Sync initial playback state from store
        const { playing } = useAppStore.getState();
        this.isTimelinePlaying = playing;

        // Create vis-timeline
        this._createTimeline();

        // Setup event handlers
        this._setupEvents();

        // Setup UI controls
        this._setupUIControls();

        // Initialize scrubber API directly
        this._initializeScrubberAPI();

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

                // Also update when playback state changes to sync timeline state
                if (state.playing !== prevState.playing) {
                    this.isTimelinePlaying = state.playing;
                    // Force a position update when playback starts/stops
                    requestAnimationFrame(() => this.updateCurrentPosition());
                }
            }
        );

        // Initialize current position with DOM readiness check
        requestAnimationFrame(() => {
            // Double-check UI elements are available before first update
            const stillMissing = this.ui.validateElements();
            if (stillMissing.length > 0) {
                console.warn('[MovieTimelineManager] Some UI elements still missing during position update:', stillMissing);
            }
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

            if (!treeController) {
                console.warn('[MovieTimelineManager] No tree controller available for scrubber');
                return;
            }

            this.scrubberAPI = new ScrubberAPI(
                treeController,
                this.transitionResolver,
                this // Pass the timeline manager instance
            );

            console.log('[MovieTimelineManager] Scrubber API initialized');

        } catch (error) {
            console.error('[MovieTimelineManager] Failed to initialize scrubber API:', error);
        }
    }

    /**
     * Create vis-timeline instance with minimal configuration
     * @private
     */
    _createTimeline() {
        // Find or create container
        let container = document.getElementById('visTimelineContainer');
        if (!container) {
            const timelineContainer = document.querySelector('.interpolation-timeline-container');
            if (!timelineContainer) {
                console.warn('[MovieTimelineManager] Timeline container not found');
                return;
            }

            container = document.createElement('div');
            container.id = 'visTimelineContainer';
            container.className = 'vis-timeline-visual-layer';
            timelineContainer.appendChild(container);
        }

        // Create optimized timeline options using constants
        const options = createTimelineOptions(this.timelineData);

        // Create timeline
        this.timeline = new Timeline(
            container,
            this.timelineData.items,
            this.timelineData.groups,
            options
        );

        // Add scrubber
        this.timeline.addCustomTime(0, 'scrubber');
    }

    /**
     * Setup event handlers using vis-timeline's native events
     * @private
     */
    _setupEvents() {
        if (!this.timeline) return;

        // Handle scrubbing via timechange event
        this.timeline.on('timechange', (properties) => {
            if (properties.id === 'scrubber') {
                this._handleScrubbing(properties.time);
            }
        });

        // Handle segment clicks
        this.timeline.on('click', (properties) => {
            if (properties.item) {
                this._handleSegmentClick(properties.item - 1); // Convert to 0-based index
            }
        });

        // Handle scrubbing start/end
        this.timeline.on('timechanged', (properties) => {
            if (properties.id === 'scrubber') {
                this._endScrubbing(properties);
            }
        });

        // Handle item selection
        this.timeline.on('select', (properties) => {
            if (properties.items && properties.items.length > 0) {
                const selectedItem = properties.items[0];
                // Convert to 0-based index and handle click
                this._handleSegmentClick(selectedItem - 1);
            }
        });
    }

    /**
     * Handle scrubbing interaction with direct scrubber API
     * @private
     * @param {number} time - Current time in milliseconds
     */
    async _handleScrubbing(time) {
        // Don't treat programmatic updates during playback as user scrubbing
        if (this.isTimelinePlaying) {
            return;
        }

        if (!this.isScrubbing) {
            await this._startScrubbing(time);
        } else {
            await this._updateScrubbing(time);
        }
    }

    /**
     * Start scrubbing mode using scrubber API directly
     * @private
     * @param {number} time - Initial time in milliseconds
     */
    async _startScrubbing(time) {
        this.isScrubbing = true;
        console.log('[MovieTimelineManager] Started scrubbing at time:', time);

        // Add visual feedback class to scrubber
        const scrubberElement = document.querySelector('.vis-custom-time');
        if (scrubberElement) {
            scrubberElement.classList.add('scrubbing');
        }

        // Clear any existing scrubbing timeout
        if (this.scrubEndTimeout) {
            clearTimeout(this.scrubEndTimeout);
        }

        const progress = this._timeToProgress(time);
        await this.scrubberAPI.startScrubbing(progress);
    }

    /**
     * Update scrubbing position using scrubber API directly
     * @private
     * @param {number} time - Current time in milliseconds
     */
    async _updateScrubbing(time) {
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
                await this._updateScrubbing(time);
            });
            return;
        }

        const progress = this._timeToProgress(time);

        try {
            await this.scrubberAPI.updatePosition(progress);
            this.lastScrubTime = now;

            // Set a fallback timeout to end scrubbing if timechanged event doesn't fire
            if (this.scrubEndTimeout) {
                clearTimeout(this.scrubEndTimeout);
            }
            this.scrubEndTimeout = setTimeout(() => {
                if (this.isScrubbing) {
                    console.log('[MovieTimelineManager] Timeout - forcing end of scrubbing');
                    this.isScrubbing = false;
                    this.scrubEndTimeout = null;
                }
            }, 500); // 500ms timeout

        } catch (error) {
            console.error('[MovieTimelineManager] Error updating scrubber:', error);
        }
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

        console.log('[MovieTimelineManager] Ending scrubbing');

        const finalTime = properties.time.getTime();
        const finalProgress = this._timeToProgress(finalTime);

        // Let the ScrubberAPI render the final frame and resume store subscriptions
        await this.scrubberAPI.endScrubbing(finalProgress);

        // Calculate the definitive tree index for the final position
        const finalTreeIndex = TimelineDataProcessor.getTargetSegmentIndex(this.segments, finalTime);

        // **THE FIX**: Update the global state with the final position.
        // This synchronizes the store with the result of the scrub.
        useAppStore.getState().goToPosition(finalTreeIndex, 'jump');

        // Reset the scrubbing state flag for the manager
        this.isScrubbing = false;

        // Remove the scrubbing class from the scrubber element for visual feedback
        const scrubberElement = document.querySelector('.vis-custom-time');
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
    _calculateTimeForSegment(segmentIndex, timeInSegment = 0) {
        const segmentDurations = TimelineDataProcessor.calculateSegmentDurations(this.segments);

        let currentTime = 0;
        for (let i = 0; i < segmentIndex; i++) {
            currentTime += segmentDurations[i];
        }
        currentTime += timeInSegment;

        return currentTime;
    }

    /**
     * Calculate tree position within segment for display
     * @private
     * @param {Object} segment - The segment object
     * @param {number} currentTreeIndex - Current tree index
     * @returns {number} Tree position within segment (1-based)
     */
    _calculateTreeInSegment(segment, currentTreeIndex) {
        if (!segment || !segment.hasInterpolation || !segment.interpolationData?.length) {
            return 1;
        }

        if (segment.interpolationData.length > 1) {
            // Find which tree in the interpolation data matches currentTreeIndex
            const foundIndex = segment.interpolationData.findIndex(item =>
                item.originalIndex === currentTreeIndex);
            return foundIndex !== -1 ? foundIndex + 1 : 1;
        }

        return 1;
    }

    /**
     * Validate segment and index
     * @private
     * @param {number} segmentIndex - Segment index to validate
     * @returns {Object|null} Valid segment or null if invalid
     */
    _validateSegment(segmentIndex) {
        if (segmentIndex === -1 || segmentIndex >= this.segments.length || !this.segments[segmentIndex]) {
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
        if (!this.timelineData || this.timelineData.totalDuration === 0) {
            return 0;
        }
        return Math.max(0, Math.min(1, time / this.timelineData.totalDuration));
    }


    /**
     * Handle segment click navigation
     * @private
     * @param {number} segmentIndex - Clicked segment index
     */
    _handleSegmentClick(segmentIndex) {
        const segment = this._validateSegment(segmentIndex);
        if (!segment) {
            console.warn('[MovieTimelineManager] Invalid segment index:', segmentIndex);
            return;
        }

        // For grouped segments, navigate to the first tree in the group
        // For single segments, navigate to that tree
        let targetTreeIndex;
        if (segment.hasInterpolation && segment.interpolationData?.length > 0) {
            targetTreeIndex = segment.interpolationData[0].originalIndex;
        } else {
            targetTreeIndex = segment.interpolationData?.[0]?.originalIndex || segment.index;
        }

        // Calculate proper progress for this segment and update store timeline state
        const { segmentIndex: foundSegmentIndex, timeInSegment } = this._findSegmentForTreeIndex(targetTreeIndex);
        if (foundSegmentIndex !== -1) {
            const currentTime = this._calculateTimeForSegment(foundSegmentIndex, timeInSegment);
            this.lastTimelineProgress = currentTime / this.timelineData.totalDuration;

            // Update store timeline state for the clicked segment
            this._updateStoreTimelineState(currentTime, segment);
        }

        // Navigate to position with direction detection
        const { currentTreeIndex } = useAppStore.getState();
        const direction = targetTreeIndex > currentTreeIndex ? 'forward' : 'backward';
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
    _updateStoreTimelineState(time, fromSegment, toSegment = null, segmentProgress = 0, currentTreeIndex = null) {
        const progress = time / this.timelineData.totalDuration;

        // Find which segment we're primarily in
        const primarySegment = toSegment || fromSegment;
        const segmentIndex = this.segments.findIndex(seg => seg === primarySegment);

        if (segmentIndex === -1) return;

        // Calculate tree position within segment
        let treeInSegmentValue = 1;
        let treesInSegmentValue = 1;

        if (primarySegment.hasInterpolation && primarySegment.interpolationData?.length > 1) {
            treesInSegmentValue = primarySegment.interpolationData.length;

            // If we have currentTreeIndex, use precise calculation
            if (currentTreeIndex !== null) {
                treeInSegmentValue = this._calculateTreeInSegment(primarySegment, currentTreeIndex);
            } else {
                // Use segment progress to determine position within segment
                treeInSegmentValue = Math.max(1, Math.ceil(segmentProgress * treesInSegmentValue));
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

        // Also update segment progress for interpolation
        useAppStore.getState().setSegmentProgress(segmentProgress);
    }

    /**
     * Find which segment contains a given tree index and position within segment
     * @private
     * @param {number} treeIndex - Tree index to find
     * @returns {Object} {segmentIndex, timeInSegment}
     */
    _findSegmentForTreeIndex(treeIndex) {
        for (let i = 0; i < this.segments.length; i++) {
            const segment = this.segments[i];

            if (segment.hasInterpolation && segment.interpolationData?.length > 1) {
                // Check if tree index is within this interpolated segment
                const interpolationData = segment.interpolationData;
                for (let j = 0; j < interpolationData.length; j++) {
                    if (interpolationData[j].originalIndex === treeIndex) {
                        // Found the tree in this segment
                        const timeInSegment = j * TIMELINE_CONSTANTS.UNIT_DURATION_MS;
                        return { segmentIndex: i, timeInSegment };
                    }
                }
            } else {
                // Single tree segment - check if this is the tree we're looking for
                if (segment.interpolationData?.[0]?.originalIndex === treeIndex) {
                    return { segmentIndex: i, timeInSegment: 0 };
                }
            }
        }

        // Tree index not found in any segment
        console.warn('[MovieTimelineManager] Tree index', treeIndex, 'not found in any segment');
        return { segmentIndex: -1, timeInSegment: 0 };
    }

    /**
     * Setup UI controls using vis-timeline's native capabilities
     * @private
     */
    _setupUIControls() {
        // Leverage vis-timeline's built-in zoom/pan methods - simplified
        this.ui.setupButtonHandlers({
            zoomIn: () => this.timeline?.zoomIn(TIMELINE_CONSTANTS.ZOOM_PERCENTAGE_UI),
            zoomOut: () => this.timeline?.zoomOut(TIMELINE_CONSTANTS.ZOOM_PERCENTAGE_UI),
            fitToWindow: () => this.timeline?.fit(),
            scrollToStart: () => this.timeline?.moveTo(0),
            scrollToEnd: () => this.timeline?.moveTo(this.timelineData.totalDuration)
        });

        // Note: vis-timeline also supports keyboard navigation automatically
        // when zoomKey: 'ctrlKey' is set in options
        // Ctrl+scroll = zoom, arrow keys = pan (if keyboard: true was set)
    }

    /**
     * Update current position (called by external systems)
     */
    updateCurrentPosition() {
        const { movieData, currentTreeIndex, segmentProgress } = useAppStore.getState();
        const metadata = movieData.tree_metadata?.[currentTreeIndex];

        // Find which segment contains the current tree index and calculate proper time
        const { segmentIndex, timeInSegment } = this._findSegmentForTreeIndex(currentTreeIndex);

        // Validate segment
        const segment = this._validateSegment(segmentIndex);
        if (!segment) {
            console.warn('[MovieTimelineManager] Could not find segment for tree index:', currentTreeIndex);
            return;
        }

        // Calculate time using helper method
        let currentTime = this._calculateTimeForSegment(segmentIndex, timeInSegment);

        // Integrate segmentProgress for interpolated position
        if (segment.hasInterpolation && segment.interpolationData?.length > 1) {
            const segmentLength = segment.interpolationData.length * TIMELINE_CONSTANTS.UNIT_DURATION_MS;
            const interpolatedTimeInSegment = segmentProgress * segmentLength;
            currentTime = this._calculateTimeForSegment(segmentIndex, interpolatedTimeInSegment);
        }

        const progress = currentTime / this.timelineData.totalDuration;

        // Update scrubber position unless user is manually scrubbing
        // Allow scrubber updates during playback mode
        if (!this.isScrubbing || this.isTimelinePlaying) {
            this.lastTimelineProgress = progress;

            // Update timeline scrubber
            this.timeline?.setCustomTime(currentTime, 'scrubber');

            // Highlight current segment
            this.timeline?.setSelection([segmentIndex + 1]);
        }

        // Update store with current timeline state - this handles all store updates
        this._updateStoreTimelineState(currentTime, segment, null, segmentProgress, currentTreeIndex);

        // Get updated values from store for UI display
        const storeState = useAppStore.getState();
        const totalTrees = movieData.tree_metadata?.length || 0;

        // Update UI with comprehensive position information from store
        this.ui.updatePosition(
            storeState.currentSegmentIndex + 1, // 1-based for UI
            storeState.totalSegments,
            storeState.timelineProgress,
            currentTreeIndex + 1,
            totalTrees,
            storeState.treeInSegment,
            storeState.treesInSegment
        );
        this.ui.updateInterpolationStatus(metadata?.phase);
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

        // Destroy vis-timeline
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
