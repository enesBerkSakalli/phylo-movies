import { buildPairSpans } from '../data/pairStripGeometry.js';
import { cursorForFrame } from '../timeline.js';
import { ScrubberAPI } from './ScrubberAPI.js';
import { TimelineNavigationController } from './TimelineNavigationController.js';
import { TimelineScrubController } from './TimelineScrubController.js';

let deckTimelineRendererModulePromise = null;

function loadDeckTimelineRenderer() {
  deckTimelineRendererModulePromise ??= import('../renderers/DeckTimelineRenderer.js');
  return deckTimelineRendererModulePromise;
}

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
  constructor(timeline, store) {
    if (!store || typeof store.getState !== 'function' || typeof store.subscribe !== 'function') {
      throw new Error('MovieTimelineManager requires an injected store API');
    }

    this.store = store;
    this.isDestroyed = false;
    this.container = null;
    this.scrubberAPI = null;
    this.timeline = null;
    this._timelineCreationToken = 0;
    this._timelineUpdateFrameId = null;
    this.timelineData = timeline;
    this.segments = timeline.segments;
    this.pairStrip = null;
    this.navigationController = new TimelineNavigationController({
      timeline,
      store: this.store,
      onTimelinePositionUpdated: () => this.updateCurrentPosition(),
    });
    this.scrubController = new TimelineScrubController({
      store: this.store,
      getTimelineRenderer: () => this.timeline,
      getScrubberAPI: () => this.scrubberAPI,
      stopPlayback: () => this._stopPlayback(),
    });

    this._initialize();
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  _buildPairStrip() {
    const profile = this.store.getState().pairChanges;
    const timeline = this.timelineData;
    return {
      spans: buildPairSpans({
        segments: this.segments,
        timelineData: this.timelineData,
        profile,
        frameToMs: (frameIndex) => cursorForFrame(timeline.steps, frameIndex)?.ms ?? null,
      }),
      maxRf: profile.maxRf,
      getFrameIndexAtMs: (ms) => timeline.cursorAt(ms)?.frameIndex ?? null,
    };
  }

  _initialize() {
    this._initializeScrubberAPI();

    this.unsubscribeFromStore = this.store.subscribe((state, prevState) => {
      if (state.timelineCursor !== prevState.timelineCursor) {
        if (!this.scrubController?.isScrubbing) {
          this._scheduleCurrentPositionUpdate();
        }
      }

      if (state.treeController !== prevState.treeController) {
        this._initializeScrubberAPI(state.treeController);
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

  _initializeScrubberAPI(controller = this._selectScrubberController()) {
    if (controller === this.scrubberAPI?.treeController) return;

    this.scrubberAPI?.destroy();
    this.scrubberAPI = controller ? new ScrubberAPI(controller, this.store) : null;
  }

  _selectScrubberController() {
    return this.store.getState().treeController;
  }

  // ==========================================================================
  // TIMELINE CREATION
  // ==========================================================================

  mount(container) {
    if (this.isDestroyed || !container) return Promise.resolve(null);

    const isSameContainer = this.container === container;
    const isTimelineAttached =
      this.timeline && this.timeline.container && container.contains(this.timeline.container);

    if (isSameContainer && isTimelineAttached) {
      this._syncRendererFromStore();
      return Promise.resolve(this.timeline);
    }

    this.unmount();
    this.container = container;
    return this._createTimeline();
  }

  unmount() {
    this._timelineCreationToken += 1;
    this.scrubController?.resetOnUnmount();
    this.timeline?.destroy();
    this.timeline = null;
    this.container = null;

    this.store?.getState().setHoveredSegment(null, null);
  }

  async _createTimeline() {
    if (this.isDestroyed || !this.container) return null;
    const container = this.container;
    const creationToken = ++this._timelineCreationToken;

    // Safety check for renderer constructor
    if (!this.timelineData || typeof this.timelineData !== 'object') {
      console.error(
        '[MovieTimelineManager] Cannot create timeline: invalid timelineData',
        this.timelineData
      );
      return null;
    }

    if (this.timelineData.totalDuration <= 0) {
      console.warn('[MovieTimelineManager] Cannot create timeline: totalDuration is 0');
      return null;
    }

    let DeckTimelineRenderer;
    try {
      ({ DeckTimelineRenderer } = await loadDeckTimelineRenderer());
    } catch (error) {
      console.error('[MovieTimelineManager] Failed to load timeline renderer:', error);
      return null;
    }

    if (
      this.isDestroyed ||
      this.container !== container ||
      creationToken !== this._timelineCreationToken
    ) {
      return null;
    }

    this.pairStrip ??= this._buildPairStrip();
    const timeline = new DeckTimelineRenderer(
      this.timelineData,
      this.segments,
      this.pairStrip
    ).init(container);
    if (
      this.isDestroyed ||
      this.container !== container ||
      creationToken !== this._timelineCreationToken
    ) {
      timeline.destroy?.();
      return null;
    }

    this.timeline = timeline;
    this.timeline.bindScrubState({
      getIsScrubbing: () => this.scrubController?.isScrubbing ?? false,
    });
    this.timeline.bindHoverState({
      setHoveredSegment: (segmentIndex, segmentData, position) => {
        this.store.getState().setHoveredSegment(segmentIndex, segmentData, position);
      },
    });
    this._setupEvents();
    this._syncRendererFromStore();
    this._syncSelectedSegmentFromStore();
    return this.timeline;
  }

  _setupEvents() {
    this.timeline.on('scrubstart', this._onScrubStart.bind(this));
    this.timeline.on('timechange', this._onTimeChange.bind(this));
    this.timeline.on('timechanged', this._onTimeChanged.bind(this));
    this.timeline.on('select', this._onTimelineClick.bind(this));
    this.timeline.on('inspect', this._onTimelineInspect.bind(this));
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

    this.store.getState().setSelectedTimelineSegment(segmentIndex);

    if (segmentIndex !== null && this.navigationController) {
      this.navigationController.handleTimelineClick(segmentIndex, properties.ms);
    }
  }

  // Loaded on demand like the renderer: the dock pulls in the whole panel registry.
  _onTimelineInspect() {
    import('../../components/dock/dockRuntime.js').then(({ openPanel }) => openPanel('inspector'));
  }

  _syncSelectedSegmentFromStore() {
    if (!this.timeline) return;

    const { selectedTimelineSegmentIndex } = this.store.getState();
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
    if (this.isDestroyed || !this.scrubController) return;
    if (this.scrubController.isScrubbing || !this.timelineData || !this.timeline) return;

    this._syncRendererFromStore();
  }

  _syncRendererFromStore() {
    const movieTimeMs = this.store.getState().timelineCursor?.movieTimeMs ?? 0;
    const cursor = this.timelineData.cursorAt(movieTimeMs);
    if (cursor) this.timeline.setCustomTime(cursor.movieTimeMs);
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  _stopPlayback() {
    const store = this.store.getState();
    if (store.playing) store.stop();
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

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  destroy() {
    if (this.isDestroyed) return;

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
    this.pairStrip = null;
    this.navigationController = null;
    this.scrubberAPI = null;
    this.scrubController = null;
    this.store = null;
  }
}
