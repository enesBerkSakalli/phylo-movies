// Load timeline styles only in browser environments to keep Node-based tests happy
if (typeof document !== 'undefined') {
  import('../../css/movie-timeline/container.css');
}
import { Deck, OrthographicView } from '@deck.gl/core';
import { teardownDeckRenderer } from '../../lib/deckTeardown.js';
import { TIMELINE_THEME } from '../constants.js';
import {
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
  getDevicePixelRatio,
  calculateSeparatorWidth,
} from '../utils/layerFactories.js';
import { msToX, xToMs, calculateZoomScale } from '../math/coordinateUtils.js';
import {
  getSegmentBounds,
  timeToSegmentIndex,
  toSegmentIndex,
  toTimelineItemId,
} from '../utils/segmentTiming.js';
import { getTargetSegmentIndex } from '../utils/segmentUtils.js';
import { processSegments } from '../data/segmentProcessor.js';
import { projectPairStrip } from '../data/pairStripGeometry.js';

const HOVER_CLEAR_DELAY_MS = 150;

/**
 * WebGL-based timeline renderer using deck.gl.
 * Renders input trees as circles or ticks and each transition pair as an RF bar with SPR-move pips,
 * with scrubber, hover, and selection states.
 * Supports zoom, pan, and scrubbing interactions.
 */
export class DeckTimelineRenderer {
  // ==========================================================================
  // CONSTRUCTOR
  // ==========================================================================

  /**
   * Creates a new timeline renderer instance.
   * @param {Object} timelineData - Timeline metadata containing durations
   * @param {number} timelineData.totalDuration - Total duration in milliseconds
   * @param {number[]} timelineData.segmentDurations - Duration of each segment
   * @param {number[]} timelineData.cumulativeDurations - Cumulative end times for each segment
   * @param {Object[]} segments - Array of segment objects to render
   * @param {Object} [pairStrip] - Per-pair geometry from buildPairSpans (omitted: no pair marks)
   * @param {Object[]} pairStrip.spans
   * @param {number} pairStrip.maxRf
   * @param {(ms: number) => number|null} [pairStrip.getFrameIndexAtMs] - Frame shown at a time
   */
  constructor(timelineData, segments, pairStrip = null) {
    this._validateConstructorArgs(timelineData, segments);

    this.timelineData = timelineData;
    this.segments = segments;
    this.pairStrip = pairStrip;
    this._inputTreeCount = segments.filter((segment) => segment.isInputTreeSegment).length;

    // DOM & deck.gl
    this.deck = null;
    this.container = null;
    this.canvas = null;

    // Event handling
    this._handlers = new Map();
    this._onResize = () => this._scheduleUpdate();

    // Interaction state
    this._selectedSegmentIndex = null;
    this._lastHoverId = null;
    this._getIsScrubbing = () => false;
    this._setHoveredSegment = () => {};
    this._scrubThresholdPx = 24;
    this._wasScrubbingOnMouseDown = false;
    this._hoverTimeoutId = null;

    // Timeline range
    this._totalDuration = timelineData.totalDuration;
    this._rangeStart = 0;
    this._rangeEnd = this._totalDuration;
    this._scrubberMs = 0;

    // Rendering
    this._updateScheduled = false;
    this._updateFrameId = null;
    this._width = 0;

    // Bound handlers (for stable references)
    this._boundHoverClick = (info) => this._handleHoverLayerClick(info);

    // Layer instances (initialized in init())
    this.separatorLayer = null;
    this.inputTreeLayer = null;
    this.inputTreeHoverLayer = null;
    this.inputTreeSelectionLayer = null;
    this.scrubberLayer = null;
  }

