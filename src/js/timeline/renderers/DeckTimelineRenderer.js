import '../../../css/movie-timeline/container.css';
import '../../../css/movie-timeline/theme.css';
import { Deck, OrthographicView } from '@deck.gl/core';
import { TIMELINE_CONSTANTS } from '../constants.js';
import { handleTimelineMouseMove, handleTimelineScrubMove, handleTimelineMouseMoveOrScrub, handleTimelineMouseDown, handleTimelineMouseUp, handleTimelineWheel, handleTimelineMouseLeave } from '../eventHandlers.js';
import { createPathLayer, createAnchorLayer, createConnectionLayer, createAnchorHoverLayer, createConnectionHoverLayer, createAnchorSelectionLayer, createConnectionSelectionLayer, createSeparatorLayer } from '../utils/layerUtils.js';
import { getTimelineTheme } from '../utils/cssUtils.js';
import { msToX, xToMs, calculateZoomScale } from '../utils/coordinateUtils.js';
import { timeToSegmentIndex } from '../utils/searchUtils.js';
import { getTargetSegmentIndex } from '../utils/segmentUtils.js';
import { createScrubberLayer, getDevicePixelRatio, createSnapFunction } from '../utils/renderingUtils.js';
import { DefaultRadiusStrategy } from '../strategies/radiusStrategy.js';
import { DefaultGapStrategy } from '../strategies/gapStrategy.js';
import { processSegments } from '../segmentProcessor.js';

export class DeckTimelineRenderer {
  constructor(timelineData, segments) {
    this.timelineData = timelineData;
    this.segments = segments || [];
    this.deck = null;
    this.container = null;
    this.canvas = null;
    this._handlers = new Map();
    this._selectedId = null;
    this._lastHoverId = null;
    this._isScrubbing = false;
    this._scrubThresholdPx = 10;
    this._onResize = () => this._scheduleUpdate();

    this._totalDuration = timelineData.totalDuration || 1;
    this._rangeStart = 0;
    this._rangeEnd = this._totalDuration;
    this._scrubberMs = 0;

    this._viewState = { target: [0, 0, 0], zoom: 0 };
    this._updateScheduled = false;

    // --- Pre-bind event handlers for stable references ---
    this._handleScrubMove = this._handleScrubMove.bind(this);
    this._handleMouseUp = this._handleMouseUp.bind(this);

    // --- Layer instances, initialized once ---
    this.separatorLayer = null;
    this.connectionLayer = null;
    this.anchorLayer = null;
    this.connectionHoverLayer = null;
    this.anchorHoverLayer = null;
    this.connectionSelectionLayer = null;
    this.anchorSelectionLayer = null;
    this.scrubberLayer = null;

    // Strategies (can be swapped for custom behaviors)
    this.radiusStrategy = DefaultRadiusStrategy;
    this.gapStrategy = DefaultGapStrategy;
  }

  init(container) {
    if (!window.getComputedStyle(container).position || window.getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }
    this.container = container;
    this.canvas = document.createElement('div');
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = '0';
    this.canvas.style.right = '0';
    this.canvas.style.top = '0';
    this.canvas.style.bottom = '0';
    this.canvas.style.zIndex = '2';
    this.canvas.style.pointerEvents = 'auto';
    container.appendChild(this.canvas);

    // --- Create layer instances one time with empty data ---
    const initialTheme = getTimelineTheme(this.container);
    this.separatorLayer = createSeparatorLayer([], initialTheme);
    this.connectionLayer = createConnectionLayer([], initialTheme.connectionWidth);
    this.anchorLayer = createAnchorLayer([], initialTheme.anchorStrokeWidth);
    this.connectionHoverLayer = createConnectionHoverLayer([], initialTheme.connectionHoverRGB, initialTheme.connectionHoverWidth);
    this.anchorHoverLayer = createAnchorHoverLayer([], initialTheme.connectionHoverRGB);
    this.connectionSelectionLayer = createConnectionSelectionLayer([], initialTheme);
    this.anchorSelectionLayer = createAnchorSelectionLayer([], initialTheme);
    // Initialize scrubberLayer as a proper PathLayer instance
    this.scrubberLayer = createPathLayer('scrubber-layer', [], [0, 0, 0, 0], 1);

    const rect = container.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);

    this.deck = new Deck({
      parent: this.canvas,
      views: [new OrthographicView({
        id: 'ortho',
        flipY: false,
        near: 0.1,
        far: 1000
      })],
      controller: false,
      viewState: this._viewState,
      width,
      height,
      useDevicePixels: getDevicePixelRatio(),
      layers: [],
      onViewStateChange: () => {},
      glOptions: {
        alpha: true,
        preserveDrawingBuffer: true
      }
    });

