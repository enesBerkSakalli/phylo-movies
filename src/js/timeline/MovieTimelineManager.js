/**
 * Refactored MovieTimelineManager - Modular timeline management using vis-timeline
 * Leverages existing TransitionIndexResolver and removes redundant implementations
 */

import { Timeline, DataSet } from 'vis-timeline/standalone';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import '../../css/movie-timeline.css';

import { TIMELINE_CONSTANTS, createTimelineOptions } from './constants.js';
import { TimelineDataProcessor } from './TimelineDataProcessor.js';
import { TimelineInterpolator } from './TimelineInterpolator.js';
import { TimelineUI } from './TimelineUI.js';
import { createScrubberIntegration, isCustomScrubberSupported } from './ScrubberIntegration.js';
import { useAppStore } from '../core/store.js';
import { clamp } from '../utils/MathUtils.js';

export class MovieTimelineManager {
    constructor(movieData, transitionIndexResolver) {
        this.movieData = movieData;
        this.transitionResolver = transitionIndexResolver;
        this.isTimelinePlaying = false;
        this.isScrubbing = false;
        this.lastTimelineProgress = 0;

        // Performance optimization properties
        this.lastScrubTime = 0;
        this.scrubRequestId = null;
        this.SCRUB_THROTTLE_MS = 16; // ~60fps limit

        // Create modular components
        this.ui = new TimelineUI();
        this.interpolator = new TimelineInterpolator(
            () => useAppStore.getState().treeController,
            () => this.transitionResolver
        );

        // Initialize custom scrubber integration
        this.scrubberIntegration = null;

        // Process timeline data using existing resolver
        this.segments = TimelineDataProcessor.createSegments(movieData, transitionIndexResolver);
        this.timelineData = TimelineDataProcessor.createTimelineData(this.segments);

        // Debug logging
        console.log('[MovieTimelineManager] Created segments:', this.segments.length);
        console.log('[MovieTimelineManager] Movie data:', !!movieData, movieData?.tree_metadata?.length);
        console.log('[MovieTimelineManager] Transition resolver:', !!transitionIndexResolver);

        this._initialize();
    }

    /**
     * Initialize the timeline
     * @private
     */
    _initialize() {
        if (!this.segments.length) {
            console.warn('[MovieTimelineManager] No timeline segments available');
            return;
        }

        // Validate UI elements
        const missingElements = this.ui.validateElements();
        if (missingElements.length > 0) {
            console.warn('[MovieTimelineManager] Missing UI elements:', missingElements);
        }

        // Update UI metrics
        this.ui.updateMetrics(this.segments.length);

        // Create vis-timeline
        this._createTimeline();

        // Setup event handlers
        this._setupEvents();

        // Setup UI controls
        this._setupUIControls();

        // Initialize custom scrubber integration
        this._initializeScrubberIntegration();

        // Initialize current position
        requestAnimationFrame(() => {
            this.updateCurrentPosition();
        });
    }

    /**
     * Initialize the custom scrubber integration system
     * @private
     */
    _initializeScrubberIntegration() {
        try {
            if (isCustomScrubberSupported()) {
                this.scrubberIntegration = createScrubberIntegration(this);

                // Configure scrubber integration
                this.scrubberIntegration.configure({
                    useCustomScrubber: true,
                    fallbackToOriginal: true,
                    debugMode: true // Enable debug logging
                });

                console.log('[MovieTimelineManager] Custom scrubber integration initialized');
            } else {
                console.log('[MovieTimelineManager] Custom scrubber not supported, using fallback');
            }
        } catch (error) {
            console.error('[MovieTimelineManager] Failed to initialize scrubber integration:', error);
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
        const options = createTimelineOptions(this.timelineData, 'default');

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

        // Handle timeline range changes
        this.timeline.on('rangechange', () => {
            // Let vis-timeline handle zoom/pan - no custom logic needed
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
                this._endScrubbing();
            }
        });
    }

    /**
     * Handle scrubbing interaction with custom scrubber integration
     * @private
     * @param {number} time - Current time in milliseconds
     */
    async _handleScrubbing(time) {
        if (!this.isScrubbing) {
            await this._startScrubbing(time);
        } else {
            await this._updateScrubbing(time);
        }
    }

    /**
     * Start scrubbing mode using integrated scrubber system
     * @private
     * @param {number} time - Initial time in milliseconds
     */
    async _startScrubbing(time) {
        this.isScrubbing = true;

        // Try to use custom scrubber integration first
        if (this.scrubberIntegration) {
            const success = await this.scrubberIntegration.handleScrubStart(time);
            if (success) {
                console.log('[MovieTimelineManager] Using custom scrubber for scrubbing');
                return;
            }
        }

        // Fallback to original implementation
        console.log('[MovieTimelineManager] Using original scrubber implementation');
        this._startScrubbing_Original();
        this._performScrubUpdate(time);
    }