  _validateConstructorArgs(timelineData, segments) {
    if (!timelineData || typeof timelineData !== 'object') {
      throw new Error('[DeckTimelineRenderer] Invalid timelineData: must be an object');
    }
    if (typeof timelineData.totalDuration !== 'number' || timelineData.totalDuration <= 0) {
      throw new Error(
        '[DeckTimelineRenderer] Invalid timelineData.totalDuration: must be a positive number'
      );
    }
    if (!Array.isArray(timelineData.segmentDurations)) {
      throw new Error(
        '[DeckTimelineRenderer] Invalid timelineData.segmentDurations: must be an array'
      );
    }
    if (!Array.isArray(timelineData.cumulativeDurations)) {
      throw new Error(
        '[DeckTimelineRenderer] Invalid timelineData.cumulativeDurations: must be an array'
      );
    }
    if (!Array.isArray(segments)) {
      throw new Error('[DeckTimelineRenderer] Invalid segments: must be an array');
    }
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initializes the renderer by creating the canvas, deck.gl instance, and binding events.
   * @param {HTMLElement} container - DOM element to render into
   * @returns {DeckTimelineRenderer} This instance for chaining
   */
  init(container) {
    this._setupContainer(container);
    this._createLayers();
    this._createDeck();
    this._setupAccessibility();

    this.setCustomTime(0);
    this._updateLayers();

    this._bindResizeObservers();
    this._bindMouseEvents();

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
      this._boundHoverClick
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

  _setupAccessibility() {
    const target = this.canvas;
    if (!target?.setAttribute) return;

    target.setAttribute('tabindex', '0');
    target.setAttribute('role', 'slider');
    target.setAttribute('aria-label', 'Movie timeline position');
    target.setAttribute('aria-valuemin', '0');
    target.setAttribute('aria-valuemax', String(Math.round(this._totalDuration)));
    this._updateAccessibilityAttributes();
  }

  _updateAccessibilityAttributes() {
    const target = this.canvas;
    if (!target?.setAttribute) return;

    const valueNow = Math.round(this._scrubberMs);

    target.setAttribute('aria-valuenow', String(valueNow));
    target.setAttribute('aria-valuetext', this._getAccessibilityValueText());
  }

  _getAccessibilityValueText() {
    const segmentIndex = this._timeToSegmentIndex(this._scrubberMs, { includeEnd: true });
    const segment = segmentIndex >= 0 ? this.segments[segmentIndex] : null;

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
    const frameIndex = this.pairStrip?.getFrameIndexAtMs?.(this._scrubberMs);
    if (stepCount < 1 || !Number.isInteger(frameIndex)) return `${transition}: ${trees}`;

    const step = Math.max(1, Math.min(stepCount, frameIndex - segment.sourceGlobalIndex));
    return `${transition}: ${trees}, step ${step} of ${stepCount}`;
  }

  _bindResizeObservers() {
    window.addEventListener('resize', this._onResize);
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(() => this._scheduleUpdate());
      this._resizeObserver.observe(this.container);
    }
  }

  // ==========================================================================
  // PUBLIC API: Scrubber & Selection
  // ==========================================================================

  /**
   * Sets the scrubber position to a specific time.
   * @param {number} ms - Time in milliseconds (clamped to valid range)
   */
  setCustomTime(ms) {
    this._scrubberMs = Math.max(0, Math.min(ms, this._totalDuration));
    this._updateAccessibilityAttributes();
    this._scheduleUpdate();
  }

  bindScrubState({ getIsScrubbing } = {}) {
    this._getIsScrubbing = typeof getIsScrubbing === 'function' ? getIsScrubbing : () => false;
    this._scheduleUpdate();
  }

  bindHoverState({ setHoveredSegment } = {}) {
    this._setHoveredSegment =
      typeof setHoveredSegment === 'function' ? setHoveredSegment : () => {};
  }

  setHoveredSegment(segmentIndex, segmentData = null, position = null) {
    this._setHoveredSegment(segmentIndex, segmentData, position);
  }

  isScrubbing() {
    return Boolean(this._getIsScrubbing?.());
  }

  syncScrubState() {
    this._scheduleUpdate();
  }

  /**
   * Sets the inspected segment. This is user selection, not the active playhead segment.
   * @param {number|null} segmentIndex - Zero-based segment index or null to clear
   */
  setSelectedSegment(segmentIndex) {
    this._selectedSegmentIndex =
      Number.isInteger(segmentIndex) && segmentIndex >= 0 && segmentIndex < this.segments.length
        ? segmentIndex
        : null;
    this._updateLayers();
  }

  // ==========================================================================
  // PUBLIC API: Zoom & Pan
  // ==========================================================================

  /**
   * Zooms in by reducing the visible time range, centered on current view.
   * @param {number} pct - Zoom factor (0.2 = 20% reduction in visible span)
   */
  zoomIn(pct) {
    const span = this._rangeEnd - this._rangeStart;
    this._setZoomedSpan(Math.max(1, span * (1 - pct)));
  }

  /**
   * Zooms out by expanding the visible time range, centered on current view.
   * @param {number} pct - Zoom factor (0.2 = 20% increase in visible span)
   */
  zoomOut(pct) {
    const span = this._rangeEnd - this._rangeStart;
    this._setZoomedSpan(Math.min(this._totalDuration, span * (1 + pct)));
  }

  /**
   * Applies a new visible-range span, centered on the current view.
   * @param {number} newSpan - The new span, already clamped by the caller.
   */
  _setZoomedSpan(newSpan) {
    const center = (this._rangeStart + this._rangeEnd) / 2;
    this._rangeStart = Math.max(0, center - newSpan / 2);
    this._rangeEnd = Math.min(this._totalDuration, center + newSpan / 2);
    this._scheduleUpdate();
  }

  /**
   * Resets zoom to show the entire timeline.
   */
  fit() {
    this._rangeStart = 0;
    this._rangeEnd = this._totalDuration;
    this._scheduleUpdate();
  }

  // ==========================================================================
  // PUBLIC API: Events
  // ==========================================================================

  /**
   * Registers an event handler for timeline events.
   * @param {string} event - Event name ('scrubstart', 'timechange', 'timechanged', 'select', 'inspect')
   * @param {Function} handler - Callback function receiving event payload
   */
  on(event, handler) {
    if (!this._handlers.has(event)) this._handlers.set(event, new Set());
    this._handlers.get(event).add(handler);
  }

  // ==========================================================================
  // EVENT HANDLING
  // ==========================================================================

  _bindMouseEvents() {
    const pointerTarget = this.deck?.canvas ?? this.canvas;
    const eventConfigs = [
      {
        event: 'mousemove',
        handler: (e) => this._handleMouseMoveOrScrub(e),
        target: pointerTarget,
      },
      { event: 'mousedown', handler: (e) => this._handleMouseDown(e), target: pointerTarget },
      { event: 'mouseup', handler: () => this._handleMouseUp(), target: window },
      { event: 'click', handler: (e) => this._handleClick(e), target: pointerTarget },
      { event: 'dblclick', handler: (e) => this._handleDoubleClick(e), target: pointerTarget },
      { event: 'keydown', handler: (e) => this._handleKeyDown(e), target: pointerTarget },
      {
        event: 'wheel',
        handler: (e) => this._handleWheel(e),
        target: pointerTarget,
        options: { passive: false },
      },
      { event: 'mouseleave', handler: () => this._handleMouseLeave(), target: pointerTarget },
    ];

    eventConfigs.forEach(({ event, handler, target, options }) => {
      target.addEventListener(event, handler, options);
    });

    this._unbindMouseEvents = () => {
      eventConfigs.forEach(({ event, handler, target, options }) => {
        target.removeEventListener(event, handler, options);
      });
    };
  }

  _handleMouseMoveOrScrub(event) {
    if (this.isScrubbing()) {
      this._handleTimelineScrubMove(event);
      return;
    }

    this._handleTimelineMouseMove(event);
  }

  _handleTimelineMouseMove(event) {
    const rect = this.container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const ms = this._xToMs(x);
    const segIndex = this._timeToSegmentIndex(ms);
    const id = segIndex >= 0 ? toTimelineItemId(segIndex) : null;

    if (id !== this._lastHoverId) {
      if (this._lastHoverId != null) this._scheduleHoveredSegmentClear();

      if (id != null) {
        this._clearHoverTimeout();
        this._publishHoveredSegment(segIndex, rect);
      }

      this._lastHoverId = id;
      this._scheduleUpdate();
    } else if (id != null) {
      this._publishHoveredSegment(segIndex, rect);
    }
  }

  _publishHoveredSegment(segIndex, rect) {
    const segment = this.segments[segIndex];
    const bounds = getSegmentBounds(segIndex, this.timelineData);
    if (!segment || !bounds) return;

    const startX = this._msToX(bounds.start);
    const endX = this._msToX(bounds.end);
    const centerX = (startX + endX) / 2;

    this.setHoveredSegment(segIndex, segment, {
      x: rect.left + centerX,
      y: rect.top,
    });
  }

  _handleTimelineScrubMove(event) {
    const rect = this.container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const ms = Math.max(0, Math.min(this._xToMs(x), this._totalDuration));

    this._scrubberMs = ms;
    this._updateAccessibilityAttributes();
    this._emit('timechange', { id: 'scrubber', time: ms });
    this._scheduleUpdate();
  }

  _handleMouseDown(event) {
    const rect = this.container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const scrubX = this._msToX(this._scrubberMs);
    const distance = Math.abs(x - scrubX);

    if (distance < this._scrubThresholdPx) {
      this._wasScrubbingOnMouseDown = true;
      this._emit('scrubstart', { id: 'scrubber', time: this._scrubberMs });
      this.syncScrubState();
      return;
    }

    this._wasScrubbingOnMouseDown = false;
  }

  _handleClick(event) {
    if (this._wasScrubbingOnMouseDown) {
      this._wasScrubbingOnMouseDown = false;
      return;
    }

    const rect = this.container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const clickMs = this._xToMs(x);
    const initialSegIndex = this._timeToSegmentIndex(clickMs);

    if (initialSegIndex === -1) {
      this.setSelectedSegment(null);
      this._emit('select', { id: null, segmentIndex: null });
      return;
    }

    const targetIndex = getTargetSegmentIndex(
      initialSegIndex,
      clickMs,
      this.segments,
      this.timelineData.cumulativeDurations
    );
    this._selectSegment(targetIndex, clickMs);
  }

  // A double-click on a transition asks for its inspector; the clicks before it already selected it.
  _handleDoubleClick(event) {
    const rect = this.container.getBoundingClientRect();
    const clickMs = this._xToMs(event.clientX - rect.left);
    const segmentIndex = getTargetSegmentIndex(
      this._timeToSegmentIndex(clickMs),
      clickMs,
      this.segments,
      this.timelineData.cumulativeDurations
    );
    const segment = this.segments[segmentIndex];
    if (!segment || segment.isInputTreeSegment) return;

    this._selectSegment(segmentIndex, clickMs);
    this._emit('inspect', { segmentIndex, segment });
  }

  _handleKeyDown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    const targetIndex = this._getKeyboardTargetSegmentIndex(event.key);
    if (targetIndex === null) return;

    event.preventDefault();
    const bounds = getSegmentBounds(targetIndex, this.timelineData);
    const targetMs = bounds ? (bounds.start + bounds.end) / 2 : this._scrubberMs;
    this._scrubberMs = Math.max(0, Math.min(targetMs, this._totalDuration));
    this._updateAccessibilityAttributes();
    this._selectSegment(targetIndex, this._scrubberMs);
    this._scheduleUpdate();
  }

