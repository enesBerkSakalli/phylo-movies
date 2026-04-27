import { TIMELINE_CONSTANTS } from '../constants.js';
import { TimelineDataProcessor } from '../data/TimelineDataProcessor.js';
import { TimelineClock } from './TimelineClock.js';
import { ScrubberAPI } from './ScrubberAPI.js';
import { TimelineNavigationController } from './TimelineNavigationController.js';
import { TimelineScrubController } from './TimelineScrubController.js';
import { TimelineStateSynchronizer } from './TimelineStateSynchronizer.js';
import { useAppStore } from '../../state/phyloStore/store.js';
import { DeckTimelineRenderer } from '../renderers/DeckTimelineRenderer.js';

// ============================================================================
// MOVIE TIMELINE MANAGER
// ============================================================================

/**
 * Top-level lifecycle coordinator for the timeline subsystem.
 *
 * The manager composes the focused timeline controllers and owns:
 * - mount/unmount lifecycle
 * - renderer creation and event binding
 * - store subscription wiring
 */
export class MovieTimelineManager {
    constructor(movieData, transitionIndexResolver) {
        this.movieData = movieData;
        this.transitionResolver = transitionIndexResolver;
        this.isDestroyed = false;
        this.container = null;
        this.scrubberAPI = null;
        this.timeline = null;
        this.segments = TimelineDataProcessor.createSegments(movieData);
        this.timelineData = TimelineDataProcessor.createTimelineData(this.segments);
        this.timelineClock = new TimelineClock({
            segments: this.segments,
            timelineData: this.timelineData,
            movieData: this.movieData
        });
        this.stateSynchronizer = new TimelineStateSynchronizer(this.timelineData, this.segments, useAppStore);
        this.navigationController = new TimelineNavigationController({
            segments: this.segments,
            timelineData: this.timelineData,
            store: useAppStore,
            onTimelinePositionUpdated: () => this.updateCurrentPosition()
        });
        this.scrubController = new TimelineScrubController({
            timelineData: this.timelineData,
            segments: this.segments,
            store: useAppStore,
            getTimelineRenderer: () => this.timeline,
            getScrubberAPI: () => this.scrubberAPI,
            stopPlayback: () => this._stopPlayback()
        });

        this._initialize();
    }

    // ==========================================================================
    // INITIALIZATION
    // ==========================================================================

    _initialize() {
        this._initializeScrubberAPI();

        this.unsubscribeFromStore = useAppStore.subscribe((state, prevState) => {
            if (state.currentTreeIndex !== prevState.currentTreeIndex ||
                state.animationProgress !== prevState.animationProgress) {
                if (!this.scrubController?.isScrubbing) {
                    requestAnimationFrame(() => this.updateCurrentPosition());
                }
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

    mount(container) {
        if (this.isDestroyed || !container) return;

        const isSameContainer = this.container === container;
        const isTimelineAttached = this.timeline &&
            this.timeline.container &&
            container.contains(this.timeline.container);

        if (isSameContainer && isTimelineAttached) {
            this.stateSynchronizer.restoreMountedState(this.timeline, this.scrubController.lastScrubEndTime);
            return;
        }

        this.unmount();
        this.container = container;
        this._createTimeline();

        if (this.timeline) {
            this._setupEvents();
            this.stateSynchronizer.restoreMountedState(this.timeline, this.scrubController.lastScrubEndTime);
        }
    }

    unmount() {
        this.scrubController?.resetOnUnmount();
        this.timeline?.destroy();
        this.timeline = null;
        this.container = null;

        useAppStore.getState().setTooltipHovered(false);
        useAppStore.getState().setHoveredSegment(null, null);
    }

    _createTimeline() {
        if (this.isDestroyed || !this.container) return;

        // Safety check for renderer constructor
        if (!this.timelineData || typeof this.timelineData !== 'object') {
            console.error('[MovieTimelineManager] Cannot create timeline: invalid timelineData', this.timelineData);
            return;
        }

        if (this.timelineData.totalDuration <= 0) {
            console.warn('[MovieTimelineManager] Cannot create timeline: totalDuration is 0');
            return;
        }

        this.timeline = new DeckTimelineRenderer(this.timelineData, this.segments).init(this.container);
        this.timeline.bindScrubState({
            getIsScrubbing: () => this.scrubController?.isScrubbing ?? false
        });
    }

    _setupEvents() {
        this.timeline.on('scrubstart', this._onScrubStart.bind(this));
        this.timeline.on('timechange', this._onTimeChange.bind(this));
        this.timeline.on('timechanged', this._onTimeChanged.bind(this));
        this.timeline.on('select', this._onTimelineClick.bind(this));
    }

    // ==========================================================================
    // EVENT HANDLERS
    // ==========================================================================

    _onTimeChange(properties) {
        if (properties.id === 'scrubber' && this.scrubController) {
            this.scrubController.handleScrubbing(properties.time);
        }
    }

    _onScrubStart(properties) {
        if (properties.id === 'scrubber' && this.scrubController) {
            this.scrubController.startScrubbing(properties.time);
        }
    }

    _onTimeChanged(properties) {
        if (properties.id === 'scrubber' && this.scrubController) {
            this.scrubController.endScrubbing(properties.time);
        }
    }

    _onTimelineClick(properties) {
        if (properties.id && this.navigationController) {
            this.navigationController.handleTimelineClick(
                properties.id - TIMELINE_CONSTANTS.INDEX_OFFSET_UI,
                properties.ms
            );
        }
    }

    // ==========================================================================
    // POSITION UPDATES
    // ==========================================================================

    updateCurrentPosition() {
        // Keep store subscriptions active across temporary UI unmounts, but do no
        // timeline work until a renderer is mounted again.
        if (this.isDestroyed || !this.scrubController || !this.stateSynchronizer) return;
        if (this.scrubController.isScrubbing || !this.timelineData || !this.timeline) return;

        const syncState = this.stateSynchronizer.syncRendererFromStore(this.timeline, this.scrubController.lastScrubEndTime);
        if (syncState && !syncState.preservingScrubPosition) {
            this.stateSynchronizer.updateStoreTimelineState(syncState.currentTime, syncState.segment, syncState.treeIndex);
        }
    }

    // ==========================================================================
    // UTILITIES
    // ==========================================================================

    _stopPlayback() {
        const store = useAppStore.getState();
        if (store.playing) store.stop();
    }

    getSegmentCount() {
        return this.timelineClock?.getSegmentCount() ?? 0;
    }

    getInterpolationDataForTimelineProgress(progress) {
        return this.timelineClock?.getInterpolationDataForProgress(progress) ?? null;
    }

    getTimelineProgressForTreeIndex(treeIndex) {
        return this.timelineClock?.getTimelineProgressForTreeIndex(treeIndex) ?? null;
    }

    getTimelineProgressForLinearTreeProgress(progress, treeCount) {
        return this.timelineClock?.getTimelineProgressForLinearTreeProgress(progress, treeCount) ?? null;
    }

    // ==========================================================================
    // CLEANUP
    // ==========================================================================

    destroy() {
        this.isDestroyed = true;
        this.unsubscribeFromStore?.();

        this.unmount();
        this.scrubberAPI?.destroy();
        this.scrubController?.destroy();

        this.segments = null;
        this.timelineData = null;
        this.timelineClock = null;
        this.navigationController = null;
        this.scrubberAPI = null;
        this.scrubController = null;
        this.stateSynchronizer = null;
    }
}
