// Load timeline styles only in browser environments to keep Node-based tests happy
if (typeof document !== 'undefined') {
  import('../css/movie-timeline/container.css');
}
import { Deck, OrthographicView } from '@deck.gl/core';
import { teardownDeckRenderer } from '../lib/deckTeardown.js';
import {
  createBaselineLayer,
  createInputTreeTickLayer,
  createInputTreeLayer,
  createPairMarkLayer,
  createPairPipLayer,
  createInputTreeHoverLayer,
  createInputTreeSelectionLayer,
  createSeparatorLayer,
  createScrubberLayers,
  createScrubberKnobLayer,
  calculateSeparatorWidth,
} from './deckLayers.js';
import {
  msToX,
  xToMs,
  calculateZoomScale,
  followRange,
  panRange,
  zoomRange,
} from './math/coordinateUtils.js';
import { stepAt } from './timeline.js';
import {
  TIMELINE_THEME,
  getDevicePixelRatio,
  processSegments,
  projectPairStrip,
} from './stripGeometry.js';
import { attachTimelineInput } from './timelineInput.js';
import { describeCursor } from './describeCursor.js';
import { cssColor } from '../services/ui/colorUtils.js';

// What the strip answers to (timelineInput, and the playback shortcuts it defers to)
const SLIDER_KEYS =
  'Space ArrowLeft ArrowRight Shift+ArrowLeft Shift+ArrowRight PageUp PageDown Home End Enter Escape Plus Minus 0';

// The strip's colour roles and the theme tokens (src/css/index.css) they are read from
const STRIP_COLOR_TOKENS = {
  mark: '--data-mark', // RF bars, branch-length dashes, dense input-tree ticks
  markStrong: '--data-mark-strong', // SPR dots, input-tree rings
  hover: '--hover-mark',
  selection: '--primary', // the ink: selected bar, dots, ring, tick and the bracket
  playhead: '--signal',
  background: '--background',
  axis: '--axis', // the baseline
  grid: '--grid', // segment separators
};

/**
 * The timeline strip, drawn with deck.gl: input trees as circles or ticks, each transition pair as
 * an RF bar with SPR-move pips, and the scrubber handle. It draws what it is told (`selected`,
 * `hovered`, `scrubbing`, the scrubber time) and owns only the visible range (zoom and pan, which
 * follows the playhead out of view); the gestures it hears go out through the callbacks, see
 * timelineInput.
 */
export class TimelineView {
  /**
   * @param {Object} timeline - buildTimeline() result
   * @param {{spans: Object[], maxRf: number}} strip - per-pair geometry from buildPairSpans
   * @param {Object} callbacks - { onScrub, onSelect, onDeselect, onHover, onInspect }, see
   *   timelineInput
   */
  constructor(timeline, strip, callbacks) {
    this.timeline = timeline;
    this.strip = strip;
    this.callbacks = callbacks;

    // DOM & deck.gl
    this.deck = null;
    this.container = null;
    this.canvas = null;

    // Drawn state; the controller feeds it from the store
    this.selected = null;
    this.hovered = null;
    this.scrubbing = false;
    this.scrubberMs = 0;

    // Visible range (zoom)
    this._totalDuration = timeline.totalDuration;
    this._rangeStart = 0;
    this._rangeEnd = this._totalDuration;
    this._width = 0;
    this._place = null; // segment:frame the slider text was last written for

    this._updateScheduled = false;
    this._updateFrameId = null;
  }

  /**
   * Creates the canvas and deck.gl instance and starts listening.
   * @param {HTMLElement} container - DOM element to render into
   * @returns {TimelineView} This instance for chaining
   */
  init(container) {
    this._setupContainer(container);
    this._createDeck();
    this._setupAccessibility();

    this.setCustomTime(0);
    this.refreshColors();

    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(() => this._scheduleUpdate());
      this._resizeObserver.observe(this.container);
    }
    this._detachInput = attachTimelineInput(this, this.callbacks);

