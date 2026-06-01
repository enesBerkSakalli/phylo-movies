import { TimelineDataProcessor } from '../data/TimelineDataProcessor.js';
import { TimelineDataset } from '../data/TimelineDataset.js';
import { TimelineClock } from './TimelineClock.js';
import { TimelineConductor } from './TimelineConductor.js';
import { ScrubberAPI } from './ScrubberAPI.js';
import { TimelineNavigationController } from './TimelineNavigationController.js';
import { TimelineScrubController } from './TimelineScrubController.js';
import { TimelineStateSynchronizer } from './TimelineStateSynchronizer.js';
import { useAppStore } from '../../state/phyloStore/store.js';
import { DeckTimelineRenderer } from '../renderers/DeckTimelineRenderer.js';
import { buildTimelineStatusSnapshot } from '../view/timelineStatusModel.js';

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
  constructor(movieData, treeList) {
    if (!Array.isArray(treeList) || treeList.length === 0) {
      throw new Error('MovieTimelineManager requires a non-empty normalized treeList');
    }

    this.treeList = treeList;
    this.isDestroyed = false;
    this.container = null;
    this.scrubberAPI = null;
    this.timeline = null;
    this._timelineUpdateFrameId = null;
    this.segments = TimelineDataProcessor.createSegments(movieData);
    this.timelineData = TimelineDataProcessor.createTimelineData(this.segments);
    this.timelineDataset = TimelineDataset.fromMovieData(movieData, {
      segments: this.segments,
      timelineData: this.timelineData,
      treeList,
    });
    this.timelineConductor = TimelineConductor.fixed(this.timelineDataset);
    this.timelineClock = new TimelineClock({
      timelineDataset: this.timelineDataset,
    });
    this.stateSynchronizer = new TimelineStateSynchronizer({
      timelineDataset: this.timelineDataset,
      store: useAppStore,
    });
    this.navigationController = new TimelineNavigationController({
      timelineDataset: this.timelineDataset,
      segments: this.segments,
      timelineData: this.timelineData,
      store: useAppStore,
      onTimelinePositionUpdated: () => this.updateCurrentPosition(),
    });
    this.scrubController = new TimelineScrubController({
      timelineDataset: this.timelineDataset,
      timelineData: this.timelineData,
      segments: this.segments,
      store: useAppStore,
      getTimelineRenderer: () => this.timeline,
      getScrubberAPI: () => this.scrubberAPI,
      stopPlayback: () => this._stopPlayback(),
    });

    this._initialize();
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  _initialize() {
    this._initializeScrubberAPI();

    this.unsubscribeFromStore = useAppStore.subscribe((state, prevState) => {
      if (state.frameIndex !== prevState.frameIndex || state.playhead !== prevState.playhead) {
        if (!this.scrubController?.isScrubbing) {
          this._scheduleCurrentPositionUpdate();
        }
      }

      if (state.treeControllers !== prevState.treeControllers) {
        const controller = this._selectScrubberController();
        if (controller && controller !== this.scrubberAPI?.treeController) {
          this._initializeScrubberAPI(controller);
        }
      }

      if (state.selectedTimelineSegmentIndex !== prevState.selectedTimelineSegmentIndex) {
        this._syncSelectedSegmentFromStore();
      }
    });

    this._scheduleCurrentPositionUpdate();
  }

  _scheduleCurrentPositionUpdate() {
    if (this.isDestroyed || this._timelineUpdateFrameId !== null) return;

    this._timelineUpdateFrameId = requestAnimationFrame(() => {
      this._timelineUpdateFrameId = null;
      this.updateCurrentPosition();
    });
  }

  _initializeScrubberAPI(controllerOverride = null) {
    const controller = controllerOverride || this._selectScrubberController();
    if (!controller) return;

    this.scrubberAPI = new ScrubberAPI(controller, this, useAppStore);
  }

  _selectScrubberController() {
    const { treeControllers } = useAppStore.getState();
    return treeControllers[0] || null;
  }

  // ==========================================================================
  // TIMELINE CREATION
  // ==========================================================================

  mount(container) {
    if (this.isDestroyed || !container) return;

    const isSameContainer = this.container === container;
    const isTimelineAttached =
      this.timeline && this.timeline.container && container.contains(this.timeline.container);

    if (isSameContainer && isTimelineAttached) {
      this.stateSynchronizer.restoreMountedState(
        this.timeline,
        this.scrubController.lastScrubEndTime
      );
      return;
    }

    this.unmount();
    this.container = container;
    this._createTimeline();

    if (this.timeline) {
      this._setupEvents();
      this.stateSynchronizer.restoreMountedState(
        this.timeline,
        this.scrubController.lastScrubEndTime
      );
      this._syncSelectedSegmentFromStore();
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
      console.error(
        '[MovieTimelineManager] Cannot create timeline: invalid timelineData',
        this.timelineData
      );
      return;
    }

    if (this.timelineData.totalDuration <= 0) {
      console.warn('[MovieTimelineManager] Cannot create timeline: totalDuration is 0');
      return;
    }

    this.timeline = new DeckTimelineRenderer(this.timelineData, this.segments).init(this.container);
    this.timeline.bindScrubState({
      getIsScrubbing: () => this.scrubController?.isScrubbing ?? false,
    });
    this.timeline.bindHoverState({
      setHoveredSegment: (segmentIndex, segmentData, position) => {
        useAppStore.getState().setHoveredSegment(segmentIndex, segmentData, position);
      },
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
    const segmentIndex = Number.isInteger(properties.segmentIndex) ? properties.segmentIndex : null;

    useAppStore.getState().setSelectedTimelineSegment(segmentIndex);

    if (segmentIndex !== null && this.navigationController) {
      this.navigationController.handleTimelineClick(segmentIndex, properties.ms);
    }
  }

  _syncSelectedSegmentFromStore() {
    if (!this.timeline) return;

    const { selectedTimelineSegmentIndex } = useAppStore.getState();
    const isValidSelection =
      Number.isInteger(selectedTimelineSegmentIndex) &&
      selectedTimelineSegmentIndex >= 0 &&
      selectedTimelineSegmentIndex < this.segments.length;

    this.timeline.setSelectedSegment(isValidSelection ? selectedTimelineSegmentIndex : null);
  }

  // ==========================================================================
  // POSITION UPDATES
  // ==========================================================================

  updateCurrentPosition() {
    // Keep store subscriptions active across temporary UI unmounts, but do no
    // timeline work until a renderer is mounted again.
    if (this.isDestroyed || !this.scrubController || !this.stateSynchronizer) return;
    if (this.scrubController.isScrubbing || !this.timelineData || !this.timeline) return;

    const syncState = this.stateSynchronizer.syncRendererFromStore(
      this.timeline,
      this.scrubController.lastScrubEndTime
    );
    if (syncState && !syncState.preservingScrubPosition) {
      this.stateSynchronizer.updateStoreTimelineState(
        syncState.currentTime,
        syncState.segment,
        syncState.frameIndex
      );
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

  getSegment(index) {
    return Number.isInteger(index) ? (this.segments?.[index] ?? null) : null;
  }

  hasTransitionSegments() {
    return (
      Array.isArray(this.segments) &&
      this.segments.some((segment) => segment && !segment.isInputTreeSegment)
    );
  }

  zoomIn(factor = 0.2) {
    this.timeline?.zoomIn?.(factor);
  }

  zoomOut(factor = 0.2) {
    this.timeline?.zoomOut?.(factor);
  }

  fit() {
    this.timeline?.fit?.();
  }

  scrollToStart() {
    this.timeline?.moveTo?.(0);
  }

  scrollToEnd() {
    const total = this.timeline?.getTotalDuration?.();
    const range = this.timeline?.getVisibleTimeRange?.();

    if (
      !Number.isFinite(total) ||
      !range ||
      !Number.isFinite(range.min) ||
      !Number.isFinite(range.max)
    ) {
      return;
    }

    const visibleDuration = Math.max(0, range.max - range.min);
    this.timeline?.moveTo?.(Math.max(0, total - visibleDuration));
  }

  getTransitionFrameForTimelineProgress(progress) {
    let transitionFrame = this.timelineClock?.getTransitionFrameForProgress(progress) ?? null;
    if (
      transitionFrame &&
      (!transitionFrame.sourceTree || !transitionFrame.targetTree) &&
      Number.isInteger(transitionFrame.sourceTreeIndex) &&
      Number.isInteger(transitionFrame.targetTreeIndex)
    ) {
      const { ensureTreesHydrated } = useAppStore.getState();
      ensureTreesHydrated?.([transitionFrame.sourceTreeIndex, transitionFrame.targetTreeIndex]);
      transitionFrame = this.timelineClock?.getTransitionFrameForProgress(progress) ?? null;
    }
    return transitionFrame;
  }

  getTimelineProgressForLinearTreeProgress(progress, treeCount) {
    return (
      this.timelineClock?.getTimelineProgressForLinearTreeProgress(progress, treeCount) ?? null
    );
  }

  getCursorAtMovieTime(movieTimeMs, options = {}) {
    return this.timelineConductor?.setMovieTimeMs(movieTimeMs, options) ?? null;
  }

  getCursorAtTimelineProgress(timelineProgress, options = {}) {
    return this.timelineConductor?.setTimelineProgress(timelineProgress, options) ?? null;
  }

  getCursorForFrame(frameIndex, options = {}) {
    return this.timelineConductor?.setFrameIndex(frameIndex, options) ?? null;
  }

  getFrameOccurrences(frameIndex) {
    return this.timelineDataset?.getOccurrencesForFrame(frameIndex) ?? [];
  }

  getTimelineStatusSnapshot({
    frameIndex = null,
    timelineCursor = null,
    inputFrameIndices = null,
    hasMsa = false,
    msaStepSize = null,
    msaWindowSize = null,
    msaColumnCount = null,
  } = {}) {
    const resolvedCursor =
      timelineCursor ?? (Number.isInteger(frameIndex) ? this.getCursorForFrame(frameIndex) : null);
    const resolvedFrameIndex =
      resolvedCursor?.frameIndex ?? (Number.isInteger(frameIndex) ? frameIndex : 0);

    return buildTimelineStatusSnapshot({
      frameIndex: resolvedFrameIndex,
      treeListLength: this.treeList?.length ?? 0,
      inputFrameIndices: inputFrameIndices ?? this.timelineDataset?.getInputFrameIndices?.() ?? [],
      timelineCursor: resolvedCursor,
      hasMsa,
      msaStepSize,
      msaWindowSize,
      msaColumnCount,
    });
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  destroy() {
    this.isDestroyed = true;
    this.unsubscribeFromStore?.();
    if (this._timelineUpdateFrameId !== null) {
      cancelAnimationFrame(this._timelineUpdateFrameId);
      this._timelineUpdateFrameId = null;
    }

    this.unmount();
    this.scrubberAPI?.destroy();
    this.scrubController?.destroy();

    this.segments = null;
    this.timelineData = null;
    this.timelineDataset = null;
    this.timelineConductor = null;
    this.timelineClock = null;
    this.navigationController = null;
    this.scrubberAPI = null;
    this.scrubController = null;
    this.stateSynchronizer = null;
  }
}
