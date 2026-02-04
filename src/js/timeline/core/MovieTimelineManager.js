import { TIMELINE_CONSTANTS } from '../constants.js';
import { TimelineDataProcessor } from '../data/TimelineDataProcessor.js';
import { ScrubberAPI } from './ScrubberAPI.js';
import { TimelineMathUtils } from '../math/TimelineMathUtils.js';
import { useAppStore } from '../../core/store.js';
import { DeckTimelineRenderer } from '../renderers/DeckTimelineRenderer.js';

// ============================================================================
// MOVIE TIMELINE MANAGER
// ============================================================================

export class MovieTimelineManager {
    constructor(movieData, transitionIndexResolver) {
        this.movieData = movieData;
        this.transitionResolver = transitionIndexResolver;
        this.isScrubbing = false;
        this.isDestroyed = false;
        this.scrubberAPI = null;
        this.timeline = null;
        this.segments = TimelineDataProcessor.createSegments(movieData);
        this.timelineData = TimelineDataProcessor.createTimelineData(this.segments);

        // Scrubbing state
        this.lastScrubTime = 0;
        this.scrubRequestId = null;
        this._pendingScrubTimeMs = null;
        this._lastScrubEndTime = 0;

        this._initialize();
    }

    // ==========================================================================
    // INITIALIZATION
    // ==========================================================================

    _initialize() {
        this._createTimeline();
        if (this.timeline) {
            this._setupEvents();
        }

        this._initializeScrubberAPI();

        this.unsubscribeFromStore = useAppStore.subscribe((state, prevState) => {
            if (state.currentTreeIndex !== prevState.currentTreeIndex ||
                state.animationProgress !== prevState.animationProgress) {
                requestAnimationFrame(() => this.updateCurrentPosition());
            }

            if (state.treeControllers !== prevState.treeControllers) {
                const controller = this._selectScrubberController();
                if (controller && controller !== this.scrubberAPI?.treeController) {
                    this._initializeScrubberAPI(controller);
                }
            }
        });

        requestAnimationFrame(() => this.updateCurrentPosition());
    }

    _initializeScrubberAPI(controllerOverride = null) {
        const controller = controllerOverride || this._selectScrubberController();
        if (!controller) return;

        this.scrubberAPI = new ScrubberAPI(controller, this.transitionResolver, this);
    }

    _selectScrubberController() {
        const { treeControllers } = useAppStore.getState();
        return treeControllers?.[0] || null;
    }

    // ==========================================================================
    // TIMELINE CREATION
    // ==========================================================================

    /**
     * Public API to ensure the timeline container is correctly initialized
     * and attached to the DOM. Usually called by React components when they mount.
     */
    ensureTimelineInitialized() {
        if (this.isDestroyed) return;

        // Check if timeline exists and is attached to the DOM
        const isTimelineAttached = this.timeline &&
                                   this.timeline.container &&
                                   document.body.contains(this.timeline.container);

        if (!isTimelineAttached) {
            this._createTimeline();
            if (this.timeline) {
                this._setupEvents();
            }
        }
    }

    _createTimeline() {
        if (this.isDestroyed) return;

        const timelineParent = document.querySelector('.interpolation-timeline-container');
        if (!timelineParent) return;

        this.timeline?.destroy();

        const existing = timelineParent.querySelector('#timelineContainer');
        existing?.parentNode?.removeChild(existing);

        const container = document.createElement('div');
        container.id = 'timelineContainer';
        container.className = 'timeline-visual-layer';
        timelineParent.insertAdjacentElement('beforeend', container);

        // Safety check for renderer constructor
        if (!this.timelineData || typeof this.timelineData !== 'object') {
            console.error('[MovieTimelineManager] Cannot create timeline: invalid timelineData', this.timelineData);
            return;
        }

        if (this.timelineData.totalDuration <= 0) {
            console.warn('[MovieTimelineManager] Cannot create timeline: totalDuration is 0');
            return;
        }

        this.timeline = new DeckTimelineRenderer(this.timelineData, this.segments).init(container);
    }