  _getKeyboardTargetSegmentIndex(key) {
    const lastIndex = this.segments.length - 1;
    if (lastIndex < 0) return null;

    if (key === 'Home') return 0;
    if (key === 'End') return lastIndex;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight') return null;

    const currentIndex = Number.isInteger(this._selectedSegmentIndex)
      ? this._selectedSegmentIndex
      : Math.max(0, this._timeToSegmentIndex(this._scrubberMs));
    const delta = key === 'ArrowRight' ? 1 : -1;
    return Math.max(0, Math.min(lastIndex, currentIndex + delta));
  }

  _handleMouseUp() {
    if (this.isScrubbing()) {
      this.syncScrubState();
      this._emit('timechanged', { id: 'scrubber', time: this._scrubberMs });
    }
  }

  _handleWheel(event) {
    const rect = this.container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const msCenter = this._xToMs(x);
    const span = this._rangeEnd - this._rangeStart;
    const delta = Math.sign(event.deltaY) < 0 ? -0.2 : 0.2;
    const newSpan = Math.max(1, Math.min(this._totalDuration, span * (1 + delta)));

    this._rangeStart = Math.max(0, msCenter - newSpan / 2);
    this._rangeEnd = Math.min(this._totalDuration, msCenter + newSpan / 2);
    this._scheduleUpdate();
    event.preventDefault();
  }