    this.addCustomTime(TIMELINE_CONSTANTS.DEFAULT_PROGRESS, 'scrubber');

    this._updateLayers();
    window.addEventListener('resize', this._onResize);
    if (window.ResizeObserver) {
      this._resizeObserver = new ResizeObserver(() => this._scheduleUpdate());
      this._resizeObserver.observe(this.container);
    }
    this._bindMouseEvents();

    return this;
  }

  setScrubbing(enabled) {
    this._isScrubbing = !!enabled;
    this._scheduleUpdate();
  }

  on(event, handler) {
    if (!this._handlers.has(event)) this._handlers.set(event, new Set());
    this._handlers.get(event).add(handler);
  }

  off(event, handler) {
    const set = this._handlers.get(event);
    if (set) set.delete(handler);
  }

  addCustomTime(ms, id) {
    const value = typeof ms === 'number' ? ms : TIMELINE_CONSTANTS.DEFAULT_PROGRESS;
    this._scrubberMs = Math.max(0, Math.min(value, this._totalDuration));
    this._scheduleUpdate();
  }

  setCustomTime(ms, id) {
    this._scrubberMs = Math.max(0, Math.min(ms, this._totalDuration));
    this._scheduleUpdate();
  }
  setSelection(ids) {
    this._selectedId = Array.isArray(ids) && ids.length ? ids[0] : null;
    this._updateLayers();
  }
  zoomIn(pct) {
    const span = this._rangeEnd - this._rangeStart;
    const newSpan = Math.max(1, span * (1 - pct));
    const center = (this._rangeStart + this._rangeEnd) / 2;
    this._rangeStart = Math.max(0, center - newSpan / 2);
    this._rangeEnd = Math.min(this._totalDuration, center + newSpan / 2);
    this._scheduleUpdate();
  }
  zoomOut(pct) {
    const span = this._rangeEnd - this._rangeStart;
    const newSpan = Math.min(this._totalDuration, span * (1 + pct));
    const center = (this._rangeStart + this._rangeEnd) / 2;
    this._rangeStart = Math.max(0, center - newSpan / 2);
    this._rangeEnd = Math.min(this._totalDuration, center + newSpan / 2);
    this._scheduleUpdate();
  }
  fit() {
    // This now works by updating the internal range state
    // and letting _updateLayers calculate the correct viewState.
    this._rangeStart = 0;
    this._rangeEnd = this._totalDuration;
    this._scheduleUpdate();
  }

  // --- THE FIX: Add the missing public methods ---

  /**
   * Returns the total duration of the timeline.
   * @returns {number} The total duration in milliseconds.
   */
  getTotalDuration() {
    return this._totalDuration;
  }

  /**
   * Calculates and returns the currently visible time range.
   * @returns {{min: number, max: number}|null} An object with min and max time, or null if not available.
   */
  getVisibleTimeRange() {
    // Use internal range state instead of trying to reverse-engineer from viewState
    return { 
      min: this._rangeStart, 
      max: this._rangeEnd 
    };
  }

  // --- END FIX ---

  moveTo(ms) {
    // Pan the view to show 'ms' at the start, preserving current zoom level (span)
    const span = this._rangeEnd - this._rangeStart;
    const newStart = Math.max(0, Math.min(ms, this._totalDuration - span));
    const newEnd = newStart + span;

    this._rangeStart = newStart;
    this._rangeEnd = newEnd;
    this._scheduleUpdate();
  }

  destroy() {
    if (this.deck) {
      this.deck.finalize();
    }
    if (this.canvas?.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    window.removeEventListener('resize', this._onResize);
    if (this._resizeObserver) {
      try { this._resizeObserver.disconnect(); } catch {}
      this._resizeObserver = null;
    }
    this.deck = null;
    this.container = null;
    this._handlers.clear();
  }

  _updateLayers() {
    if (!this.deck) return;
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));

    this._width = width;

    const theme = getTimelineTheme(this.container);

    const rangeStart = this._rangeStart;
    const rangeEnd = this._rangeEnd;
    const buffer = (rangeEnd - rangeStart) * 0.1;
    const visStart = rangeStart - buffer;
    const visEnd = rangeEnd + buffer;

    const startIdx = Math.max(0, timeToSegmentIndex(Math.max(0, visStart), this.timelineData.cumulativeDurations) - 1);

    const endIdx = Math.min(this.segments.length - 1, timeToSegmentIndex(Math.min(this._totalDuration - 1, visEnd), this.timelineData.cumulativeDurations) + 1);

    const zoomScale = calculateZoomScale(rangeStart, rangeEnd, this._totalDuration);

    const {
      separators,
      anchorPoints,
      selectionAnchors,
      hoverAnchors,
      connections,
      selectionConnections,
      hoverConnections
    } = processSegments(
      {
        startIdx, endIdx, width, height, visStart, visEnd, zoomScale, theme,
        timelineData: this.timelineData,
        segments: this.segments,
        selectedId: this._selectedId,
        lastHoverId: this._lastHoverId,
        rangeStart: this._rangeStart,
        rangeEnd: this._rangeEnd
      },
      {
        radiusStrategy: this.radiusStrategy,
        gapStrategy: this.gapStrategy
      }
    );

    // --- Clone layers with new data and props ---
    const layers = [
      this.separatorLayer.clone({ data: separators, getColor: [theme.separatorRGB[0], theme.separatorRGB[1], theme.separatorRGB[2], 120], widthMinPixels: theme.separatorWidth }),
      this.connectionLayer.clone({ data: connections, widthMinPixels: theme.connectionWidth }),
      this.connectionHoverLayer.clone({ data: hoverConnections, getColor: [theme.connectionHoverRGB[0], theme.connectionHoverRGB[1], theme.connectionHoverRGB[2], 160], widthMinPixels: theme.connectionHoverWidth }),
      this.connectionSelectionLayer.clone({ data: selectionConnections, getColor: [theme.connectionSelectionRGB[0], theme.connectionSelectionRGB[1], theme.connectionSelectionRGB[2], 230], widthMinPixels: theme.connectionSelectionWidth }),
      this.scrubberLayer.clone(createScrubberLayer(this._scrubberMs, this._rangeStart, this._rangeEnd, width, height, theme, this._isScrubbing)),
      // Anchor layers on top to ensure circles are always visible
      this.anchorLayer.clone({ data: anchorPoints, lineWidthMinPixels: theme.anchorStrokeWidth }),
      this.anchorHoverLayer.clone({ data: hoverAnchors, getLineColor: [theme.connectionHoverRGB[0], theme.connectionHoverRGB[1], theme.connectionHoverRGB[2], 160] }),
      this.anchorSelectionLayer.clone({ data: selectionAnchors, getLineColor: [theme.connectionSelectionRGB[0], theme.connectionSelectionRGB[1], theme.connectionSelectionRGB[2], 230] })
    ];

    this.deck.setProps({
      width,
      height,
      layers,
      viewState: this._viewState
    });
    this._updateScheduled = false;
  }

  _handleMouseMove(event) {
    handleTimelineMouseMove(this, event);
  }

  _handleClick(event) {
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

  // --- Add handler methods to call the external logic ---
  _handleScrubMove(event) {
    handleTimelineScrubMove(this, event);
  }

  _handleMouseUp() {
    handleTimelineMouseUp(this);
  }

  _timeToSegmentIndex(ms) {
    return timeToSegmentIndex(ms, this.timelineData.cumulativeDurations);
  }

  _xToMs(x) {
    return xToMs(x, this._rangeStart, this._rangeEnd, this._width);
  }

  _msToX(ms) {
    return msToX(ms, this._rangeStart, this._rangeEnd, this._width);
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

  _bindMouseEvents() {
    const eventConfigs = [
      { event: 'mousemove', handler: (e) => handleTimelineMouseMoveOrScrub(this, e), target: this.canvas },
      { event: 'mousedown', handler: (e) => handleTimelineMouseDown(this, e), target: this.canvas },
      { event: 'mouseup', handler: () => this._handleMouseUp(), target: window },
      { event: 'click', handler: (e) => this._handleClick(e), target: this.canvas },
      { event: 'wheel', handler: (e) => handleTimelineWheel(this, e), target: this.canvas, options: { passive: false } },
      { event: 'mouseleave', handler: () => handleTimelineMouseLeave(this), target: this.canvas }
    ];

    // Add event listeners
    eventConfigs.forEach(({ event, handler, target, options }) => {
      target.addEventListener(event, handler, options);
    });

    // Create unbind function
    this._unbindMouseEvents = () => {
      eventConfigs.forEach(({ event, handler, target, options }) => {
        target.removeEventListener(event, handler, options);
      });
    };
  }

  _scheduleUpdate() {
    if (this._updateScheduled) return;
    this._updateScheduled = true;
    requestAnimationFrame(() => this._updateLayers());
  }
}