    _setupEvents() {
        this.timeline.on('timechange', this._onTimeChange.bind(this));
        this.timeline.on('timechanged', this._onTimeChanged.bind(this));
        this.timeline.on('select', this._onTimelineClick.bind(this));
    }

    // ==========================================================================
    // EVENT HANDLERS
    // ==========================================================================

    _onTimeChange(properties) {
        if (properties.id === 'scrubber') {
            this._handleScrubbing(properties.time);
        }
    }

    _onTimeChanged(properties) {
        if (properties.id === 'scrubber') {
            this._endScrubbing(properties.time);
        }
    }

    _onTimelineClick(properties) {
        console.log('[MovieTimelineManager] Timeline click received:', properties);
        if (properties.id) {
            this._handleSegmentClick(properties.id - TIMELINE_CONSTANTS.INDEX_OFFSET_UI);
        }
    }

    // ==========================================================================
    // SCRUBBING
    // ==========================================================================

    async _handleScrubbing(timeMs) {
        if (!this.isScrubbing) {
            await this._startScrubbing(timeMs);
        } else {
            await this._updateScrubbing(timeMs);
        }
    }

    async _startScrubbing(timeMs) {
        this._stopPlayback();
        this.isScrubbing = true;
        this.timeline?.setScrubbing(true);

        if (this.scrubberAPI) {
            await this.scrubberAPI.startScrubbing(this._timeToProgress(timeMs));
        }
    }

    async _updateScrubbing(timeMs) {
        if (!this.scrubberAPI || !this.isScrubbing) return;

        this._pendingScrubTimeMs = timeMs;
        const now = performance.now();

        if (now - this.lastScrubTime < TIMELINE_CONSTANTS.SCRUB_THROTTLE_MS) {
            if (this.scrubRequestId) return;

            this.scrubRequestId = requestAnimationFrame(async () => {
                this.scrubRequestId = null;
                if (!this.isScrubbing) return;

                const latestTimeMs = this._pendingScrubTimeMs;
                this._pendingScrubTimeMs = null;

                if (latestTimeMs != null) {
                    await this.scrubberAPI.updatePosition(this._timeToProgress(latestTimeMs));
                    this.lastScrubTime = performance.now();
                }
            });
            return;
        }

        this._pendingScrubTimeMs = null;
        await this.scrubberAPI.updatePosition(this._timeToProgress(timeMs));
        this.lastScrubTime = now;
    }

    async _endScrubbing(finalTimeMs) {
        if (!this.isScrubbing) return;

        const finalProgress = this._timeToProgress(finalTimeMs);
        let lastState = this.scrubberAPI
            ? await this.scrubberAPI.endScrubbing(finalProgress)
            : null;

        this.isScrubbing = false;
        this._lastScrubEndTime = performance.now();
        this.timeline?.setScrubbing(false);

        if (this.scrubRequestId) {
            cancelAnimationFrame(this.scrubRequestId);
            this.scrubRequestId = null;
        }

        if (lastState?.interpolationData) {
            const { fromIndex, toIndex, timeFactor } = lastState.interpolationData;
            const primaryTreeIndex = timeFactor < 0.5 ? fromIndex : toIndex;
            useAppStore.getState().setTimelineProgress(finalProgress, primaryTreeIndex, timeFactor);
            return;
        }

        const currentTime = TimelineMathUtils.progressToTime(finalProgress, this.timelineData.totalDuration);
        const target = TimelineMathUtils.getTargetTreeForTime(
            this.segments, currentTime, this.timelineData.segmentDurations,
            'nearest', this.timelineData.cumulativeDurations
        );

        useAppStore.getState().setTimelineProgress(finalProgress, target?.treeIndex, target?.segmentProgress);
    }

    // ==========================================================================
    // POSITION UPDATES
    // ==========================================================================

