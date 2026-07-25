/**
 * DeckGL-backed multiple sequence alignment viewer.
 */

import { Deck, OrthographicView, OrthographicController } from '@deck.gl/core';
import { calculateConsensus } from './utils/dataUtils.js';
import {
  buildCellData,
  createCellsLayers,
  getCellSampling,
  groupCellDataBySize,
} from './layers/cellsLayer.js';
import {
  createCurrentRegionBorderLayer,
  createPreviousRegionBorderLayer,
  buildRegionBorder,
} from './layers/regionBorderLayer.js';
import { createLettersLayer, buildTextData } from './layers/lettersLayer.js';
import { createRowLabelsLayer, buildRowLabels } from './layers/rowLabelsLayer.js';
import { createColumnAxisLayer, buildColumnAxis } from './layers/columnAxisLayer.js';
import { DEFAULT_MSA_VIEWER_OPTIONS, MSA_VIEWER_CONSTANTS } from './config.js';
import { clampViewState, getVisibleRange, getZoomScale } from './viewportUtils.js';
import {
  deriveSynchronizedViewStates,
  getCenteredViewState,
  getFitAlignmentViewState,
  getInitialAlignmentViewState,
} from './cameraUtils.js';
import { normalizeViewerRegion, resolveRegionTargetColumn } from './regionUtils.js';

function normalizeRegionOrNull(region, columnCount) {
  if (!region) return null;
  return normalizeViewerRegion(
    region.startCol ?? region.start,
    region.endCol ?? region.end,
    columnCount
  );
}

function regionsEqual(left, right) {
  if (left === right) return true;
  return Boolean(left && right && left.startCol === right.startCol && left.endCol === right.endCol);
}

function rangesEqual(left, right) {
  return Boolean(
    left &&
    right &&
    left.r0 === right.r0 &&
    left.r1 === right.r1 &&
    left.c0 === right.c0 &&
    left.c1 === right.c1
  );
}

function rangeContains(outer, inner) {
  return Boolean(
    outer &&
    inner &&
    outer.r0 <= inner.r0 &&
    outer.r1 >= inner.r1 &&
    outer.c0 <= inner.c0 &&
    outer.c1 >= inner.c1
  );
}

function samplingEqual(left, right) {
  return Boolean(left && right && left.rowStep === right.rowStep && left.colStep === right.colStep);
}

export class MSADeckGLViewer {
  constructor(container, options = {}) {
    this.container = container;
    const { rowColorMap = DEFAULT_MSA_VIEWER_OPTIONS.rowColorMap, ...restOptions } = options;
    this.options = {
      ...DEFAULT_MSA_VIEWER_OPTIONS,
      ...restOptions,
      // Ensure we never mutate the shared default map
      rowColorMap: { ...DEFAULT_MSA_VIEWER_OPTIONS.rowColorMap, ...rowColorMap },
    };

    this.state = {
      deckgl: null,
      seqs: [],
      type: 'protein',
      rows: 0,
      cols: 0,
      currentRegion: null,
      previousRegion: null,
      // Main view state
      viewState: { target: [0, 0, 0], zoom: 0 },
    };

    // Constants (centralised in config)
    this.DEFAULT_LABELS_WIDTH = MSA_VIEWER_CONSTANTS.DEFAULT_LABELS_WIDTH;
    this.LABELS_WIDTH = this.DEFAULT_LABELS_WIDTH;
    this.AXIS_HEIGHT = MSA_VIEWER_CONSTANTS.AXIS_HEIGHT;
    this.MIN_ZOOM = MSA_VIEWER_CONSTANTS.MIN_ZOOM;
    this.MAX_ZOOM = MSA_VIEWER_CONSTANTS.MAX_ZOOM;

    this.frame = null;
    this._destroyed = false;
    this._renderedRange = null;
    this._cellGroupsCache = null;
    this._initialLayoutObserver = null;
    this.resizeObserver = null; // ResizeObserver for container resize handling
    this._labelMeasuredWidth = this.DEFAULT_LABELS_WIDTH; // raw text-based width before zoom scaling
    this._scrollZoomSpeed = 0.08; // Custom wheel zoom speed multiplier
    this._handleWheel = this.handleWheel.bind(this);

    this.initializeDeckWhenReady();
  }

  // =======================================================================
  // UTILITIES
  // =======================================================================

