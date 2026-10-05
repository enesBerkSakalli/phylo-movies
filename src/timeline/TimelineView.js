// Load timeline styles only in browser environments to keep Node-based tests happy
if (typeof document !== 'undefined') {
  import('../css/movie-timeline/container.css');
}
import { Deck, OrthographicView } from '@deck.gl/core';
import { teardownDeckRenderer } from '../lib/deckTeardown.js';
import {
  TIMELINE_THEME,
  createPathLayer,
  createBaselineLayer,
  createInputTreeTickLayer,
  createInputTreeLayer,
  createPairMarkLayer,
  createPairPipLayer,
  createInputTreeHoverLayer,
  createInputTreeSelectionLayer,
  createSeparatorLayer,
  createScrubberLayer,
  calculateSeparatorWidth,
} from './deckLayers.js';
import { msToX, xToMs, calculateZoomScale } from './math/coordinateUtils.js';
import { getSegmentBounds, timeToSegmentIndex } from './utils/segmentTiming.js';
import { getDevicePixelRatio, processSegments, projectPairStrip } from './stripGeometry.js';
import { attachTimelineInput } from './timelineInput.js';

/**
 * The timeline strip, drawn with deck.gl: input trees as circles or ticks, each transition pair as
 * an RF bar with SPR-move pips, and the scrubber handle. It draws what it is told (`selected`,
 * `hovered`, `scrubbing`, the scrubber time) and owns only the zoom range; the gestures it hears
 * go out through the callbacks, see timelineInput.
 */
export class TimelineView {
  /**
   * @param {Object} timeline - buildTimeline() result
   * @param {{spans: Object[], maxRf: number}} strip - per-pair geometry from buildPairSpans
   * @param {Object} callbacks - { onScrub, onSelect, onHover, onInspect }, see timelineInput
   */
  constructor(timeline, strip, callbacks) {
    this.timeline = timeline;
    this.strip = strip;
    this.callbacks = callbacks;
    this._inputTreeCount = timeline.segments.filter((segment) => segment.isInputTreeSegment).length;

    // DOM & deck.gl
    this.deck = null;
    this.container = null;
    this.canvas = null;
    this._onResize = () => this._scheduleUpdate();

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

    this._updateScheduled = false;
    this._updateFrameId = null;

    // Set by the input: a click on a hovered input-tree circle, as (segmentIndex, ms)
    this.onPick = null;
  }

  /**
   * Creates the canvas and deck.gl instance and starts listening.
   * @param {HTMLElement} container - DOM element to render into
   * @returns {TimelineView} This instance for chaining
   */
  init(container) {
    this._setupContainer(container);
    this._createLayers();
    this._createDeck();
    this._setupAccessibility();

    this.setCustomTime(0);
    this._updateLayers();

    window.addEventListener('resize', this._onResize);
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(() => this._scheduleUpdate());
      this._resizeObserver.observe(this.container);
    }
    this._detachInput = attachTimelineInput(this, this.callbacks);