    return this;
  }

  _setupContainer(container) {
    this.container = container;

    this.canvas = document.createElement('div');
    this.canvas.style.cssText =
      'position:absolute;left:0;right:0;top:0;bottom:0;z-index:2;pointer-events:auto;touch-action:none;';
    container.appendChild(this.canvas);
  }

  _createDeck() {
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);

    this.deck = new Deck({
      parent: this.canvas,
      views: [new OrthographicView({ id: 'ortho', flipY: false, near: 0.1, far: 1000 })],
      controller: false,
      viewState: { target: [0, 0, 0], zoom: 0 },
      width,
      height,
      useDevicePixels: getDevicePixelRatio(),
      layers: [],
      onViewStateChange: () => {},
      glOptions: { alpha: true, preserveDrawingBuffer: true },
      onLoad: () => this._removeDeckCanvasFromTabOrder(),
    });
    this._removeDeckCanvasFromTabOrder();
  }

  // The wrapper element is the keyboard-operable slider. deck.gl makes its own canvas focusable,
  // which would be a second, unnamed tab stop, and a click on the strip would focus it instead of
  // the slider; unfocusable, the click focuses the slider around it.
  _removeDeckCanvasFromTabOrder() {
    const deckCanvas = this.canvas?.querySelector?.('canvas');
    if (!deckCanvas) return;
    deckCanvas.removeAttribute('tabindex');
    deckCanvas.setAttribute('aria-hidden', 'true');
  }

  // ==========================================================================
  // ACCESSIBILITY
  // ==========================================================================

  _setupAccessibility() {
    const target = this.canvas;
    target.setAttribute('tabindex', '0');
    target.setAttribute('role', 'slider');
    target.setAttribute('aria-label', 'Movie timeline position');
    target.setAttribute('aria-keyshortcuts', SLIDER_KEYS);
    target.setAttribute('data-playback-keys', ''); // Space and the arrows go to playbackShortcuts
    target.setAttribute('aria-valuemin', '0');
    target.setAttribute('aria-valuemax', String(Math.round(this._totalDuration)));
    this._updateAccessibilityAttributes();
  }

  _updateAccessibilityAttributes() {
    const { timeline, scrubberMs, canvas } = this;
    canvas.setAttribute('aria-valuenow', String(Math.round(scrubberMs)));

    // The text names the segment and step, which change far less often than the playhead moves.
    const cursor = timeline.cursorAt(scrubberMs);
    const place = `${cursor?.segmentIndex}:${cursor?.frameIndex}`;
    if (place === this._place) return;
    this._place = place;
    canvas.setAttribute(
      'aria-valuetext',
      describeCursor(timeline, cursor)?.aria ?? 'No timeline segment selected'
    );
  }

  // ==========================================================================
  // DRAWN STATE
  // ==========================================================================

  /**
   * Sets the scrubber position to a specific time.
   * @param {number} ms - Time in milliseconds (clamped to valid range)
   */
  setCustomTime(ms) {
    const before = this.scrubberMs;
    this.scrubberMs = Math.max(0, Math.min(ms, this._totalDuration));
    // A dragged handle stays under the pointer; anything else that moves it out of view is followed
    if (!this.scrubbing)
      this._setRange(followRange(...this._range(), this._totalDuration, before, this.scrubberMs));
    this._updateAccessibilityAttributes();
    this._scheduleUpdate();
  }

  /** The inspected segment: user selection, not the playhead's segment. @param {number|null} index */
  setSelection(index) {
    this.selected = index;
    this._updateLayers();
  }

  /** The segment under the pointer. @param {number|null} index */
  setHover(index) {
    this.hovered = index;
    this._updateLayers();
  }

  /** Whether the handle is being dragged (it draws wider). @param {boolean} scrubbing */
  setScrubbing(scrubbing) {
    this.scrubbing = scrubbing;
    this._updateLayers();
  }

  /** Reads the strip's colours from the theme tokens again (at mount, and after a theme switch). */
  refreshColors() {
    const entries = Object.entries(STRIP_COLOR_TOKENS);
    this.colors = Object.fromEntries(
      entries.map(([role, token]) => [role, cssColor(this.container, token)])
    );
    this._updateLayers();
  }

  // ==========================================================================
  // ZOOM & COORDINATES
  // ==========================================================================

  /**
   * Scales the visible span, keeping `anchor` where it is in the view.
   * @param {number} factor - 0.8 shows 20% less time, 1.2 shows 20% more
   * @param {number} [anchor] - Time in milliseconds; default the playhead, or the middle of the
   *   view when the playhead is off screen
   */
  zoom(factor, anchor = this._playheadOrMiddle()) {
    this._setRange(zoomRange(...this._range(), this._totalDuration, factor, anchor));
  }

  /** Moves the visible range by `deltaMs`, stopping at the ends of the timeline. */
  pan(deltaMs) {
    this._setRange(panRange(...this._range(), this._totalDuration, deltaMs));
  }

  /** Resets zoom to show the entire timeline. */
  fit() {
    this._setRange([0, this._totalDuration]);
  }

  /** Whether less than the whole timeline is in view. */
  get zoomed() {
    return this._rangeEnd - this._rangeStart < this._totalDuration;
  }

  _range() {
    return [this._rangeStart, this._rangeEnd];
  }

  _setRange([start, end]) {
    if (start === this._rangeStart && end === this._rangeEnd) return;
    [this._rangeStart, this._rangeEnd] = [start, end];
    this._scheduleUpdate();
  }

  _playheadOrMiddle() {
    const inView = this.scrubberMs >= this._rangeStart && this.scrubberMs <= this._rangeEnd;
    return inView ? this.scrubberMs : (this._rangeStart + this._rangeEnd) / 2;
  }

  // x is in px from the strip's left edge
  xToMs(x) {
    return xToMs(x, this._rangeStart, this._rangeEnd, this._width);
  }

  msToX(ms) {
    return msToX(ms, this._rangeStart, this._rangeEnd, this._width);
  }

  /** Viewport x of a segment's middle: where its tooltip hangs. */
  anchorX(segmentIndex) {
    const { start, end } = this.timeline.segments[segmentIndex];
    return this.container.getBoundingClientRect().left + this.msToX((start + end) / 2);
  }

  // ==========================================================================
  // RENDERING
  // ==========================================================================

  _scheduleUpdate() {
    if (this._updateScheduled) return;
    this._updateScheduled = true;
    this._updateFrameId = requestAnimationFrame(() => {
      this._updateFrameId = null;
      this._updateLayers();
    });
  }

  _updateLayers() {
    if (!this.deck) {
      this._updateScheduled = false;
      return;
    }

    const rect = this.container.getBoundingClientRect();
    // The exact width places marks and maps the pointer; deck is sized in whole pixels.
    const width = Math.max(1, rect.width);
    const height = Math.max(1, Math.round(rect.height));
    this._width = width;

    const { rangeStart, rangeEnd, visStart, visEnd, startIdx, endIdx, zoomScale } =
      this._computeVisibleRange();

    const {
      inputTreeTicks,
      baselines,
      separators,
      inputTreePoints,
      activeInputTreeTicks,
      selectionInputTrees,
      hoverInputTrees,
    } = processSegments({
      startIdx,
      endIdx,
      width,
      height,
      visStart,
      visEnd,
      zoomScale,
      segments: this.timeline.segments,
      selectedSegmentIndex: this.selected,
      hoverIndex: this.hovered,
      rangeStart,
      rangeEnd,
    });

    const pairStrip = this._projectPairStrip({
      rangeStart,
      rangeEnd,
      visStart,
      visEnd,
      width,
      height,
    });

    const layers = this._buildLayers({
      inputTreeTicks,
      baselines,
      separators,
      inputTreePoints,
      activeInputTreeTicks,
      selectionInputTrees,
      hoverInputTrees,
      pairStrip,
      width,
      height,
    });

    this.deck.setProps({ width: Math.round(width), height, layers });
    this._updateScheduled = false;
  }

  _projectPairStrip(view) {
    const { segments } = this.timeline;
    const hoveredSegment = segments[this.hovered];
    const selectedSegment = segments[this.selected];
    return projectPairStrip({
      ...view,
      spans: this.strip.spans,
      maxRf: this.strip.maxRf,
      hoverPairId: hoveredSegment?.isInputTreeSegment === false ? hoveredSegment.pairId : null,
      selectedPairId: selectedSegment?.isInputTreeSegment === false ? selectedSegment.pairId : null,
      selectedBounds: selectedSegment?.isInputTreeSegment === false ? selectedSegment : null,
    });
  }

  _computeVisibleRange() {
    const rangeStart = this._rangeStart;
    const rangeEnd = this._rangeEnd;
    const buffer = (rangeEnd - rangeStart) * 0.1;
    const visStart = rangeStart - buffer;
    const visEnd = rangeEnd + buffer;

    const { steps, segments } = this.timeline;
    const startIdx = Math.max(0, stepAt(steps, visStart).segment - 1);
    const endIdx = Math.min(segments.length - 1, stepAt(steps, visEnd).segment + 1);

    const zoomScale = calculateZoomScale(rangeStart, rangeEnd, this._totalDuration);

    return { rangeStart, rangeEnd, visStart, visEnd, startIdx, endIdx, zoomScale };
  }

  _buildLayers({
    inputTreeTicks,
    baselines,
    separators,
    inputTreePoints,
    activeInputTreeTicks,
    selectionInputTrees,
    hoverInputTrees,
    pairStrip,
    width,
    height,
  }) {
    const theme = TIMELINE_THEME;
    const colors = this.colors;

    return [
      createSeparatorLayer(
        separators,
        calculateSeparatorWidth(this.timeline.segments.length),
        colors.grid
      ),
      createBaselineLayer(baselines, colors.axis),
      createInputTreeTickLayer(inputTreeTicks, colors.mark),
      createInputTreeTickLayer(activeInputTreeTicks, colors.selection, true),
      createPairMarkLayer('pair-mark-layer', pairStrip.marks, colors.mark),
      createPairMarkLayer('pair-hover-layer', pairStrip.hoverMarks, colors.hover),
      // The selection draws over the playhead line so it stays visible; the knob tops everything
      ...createScrubberLayers(
        this.scrubberMs,
        this._rangeStart,
        this._rangeEnd,
        width,
        height,
        this.scrubbing,
        colors
      ),
      createPairMarkLayer('pair-selection-layer', pairStrip.selectionMarks, colors.selection),
      createPairMarkLayer('pair-selection-span-layer', pairStrip.selectionSpan, colors.selection),
      // Circles sit on the baseline, so they draw over the bars they overlap
      createInputTreeLayer(inputTreePoints, theme.inputTreeStrokeWidth, colors),
      createInputTreeHoverLayer(hoverInputTrees, colors),
      createInputTreeSelectionLayer(selectionInputTrees, colors),
      createPairPipLayer('pair-pip-layer', pairStrip.pips, colors.markStrong),
      createPairPipLayer('pair-selection-pip-layer', pairStrip.selectionPips, colors.selection),
      createScrubberKnobLayer(
        this.scrubberMs,
        this._rangeStart,
        this._rangeEnd,
        width,
        height,
        colors.playhead
      ),
    ];
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Cleans up all resources: deck.gl instance, DOM elements, event listeners, observers.
   */
  destroy() {
    // Finalizing while input handlers are still bound would let a late event reach a torn-down deck.
    this._detachInput?.();
    this._detachInput = null;

    teardownDeckRenderer({
      frameId: this._updateFrameId,
      resizeObserver: this._resizeObserver,
      deck: this.deck,
      element: this.canvas,
      label: '[TimelineView]',
    });
    this._updateFrameId = null;
    this._resizeObserver = null;
    this.deck = null;

    this.container = null;
    this._updateScheduled = false;
  }
}