  /**
   * Measure text width using a 2D canvas context
   * @param {string} text - The text to measure
   * @returns {number} Width in pixels
   */
  _measureTextWidth(text) {
    if (!this._ctx2d) {
      const canvas = document.createElement('canvas');
      this._ctx2d = canvas.getContext('2d');
      if (!this._ctx2d) {
        return String(text || '').length * 6;
      }
      this._ctx2d.font =
        '10px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, "Helvetica Neue", Arial';
    }
    return this._ctx2d.measureText(text || '').width;
  }

  /**
   * Check if sequences are loaded
   * @returns {boolean} True if sequences are loaded and not empty
   */
  hasSequences() {
    return this.state.seqs && this.state.seqs.length > 0;
  }

  getLayoutMetrics() {
    return {
      labelsWidth: this.LABELS_WIDTH,
      axisHeight: this.AXIS_HEIGHT,
    };
  }

  hasUsableContainerSize() {
    return (this.container?.clientWidth || 0) > 0 && (this.container?.clientHeight || 0) > 0;
  }

  initializeDeckWhenReady() {
    if (this._destroyed || !this.container || this.state.deckgl) return;

    if (this.hasUsableContainerSize() || typeof ResizeObserver === 'undefined') {
      this.initializeDeck();
      return;
    }

    this._initialLayoutObserver = new ResizeObserver(() => {
      if (!this.hasUsableContainerSize()) return;
      this._initialLayoutObserver?.disconnect();
      this._initialLayoutObserver = null;
      this.initializeDeck();
    });
    this._initialLayoutObserver.observe(this.container);
  }

  // =======================================================================
  // DECK.GL EVENT HANDLERS
  // =======================================================================

  /**
   * Handle view state changes from deck.gl
   * @param {Object} viewState - The new view state
   */
  handleViewStateChange(
    viewState,
    { force = false, layoutChanged = false, scheduleRender = true } = {}
  ) {
    // Handle both single view state and composite view state updates
    // When using multiple views, deck.gl might pass { main: ..., labels: ... } or just the changed one

    // We strictly control the 'main' view state and derive 'labels' from it
    const activeViewState = viewState.main || viewState;
    const oldViewState = this.state.viewState;

    const containerWidth = this.container?.clientWidth || 0;
    const containerHeight = this.container?.clientHeight || 0;

    const activeClamped = clampViewState(activeViewState, {
      minZoom: this.MIN_ZOOM,
      maxZoom: this.MAX_ZOOM,
      containerWidth,
      containerHeight,
      labelsWidth: this.LABELS_WIDTH,
      axisHeight: this.AXIS_HEIGHT,
      cellSize: this.options.cellSize,
      rows: this.state.rows,
      cols: this.state.cols,
    });

    // 3. Infinite Loop Prevention (Equality Check)
    if (
      !force &&
      oldViewState.zoom === activeClamped.zoom &&
      oldViewState.target[0] === activeClamped.target[0] &&
      oldViewState.target[1] === activeClamped.target[1]
    ) {
      return;
    }

    this.state.viewState = activeClamped;

    // Keep label column width proportional to zoom
    let labelWidthChanged = false;
    if (this.hasSequences()) {
      labelWidthChanged = this.updateLabelWidthForZoom(getZoomScale(activeClamped.zoom), {
        updateDeck: false,
      });
    }

    // 4. Derived View States (Axis Lock Strategy)
    // - labels: ignores X changes (target[0] = viewportWidth / 2)
    // - axis: ignores Y changes (target[1] = viewportHeight / 2)
    // - corner: frozen position, shared zoom

    // Update deck.gl view state
    if (this.state.deckgl) {
      const deckProps = {
        viewState: this.buildSynchronizedViewStates(activeClamped),
      };
      if (labelWidthChanged || layoutChanged) {
        deckProps.views = this.buildDeckViews();
      }
      this.state.deckgl.setProps(deckProps);
    }

    const range = this.hasSequences()
      ? getVisibleRange(
          activeClamped,
          this._getViewportDimensions(),
          this.options.cellSize,
          this.state.rows,
          this.state.cols
        )
      : null;

    // Pan and inertia only update deck view state while the overscanned layer range still covers
    // the viewport. Zoom always refreshes labels; cell data remains cached when sampling is stable.
    if (
      scheduleRender &&
      this.hasSequences() &&
      (oldViewState.zoom !== activeClamped.zoom || !rangeContains(this._renderedRange, range))
    ) {
      this.renderThrottled();
    }

    // Dispatch custom event for view updates
    if (this.onViewStateChange) {
      this.onViewStateChange({
        viewState: activeClamped,
        range,
        layoutMetrics: this.getLayoutMetrics(),
      });
    }
  }

