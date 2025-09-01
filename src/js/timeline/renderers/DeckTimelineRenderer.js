// Pure deck.gl-based timeline renderer (no vis-timeline dependency)
import '../../../css/movie-timeline/container.css';
import '../../../css/timeline-segments.css';
import '../../../css/movie-timeline/scrubber.css';
import { Deck, OrthographicView, COORDINATE_SYSTEM } from '@deck.gl/core';
import { SolidPolygonLayer, PathLayer, TextLayer } from '@deck.gl/layers';
import { TIMELINE_CONSTANTS } from '../constants.js';
import { TimelineDataProcessor } from '../TimelineDataProcessor.js';

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
    this._scrubThresholdPx = 6;
    this._onResize = () => this._scheduleUpdate();
    this._colorCache = new Map();

    // Time window and scrubber state
    this._totalDuration = timelineData.totalDuration || 1;
    this._rangeStart = 0;
    this._rangeEnd = this._totalDuration;
    this._scrubberMs = 0;

    // Deck view state and update scheduling
    this._viewState = { target: [0, 0, 0], zoom: 0 };
    this._updateScheduled = false;
  }

  init(container) {
    // Ensure container is positioned for absolute overlay
    const pos = window.getComputedStyle(container).position;
    if (!pos || pos === 'static') {
      container.style.position = 'relative';
    }
    // Create overlay canvas for deck.gl
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

    // Prepare a hidden probe element for CSS color extraction
    this._colorProbe = document.createElement('div');
    this._colorProbe.style.position = 'absolute';
    this._colorProbe.style.visibility = 'hidden';
    this._colorProbe.style.pointerEvents = 'none';
    this._colorProbe.style.width = '1px';
    this._colorProbe.style.height = '1px';
    container.appendChild(this._colorProbe);

    const rect = container.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);

    this.deck = new Deck({
      parent: this.canvas,
      views: [new OrthographicView({ 
        id: 'ortho',
        flipY: false,  // Use bottom-left origin like WebGL
        near: 0.1,
        far: 1000
      })],
      controller: false,
      viewState: this._viewState,
      width,
      height,
      layers: [],
      onViewStateChange: () => {},
      glOptions: { 
        alpha: true,
        preserveDrawingBuffer: true  // Helps with overlay rendering
      }
    });

    // Initial scrubber
    this.addCustomTime(TIMELINE_CONSTANTS.DEFAULT_PROGRESS, 'scrubber');

    // Initial render + listeners
    this._updateLayers();
    window.addEventListener('resize', this._onResize);
    this._bindMouseEvents();

    return this;
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
    if (!this._scrubberEl) {
      this._scrubberEl = document.createElement('div');
      this._scrubberEl.className = 'deck-scrubber';
      this._scrubberEl.style.position = 'absolute';
      this._scrubberEl.style.top = '0';
      this._scrubberEl.style.bottom = '0';
      this._scrubberEl.style.width = '0px';
      this._scrubberEl.style.borderLeft = '2px solid rgba(255,255,255,0.8)';
      this._scrubberEl.style.zIndex = '3';
      this._scrubberEl.style.pointerEvents = 'none';
      this.container.appendChild(this._scrubberEl);
    }
    this._positionScrubberElement();
    this._scheduleUpdate();
  }

  setCustomTime(ms, id) {
    this._scrubberMs = Math.max(0, Math.min(ms, this._totalDuration));
    this._positionScrubberElement();
    this._scheduleUpdate();
  }
  setSelection(ids) {
    this._selectedId = Array.isArray(ids) && ids.length ? ids[0] : null;
    this._updateLayers();
  }
  zoomIn(pct) {
    const factor = Math.max(0.05, Math.min(0.95, pct || 0.3));
    const span = this._rangeEnd - this._rangeStart;
    const newSpan = Math.max(1, span * (1 - factor));
    const center = (this._rangeStart + this._rangeEnd) / 2;
    this._rangeStart = Math.max(0, center - newSpan / 2);
    this._rangeEnd = Math.min(this._totalDuration, center + newSpan / 2);
    this._scheduleUpdate();
  }
  zoomOut(pct) {
    const factor = Math.max(0.05, Math.min(0.95, pct || 0.3));
    const span = this._rangeEnd - this._rangeStart;
    const newSpan = Math.min(this._totalDuration, span * (1 + factor));
    const center = (this._rangeStart + this._rangeEnd) / 2;
    this._rangeStart = Math.max(0, center - newSpan / 2);
    this._rangeEnd = Math.min(this._totalDuration, center + newSpan / 2);
    this._scheduleUpdate();
  }
  fit() {
    this._rangeStart = 0;
    this._rangeEnd = this._totalDuration;
    this._scheduleUpdate();
  }
  moveTo(ms) {
    const span = this._rangeEnd - this._rangeStart;
    const center = Math.max(0, Math.min(ms, this._totalDuration));
    this._rangeStart = Math.max(0, center - span / 2);
    this._rangeEnd = Math.min(this._totalDuration, center + span / 2);
    this._scheduleUpdate();
  }

  destroy() {
    if (this._unbindMouseEvents) this._unbindMouseEvents();
    this.deck?.finalize();
    if (this.canvas?.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    if (this._colorProbe?.parentNode) this._colorProbe.parentNode.removeChild(this._colorProbe);
    window.removeEventListener('resize', this._onResize);
    this.deck = null;
    this.container = null;
    this._handlers.clear();
  }

  // Private helpers
  _updateLayers() {
    if (!this.deck) return;
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);

    // Build polygons for visible segments using our ms→px mapping
    const polys = [];
    const borders = [];
    const hoverBorders = [];
    const hoverFills = [];
    const { cumulativeDurations, segmentDurations } = this.timelineData;
    const rangeStart = this._rangeStart;
    const rangeEnd = this._rangeEnd;
    const buffer = (rangeEnd - rangeStart) * 0.1;
    const visStart = rangeStart - buffer;
    const visEnd = rangeEnd + buffer;

    const maxDuration = Math.max(...segmentDurations, 1);

    // Only iterate visible indices using binary search window
    const startIdx = Math.max(0, this._timeToSegmentIndex(Math.max(0, visStart)) - 1);
    const endIdx = Math.min(this.segments.length - 1, this._timeToSegmentIndex(Math.min(this._totalDuration - 1, visEnd)) + 1);
    for (let i = startIdx; i <= endIdx; i++) {
      const segStart = i === 0 ? 0 : cumulativeDurations[i - 1];
      const segEnd = cumulativeDurations[i];
      if (segEnd < visStart || segStart > visEnd) continue;

      let x0 = this._msToX(segStart, width);
      let x1 = this._msToX(segEnd, width);
      
      // Make anchor points scale inversely with the number of segments
      if (this.segments[i]?.isFullTree) {
        const center = (x0 + x1) / 2;
        // Scale anchor width based on total segment count
        // More segments = smaller anchors
        const segmentCount = this.segments.length;
        const scaleFactor = Math.max(0.02, Math.min(0.1, 1.0 / segmentCount)); // Between 2% and 10%
        const minWidth = Math.max(10, 200 / segmentCount); // Minimum width scales with segment count
        const anchorWidth = Math.max(minWidth, width * scaleFactor);
        x0 = center - anchorWidth / 2;
        x1 = center + anchorWidth / 2;
      }
      
      const poly = [
        [x0 - width / 2, -height / 2],
        [x1 - width / 2, -height / 2],
        [x1 - width / 2, height / 2],
        [x0 - width / 2, height / 2]
      ];
      const colorClass = TimelineDataProcessor.getSegmentColorClass(
        this.segments[i],
        null,
        segmentDurations[i],
        maxDuration
      );
      // Anchor points: distinctive color to stand out as boundaries
      let fillColor;
      if (this.segments[i]?.isFullTree) {
        fillColor = [60, 60, 80, 255]; // Darker blue-gray for anchor points to be more visible
      } else {
        // Compute gradient color based on subtree movement count normalized to global min/max
        const count = this.segments[i]?.subtreeMoveCount ?? 0;
        const { minSubtreeMoves, maxSubtreeMoves } = this.timelineData;
        fillColor = this._colorFromGradient(count, minSubtreeMoves, maxSubtreeMoves) || this._colorFromClass(colorClass);
      }
      // Make anchor points have more prominent borders
      const borderColor = this.segments[i]?.isFullTree 
        ? [255, 255, 255, 255]  // White border for anchor points to really stand out
        : this._borderFromFill(fillColor);

      polys.push({ id: i + 1, polygon: poly, fillColor, borderColor });

      const id = i + 1;
      if (this._selectedId === id) {
        borders.push({ id, polygon: poly });
      } else if (this._lastHoverId === id) {
        hoverBorders.push({ id, polygon: poly });
        hoverFills.push({ id, polygon: poly });
      }
    }

    const segmentLayer = new SolidPolygonLayer({
      id: 'segments-layer',
      data: polys,
      filled: true,
      stroked: true,
      getPolygon: d => d.polygon,
      getFillColor: d => d.fillColor,
      getLineColor: d => d.borderColor,
      getLineWidth: d => {
        // Make anchor points have much thicker borders
        const segment = this.segments[d.id - 1];
        return segment?.isFullTree ? 3 : 1;
      },
      pickable: false,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      parameters: { depthTest: false }
    });

    const selectionLayer = new SolidPolygonLayer({
      id: 'selection-layer',
      data: borders,
      filled: false,
      stroked: true,
      getPolygon: d => d.polygon,
      getLineColor: [255, 255, 255, 230],
      getLineWidth: 3,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      parameters: { depthTest: false }
    });

    const hoverFillLayer = new SolidPolygonLayer({
      id: 'hover-fill-layer',
      data: hoverFills,
      filled: true,
      stroked: false,
      getPolygon: d => d.polygon,
      getFillColor: [255, 255, 255, 40],
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      parameters: { depthTest: false }
    });

    const hoverBorderLayer = new SolidPolygonLayer({
      id: 'hover-border-layer',
      data: hoverBorders,
      filled: false,
      stroked: true,
      getPolygon: d => d.polygon,
      getLineColor: [255, 255, 255, 160],
      getLineWidth: 1,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      parameters: { depthTest: false }
    });

    // Scrubber line at current customTime
    const scrubX = this._msToX(this._scrubberMs, width);
    const scrubPoly = [
      [scrubX - width / 2, -height / 2],
      [scrubX - width / 2, height / 2]
    ];
    const scrubberLayer = new PathLayer({
      id: 'scrubber-layer',
      data: [{ path: scrubPoly }],
      getPath: d => d.path,
      getColor: this._isScrubbing ? [255, 255, 255, 255] : [255, 255, 255, 180],
      widthMinPixels: this._isScrubbing ? 3 : 2,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      parameters: { depthTest: false }
    });

    // Axis ticks and labels
    const { tickLines, tickLabels } = this._buildTicks(width, height);
    const tickLayer = new PathLayer({
      id: 'tick-layer',
      data: tickLines,
      getPath: d => d.path,
      getColor: [180, 180, 180, 160],
      widthMinPixels: 1,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      parameters: { depthTest: false }
    });
    const labelLayer = new TextLayer({
      id: 'label-layer',
      data: tickLabels,
      getPosition: d => d.pos,
      getText: d => d.text,
      getSize: 10,
      getColor: [200, 200, 200, 200],
      background: true,
      backgroundPadding: [2, 2],
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'top',
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      parameters: { depthTest: false }
    });

    this.deck.setProps({
      width,
      height,
      layers: [segmentLayer, hoverFillLayer, hoverBorderLayer, selectionLayer, scrubberLayer, tickLayer, labelLayer],
      viewState: this._viewState
    });
    this._updateScheduled = false;
  }

  _handleMouseMove(event) {
    const rect = this.container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const ms = this._xToMs(x, rect.width);
    const segIndex = this._timeToSegmentIndex(ms);
    const id = segIndex >= 0 ? segIndex + 1 : null;
    
    if (id !== this._lastHoverId) {
      // itemout for previous
      if (this._lastHoverId != null) {
        this._emit('itemout', {});
      }
      if (id != null) {
        this._emit('itemover', { item: id, event });
      }
      this._lastHoverId = id;
      this._scheduleUpdate();
    }
    this._emit('mouseMove', { event });
  }

  _handleClick(event) {
    const rect = this.container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    let ms = this._xToMs(x, rect.width);
    let segIndex = this._timeToSegmentIndex(ms);
    
    if (segIndex >= 0 && segIndex < this.segments.length) {
      const segment = this.segments[segIndex];
      
      // If clicking on an anchor point, find the nearest interpolation segment
      if (segment?.isFullTree) {
        const { cumulativeDurations } = this.timelineData;
        const segStart = segIndex === 0 ? 0 : cumulativeDurations[segIndex - 1];
        const segEnd = cumulativeDurations[segIndex];
        const clickPos = ms;
        
        // Find nearest non-anchor segment
        let targetIndex = segIndex;
        
        // Check previous segment
        if (segIndex > 0 && !this.segments[segIndex - 1]?.isFullTree) {
          const prevEnd = segIndex > 1 ? cumulativeDurations[segIndex - 2] : 0;
          const prevDist = Math.abs(clickPos - (cumulativeDurations[segIndex - 1] + prevEnd) / 2);
          targetIndex = segIndex - 1;
          
          // Check next segment too
          if (segIndex < this.segments.length - 1 && !this.segments[segIndex + 1]?.isFullTree) {
            const nextEnd = cumulativeDurations[segIndex + 1];
            const nextDist = Math.abs(clickPos - (segEnd + nextEnd) / 2);
            if (nextDist < prevDist) {
              targetIndex = segIndex + 1;
            }
          }
        } else if (segIndex < this.segments.length - 1 && !this.segments[segIndex + 1]?.isFullTree) {
          // Only next segment is available
          targetIndex = segIndex + 1;
        }
        
        segIndex = targetIndex;
      }
      
      const id = segIndex + 1;
      this._emit('click', { item: id, event });
      this._selectedId = id;
      this._scheduleUpdate();
    }
  }

  _timeToSegmentIndex(ms) {
    const { cumulativeDurations } = this.timelineData;
    if (!cumulativeDurations?.length) return -1;
    // Binary search
    let lo = 0, hi = cumulativeDurations.length - 1, ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (ms < cumulativeDurations[mid]) {
        ans = mid; hi = mid - 1;
      } else {
        lo = mid + 1;
      }
    }
    return ans;
  }

  _emit(event, payload) {
    const set = this._handlers.get(event);
    if (!set) return;
    for (const h of set) {
      try { h(payload); } catch {}
    }
  }

  _bindMouseEvents() {
    const onMove = (e) => {
      if (this._isScrubbing) {
        this._handleScrubMove(e);
      } else {
        this._handleMouseMove(e);
      }
    };
    const onDown = (e) => {
      const rect = this.container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const scrubX = this._msToX(this._scrubberMs, rect.width);
      if (Math.abs(x - scrubX) <= this._scrubThresholdPx) {
        this._isScrubbing = true;
        if (this._scrubberEl) this._scrubberEl.classList.add('scrubbing');
        this._emit('timechange', { id: 'scrubber', time: new Date(this._scrubberMs) });
        e.preventDefault();
      }
    };
    const onUp = () => {
      if (this._isScrubbing) {
        this._isScrubbing = false;
        if (this._scrubberEl) this._scrubberEl.classList.remove('scrubbing');
        this._emit('timechanged', { id: 'scrubber', time: new Date(this._scrubberMs) });
      }
    };
    const onClick = (e) => this._handleClick(e);
    const onWheel = (e) => {
      const rect = this.container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const msCenter = this._xToMs(x, rect.width);
      const span = this._rangeEnd - this._rangeStart;
      const delta = Math.sign(e.deltaY) < 0 ? -0.2 : 0.2; // zoom step
      const newSpan = Math.max(1, Math.min(this._totalDuration, span * (1 + delta)));
      this._rangeStart = Math.max(0, msCenter - newSpan / 2);
      this._rangeEnd = Math.min(this._totalDuration, msCenter + newSpan / 2);
      this._scheduleUpdate();
      e.preventDefault();
    };
    const onLeave = () => {
      if (this._lastHoverId != null) {
        this._emit('itemout', {});
        this._lastHoverId = null;
        this._scheduleUpdate();
      }
    };

    this.canvas.addEventListener('mousemove', onMove);
    this.canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    this.canvas.addEventListener('click', onClick);
    this.canvas.addEventListener('wheel', onWheel, { passive: false });
    this.canvas.addEventListener('mouseleave', onLeave);

    this._unbindMouseEvents = () => {
      this.canvas.removeEventListener('mousemove', onMove);
      this.canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      this.canvas.removeEventListener('click', onClick);
      this.canvas.removeEventListener('wheel', onWheel);
      this.canvas.removeEventListener('mouseleave', onLeave);
    };
  }

  _handleScrubMove(e) {
    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let ms = Math.max(0, Math.min(this._xToMs(x, rect.width), this._totalDuration));
    
    // Snap through anchor points - find the segment at this time
    const segIndex = this._timeToSegmentIndex(ms);
    if (segIndex >= 0 && segIndex < this.segments.length) {
      const segment = this.segments[segIndex];
      
      // If we're on an anchor point (full tree), snap to the next/previous interpolation segment
      if (segment?.isFullTree) {
        const { cumulativeDurations } = this.timelineData;
        const segStart = segIndex === 0 ? 0 : cumulativeDurations[segIndex - 1];
        const segEnd = cumulativeDurations[segIndex];
        const segMid = (segStart + segEnd) / 2;
        
        // Determine direction of scrubbing based on position relative to segment center
        if (ms < segMid) {
          // Moving backwards - snap to end of previous segment if it exists and is not an anchor
          if (segIndex > 0 && !this.segments[segIndex - 1]?.isFullTree) {
            ms = cumulativeDurations[segIndex - 1] - 1; // Just before this anchor
          }
        } else {
          // Moving forwards - snap to start of next segment if it exists and is not an anchor
          if (segIndex < this.segments.length - 1 && !this.segments[segIndex + 1]?.isFullTree) {
            ms = segEnd + 1; // Just after this anchor
          }
        }
      }
    }
    
    this._scrubberMs = ms;
    this._positionScrubberElement();
    this._emit('timechange', { id: 'scrubber', time: new Date(this._scrubberMs) });
    this._scheduleUpdate();
  }

  _positionScrubberElement() {
    if (!this._scrubberEl) return;
    const rect = this.container.getBoundingClientRect();
    const x = this._msToX(this._scrubberMs, rect.width);
    this._scrubberEl.style.left = `${Math.round(x)}px`;
  }

  _msToX(ms, width) {
    const t = (ms - this._rangeStart) / Math.max(1, (this._rangeEnd - this._rangeStart));
    return t * width;
  }

  _xToMs(x, width) {
    const t = x / Math.max(1, width);
    return this._rangeStart + t * (this._rangeEnd - this._rangeStart);
  }

  _buildTicks(width, height) {
    const span = Math.max(1, this._rangeEnd - this._rangeStart);
    const pxPerMs = width / span;
    const targetPx = 90;
    const targetMs = targetPx / Math.max(1e-6, pxPerMs);
    const steps = [1,2,5,10,20,50,100,200,500,1000,2000,5000,10000,20000,30000,60000,120000,300000,600000,1800000,3600000];
    const step = steps.find(s => s >= targetMs) || steps[steps.length - 1];
    const startTick = Math.floor(this._rangeStart / step) * step;
    const endTick = Math.ceil(this._rangeEnd / step) * step;
    const tickLines = [];
    const tickLabels = [];
    for (let t = startTick; t <= endTick; t += step) {
      const x = this._msToX(t, width) - width/2;
      tickLines.push({ path: [[x, -height/2], [x, -height/2 + 6]] });
      tickLabels.push({ pos: [x, -height/2 + 8], text: this._formatMs(t) });
    }
    return { tickLines, tickLabels };
  }

  _formatMs(ms) {
    if (ms >= 3600000) return `${(ms/3600000).toFixed(1)}h`;
    if (ms >= 60000) return `${(ms/60000).toFixed(1)}m`;
    if (ms >= 1000) return `${(ms/1000).toFixed(1)}s`;
    return `${Math.round(ms)}ms`;
  }

  _scheduleUpdate() {
    if (this._updateScheduled) return;
    this._updateScheduled = true;
    requestAnimationFrame(() => this._updateLayers());
  }

  _colorFromClass(cls) {
    // Try CSS-derived color (border-color preferred due to gradients)
    if (this._colorCache.has(cls)) return this._colorCache.get(cls);

    const rgb = this._getCssColor(cls);
    if (rgb) {
      this._colorCache.set(cls, rgb);
      return rgb;
    }

    // Fallback static palette approximating CSS
    const map = {
      'timeline-full-tree': [33, 33, 33, 255],
      'timeline-interp-minimal': [129, 199, 132, 255],
      'timeline-interp-light': [255, 213, 79, 255],
      'timeline-interp-moderate': [255, 183, 77, 255],
      'timeline-interp-heavy': [255, 138, 101, 255],
      'timeline-interp-massive': [239, 83, 80, 255],
      'timeline-segment-default': [149, 165, 166, 255]
    };
    return map[cls] || [160, 160, 160, 220];
  }

  _colorFromGradient(value, minV, maxV) {
    try {
      if (!isFinite(minV) || !isFinite(maxV) || maxV <= minV) {
        // Degenerate scale: return a neutral color
        return [129, 199, 132, 255]; // greenish
      }
      const t = Math.max(0, Math.min(1, (value - minV) / (maxV - minV)));
      // Map t: 0 -> green (h=120), 1 -> red (h=0). Convert to RGB.
      const h = (1 - t) * 120; // degrees
      const s = 0.85; // saturation
      const l = 0.55; // lightness
      const rgb = this._hslToRgb(h, s, l);
      return [rgb[0], rgb[1], rgb[2], 255];
    } catch {
      return [129, 199, 132, 255];
    }
  }

  _hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hp = h / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    let r = 0, g = 0, b = 0;
    if (hp >= 0 && hp < 1) { r = c; g = x; b = 0; }
    else if (hp < 2) { r = x; g = c; b = 0; }
    else if (hp < 3) { r = 0; g = c; b = x; }
    else if (hp < 4) { r = 0; g = x; b = c; }
    else if (hp < 5) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    const m = l - c / 2;
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }

  _getCssColor(cls) {
    try {
      if (!this._colorProbe) return null;
      this._colorProbe.className = cls;
      const style = window.getComputedStyle(this._colorProbe);
      // Prefer border-color as it is a solid color for gradients
      let color = style.borderColor || style.borderTopColor;
      if (!color || color === 'rgba(0, 0, 0, 0)') {
        color = style.backgroundColor;
      }
      const rgba = this._parseCssColor(color);
      return rgba;
    } catch {
      return null;
    }
  }

  _parseCssColor(str) {
    if (!str) return null;
    // rgb(a) string -> [r,g,b,a]
    const rgbaMatch = str.match(/rgba?\(([^)]+)\)/i);
    if (rgbaMatch) {
      const parts = rgbaMatch[1].split(',').map(s => s.trim());
      const r = parseInt(parts[0], 10) || 0;
      const g = parseInt(parts[1], 10) || 0;
      const b = parseInt(parts[2], 10) || 0;
      const a = parts[3] !== undefined ? Math.round(parseFloat(parts[3]) * 255) : 255;
      return [r, g, b, a];
    }
    // Hex #rrggbb
    const hexMatch = str.match(/^#([0-9a-f]{6})$/i);
    if (hexMatch) {
      const hex = hexMatch[1];
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return [r, g, b, 255];
    }
    return null;
  }

  _borderFromFill(fill) {
    try {
      const r = Math.max(0, Math.min(255, Math.round((fill?.[0] ?? 160) * 0.6)));
      const g = Math.max(0, Math.min(255, Math.round((fill?.[1] ?? 160) * 0.6)));
      const b = Math.max(0, Math.min(255, Math.round((fill?.[2] ?? 160) * 0.6)));
      const a = 220;
      return [r, g, b, a];
    } catch {
      return [40, 40, 40, 180];
    }
  }
}