    return this;
  }

  _setupContainer(container) {
    if (
      !window.getComputedStyle(container).position ||
      window.getComputedStyle(container).position === 'static'
    ) {
      container.style.position = 'relative';
    }
    this.container = container;

    this.canvas = document.createElement('div');
    this.canvas.style.cssText =
      'position:absolute;left:0;right:0;top:0;bottom:0;z-index:2;pointer-events:auto;';
    container.appendChild(this.canvas);
  }

  _createLayers() {
    this.separatorLayer = createSeparatorLayer([], TIMELINE_THEME);
    this.baselineLayer = createBaselineLayer([], TIMELINE_THEME);
    this.inputTreeTickLayer = createInputTreeTickLayer([], TIMELINE_THEME);
    this.activeInputTreeTickLayer = createInputTreeTickLayer([], TIMELINE_THEME, true);
    this.inputTreeLayer = createInputTreeLayer([], TIMELINE_THEME.inputTreeStrokeWidth);
    this.pairMarkLayer = createPairMarkLayer('pair-mark-layer', [], TIMELINE_THEME.stripMarkRGB);
    this.pairHoverLayer = createPairMarkLayer(
      'pair-hover-layer',
      [],
      TIMELINE_THEME.stripMarkHoverRGB
    );
    this.pairSelectionLayer = createPairMarkLayer(
      'pair-selection-layer',
      [],
      TIMELINE_THEME.connectionSelectionRGB
    );
    this.pairSelectionSpanLayer = createPairMarkLayer(
      'pair-selection-span-layer',
      [],
      TIMELINE_THEME.connectionSelectionRGB
    );
    this.pairPipLayer = createPairPipLayer(
      'pair-pip-layer',
      [],
      TIMELINE_THEME.stripPipRGB,
      TIMELINE_THEME.stripPipAlpha
    );
    this.pairSelectionPipLayer = createPairPipLayer(
      'pair-selection-pip-layer',
      [],
      TIMELINE_THEME.connectionSelectionRGB,
      TIMELINE_THEME.stripPipAlpha
    );
    this.inputTreeHoverLayer = createInputTreeHoverLayer(
      [],
      TIMELINE_THEME.connectionHoverRGB,
      (info) => this._pick(info)
    );
    this.inputTreeSelectionLayer = createInputTreeSelectionLayer([], TIMELINE_THEME);
    this.scrubberLayer = createPathLayer('scrubber-layer', [], [0, 0, 0, 0], 1);
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

  // The wrapper element is the keyboard-operable slider; deck.gl's own canvas
  // would otherwise be a second, unnamed tab stop inside it.
  _removeDeckCanvasFromTabOrder() {
    const deckCanvas = this.canvas?.querySelector?.('canvas');
    if (!deckCanvas) return;
    deckCanvas.setAttribute('tabindex', '-1');
    deckCanvas.setAttribute('aria-hidden', 'true');
  }

  // A hit on the hovered input-tree circle always picks that tree, even where the click's own
  // time would land in a neighbouring segment.
  _pick({ object, coordinate }) {
    if (object?.segmentIndex == null) return;
    const x = (coordinate?.[0] ?? object.position[0]) + this._width / 2;
    this.onPick?.(object.segmentIndex, this.xToMs(x));
  }

  // ==========================================================================
  // ACCESSIBILITY
  // ==========================================================================

  _setupAccessibility() {
    const target = this.canvas;
    target.setAttribute('tabindex', '0');
    target.setAttribute('role', 'slider');
    target.setAttribute('aria-label', 'Movie timeline position');
    target.setAttribute('aria-valuemin', '0');
    target.setAttribute('aria-valuemax', String(Math.round(this._totalDuration)));
    this._updateAccessibilityAttributes();
  }

  _updateAccessibilityAttributes() {
    this.canvas.setAttribute('aria-valuenow', String(Math.round(this.scrubberMs)));
    this.canvas.setAttribute('aria-valuetext', this._getAccessibilityValueText());
  }

  _getAccessibilityValueText() {
    const { segments } = this.timeline;
    const segmentIndex = timeToSegmentIndex(this.scrubberMs, this.timeline, { includeEnd: true });
    const segment = segments[segmentIndex];

    if (!segment) {
      return 'No timeline segment selected';
    }

    if (segment.isInputTreeSegment) {
      const treeNumber = Number.isInteger(segment.originalTreeIndex)
        ? segment.originalTreeIndex + 1
        : segmentIndex + 1;
      return `Input tree ${treeNumber} of ${this._inputTreeCount}`;
    }

    const transition = `Transition ${segment.pairOrdinal + 1} of ${this._inputTreeCount - 1}`;
    const trees = `tree ${segment.sourceInputTreeIndex + 1} to tree ${segment.targetInputTreeIndex + 1}`;
    const stepCount = segment.targetGlobalIndex - segment.sourceGlobalIndex - 1;
    const frameIndex = this.timeline.cursorAt(this.scrubberMs)?.frameIndex;
    if (stepCount < 1 || !Number.isInteger(frameIndex)) return `${transition}: ${trees}`;

    const step = Math.max(1, Math.min(stepCount, frameIndex - segment.sourceGlobalIndex));
    return `${transition}: ${trees}, step ${step} of ${stepCount}`;
  }

  // ==========================================================================
  // DRAWN STATE
  // ==========================================================================

  /**
   * Sets the scrubber position to a specific time.
   * @param {number} ms - Time in milliseconds (clamped to valid range)
   */
  setCustomTime(ms) {
    this.scrubberMs = Math.max(0, Math.min(ms, this._totalDuration));
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

  // ==========================================================================
  // ZOOM & COORDINATES
  // ==========================================================================

  /**
   * Scales the visible span, keeping `center` (default: the middle of the view) in the middle.
   * @param {number} factor - 0.8 shows 20% less time, 1.2 shows 20% more
   * @param {number} [center] - Time in milliseconds
   */
  zoom(factor, center = (this._rangeStart + this._rangeEnd) / 2) {
    const span = (this._rangeEnd - this._rangeStart) * factor;
    const newSpan = Math.max(1, Math.min(this._totalDuration, span));
    this._rangeStart = Math.max(0, center - newSpan / 2);
    this._rangeEnd = Math.min(this._totalDuration, center + newSpan / 2);
    this._scheduleUpdate();
  }

  zoomIn(pct = 0.2) {
    this.zoom(1 - pct);
  }

  zoomOut(pct = 0.2) {
    this.zoom(1 + pct);
  }

  /** Resets zoom to show the entire timeline. */
  fit() {
    this._rangeStart = 0;
    this._rangeEnd = this._totalDuration;
    this._scheduleUpdate();
  }

  // x is in px from the strip's left edge
  xToMs(x) {
    return xToMs(x, this._rangeStart, this._rangeEnd, this._width);
  }

  msToX(ms) {
    return msToX(ms, this._rangeStart, this._rangeEnd, this._width);
  }

  /** Viewport point on top of a segment's middle: where its tooltip hangs. */
  anchorOf(segmentIndex) {
    const { start, end } = getSegmentBounds(segmentIndex, this.timeline);
    const rect = this.container.getBoundingClientRect();
    return { x: rect.left + this.msToX((start + end) / 2), y: rect.top };
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
    const width = Math.max(1, Math.round(rect.width));
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
      theme: TIMELINE_THEME,
      timelineData: this.timeline,
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

    this.deck.setProps({ width, height, layers });
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
      theme: TIMELINE_THEME,
      hoverPairId: hoveredSegment?.isInputTreeSegment === false ? hoveredSegment.pairId : null,
      selectedPairId: selectedSegment?.isInputTreeSegment === false ? selectedSegment.pairId : null,
      selectedBounds:
        selectedSegment?.isInputTreeSegment === false
          ? getSegmentBounds(this.selected, this.timeline)
          : null,
    });
  }

  _computeVisibleRange() {
    const rangeStart = this._rangeStart;
    const rangeEnd = this._rangeEnd;
    const buffer = (rangeEnd - rangeStart) * 0.1;
    const visStart = rangeStart - buffer;
    const visEnd = rangeEnd + buffer;

    const startIdx = Math.max(0, timeToSegmentIndex(Math.max(0, visStart), this.timeline) - 1);
    const rawEndIdx = timeToSegmentIndex(Math.min(this._totalDuration - 1, visEnd), this.timeline);
    const endIdx = Math.min(this.timeline.segments.length - 1, rawEndIdx + 1);

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
    const separatorWidth = calculateSeparatorWidth(this.timeline.segments.length, theme);

    // Cache color arrays for updateTriggers (stable references for comparison)
    const hoverColor = [
      theme.connectionHoverRGB[0],
      theme.connectionHoverRGB[1],
      theme.connectionHoverRGB[2],
      160,
    ];
    const selectionColor = [
      theme.connectionSelectionRGB[0],
      theme.connectionSelectionRGB[1],
      theme.connectionSelectionRGB[2],
      230,
    ];

    return [
      this.separatorLayer.clone({
        data: separators,
        widthMinPixels: separatorWidth,
        updateTriggers: { getColor: [theme.separatorAlpha, theme.separatorDenseAlpha] },
      }),
      this.baselineLayer.clone({ data: baselines }),
      this.inputTreeTickLayer.clone({ data: inputTreeTicks }),
      this.activeInputTreeTickLayer.clone({ data: activeInputTreeTicks }),
      this.pairMarkLayer.clone({ data: pairStrip.marks }),
      this.pairHoverLayer.clone({ data: pairStrip.hoverMarks }),
      this.pairSelectionLayer.clone({ data: pairStrip.selectionMarks }),
      this.pairSelectionSpanLayer.clone({ data: pairStrip.selectionSpan }),
      // Circles sit on the baseline, so they draw over the bars they overlap
      this.inputTreeLayer.clone({
        data: inputTreePoints,
        lineWidthMinPixels: theme.inputTreeStrokeWidth,
      }),
      this.inputTreeHoverLayer.clone({
        data: hoverInputTrees,
        getLineColor: hoverColor,
        updateTriggers: { getLineColor: hoverColor },
      }),
      this.inputTreeSelectionLayer.clone({
        data: selectionInputTrees,
        getLineColor: selectionColor,
        updateTriggers: { getLineColor: selectionColor },
      }),
      this.pairPipLayer.clone({ data: pairStrip.pips }),
      this.pairSelectionPipLayer.clone({ data: pairStrip.selectionPips }),
      this.scrubberLayer.clone(
        createScrubberLayer(
          this.scrubberMs,
          this._rangeStart,
          this._rangeEnd,
          width,
          height,
          theme,
          this.scrubbing
        )
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

    window.removeEventListener('resize', this._onResize);

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