  /**
   * Zoom in by a fixed step
   */
  zoomIn() {
    const { zoom, target } = this.state.viewState;
    this.handleViewStateChange({
      target,
      zoom: zoom + 0.2,
    });
  }

  /**
   * Zoom out by a fixed step
   */
  zoomOut() {
    const { zoom, target } = this.state.viewState;
    this.handleViewStateChange({
      target,
      zoom: zoom - 0.2,
    });
  }

  /**
   * Generate tooltip content for objects
   * @param {Object} object - The object being hovered
   * @returns {Object|null} Tooltip content or null
   */
  getTooltipContent(object) {
    if (!object || object.row === undefined || !this.state.seqs[object.row]) {
      return null;
    }
    const { row } = object;
    if (object.kind === 'cell') {
      const { col, ch } = object;
      return { text: `${this.state.seqs[row].id}\nrow ${row + 1}, col ${col + 1}: ${ch}` };
    }
    if (object.kind === 'label') {
      return { text: this.state.seqs[row].id };
    }
    return null;
  }

  // =======================================================================
  // DECK.GL INITIALIZATION
  // =======================================================================

  /**
   * Setup container styling and create canvas element for deck.gl
   * @returns {HTMLCanvasElement} The created canvas element
   */
  setupContainerAndCanvas() {
    // Ensure container can receive mouse events
    this.container.style.position = 'relative';
    this.container.style.overflow = 'hidden'; // Disable native scrollbars - use deck.gl panning

    // Create canvas element for deck.gl
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    this.container.appendChild(canvas);
    this.canvas = canvas;

    return canvas;
  }

  initializeDeck() {
    if (this._destroyed || !this.container || this.state.deckgl) return;

    this._initialLayoutObserver?.disconnect();
    this._initialLayoutObserver = null;

    // Setup container and create canvas
    const canvas = this.setupContainerAndCanvas();

    this.state.deckgl = new Deck({
      canvas,
      width: '100%',
      height: '100%',
      useDevicePixels: 1,
      glOptions: {
        antialias: true,
      },
      views: this.buildDeckViews(),
      // Filter layers to ensuring they render only in their assigned view
      layerFilter: ({ layer, viewport }) => {
        return layer.props.viewId === viewport.id;
      },
      // We must initialize with the composite view state
      viewState: {
        main: { target: [0, 0, 0], zoom: 0 },
        labels: { target: [0, 0, 0], zoom: 0 },
        axis: { target: [0, 0, 0], zoom: 0 },
        corner: { target: [0, 0, 0], zoom: 0 },
      },
      getCursor: ({ isDragging }) => (isDragging ? 'grabbing' : 'grab'),
      style: {},
      onViewStateChange: ({ viewState }) => {
        this.handleViewStateChange(viewState);
      },
      getTooltip: ({ object }) => {
        return this.getTooltipContent(object);
      },
    });

    // Attach wheel handler for custom pan/zoom behavior
    this.container.addEventListener('wheel', this._handleWheel, { passive: false });

    if (this.hasSequences()) {
      this.initializeCameraIfReady();
      this.render();
    }

    this.startResizeObserver();
  }