  _handleMouseLeave() {
    if (this._lastHoverId == null) return;

    this._scheduleHoveredSegmentClear();
    this._lastHoverId = null;
    this._scheduleUpdate();
  }

  _clearHoverTimeout() {
    if (this._hoverTimeoutId !== null) {
      clearTimeout(this._hoverTimeoutId);
      this._hoverTimeoutId = null;
    }
  }

  _scheduleHoveredSegmentClear() {
    this._clearHoverTimeout();
    this._hoverTimeoutId = setTimeout(() => {
      this._hoverTimeoutId = null;
      this.setHoveredSegment(null, null);
    }, HOVER_CLEAR_DELAY_MS);
  }

  _handleHoverLayerClick(info) {
    if (!info?.object?.id) return;

    const targetIndex = Number.isInteger(info.object.segmentIndex)
      ? info.object.segmentIndex
      : toSegmentIndex(info.object.id);
    const targetId = info.object.id;
    const segment = this.segments[targetIndex];

    if (targetIndex >= 0 && targetIndex < this.segments.length) {
      this._selectSegment(targetIndex, this._getClickMsFromPickingInfo(info), targetId, segment);
    }
  }

  _selectSegment(
    segmentIndex,
    ms,
    id = toTimelineItemId(segmentIndex),
    segment = this.segments[segmentIndex]
  ) {
    if (!Number.isInteger(segmentIndex) || segmentIndex < 0 || segmentIndex >= this.segments.length)
      return;

    this.setSelectedSegment(segmentIndex);
    this._emit('select', {
      id,
      segmentIndex,
      ms,
      segment,
    });
  }