    updateCurrentPosition() {
        if (this.isScrubbing || !this.timelineData) return;

        const { animationProgress, timelineProgress, playing } = useAppStore.getState();
        const SCRUB_GRACE_PERIOD_MS = 150;
        const withinGracePeriod = this._lastScrubEndTime > 0 &&
            (performance.now() - this._lastScrubEndTime) < SCRUB_GRACE_PERIOD_MS;

        const progress = (withinGracePeriod || !playing) && timelineProgress != null
            ? timelineProgress
            : animationProgress;

        const currentTime = TimelineMathUtils.progressToTime(progress, this.timelineData.totalDuration);
        this.timeline?.setCustomTime(currentTime);

        const { treeIndex, segmentIndex, segmentProgress } = TimelineMathUtils.getTargetTreeForTime(
            this.segments, currentTime, this.timelineData.segmentDurations,
            'nearest', this.timelineData.cumulativeDurations
        );

        const segment = this._validateSegment(segmentIndex);
        if (!segment) return;

        this.timeline?.setSelection([segmentIndex + TIMELINE_CONSTANTS.INDEX_OFFSET_UI]);

        const preservingScrubPosition = (withinGracePeriod || !playing) && timelineProgress != null;
        if (!preservingScrubPosition) {
            this._updateStoreTimelineState(currentTime, segment, treeIndex);
            // setSegmentProgress is removed as it is redundant
        }
    }

    _updateStoreTimelineState(time, segment, currentTreeIndex) {
        const totalProgress = this._timeToProgress(time);
        const segmentIndex = this.segments.indexOf(segment);
        if (segmentIndex === -1) return;

        let treeInSegment, treesInSegment;
        if (segment.hasInterpolation && segment.interpolationData?.length > 1) {
            treesInSegment = segment.interpolationData.length;
            treeInSegment = TimelineMathUtils.calculateTreePositionInSegment(segment, currentTreeIndex).treeInSegment;
        } else {
            treeInSegment = TIMELINE_CONSTANTS.DEFAULT_TREE_IN_SEGMENT;
            treesInSegment = TIMELINE_CONSTANTS.DEFAULT_TREES_IN_SEGMENT;
        }

        useAppStore.getState().updateTimelineState({
            currentSegmentIndex: segmentIndex,
            totalSegments: this.segments.length,
            treeInSegment,
            treesInSegment,
            timelineProgress: totalProgress
        });
    }

    // ==========================================================================
    // NAVIGATION
    // ==========================================================================

    _handleSegmentClick(segmentIndex) {
        const segment = this._validateSegment(segmentIndex);
        if (!segment) return;

        // If clicking an anchor (full tree), update clipboard
        if (segment.isFullTree) {
            const originalIndex = segment.interpolationData?.[0]?.originalIndex ?? segment.index;
            console.log('[MovieTimelineManager] Anchor clicked, setting clipboard to tree:', originalIndex);
            useAppStore.getState().setClipboardTreeIndex(originalIndex);
        }

        const targetTreeIndex = segment.interpolationData?.[0]?.originalIndex ?? segment.index;
        this._navigateToTree(targetTreeIndex);
        requestAnimationFrame(() => this.updateCurrentPosition());
    }

    _navigateToTree(targetTreeIndex) {
        const { currentTreeIndex, goToPosition } = useAppStore.getState();
        const direction = targetTreeIndex === currentTreeIndex ? 'jump'
            : (targetTreeIndex > currentTreeIndex ? 'forward' : 'backward');
        goToPosition(targetTreeIndex, direction);
    }

    // ==========================================================================
    // UTILITIES
    // ==========================================================================

    _validateSegment(segmentIndex) {
        if (segmentIndex < 0 || segmentIndex >= this.segments.length) return null;
        return this.segments[segmentIndex];
    }

    _timeToProgress(time) {
        return TimelineMathUtils.timeToProgress(time, this.timelineData.totalDuration);
    }

    _stopPlayback() {
        const store = useAppStore.getState();
        if (store.playing) store.stop();
    }

    // ==========================================================================
    // CLEANUP
    // ==========================================================================

    destroy() {
        this.isDestroyed = true;
        if (this.scrubRequestId) cancelAnimationFrame(this.scrubRequestId);
        this.unsubscribeFromStore?.();

        this.timeline?.destroy();
        this.scrubberAPI?.destroy();

        this.timeline = null;
        this.segments = null;
        this.timelineData = null;
        this.scrubberAPI = null;
        this.scrubRequestId = null;
    }
}
