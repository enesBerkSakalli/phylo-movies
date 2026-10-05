import { TIMELINE_CONSTANTS } from './constants.js';
import { buildPairSpans } from './data/pairStripGeometry.js';
import { cursorForFrame } from './timeline.js';
import { getSegmentBounds } from './utils/segmentTiming.js';
import { selectInputFrameIndices } from '../state/phyloStore/selectors/treeSelectors.js';

const EDGE_MS = 1;

const cancelFrame = (id) => id !== null && cancelAnimationFrame(id);

/**
 * Drives the timeline strip: mounts the renderer into a host, keeps it in step with the store, and
 * turns its gestures into store writes (scrub, click-to-seek, inspect).
 *
 * The store's `timeline` is the data; while mounted, `timelineView` is the renderer and
 * `isScrubbing` says a handle drag is in progress.
 */
export class TimelineController {
  constructor(store) {
    this.store = store;
    this.view = null;
    this.container = null;
    this.token = 0;
    this.unsubscribe = null;
    this.positionFrame = null;
    this.scrubFrame = null;
    this.lastScrubAt = 0;
    this.pendingScrubMs = null;
    this.lastRenderMs = null;
    this.pendingRenderMs = null;
    this.rendering = null;
  }

  get isScrubbing() {
    return this.store.getState().isScrubbing;
  }

  mount(container) {
    if (!container) return Promise.resolve(null);
    if (this.container === container && this.view && container.contains(this.view.container)) {
      this.syncPosition();
      return Promise.resolve(this.view);
    }

    this.unmount();
    this.container = container;
    return this._create(container);
  }

  unmount() {
    this.token += 1;
    this.unsubscribe?.();
    this.unsubscribe = null;
    cancelFrame(this.positionFrame);
    cancelFrame(this.scrubFrame);
    this.positionFrame = this.scrubFrame = this.pendingScrubMs = this.pendingRenderMs = null;
    this.view?.destroy();
    this.view = null;
    this.container = null;

    this.store.setState({ isScrubbing: false, timelineView: null });
    this.store.getState().setHoveredSegment(null, null);
  }

  async _create(container) {
    const token = this.token;
    const { timeline, pairChanges } = this.store.getState();
    if (!(timeline?.totalDuration > 0)) return null;

    let DeckTimelineRenderer;
    try {
      ({ DeckTimelineRenderer } = await import('./renderers/DeckTimelineRenderer.js'));
    } catch (error) {
      console.error('[TimelineController] Failed to load timeline renderer:', error);
      return null;
    }
    // Unmounted, or mounted again, while the renderer loaded.
    if (token !== this.token) return null;

    const view = new DeckTimelineRenderer(timeline, timeline.segments, {
      spans: buildPairSpans({
        segments: timeline.segments,
        timelineData: timeline,
        profile: pairChanges,
        frameToMs: (frameIndex) => cursorForFrame(timeline.steps, frameIndex)?.ms ?? null,
      }),
      maxRf: pairChanges.maxRf,
      getFrameIndexAtMs: (ms) => timeline.cursorAt(ms)?.frameIndex ?? null,
    }).init(container);

    this.view = view;
    view.bindScrubState({ getIsScrubbing: () => this.isScrubbing });
    view.bindHoverState({
      setHoveredSegment: (...args) => this.store.getState().setHoveredSegment(...args),
    });
    view.on('scrubstart', ({ time }) => this.startScrub(time));
    view.on('timechange', ({ time }) => this.scrub(time));
    view.on('timechanged', ({ time }) => this.endScrub(time));
    view.on('select', (click) => this.select(click));
    // Loaded on demand like the renderer: the dock pulls in the whole panel registry.
    view.on('inspect', () =>
      import('../components/dock/dockRuntime.js').then(({ openPanel }) => openPanel('inspector'))
    );

    this.unsubscribe = this.store.subscribe((state, prevState) => {
      if (state.timelineCursor !== prevState.timelineCursor && !state.isScrubbing) {
        this.schedulePosition();
      }
      if (state.selectedTimelineSegmentIndex !== prevState.selectedTimelineSegmentIndex) {
        view.setSelectedSegment(state.selectedTimelineSegmentIndex);
      }
    });

    this.syncPosition();
    view.setSelectedSegment(this.store.getState().selectedTimelineSegmentIndex);
    this.store.setState({ timelineView: view });
    return view;
  }

  syncPosition() {
    this.view?.setCustomTime(this.store.getState().timelineCursor?.movieTimeMs ?? 0);
  }

  // Cursor writes come in bursts during playback: move the handle once per frame.
  schedulePosition() {
    if (this.positionFrame !== null) return;
    this.positionFrame = requestAnimationFrame(() => {
      this.positionFrame = null;
      if (!this.isScrubbing) this.syncPosition();
    });
  }