  startResizeObserver() {
    if (!this.container || typeof ResizeObserver === 'undefined') return;

    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => {
      if (this.hasSequences()) {
        this.adjustLabelWidth({ updateDeck: false });
        this.handleViewStateChange(this.state.viewState, {
          force: true,
          layoutChanged: true,
        });
      }
    });
    this.resizeObserver.observe(this.container);
  }

  // =======================================================================
  // DATA LOADING
  // =======================================================================

  update({
    data,
    currentRegion = null,
    previousRegion = null,
    showLetters,
    colorScheme,
    rowColorMap,
  }) {
    if (this._destroyed) {
      return false;
    }

    let changed = false;
    const dataChanged = this._processedData !== data;
    const previousColorScheme = this.options.colorScheme;
    if (dataChanged) {
      this._processedData = data;
      changed = true;
      if (data) {
        this.state.seqs = data.sequences;
        this.state.type = data.type;
        this.state.rows = data.rows;
        this.state.cols = data.cols;
        this.state.consensus = data.consensus ?? calculateConsensus(data.sequences);
        this.adjustLabelWidth({ updateDeck: false });
        this.initializeCameraIfReady();
      } else {
        this.state.seqs = [];
        this.state.type = 'protein';
        this.state.rows = 0;
        this.state.cols = 0;
        this.state.consensus = null;
        this._hasLoadedOnce = false;
      }
      this.invalidateRenderCache();
    }

    const nextCurrentRegion = normalizeRegionOrNull(currentRegion, this.state.cols);
    const nextPreviousRegion = normalizeRegionOrNull(previousRegion, this.state.cols);
    if (!regionsEqual(this.state.currentRegion, nextCurrentRegion)) {
      this.state.currentRegion = nextCurrentRegion;
      changed = true;
    }
    if (!regionsEqual(this.state.previousRegion, nextPreviousRegion)) {
      this.state.previousRegion = nextPreviousRegion;
      changed = true;
    }

    if (showLetters !== undefined && this.options.showLetters !== showLetters) {
      this.options.showLetters = showLetters;
      changed = true;
    }
    if (colorScheme !== undefined && this.options.colorScheme !== colorScheme) {
      this.options.colorScheme = colorScheme;
      changed = true;
      if ((previousColorScheme === 'taxa') !== (colorScheme === 'taxa')) {
        this.invalidateCellCache();
      }
    }
    if (rowColorMap !== undefined && this.options.rowColorMap !== rowColorMap) {
      this.options.rowColorMap = rowColorMap;
      changed = true;
    }

    if (changed) {
      this.render();
    }
    return changed;
  }

  /**
   * Initializes the camera to focus on the Top-Left corner (Seq 1, Res 1)
   * at a readable 1:1 zoom level.
   */
  initCameraPosition() {
    if (!this.container) return;

    this.handleViewStateChange(
      {
        main: getInitialAlignmentViewState({
          containerWidth: this.container.clientWidth,
          containerHeight: this.container.clientHeight,
          labelsWidth: this.LABELS_WIDTH,
          axisHeight: this.AXIS_HEIGHT,
        }),
      },
      { scheduleRender: false }
    );
  }

  /**
   * Fit the camera to show the entire MSA alignment
   */
  fitAlignment() {
    if (!this.hasSequences() || !this.container) return;

    const newViewState = getFitAlignmentViewState({
      containerWidth: this.container.clientWidth,
      containerHeight: this.container.clientHeight,
      labelsWidth: this.LABELS_WIDTH,
      axisHeight: this.AXIS_HEIGHT,
      cellSize: this.options.cellSize,
      rows: this.state.rows,
      cols: this.state.cols,
    });
    this.handleViewStateChange({ main: newViewState });
  }

  // =======================================================================
  // RENDERING
  // =======================================================================

  render() {
    if (this._destroyed || !this.state.deckgl) {
      return;
    }

    // Don't render if no data is loaded
    if (!this.hasSequences()) {
      this.state.deckgl.setProps({ layers: [] });
      return;
    }

    const cs = this.options.cellSize;
    const visibleRange = this.getVisibleRange();
    const sampling = this.getCellSampling(visibleRange);
    const renderRange = this.getRenderRange(visibleRange, sampling);

    const cellsLayers = this.buildCellsLayers(cs, renderRange, sampling);
    const previousRegionLayer = this.buildPreviousRegionBorderLayer(cs);
    const currentRegionLayer = this.buildCurrentRegionBorderLayer(cs);
    const lettersLayer = this.buildLettersLayer(cs, renderRange);
    const rowLabelsLayer = this.buildRowLabelsLayer(cs, renderRange);
    const columnAxisLayer = this.buildColumnAxisLayer(cs, renderRange);

    const layers = [
      ...cellsLayers,
      previousRegionLayer,
      currentRegionLayer,
      lettersLayer,
      rowLabelsLayer,
      columnAxisLayer,
    ];

    this.state.deckgl.setProps({ layers });
    this._renderedRange = renderRange;
  }

  renderThrottled() {
    if (this._destroyed || this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      this.render();
    });
  }

  // =======================================================================
  // WHEEL PAN/ZOOM
  // =======================================================================

  /**
   * Handle wheel events: pan by default; zoom when ctrl/meta is held (pinch gesture).
   */
  handleWheel(event) {
    // Prevent browser/page scroll
    event.preventDefault();

    const ctrlZoom = event.ctrlKey || event.metaKey;
    const { target, zoom } = this.state.viewState;
    const zoomScale = getZoomScale(zoom);

    if (ctrlZoom) {
      // Pinch/ctrl+wheel zoom; scale delta to keep feel snappy
      const delta = -event.deltaY * 0.001 * this._scrollZoomSpeed;
      this.handleViewStateChange({
        main: {
          ...this.state.viewState,
          zoom: zoom + delta,
        },
      });
      return;
    }

    // Default: pan using wheel deltas
    const dx = -event.deltaX / zoomScale;
    const dy = -event.deltaY / zoomScale;
    this.handleViewStateChange({
      main: {
        ...this.state.viewState,
        target: [target[0] + dx, target[1] + dy, 0],
      },
    });
  }

  // =======================================================================
  // LAYER BUILDING
  // =======================================================================

  /**
   * Build instanced cell layers for the MAIN view (culled)
   * @param {number} cellSize - Size of each cell
   * @returns {ColumnLayer[]} The cell layers
   */
  getVisibleRange() {
    return getVisibleRange(
      this.state.viewState,
      this._getViewportDimensions(),
      this.options.cellSize,
      this.state.rows,
      this.state.cols
    );
  }

  /**
   * Container/label/axis dimensions used to compute the visible cell range.
   */
  _getViewportDimensions() {
    return {
      containerWidth: this.container.clientWidth,
      containerHeight: this.container.clientHeight,
      labelsWidth: this.LABELS_WIDTH,
      axisHeight: this.AXIS_HEIGHT,
    };
  }

  getCellSampling(visibleRange) {
    return getCellSampling(visibleRange, this.options.MAX_CELLS, {
      preserveRows: this.options.colorScheme === 'taxa',
    });
  }

  getRenderRange(visibleRange, sampling) {
    if (
      this._cellGroupsCache &&
      samplingEqual(this._cellGroupsCache.sampling, sampling) &&
      rangeContains(this._cellGroupsCache.range, visibleRange)
    ) {
      return this._cellGroupsCache.range;
    }

    const visibleRows = visibleRange.r1 - visibleRange.r0 + 1;
    const visibleColumns = visibleRange.c1 - visibleRange.c0 + 1;
    const rowPadding = Math.max(sampling.rowStep, Math.ceil(visibleRows / 4));
    const columnPadding = Math.max(sampling.colStep, Math.ceil(visibleColumns / 4));

    return {
      r0: Math.max(0, visibleRange.r0 - rowPadding),
      r1: Math.min(this.state.rows - 1, visibleRange.r1 + rowPadding),
      c0: Math.max(0, visibleRange.c0 - columnPadding),
      c1: Math.min(this.state.cols - 1, visibleRange.c1 + columnPadding),
    };
  }

  buildCellsLayers(cellSize, renderRange, sampling) {
    if (
      !this._cellGroupsCache ||
      !samplingEqual(this._cellGroupsCache.sampling, sampling) ||
      !rangesEqual(this._cellGroupsCache.range, renderRange)
    ) {
      const cellData = buildCellData(
        cellSize,
        this.state.seqs,
        renderRange,
        this.options.MAX_CELLS,
        {
          preserveRows: this.options.colorScheme === 'taxa',
          consensus: this.state.consensus,
          sampling,
        }
      );
      this._cellGroupsCache = {
        range: renderRange,
        sampling,
        groups: groupCellDataBySize(cellData),
      };
    }

    return createCellsLayers(
      this._cellGroupsCache.groups,
      this.state.type,
      this.state.currentRegion,
      this.options.colorScheme,
      this.state.consensus,
      this.state.previousRegion,
      this.options.rowColorMap
    );
  }

  invalidateCellCache() {
    this._cellGroupsCache = null;
  }

  invalidateRenderCache() {
    this._renderedRange = null;
    this.invalidateCellCache();
  }

  /**
   * Build the current region border polygon layer
   * @param {number} cellSize - Size of each cell
   * @returns {PolygonLayer} The current region border layer
   */
  buildCurrentRegionBorderLayer(cellSize) {
    const borderData = buildRegionBorder(
      cellSize,
      this.state.currentRegion,
      this.state.rows,
      this.state.cols
    );
    return createCurrentRegionBorderLayer(borderData);
  }

  /**
   * Build the previous region border polygon layer (behind current)
   * @param {number} cellSize - Size of each cell
   * @returns {PolygonLayer} The previous region border layer
   */
  buildPreviousRegionBorderLayer(cellSize) {
    const borderData = buildRegionBorder(
      cellSize,
      this.state.previousRegion,
      this.state.rows,
      this.state.cols
    );
    return createPreviousRegionBorderLayer(borderData);
  }

  /**
   * Build the letters text layer
   * @param {number} cellSize - Size of each cell
   * @returns {TextLayer} The letters layer
   */
  buildLettersLayer(cellSize, visibleRange) {
    const zoomScale = getZoomScale(this.state.viewState.zoom);
    const textData = buildTextData(
      cellSize,
      this.state.seqs,
      visibleRange,
      this.options.showLetters,
      this.options.cellSize,
      zoomScale
    );
    return createLettersLayer(
      textData,
      this.state.type,
      this.options.colorScheme,
      this.state.consensus,
      this.options.rowColorMap,
      this.state.currentRegion,
      this.state.previousRegion
    );
  } /**
   * Build the row labels text layer
   * @param {number} cellSize - Size of each cell
   * @returns {TextLayer} The row labels layer
   */
  buildRowLabelsLayer(cellSize, visibleRange) {
    // Pass LABELS_WIDTH to calculate alignment
    const labelsData = buildRowLabels(
      cellSize,
      this.state.seqs,
      visibleRange,
      this.state.viewState,
      getZoomScale(this.state.viewState.zoom),
      this.LABELS_WIDTH,
      this.options.rowColorMap
    );
    return createRowLabelsLayer(labelsData);
  }

  /**
   * Build the column axis text layer
   * @param {number} cellSize - Size of each cell
   * @returns {TextLayer} The column axis layer
   */
  buildColumnAxisLayer(cellSize, visibleRange) {
    const zoomScale = getZoomScale(this.state.viewState.zoom);
    const axisData = buildColumnAxis(
      cellSize,
      this.state.viewState,
      visibleRange,
      this.state.rows,
      zoomScale,
      this.options.cellSize
    );
    return createColumnAxisLayer(axisData, zoomScale);
  }

  /**
   * Center the viewport on a zero-based row and/or column.
   */
  centerViewportOn({ row, column }) {
    if (!this.hasSequences()) return;

    this.handleViewStateChange(
      getCenteredViewState({
        currentViewState: this.state.viewState,
        cellSize: this.options.cellSize,
        row,
        column,
      })
    );
  }

  centerRegion(startCol, endCol) {
    if (!this.hasSequences()) return;

    const region = normalizeViewerRegion(startCol, endCol, this.state.cols);
    const targetColumn = resolveRegionTargetColumn(region, 'center');
    if (!Number.isFinite(targetColumn)) return;

    this.centerViewportOn({ column: Math.max(0, targetColumn) });
  }

  initializeCameraIfReady() {
    if (this._hasLoadedOnce || !this.state.deckgl || !this.hasUsableContainerSize()) return;
    this.initCameraPosition();
    this._hasLoadedOnce = true;
  }

  buildSynchronizedViewStates(mainViewState = this.state.viewState) {
    return deriveSynchronizedViewStates({
      mainViewState,
      labelsWidth: this.LABELS_WIDTH,
      axisHeight: this.AXIS_HEIGHT,
    });
  }

  /**
   * Adjust LABELS_WIDTH based on the longest sequence ID
   */
  adjustLabelWidth({ updateDeck = true } = {}) {
    if (!this.hasSequences()) return;

    let maxWidth = 0;
    this.state.seqs.forEach((s) => {
      const w = this._measureTextWidth(s.id);
      if (w > maxWidth) maxWidth = w;
    });

    // Add minimal padding (1px each side) and store the unscaled width
    const calculatedWidth = Math.max(this.DEFAULT_LABELS_WIDTH, maxWidth + 2);
    this._labelMeasuredWidth = calculatedWidth;
    this.updateLabelWidthForZoom(getZoomScale(this.state.viewState.zoom), { updateDeck });
  }

  buildDeckViews() {
    const containerW = this.container.clientWidth;
    const containerH = this.container.clientHeight;

    return [
      // Top-Left Corner
      new OrthographicView({
        id: 'corner',
        x: 0,
        y: 0,
        width: this.LABELS_WIDTH,
        height: this.AXIS_HEIGHT,
        flipY: true,
        controller: false,
        clear: { color: [248, 248, 248, 1] },
      }),
      // Left panel (Labels)
      new OrthographicView({
        id: 'labels',
        x: 0,
        y: this.AXIS_HEIGHT,
        width: this.LABELS_WIDTH,
        height: containerH - this.AXIS_HEIGHT, // Height in pixels
        flipY: true,
        controller: false,
        clear: { color: [248, 248, 248, 1] },
      }),
      // Top panel (Axis)
      new OrthographicView({
        id: 'axis',
        x: this.LABELS_WIDTH,
        y: 0,
        width: containerW - this.LABELS_WIDTH, // Width in pixels
        height: this.AXIS_HEIGHT,
        flipY: true,
        controller: false,
        clear: { color: [248, 248, 248, 1] },
      }),
      // Main View
      new OrthographicView({
        id: 'main',
        x: this.LABELS_WIDTH,
        y: this.AXIS_HEIGHT,
        width: containerW - this.LABELS_WIDTH, // Width in pixels
        height: containerH - this.AXIS_HEIGHT, // Height in pixels
        flipY: true,
        controller: {
          type: OrthographicController,
          dragPan: true,
          inertia: true,
          scrollZoom: false, // Custom wheel handler handles pan/zoom
          doubleClickZoom: false,
          keyboard: { zoomSpeed: 0.08 },
        },
        clear: { color: [255, 255, 255, 1] },
      }),
    ];
  }

  /**
   * Update LABELS_WIDTH and view layout based on current zoom, keeping label column proportional.
   */
  updateLabelWidthForZoom(zoomScale, { updateDeck = true } = {}) {
    if (!this.container) return false;

    const baseWidth = this._labelMeasuredWidth || this.DEFAULT_LABELS_WIDTH;
    // Shrink when zoomed out, up to 60% reduction; don't grow beyond base when zooming in
    const widthScale = Math.max(0.4, Math.min(1, zoomScale || 1));
    const targetWidth = baseWidth * widthScale;

    // Cap at 30% of container width to avoid taking over the screen
    const screenMaxWidth = this.container.clientWidth * 0.3 || 300;
    const nextLabelsWidth = Math.min(targetWidth, screenMaxWidth);
    const labelWidthChanged = this.LABELS_WIDTH !== nextLabelsWidth;
    this.LABELS_WIDTH = nextLabelsWidth;

    // Construct synchronized view states for labels/axis
    const vs = this.state.viewState;
    const scale = getZoomScale(vs.zoom);

    const labelsViewState = { ...vs, target: [this.LABELS_WIDTH / 2 / scale, vs.target[1], 0] };
    const axisViewState = { ...vs, target: [vs.target[0], this.AXIS_HEIGHT / 2 / scale, 0] };
    const cornerViewState = {
      ...vs,
      target: [this.LABELS_WIDTH / 2 / scale, this.AXIS_HEIGHT / 2 / scale, 0],
    };

    if (updateDeck) {
      this.state.deckgl?.setProps({
        views: this.buildDeckViews(),
        viewState: {
          main: this.state.viewState,
          labels: labelsViewState,
          axis: axisViewState,
          corner: cornerViewState,
        },
      });
    }

    return labelWidthChanged;
  }

  destroy() {
    this._destroyed = true;

    this._initialLayoutObserver?.disconnect();
    this._initialLayoutObserver = null;

    if (this.frame) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }

    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Remove wheel handler
    if (this.container && this._handleWheel) {
      this.container.removeEventListener('wheel', this._handleWheel);
    }

    if (this.state.deckgl) {
      this.state.deckgl.finalize();
      this.state.deckgl = null;
    }

    // Remove artifacts we added (leave React-managed children alone)
    if (this.container) {
      try {
        if (this.canvas && this.canvas.parentNode === this.container) {
          this.container.removeChild(this.canvas);
        }
      } catch (err) {
        console.warn('[MSA Viewer] Cleanup error during removeChild:', err);
      }
    }
  }
}