    /**
     * Update scrubbing position using integrated scrubber system
     * @private
     * @param {number} time - Current time in milliseconds
     */
    async _updateScrubbing(time) {
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

        // Try to use custom scrubber integration
        if (this.scrubberIntegration) {
            const success = await this.scrubberIntegration.handleScrubUpdate(time);
            if (success) {
                this.lastScrubTime = now;
                return;
            }
        }

        // Fallback to original implementation
        this._performScrubUpdate(time);
    }

    /**
     * End scrubbing mode using integrated scrubber system
     * @private
     */
    async _endScrubbing() {
        if (!this.isScrubbing) return;

        console.log('[MovieTimelineManager] Ending scrubbing mode');

        // Clean up performance optimization timers
        if (this.scrubRequestId) {
            cancelAnimationFrame(this.scrubRequestId);
            this.scrubRequestId = null;
        }

        // Try to use custom scrubber integration
        if (this.scrubberIntegration) {
            const success = await this.scrubberIntegration.handleScrubEnd(this._getCurrentTimelineTime());
            if (success) {
                this.isScrubbing = false;
                return;
            }
        }

        // Fallback to original implementation
        this._endScrubbing_Original();
    }

    /**
     * Get current timeline time for scrubber integration
     * @private
     * @returns {number} Current time in milliseconds
     */
    _getCurrentTimelineTime() {
        return this.lastTimelineProgress * this.timelineData.totalDuration;
    }

    /**
     * Original scrubbing start implementation (fallback)
     * @private
     */
    _startScrubbing_Original() {
        useAppStore.getState().setSubscriptionPaused(true);
    }

    /**
     * Original scrubbing end implementation (fallback)
     * @private
     */
    _endScrubbing_Original() {
        this.isScrubbing = false;
        useAppStore.getState().setSubscriptionPaused(false);

        // Clear interpolation cache
        this._lastInterpolationCache = null;

        // Navigate to final position - find the tree index at the final timeline position
        const finalTime = this.lastTimelineProgress * this.timelineData.totalDuration;
        const finalTargetIndex = TimelineDataProcessor.getTargetSegmentIndex(this.segments, finalTime);

        if (finalTargetIndex !== -1) {
            const { goToPosition, clearPositionCache, clearLayoutCache } = useAppStore.getState();

            // CRITICAL FIX: Clear caches if end state differs from expected
            // This prevents stale cached data from causing visual inconsistencies
            const currentTreeIndex = useAppStore.getState().currentTreeIndex;
            if (currentTreeIndex !== finalTargetIndex) {
                clearPositionCache();
                clearLayoutCache();
            }

            // Update final timeline state before navigation
            const interpolationData = this._getCachedInterpolationData(finalTime);
            if (interpolationData) {
                const { fromSegment, toSegment, segmentProgress } = interpolationData;
                this._updateStoreTimelineState(finalTime, fromSegment, toSegment, segmentProgress);
            }

            goToPosition(finalTargetIndex);
        }
    }

    /**
     * Perform the actual scrub update with optimizations (original implementation)
     * @private
     * @param {number} time - Current time in milliseconds
     */
    _performScrubUpdate(time) {
        this.lastScrubTime = performance.now();

        const progress = time / this.timelineData.totalDuration;
        const newProgress = clamp(progress, 0, 1);

        // CRITICAL FIX: Add navigation direction detection for timeline scrubbing
        // Use store-based direction detection to prevent circular dependencies
        const previousProgress = this.lastTimelineProgress || 0;
        let scrubDirection = 'forward';

        if (newProgress < previousProgress) {
            scrubDirection = 'backward';
        } else if (newProgress > previousProgress) {
            scrubDirection = 'forward';
        } else {
            scrubDirection = 'none'; // No movement
        }

        // Update navigation direction in store (single source of truth)
        if (scrubDirection !== 'none') {
            useAppStore.getState().setNavigationDirection(scrubDirection);
        }

        this.lastTimelineProgress = newProgress;

        // Get segments for interpolation (cached lookup optimization)
        const interpolationData = this._getCachedInterpolationData(time);

        if (interpolationData) {
            const { fromSegment, toSegment, segmentProgress } = interpolationData;

            // Update store timeline state during scrubbing
            this._updateStoreTimelineState(time, fromSegment, toSegment, segmentProgress);

            // Perform interpolation
            this.interpolator.interpolate(fromSegment, toSegment, segmentProgress);

            // Update UI (batch DOM updates)
            this.ui.updateInterpolationPosition(fromSegment, toSegment, segmentProgress);

            // Update store position for chart synchronization (debounced)
            this._updateStorePositionDebounced(time);
        }
    }