  _getClickMsFromPickingInfo(info) {
    const coordinateX = Array.isArray(info?.coordinate) ? info.coordinate[0] : null;
    if (Number.isFinite(coordinateX)) {
      return this._xToMs(coordinateX + this._width / 2);
    }

    const positionX = Array.isArray(info?.object?.position) ? info.object.position[0] : null;
    if (Number.isFinite(positionX)) {
      return this._xToMs(positionX + this._width / 2);
    }

    return null;
  }

  _emit(event, payload) {
    const set = this._handlers.get(event);
    if (!set) return;
    for (const h of set) {
      try {
        h(payload);
      } catch (e) {
        console.error(`Error in timeline event handler for '${event}':`, e);
      }
    }
  }

  // ==========================================================================
  // COORDINATE CONVERSION
  // ==========================================================================

  _timeToSegmentIndex(ms, options) {
    return timeToSegmentIndex(ms, this.timelineData, options);
  }

  _xToMs(x) {
    return xToMs(x, this._rangeStart, this._rangeEnd, this._width);
  }

  _msToX(ms) {
    return msToX(ms, this._rangeStart, this._rangeEnd, this._width);
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
      timelineData: this.timelineData,
      segments: this.segments,
      selectedSegmentIndex: this._selectedSegmentIndex,
      lastHoverId: this._lastHoverId,
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
    const hoveredSegment = this.segments[toSegmentIndex(this._lastHoverId)];
    const selectedSegment = this.segments[this._selectedSegmentIndex];
    return projectPairStrip({
      ...view,
      spans: this.pairStrip?.spans ?? [],
      maxRf: this.pairStrip?.maxRf ?? 0,
      theme: TIMELINE_THEME,
      hoverPairId: hoveredSegment?.isInputTreeSegment === false ? hoveredSegment.pairId : null,
      selectedPairId: selectedSegment?.isInputTreeSegment === false ? selectedSegment.pairId : null,
      selectedBounds:
        selectedSegment?.isInputTreeSegment === false
          ? getSegmentBounds(this._selectedSegmentIndex, this.timelineData)
          : null,
    });
  }

  _computeVisibleRange() {
    const rangeStart = this._rangeStart;
    const rangeEnd = this._rangeEnd;
    const buffer = (rangeEnd - rangeStart) * 0.1;
    const visStart = rangeStart - buffer;
    const visEnd = rangeEnd + buffer;

    const startIdx = Math.max(0, timeToSegmentIndex(Math.max(0, visStart), this.timelineData) - 1);
    const rawEndIdx = timeToSegmentIndex(
      Math.min(this._totalDuration - 1, visEnd),
      this.timelineData
    );
    const endIdx = Math.min(this.segments.length - 1, rawEndIdx + 1);

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
    const separatorWidth = calculateSeparatorWidth(this.segments?.length || 0, theme);

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
          this._scrubberMs,
          this._rangeStart,
          this._rangeEnd,
          width,
          height,
          theme,
          this.isScrubbing()
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
    if (this._hoverTimeoutId !== null) {
      clearTimeout(this._hoverTimeoutId);
      this._hoverTimeoutId = null;
    }

    if (this._unbindMouseEvents) {
      this._unbindMouseEvents();
      this._unbindMouseEvents = null;
    }

    window.removeEventListener('resize', this._onResize);

    teardownDeckRenderer({
      frameId: this._updateFrameId,
      resizeObserver: this._resizeObserver,
      deck: this.deck,
      element: this.canvas,
      label: '[DeckTimelineRenderer]',
    });
    this._updateFrameId = null;
    this._resizeObserver = null;
    this.deck = null;

    this.container = null;
    this._lastHoverId = null;
    this._updateScheduled = false;
    this._handlers.clear();
  }
}
