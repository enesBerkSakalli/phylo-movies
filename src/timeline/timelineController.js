import { buildPairSpans } from './stripGeometry.js';
import { cursorForFrame } from './timeline.js';
import { rightComparisonIndex } from '../domain/indexing/treeIndexSemantics.js';
import { selectInputFrameIndices } from '../state/phyloStore/selectors/treeSelectors.js';

const EDGE_MS = 1;
const SCRUB_THROTTLE_MS = 16;

const cancelFrame = (id) => id !== null && cancelAnimationFrame(id);

/**
 * Drives the timeline strip: mounts the view into a host, draws the store's selection, hover and
 * scrub state on it, and turns its gestures into store writes (scrub, click-to-seek, inspect).
 *
 * The store owns the state: `timeline` is the data; while mounted, `timelineView` is the view and
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

    this.store.setState({ isScrubbing: false, timelineView: null, hoveredSegment: null });
  }

  async _create(container) {
    const token = this.token;
    const { timeline, pairChanges } = this.store.getState();
    if (!(timeline?.totalDuration > 0)) return null;

    let TimelineView;
    try {
      ({ TimelineView } = await import('./TimelineView.js'));
    } catch (error) {
      console.error('[TimelineController] Failed to load timeline view:', error);
      return null;
    }
    // Unmounted, or mounted again, while the view loaded.
    if (token !== this.token) return null;

    const view = new TimelineView(
      timeline,
      {
        spans: buildPairSpans({
          segments: timeline.segments,
          profile: pairChanges,
          frameToMs: (frameIndex) => cursorForFrame(timeline.steps, frameIndex)?.ms ?? null,
        }),
        maxRf: pairChanges.maxRf,
      },
      {
        onScrub: (ms, phase) => (phase === 'end' ? this.endScrub(ms) : this.scrub(ms)),
        onSelect: (segmentIndex, ms) => this.select(segmentIndex, ms),
        onHover: (segmentIndex) => this.hover(segmentIndex),
        // Loaded on demand like the view: the dock pulls in the whole panel registry.
        onInspect: () =>
          import('../components/dock/dockRuntime.js').then(({ openPanel }) =>
            openPanel('inspector')
          ),
      }
    ).init(container);

    this.view = view;
    this.unsubscribe = this.store.subscribe((state, prevState) => {
      if (state.timelineCursor !== prevState.timelineCursor && !state.isScrubbing) {
        this.schedulePosition();
      }
      if (state.selectedTimelineSegmentIndex !== prevState.selectedTimelineSegmentIndex) {
        view.setSelection(state.selectedTimelineSegmentIndex);
      }
      if (state.hoveredSegment !== prevState.hoveredSegment) {
        view.setHover(state.hoveredSegment?.index ?? null);
      }
      if (state.isScrubbing !== prevState.isScrubbing) view.setScrubbing(state.isScrubbing);
    });

    this.syncPosition();
    view.setSelection(this.store.getState().selectedTimelineSegmentIndex);
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

  // The pointer reports its segment on every move; the store hears of it when the segment or its
  // tooltip anchor changes, since every write re-renders the tooltip.
  hover(segmentIndex) {
    const state = this.store.getState();
    const next =
      segmentIndex === null ? null : { index: segmentIndex, x: this.view.anchorX(segmentIndex) };
    const { hoveredSegment } = state;
    if (next?.index === hoveredSegment?.index && next?.x === hoveredSegment?.x) return;
    state.setHoveredSegment(next);
  }

  select(segmentIndex, ms) {
    const state = this.store.getState();
    state.setSelectedTimelineSegment(segmentIndex);

    const segment = state.timeline.segments[segmentIndex];
    if (!segment) return;
    if (segment.isInputTreeSegment) state.setClipboardTreeIndex(segment.firstFrame);

    // A timed click lands strictly inside the segment, so a boundary click stays on it.
    const cursor = Number.isFinite(ms) ? this._cursorInSegment(segmentIndex, ms) : null;
    const target = cursor ? cursor.frameIndex : segment.firstFrame;
    const direction =
      target === state.frameIndex ? 'jump' : target > state.frameIndex ? 'forward' : 'backward';
    state.goToPosition(target, direction, cursor ? { movieTimeMs: cursor.movieTimeMs } : undefined);
    requestAnimationFrame(() => this.syncPosition());
  }

  _cursorInSegment(segmentIndex, ms) {
    const { timeline } = this.store.getState();
    const { start, end } = timeline.segments[segmentIndex];
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
  }

  // Tree renders are throttled: a drag faster than that keeps only its latest position.
  scrub(ms) {
    if (!this.isScrubbing) return this.startScrub(ms);

    this.pendingScrubMs = ms;
    if (performance.now() - this.lastScrubAt < SCRUB_THROTTLE_MS) {
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
      options.rightTreeIndex = rightComparisonIndex(inputTreeIndices, frame.sourceTreeIndex);
    }

    await state.treeController.renderComparisonAwareScrubFrame(
      frame.sourceTree,
      frame.targetTree,
      frame.renderProgress,
      options
    );
  }
}