    /**
     * Cached interpolation data lookup for performance
     * @private
     * @param {number} time - Current time in milliseconds
     * @returns {Object|null} Interpolation data
     */
    _getCachedInterpolationData(time) {
        // Cache the last lookup to avoid repeated expensive calculations
        if (!this._lastInterpolationCache ||
            Math.abs(this._lastInterpolationCache.time - time) > 100) { // Cache for 100ms

            this._lastInterpolationCache = {
                time: time,
                data: TimelineDataProcessor.getSegmentsForInterpolation(this.segments, time)
            };
        }

        return this._lastInterpolationCache.data;
    }

    /**
     * Debounced store position update to reduce excessive state changes
     * @private
     * @param {number} time - Current time in milliseconds
     */
    _updateStorePositionDebounced(time) {
        // Clear existing timeout
        if (this._storeUpdateTimeout) {
            clearTimeout(this._storeUpdateTimeout);
        }

        // Debounce store updates to every 50ms during scrubbing
        this._storeUpdateTimeout = setTimeout(() => {
            this._updateStorePosition(time);
        }, 50);
    }

    /**
     * Handle segment click navigation
     * @private
     * @param {number} segmentIndex - Clicked segment index
     */
    _handleSegmentClick(segmentIndex) {
        if (segmentIndex >= 0 && segmentIndex < this.segments.length) {
            const segment = this.segments[segmentIndex];

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
                const segmentDurations = this.segments.map(seg =>
                    seg.hasInterpolation && seg.interpolationData?.length > 1
                        ? seg.interpolationData.length * TIMELINE_CONSTANTS.UNIT_DURATION_MS
                        : TIMELINE_CONSTANTS.UNIT_DURATION_MS
                );

                let currentTime = 0;
                for (let i = 0; i < foundSegmentIndex; i++) {
                    currentTime += segmentDurations[i];
                }
                currentTime += timeInSegment;

                this.lastTimelineProgress = currentTime / this.timelineData.totalDuration;

                // Update store timeline state for the clicked segment
                this._updateStoreTimelineState(currentTime, segment);
            }

            // Navigate to position with direction detection
            const { currentTreeIndex } = useAppStore.getState();
            const direction = targetTreeIndex > currentTreeIndex ? 'forward' : 'backward';
            useAppStore.getState().goToPosition(targetTreeIndex, direction);
        }
    }

    /**
     * Update store position during scrubbing
     * @private
     * @param {number} currentTime - Current time in ms
     */
    _updateStorePosition(currentTime) {
        const targetTreeIndex = TimelineDataProcessor.getTargetSegmentIndex(this.segments, currentTime);

        if (targetTreeIndex !== -1) {
            const { currentTreeIndex } = useAppStore.getState();
            if (currentTreeIndex !== targetTreeIndex) {
                useAppStore.getState().goToPosition(targetTreeIndex);
            }
        }
    }

    /**
     * Updates store timeline state consistently across all operations
     * @private
     * @param {number} time - Current time in milliseconds
     * @param {Object} fromSegment - Current segment (or source segment during interpolation)
     * @param {Object} [toSegment] - Target segment (if interpolating)
     * @param {number} [segmentProgress] - Progress within segment (0-1)
     */
    _updateStoreTimelineState(time, fromSegment, toSegment = null, segmentProgress = 0) {
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
            // Use segment progress to determine position within segment
            treeInSegmentValue = Math.max(1, Math.ceil(segmentProgress * treesInSegmentValue));
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
                // Single tree segment
                if (segment.interpolationData?.[0]?.originalIndex === treeIndex) {
                    return { segmentIndex: i, timeInSegment: 0 };
                }
            }
        }

        return { segmentIndex: -1, timeInSegment: 0 };
    }

    /**
     * Setup UI controls using vis-timeline's native capabilities
     * @private
     */
    _setupUIControls() {
        // Use vis-timeline's built-in zoom/pan methods with constants
        this.ui.setupButtonHandlers({
            zoomIn: () => this.timeline?.zoomIn(TIMELINE_CONSTANTS.ZOOM_PERCENTAGE_UI),
            zoomOut: () => this.timeline?.zoomOut(TIMELINE_CONSTANTS.ZOOM_PERCENTAGE_UI),
            fitToWindow: () => this.timeline?.fit(),
            scrollToStart: () => {
                const window = this.timeline?.getWindow();
                if (window) {
                    const windowSize = window.end - window.start;
                    this.timeline?.setWindow(0, windowSize);
                }
            },
            scrollToEnd: () => {
                const window = this.timeline?.getWindow();
                if (window) {
                    const windowSize = window.end - window.start;
                    this.timeline?.setWindow(
                        this.timelineData.totalDuration - windowSize,
                        this.timelineData.totalDuration
                    );
                }
            }
        });
    }

    /**
     * Update current position (called by external systems)
     */
    updateCurrentPosition() {
        const { movieData, currentTreeIndex } = useAppStore.getState();
        const metadata = movieData.tree_metadata?.[currentTreeIndex];

        if (!metadata || !this.segments.length) return;

        // Find which segment contains the current tree index and calculate proper time
        const { segmentIndex, timeInSegment } = this._findSegmentForTreeIndex(currentTreeIndex);

        if (segmentIndex === -1) return;

        // Calculate actual time based on segment durations
        const segmentDurations = this.segments.map(segment =>
            segment.hasInterpolation && segment.interpolationData?.length > 1
                ? segment.interpolationData.length * TIMELINE_CONSTANTS.UNIT_DURATION_MS
                : TIMELINE_CONSTANTS.UNIT_DURATION_MS
        );

        let currentTime = 0;
        for (let i = 0; i < segmentIndex; i++) {
            currentTime += segmentDurations[i];
        }
        currentTime += timeInSegment;

        const progress = currentTime / this.timelineData.totalDuration;

        if (!this.isScrubbing) {
            this.lastTimelineProgress = progress;

            // Update timeline scrubber
            this.timeline?.setCustomTime(currentTime, 'scrubber');

            // Highlight current segment
            this.timeline?.setSelection([segmentIndex + 1]);
        }

        // Update store with timeline-specific state using existing variables
        const segment = this.segments[segmentIndex];
        let treeInSegmentValue = 1;
        if (segment.hasInterpolation && segment.interpolationData?.length > 1) {
            // Find which tree in the interpolation data matches currentTreeIndex
            const foundIndex = segment.interpolationData.findIndex(item =>
                item.originalIndex === currentTreeIndex);
            if (foundIndex !== -1) {
                treeInSegmentValue = foundIndex + 1;
            }
        }

        // Update store with current timeline state using helper method
        this._updateStoreTimelineState(currentTime, segment, null, 0);

        // Override treeInSegment with precise calculation
        useAppStore.getState().updateTimelineState({
            currentSegmentIndex: segmentIndex,
            totalSegments: this.segments.length,
            treeInSegment: treeInSegmentValue,
            treesInSegment: segment.interpolationData?.length || 1,
            timelineProgress: progress
        });

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
        this.ui.updateInterpolationStatus(metadata.phase);
    }

    /**
     * Switch timeline configuration mode
     * @param {string} mode - 'default', 'minimal', 'touch', or 'performance'
     */
    switchMode(mode) {
        if (!this.timeline) return;

        const newOptions = createTimelineOptions(this.timelineData, mode);
        this.timeline.setOptions(newOptions);
    }

    /**
     * Get current timeline configuration info
     * @returns {Object} Timeline configuration details
     */
    getConfigInfo() {
        const totalTrees = this.movieData.tree_metadata?.length || 0;
        const totalInterpolationSteps = this.segments?.reduce((total, seg) =>
            total + (seg.hasInterpolation && seg.interpolationData?.length > 1
                ? seg.interpolationData.length : 1), 0) || 0;

        return {
            totalDuration: this.timelineData?.totalDuration || 0,
            segmentCount: this.segments?.length || 0,
            totalTrees: totalTrees,
            totalInterpolationSteps: totalInterpolationSteps,
            constants: TIMELINE_CONSTANTS,
            currentWindow: this.timeline?.getWindow(),
            structure: {
                groupedSegments: this.segments?.filter(seg => seg.hasInterpolation)?.length || 0,
                singleSegments: this.segments?.filter(seg => !seg.hasInterpolation)?.length || 0
            }
        };
    }

    /**
     * Clean up and destroy the timeline
     */
    destroy() {
        // Clean up performance optimization timers
        if (this.scrubRequestId) {
            cancelAnimationFrame(this.scrubRequestId);
        }

        if (this._storeUpdateTimeout) {
            clearTimeout(this._storeUpdateTimeout);
        }

        // Destroy vis-timeline
        this.timeline?.destroy();

        // Clear UI
        this.ui?.clear();

        // Clear references
        this.timeline = null;
        this.segments = null;
        this.timelineData = null;
        this.interpolator = null;
        this.ui = null;
        this._lastInterpolationCache = null;
        this.scrubRequestId = null;
        this._storeUpdateTimeout = null;
    }
}
