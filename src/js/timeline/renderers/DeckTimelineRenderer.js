// Load timeline styles only in browser environments to keep Node-based tests happy
if (typeof document !== 'undefined') {
  import('../../../css/movie-timeline/container.css');
}
import { Deck, OrthographicView } from '@deck.gl/core';
import { TIMELINE_CONSTANTS, TIMELINE_THEME } from '../constants.js';
import { handleTimelineMouseMoveOrScrub, handleTimelineMouseDown, handleTimelineMouseUp, handleTimelineWheel, handleTimelineMouseLeave } from '../events/eventHandlers.js';
import { createPathLayer, createAnchorLayer, createConnectionLayer, createAnchorHoverLayer, createConnectionHoverLayer, createAnchorSelectionLayer, createConnectionSelectionLayer, createSeparatorLayer, createScrubberLayer, getDevicePixelRatio, calculateSeparatorWidth } from '../utils/layerFactories.js';
import { msToX, xToMs, calculateZoomScale } from '../math/coordinateUtils.js';
import { timeToSegmentIndex } from '../utils/searchUtils.js';
import { getTargetSegmentIndex } from '../utils/segmentUtils.js';
import { processSegments } from '../data/segmentProcessor.js';

/**
 * WebGL-based timeline renderer using deck.gl.
 * Renders segments as anchors (circles) and connections (lines), with scrubber, hover, and selection states.
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
   */
  constructor(timelineData, segments) {
    this._validateConstructorArgs(timelineData, segments);

    this.timelineData = timelineData;
    this.segments = segments;

    // DOM & deck.gl
    this.deck = null;
    this.container = null;
    this.canvas = null;

    // Event handling
    this._handlers = new Map();
    this._onResize = () => this._scheduleUpdate();

    // Interaction state
    this._selectedId = null;
    this._lastHoverId = null;
    this._isScrubbing = false;
    this._scrubThresholdPx = 10;
    this._wasScrubbingOnMouseDown = false;

    // Timeline range
    this._totalDuration = timelineData.totalDuration;
    this._rangeStart = 0;
    this._rangeEnd = this._totalDuration;
    this._scrubberMs = 0;

    // Rendering
    this._updateScheduled = false;
    this._width = 0;

    // Bound handlers (for stable references)
    this._boundHoverClick = (info) => this._handleHoverLayerClick(info);

    // Layer instances (initialized in init())
    this.separatorLayer = null;
    this.connectionLayer = null;
    this.anchorLayer = null;
    this.connectionHoverLayer = null;
    this.anchorHoverLayer = null;
    this.connectionSelectionLayer = null;
    this.anchorSelectionLayer = null;
    this.scrubberLayer = null;
  }

  _validateConstructorArgs(timelineData, segments) {
    if (!timelineData || typeof timelineData !== 'object') {
      throw new Error('[DeckTimelineRenderer] Invalid timelineData: must be an object');
    }
    if (typeof timelineData.totalDuration !== 'number' || timelineData.totalDuration <= 0) {
      throw new Error('[DeckTimelineRenderer] Invalid timelineData.totalDuration: must be a positive number');
    }
    if (!Array.isArray(timelineData.segmentDurations)) {
      throw new Error('[DeckTimelineRenderer] Invalid timelineData.segmentDurations: must be an array');
    }
    if (!Array.isArray(timelineData.cumulativeDurations)) {
      throw new Error('[DeckTimelineRenderer] Invalid timelineData.cumulativeDurations: must be an array');
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

    this.setCustomTime(TIMELINE_CONSTANTS.DEFAULT_PROGRESS);
    this._updateLayers();

    this._bindResizeObservers();
    this._bindMouseEvents();

    return this;
  }

  _setupContainer(container) {
    if (!window.getComputedStyle(container).position || window.getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }
    this.container = container;

    this.canvas = document.createElement('div');
    this.canvas.style.cssText = 'position:absolute;left:0;right:0;top:0;bottom:0;z-index:2;pointer-events:auto;';
    container.appendChild(this.canvas);
  }

  _createLayers() {
    this.separatorLayer = createSeparatorLayer([], TIMELINE_THEME);
    this.connectionLayer = createConnectionLayer([], TIMELINE_THEME.connectionWidth);
    this.anchorLayer = createAnchorLayer([], TIMELINE_THEME.anchorStrokeWidth);
    this.connectionHoverLayer = createConnectionHoverLayer([], TIMELINE_THEME.connectionHoverRGB, TIMELINE_THEME.connectionHoverWidth, this._boundHoverClick);
    this.anchorHoverLayer = createAnchorHoverLayer([], TIMELINE_THEME.connectionHoverRGB, this._boundHoverClick);
    this.connectionSelectionLayer = createConnectionSelectionLayer([], TIMELINE_THEME);
    this.anchorSelectionLayer = createAnchorSelectionLayer([], TIMELINE_THEME);
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
      onViewStateChange: () => { },
      glOptions: { alpha: true, preserveDrawingBuffer: true }
    });
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
    this._scheduleUpdate();
  }

  /**
   * Sets the scrubbing state. When true, the scrubber is visually highlighted.
   * @param {boolean} enabled - Whether scrubbing is active
   */
  setScrubbing(enabled) {
    this._isScrubbing = enabled;
    this._scheduleUpdate();
  }

  /**
   * Sets the selected segment(s). Only the first ID is used.
   * @param {number[]|null} ids - Array of segment IDs (1-indexed) or null to clear
   */
  setSelection(ids) {
    this._selectedId = Array.isArray(ids) && ids.length ? ids[0] : null;
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
    const newSpan = Math.max(1, span * (1 - pct));
    const center = (this._rangeStart + this._rangeEnd) / 2;
    this._rangeStart = Math.max(0, center - newSpan / 2);
    this._rangeEnd = Math.min(this._totalDuration, center + newSpan / 2);
    this._scheduleUpdate();
  }

  /**
   * Zooms out by expanding the visible time range, centered on current view.
   * @param {number} pct - Zoom factor (0.2 = 20% increase in visible span)
   */
  zoomOut(pct) {
    const span = this._rangeEnd - this._rangeStart;
    const newSpan = Math.min(this._totalDuration, span * (1 + pct));
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

  /**
   * Pans the view so the given time is at the left edge, preserving zoom level.
   * @param {number} ms - Target time in milliseconds for left edge
   */
  moveTo(ms) {
    const span = this._rangeEnd - this._rangeStart;
    const newStart = Math.max(0, Math.min(ms, this._totalDuration - span));
    this._rangeStart = newStart;
    this._rangeEnd = newStart + span;
    this._scheduleUpdate();
  }

  // ==========================================================================
  // PUBLIC API: Getters
  // ==========================================================================

  /**
   * Returns the total duration of the timeline in milliseconds.
   * @returns {number} Total duration
   */
  getTotalDuration() {
    return this._totalDuration;
  }

  /**
   * Returns the currently visible time range.
   * @returns {{min: number, max: number}} Visible range in milliseconds
   */
  getVisibleTimeRange() {
    return { min: this._rangeStart, max: this._rangeEnd };
  }

  // ==========================================================================
  // PUBLIC API: Events
  // ==========================================================================

  /**
   * Registers an event handler for timeline events.
   * @param {string} event - Event name ('timechange', 'timechanged', 'select', 'itemover', 'itemout', 'mouseMove')
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
    const eventConfigs = [
      { event: 'mousemove', handler: (e) => handleTimelineMouseMoveOrScrub(this, e), target: this.canvas },
      { event: 'mousedown', handler: (e) => handleTimelineMouseDown(this, e), target: this.canvas },
      { event: 'mouseup', handler: () => this._handleMouseUp(), target: window },
      { event: 'click', handler: (e) => this._handleClick(e), target: this.canvas },
      { event: 'wheel', handler: (e) => handleTimelineWheel(this, e), target: this.canvas, options: { passive: false } },
      { event: 'mouseleave', handler: () => handleTimelineMouseLeave(this), target: this.canvas }
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
      this.setSelection(null);
      this._emit('select', { id: null });
      return;
    }

    const targetIndex = getTargetSegmentIndex(initialSegIndex, clickMs, this.segments, this.timelineData.cumulativeDurations);
    const targetId = targetIndex + 1;

    this.setSelection([targetId]);
    this._emit('select', { id: targetId, ms: clickMs, segment: this.segments[targetIndex] });
  }

  _handleMouseUp() {
    handleTimelineMouseUp(this);
  }

  _handleHoverLayerClick(info) {
    if (!info?.object?.id) return;

    const targetIndex = info.object.id - 1;
    const targetId = info.object.id;
    const segment = this.segments[targetIndex];

    if (targetIndex >= 0 && targetIndex < this.segments.length) {
      this.setSelection([targetId]);
      this._emit('select', { id: targetId, segment });
    }
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

  _timeToSegmentIndex(ms) {
    return timeToSegmentIndex(ms, this.timelineData.cumulativeDurations);
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
    requestAnimationFrame(() => this._updateLayers());
  }

  _updateLayers() {
    if (!this.deck) return;

    const rect = this.container.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    this._width = width;

    const { rangeStart, rangeEnd, visStart, visEnd, startIdx, endIdx, zoomScale } = this._computeVisibleRange();

    const {
      separators, anchorPoints, selectionAnchors, hoverAnchors,
      connections, selectionConnections, hoverConnections
    } = processSegments({
      startIdx, endIdx, width, height, visStart, visEnd, zoomScale,
      theme: TIMELINE_THEME,
      timelineData: this.timelineData,
      segments: this.segments,
      selectedId: this._selectedId,
      lastHoverId: this._lastHoverId,
      rangeStart, rangeEnd
    });

    const layers = this._buildLayers({
      separators, anchorPoints, selectionAnchors, hoverAnchors,
      connections, selectionConnections, hoverConnections,
      width, height
    });

    this.deck.setProps({ width, height, layers });
    this._updateScheduled = false;
  }

  _computeVisibleRange() {
    const rangeStart = this._rangeStart;
    const rangeEnd = this._rangeEnd;
    const buffer = (rangeEnd - rangeStart) * 0.1;
    const visStart = rangeStart - buffer;
    const visEnd = rangeEnd + buffer;

    const startIdx = Math.max(0, timeToSegmentIndex(Math.max(0, visStart), this.timelineData.cumulativeDurations) - 1);
    const rawEndIdx = timeToSegmentIndex(Math.min(this._totalDuration - 1, visEnd), this.timelineData.cumulativeDurations);
    const endIdx = Math.min(this.segments.length - 1, rawEndIdx + 1);

    const zoomScale = calculateZoomScale(rangeStart, rangeEnd, this._totalDuration);

    return { rangeStart, rangeEnd, visStart, visEnd, startIdx, endIdx, zoomScale };
  }

  _buildLayers({ separators, anchorPoints, selectionAnchors, hoverAnchors, connections, selectionConnections, hoverConnections, width, height }) {
    const theme = TIMELINE_THEME;
    const separatorWidth = calculateSeparatorWidth(this.segments?.length || 0, theme);

    // Cache color arrays for updateTriggers (stable references for comparison)
    const separatorColor = [theme.separatorRGB[0], theme.separatorRGB[1], theme.separatorRGB[2], 80];
    const hoverColor = [theme.connectionHoverRGB[0], theme.connectionHoverRGB[1], theme.connectionHoverRGB[2], 160];
    const selectionColor = [theme.connectionSelectionRGB[0], theme.connectionSelectionRGB[1], theme.connectionSelectionRGB[2], 230];

    return [
      this.separatorLayer.clone({
        data: separators,
        getColor: separatorColor,
        widthMinPixels: separatorWidth,
        updateTriggers: { getColor: separatorColor }
      }),
      this.connectionLayer.clone({ data: connections, widthMinPixels: theme.connectionWidth }),
      this.connectionHoverLayer.clone({
        data: hoverConnections,
        getColor: hoverColor,
        widthMinPixels: theme.connectionHoverWidth,
        updateTriggers: { getColor: hoverColor }
      }),
      this.connectionSelectionLayer.clone({
        data: selectionConnections,
        getColor: selectionColor,
        widthMinPixels: theme.connectionSelectionWidth,
        updateTriggers: { getColor: selectionColor }
      }),
      this.scrubberLayer.clone(createScrubberLayer(this._scrubberMs, this._rangeStart, this._rangeEnd, width, height, theme, this._isScrubbing)),
      this.anchorLayer.clone({ data: anchorPoints, lineWidthMinPixels: theme.anchorStrokeWidth }),
      this.anchorHoverLayer.clone({
        data: hoverAnchors,
        getLineColor: hoverColor,
        updateTriggers: { getLineColor: hoverColor }
      }),
      this.anchorSelectionLayer.clone({
        data: selectionAnchors,
        getLineColor: selectionColor,
        updateTriggers: { getLineColor: selectionColor }
      })
    ];
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Cleans up all resources: deck.gl instance, DOM elements, event listeners, observers.
   */
  destroy() {
    if (this.deck) {
      this.deck.finalize();
      this.deck = null;
    }

    if (this.canvas?.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    if (this._unbindMouseEvents) {
      this._unbindMouseEvents();
      this._unbindMouseEvents = null;
    }

    window.removeEventListener('resize', this._onResize);

    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }

    this.container = null;
    this._handlers.clear();
  }
}