  select({ segmentIndex, ms }) {
    const state = this.store.getState();
    const index = Number.isInteger(segmentIndex) ? segmentIndex : null;
    state.setSelectedTimelineSegment(index);

    const segment = state.timeline.segments[index];
    if (!segment) return;
    if (segment.isInputTreeSegment) state.setClipboardTreeIndex(segment.firstFrame);

    // A timed click lands strictly inside the segment, so a boundary click stays on it.
    const cursor = Number.isFinite(ms) ? this._cursorInSegment(index, ms) : null;
    const target = cursor ? cursor.frameIndex : segment.firstFrame;
    const direction =
      target === state.frameIndex ? 'jump' : target > state.frameIndex ? 'forward' : 'backward';
    state.goToPosition(target, direction, cursor ? { movieTimeMs: cursor.movieTimeMs } : undefined);
    requestAnimationFrame(() => this.syncPosition());
  }

  _cursorInSegment(segmentIndex, ms) {
    const { timeline } = this.store.getState();
    const { start, end } = getSegmentBounds(segmentIndex, timeline);
    const inside =
      end - start <= EDGE_MS ? start : Math.max(start + EDGE_MS, Math.min(ms, end - EDGE_MS));
    const cursor = timeline.cursorAt(inside);
    if (cursor?.segmentIndex !== segmentIndex) {
      throw new Error('[TimelineController] movie time resolved outside its segment');
    }
    return cursor;
  }

  startScrub(ms) {
    if (this.isScrubbing) return this.scrub(ms);

    const { playing, stop } = this.store.getState();
    if (playing) stop();
    this.store.setState({ isScrubbing: true });
    this.lastScrubAt = 0;
    this.lastRenderMs = ms;
    this.pendingScrubMs = this.pendingRenderMs = null;
    cancelFrame(this.scrubFrame);
    this.scrubFrame = null;
    this.view?.syncScrubState();
  }

  // Tree renders are throttled: a drag faster than that keeps only its latest position.
  scrub(ms) {
    if (!this.isScrubbing) return this.startScrub(ms);

    this.pendingScrubMs = ms;
    if (performance.now() - this.lastScrubAt < TIMELINE_CONSTANTS.SCRUB_THROTTLE_MS) {
      this.scrubFrame ??= requestAnimationFrame(() => {
        this.scrubFrame = null;
        if (this.isScrubbing && this.pendingScrubMs !== null) this._flushScrub();
      });
      return;
    }
    this._flushScrub();
  }

  async endScrub(ms) {
    if (!this.isScrubbing) return;

    this.pendingScrubMs = null;
    cancelFrame(this.scrubFrame);
    this.scrubFrame = null;
    if (ms !== this.lastRenderMs || this.pendingRenderMs !== null) await this.renderScrub(ms);

    // Clear the flag first: the tree hook skips cursor writes while it is set.
    this.store.setState({ isScrubbing: false });
    this.view?.syncScrubState();
    this.store.getState().seek(ms);
  }

  _flushScrub() {
    const ms = this.pendingScrubMs;
    this.pendingScrubMs = null;
    this.lastScrubAt = performance.now();
    this.renderScrub(ms);
  }

  // One tree render at a time; while it runs, only the latest requested time is kept.
  async renderScrub(ms) {
    this.lastRenderMs = ms;
    this.pendingRenderMs = ms;
    if (this.rendering) return this.rendering;

    this.rendering = (async () => {
      while (this.pendingRenderMs !== null && this.store.getState().treeController) {
        const next = this.pendingRenderMs;
        this.pendingRenderMs = null;
        try {
          await this._renderFrameAt(next);
        } catch (error) {
          console.error('[TimelineController] Scrub update failed:', { movieTimeMs: next, error });
        }
      }
    })();

    try {
      await this.rendering;
    } finally {
      this.rendering = null;
    }
  }

  async _renderFrameAt(ms) {
    const frame = this.store.getState().frameAt(ms);
    if (!frame) return;

    this.store.getState().seek(ms);
    const state = this.store.getState();
    state.updateColorManagerForIndex?.(frame.highlightTreeIndex);

    const options = frame.toRenderOptions({ scrubMode: true });
    if (state.comparisonMode) {
      const inputTreeIndices = selectInputFrameIndices(state);
      options.comparisonMode = true;
      options.rightTreeIndex =
        inputTreeIndices.find((i) => i > frame.sourceTreeIndex) ??
        inputTreeIndices[inputTreeIndices.length - 1];
    }

    await state.treeController.renderComparisonAwareScrubFrame(
      frame.sourceTree,
      frame.targetTree,
      frame.renderProgress,
      options
    );
  }
}
