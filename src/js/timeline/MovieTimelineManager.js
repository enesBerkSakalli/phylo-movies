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
import { useAppStore } from '../core/store.js';

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

        // Process timeline data using existing resolver
        this.segments = TimelineDataProcessor.createSegments(movieData, transitionIndexResolver);
        this.timelineData = TimelineDataProcessor.createTimelineData(this.segments);

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

        // Initialize current position
        requestAnimationFrame(() => {
            this.updateCurrentPosition();
        });
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
     * Handle scrubbing interaction with performance throttling
     * @private
     * @param {number} time - Current time in milliseconds
     */
    _handleScrubbing(time) {
        if (!this.isScrubbing) {
            this._startScrubbing();
        }

        // Throttle high-frequency scrubbing events for performance
        const now = performance.now();
        if (now - this.lastScrubTime < this.SCRUB_THROTTLE_MS) {
            // Cancel any pending scrub update
            if (this.scrubRequestId) {
                cancelAnimationFrame(this.scrubRequestId);
            }

            // Schedule throttled update
            this.scrubRequestId = requestAnimationFrame(() => {
                this._performScrubUpdate(time);
            });
            return;
        }

        this._performScrubUpdate(time);
    }

    /**
     * Perform the actual scrub update with optimizations
     * @private
     * @param {number} time - Current time in milliseconds
     */
    _performScrubUpdate(time) {
        this.lastScrubTime = performance.now();

        const progress = time / this.timelineData.totalDuration;
        const newProgress = Math.max(0, Math.min(progress, 1));

        // CRITICAL FIX: Add navigation direction detection for timeline scrubbing
        // This unifies scrubbing behavior with button navigation direction detection
        const previousProgress = this.lastTimelineProgress || 0;
        let scrubDirection = 'forward';

        if (newProgress < previousProgress) {
            scrubDirection = 'backward';
        } else if (newProgress > previousProgress) {
            scrubDirection = 'forward';
        } else {
            scrubDirection = 'none'; // No movement
        }

        // Update navigation direction in GUI to maintain consistency with button navigation
        const { gui } = useAppStore.getState();
        if (gui && typeof gui.setNavigationDirection === 'function' && scrubDirection !== 'none') {
            gui.setNavigationDirection(scrubDirection);

            // Also update tree controller direction synchronously
            const { treeController } = useAppStore.getState();
            if (treeController && typeof treeController.setNavigationDirection === 'function') {
                treeController.setNavigationDirection(scrubDirection);
            }
        }

        this.lastTimelineProgress = newProgress;

        // Get segments for interpolation (cached lookup optimization)
        const interpolationData = this._getCachedInterpolationData(time);

        if (interpolationData) {
            const { fromSegment, toSegment, segmentProgress } = interpolationData;

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
            const progress = segmentIndex / Math.max(1, this.segments.length - 1);

            this.lastTimelineProgress = progress;

            // Navigate to position
            useAppStore.getState().goToPosition(segment.index);
        }
    }

    /**
     * Start scrubbing mode
     * @private
     */
    _startScrubbing() {
        this.isScrubbing = true;
        useAppStore.getState().setSubscriptionPaused(true);
    }

    /**
     * End scrubbing mode with cleanup
     * @private
     */
    _endScrubbing() {
        if (!this.isScrubbing) return;

        this.isScrubbing = false;
        useAppStore.getState().setSubscriptionPaused(false);

        // Clean up performance optimization timers
        if (this.scrubRequestId) {
            cancelAnimationFrame(this.scrubRequestId);
            this.scrubRequestId = null;
        }

        if (this._storeUpdateTimeout) {
            clearTimeout(this._storeUpdateTimeout);
            this._storeUpdateTimeout = null;
        }

        // Clear interpolation cache
        this._lastInterpolationCache = null;

        // Navigate to final position
        const finalSegmentIndex = Math.round(this.lastTimelineProgress * (this.segments.length - 1));
        const finalSegment = this.segments[finalSegmentIndex];

        if (finalSegment) {
            const { goToPosition, clearPositionCache, clearLayoutCache } = useAppStore.getState();

            // CRITICAL FIX: Clear caches if end state differs from expected
            // This prevents stale cached data from causing visual inconsistencies
            const currentTreeIndex = useAppStore.getState().currentTreeIndex;
            if (currentTreeIndex !== finalSegment.index) {
                // ...existing code...
                clearPositionCache();
                clearLayoutCache();
            }

            goToPosition(finalSegment.index);
        }
    }

    /**
     * Update store position during scrubbing
     * @private
     * @param {number} currentTime - Current time in ms
     */
    _updateStorePosition(currentTime) {
        const targetSegmentIndex = TimelineDataProcessor.getTargetSegmentIndex(this.segments, currentTime);
        const targetSegment = this.segments[targetSegmentIndex];

        if (targetSegment) {
            const { currentTreeIndex } = useAppStore.getState();
            if (currentTreeIndex !== targetSegment.index) {
                useAppStore.getState().goToPosition(targetSegment.index);
            }
        }
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

        const currentSegmentIndex = this.segments.findIndex(segment => segment.index === currentTreeIndex);
        if (currentSegmentIndex === -1) return;

        const progress = currentSegmentIndex / Math.max(1, this.segments.length - 1);

        if (!this.isScrubbing) {
            this.lastTimelineProgress = progress;

            // Update timeline scrubber
            const currentTime = progress * this.timelineData.totalDuration;
            this.timeline?.setCustomTime(currentTime, 'scrubber');

            // Highlight current segment
            this.timeline?.setSelection([currentSegmentIndex + 1]);
        }

        // Update UI
        this.ui.updatePosition(currentTreeIndex, this.segments.length, progress);
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

        console.log(`[MovieTimelineManager] Switched to ${mode} mode`);
    }

    /**
     * Get current timeline configuration info
     * @returns {Object} Timeline configuration details
     */
    getConfigInfo() {
        return {
            totalDuration: this.timelineData?.totalDuration || 0,
            segmentCount: this.segments?.length || 0,
            constants: TIMELINE_CONSTANTS,
            currentWindow: this.timeline?.getWindow()
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
