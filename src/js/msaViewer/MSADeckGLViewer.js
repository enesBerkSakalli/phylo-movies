/**
 * MSA DeckGL Viewer Module
 * Extracted from msa_viewer.html for integration with WinBox
 */

import { Deck, OrthographicView, OrthographicController } from '@deck.gl/core';
import { processPhyloData, calculateConsensus } from './utils/dataUtils.js';
import { createCellsLayer, buildCellData } from './layers/cellsLayer.js';
import { createSelectionBorderLayer, buildSelectionBorder } from './layers/selectionBorderLayer.js';
import { createLettersLayer, buildTextData } from './layers/lettersLayer.js';
import { createRowLabelsLayer, buildRowLabels } from './layers/rowLabelsLayer.js';
import { createColumnAxisLayer, buildColumnAxis } from './layers/columnAxisLayer.js';

export class MSADeckGLViewer {

  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      MAX_CELLS: 150_000,
      cellSize: 12, // High-density default (67% feel)
      showLetters: true,
      colorScheme: 'default',
      rowColorMap: {},
      ...options
    };

    this.state = {
      deckgl: null,
      seqs: [],
      type: 'protein',
      rows: 0,
      cols: 0,
      selection: null,
      // Main view state
      viewState: { target: [0, 0, 0], zoom: 0 },
      minimapViewState: { target: [0, 0, 0], zoom: -1.5 }
    };



    // Constants
    this.DEFAULT_LABELS_WIDTH = 20;
    this.LABELS_WIDTH = this.DEFAULT_LABELS_WIDTH;
    this.AXIS_HEIGHT = 20;   // Proportionate height for 10px cells
    this.MIN_ZOOM = -8;
    this.MAX_ZOOM = 10;

    this.frame = null;
    this._pendingFitToMSA = false;  // Track if we need to fit after deck init
    this.resizeObserver = null;     // ResizeObserver for container resize handling

    // Delay initialization to ensure container has dimensions
    setTimeout(() => this.initializeDeck(), 50);
  }

  // =======================================================================
  // UTILITIES
  // =======================================================================

  /**
   * Get the zoom scale factor (2^zoom)
   * @returns {number} The zoom scale factor
   */
  getZoomScale() {
    return Math.pow(2, this.state.viewState.zoom || 0);
  }

  /**
   * Measure text width using a 2D canvas context
   * @param {string} text - The text to measure
   * @returns {number} Width in pixels
   */
  _measureTextWidth(text) {
    if (!this._ctx2d) {
      const canvas = document.createElement('canvas');
      this._ctx2d = canvas.getContext('2d');
      this._ctx2d.font = '10px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, "Helvetica Neue", Arial';
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

  // =======================================================================
  // DECK.GL EVENT HANDLERS
  // =======================================================================

  /**
   * Handle view state changes from deck.gl
   * @param {Object} viewState - The new view state
   */
  handleViewStateChange(viewState) {
    // Handle both single view state and composite view state updates
    // When using multiple views, deck.gl might pass { main: ..., labels: ... } or just the changed one

    // We strictly control the 'main' view state and derive 'labels' from it
    const activeViewState = viewState.main || viewState;
    const oldViewState = this.state.viewState;

    // 1. Zoom Clamping (Guard against blank voids)
    activeViewState.zoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, activeViewState.zoom));

    // 2. Clamp pan to content bounds when data is present
    if (this.hasSequences()) {
      const contentWidth = this.state.cols * this.options.cellSize;
      const contentHeight = this.state.rows * this.options.cellSize;
      const zoomScale = this.getZoomScale();

      const viewportWidth = Math.max(1, (this.container.clientWidth - this.LABELS_WIDTH));
      const viewportHeight = Math.max(1, (this.container.clientHeight - this.AXIS_HEIGHT));
      const halfW = (viewportWidth / zoomScale) / 2;
      const halfH = (viewportHeight / zoomScale) / 2;

      const minX = Math.min(halfW, contentWidth / 2);
      const maxX = Math.max(contentWidth - halfW, contentWidth / 2);
      const minY = Math.min(halfH, contentHeight / 2);
      const maxY = Math.max(contentHeight - halfH, contentHeight / 2);

      activeViewState.target = [
        Math.max(minX, Math.min(maxX, activeViewState.target[0])),
        Math.max(minY, Math.min(maxY, activeViewState.target[1])),
        0
      ];
    }

    // 3. Infinite Loop Prevention (Equality Check)
    if (oldViewState.zoom === activeViewState.zoom &&
        oldViewState.target[0] === activeViewState.target[0] &&
        oldViewState.target[1] === activeViewState.target[1]) {
      return;
    }

    this.state.viewState = activeViewState;

    // Derive minimap view state (lighter zoom, centered on content)
    if (this.hasSequences()) {
      const minimapZoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, activeViewState.zoom - 1.5));
      this.state.minimapViewState = {
        target: [this.state.cols * this.options.cellSize / 2, this.state.rows * this.options.cellSize / 2, 0],
        zoom: minimapZoom
      };
    }

    // 4. Derived View States (Axis Lock Strategy)
    // - labels: ignores X changes (target[0] = viewportWidth / 2)
    // - axis: ignores Y changes (target[1] = viewportHeight / 2)
    // - corner: frozen position, shared zoom

    // We need the view dimensions to center the top-left correctly
    const mainWidth = (this.container.clientWidth - this.LABELS_WIDTH);
    const mainHeight = (this.container.clientHeight - this.AXIS_HEIGHT);

    const labelsViewState = { ...activeViewState, target: [this.LABELS_WIDTH / 2 / this.getZoomScale(), activeViewState.target[1], 0] };
    const axisViewState = { ...activeViewState, target: [activeViewState.target[0], this.AXIS_HEIGHT / 2 / this.getZoomScale(), 0] };
    const cornerViewState = { ...activeViewState, target: [this.LABELS_WIDTH / 2 / this.getZoomScale(), this.AXIS_HEIGHT / 2 / this.getZoomScale(), 0] };

    // Update deck.gl view state
    if (this.state.deckgl) {
      this.state.deckgl.setProps({
        viewState: {
          main: activeViewState,
          minimap: this.state.minimapViewState,
          labels: labelsViewState,
          axis: axisViewState,
          corner: cornerViewState
        }
      });
    }

    // Only render if we have data
    if (this.hasSequences()) {
      this.renderThrottled();
    }

    // Dispatch custom event for view updates
    if (this.onViewStateChange) {
      // Calculate visible range to pass along
      const range = this.getVisibleRange(this.options.cellSize);
      this.onViewStateChange({ viewState: activeViewState, range });
    }
  }

  /**
   * Zoom in by a fixed step
   */
  zoomIn() {
    const { zoom, target } = this.state.viewState;
    this.handleViewStateChange({
      target,
      zoom: zoom + 0.2
    });
  }

  /**
   * Zoom out by a fixed step
   */
  zoomOut() {
    const { zoom, target } = this.state.viewState;
    this.handleViewStateChange({
      target,
      zoom: zoom - 0.2
    });
  }

  /**
   * Reset view to fit the entire MSA alignment
   */
  resetView() {
    if (this.hasSequences()) {
      this.fitToMSA();
    } else {
      this.handleViewStateChange({
        target: [0, 0, 0],
        zoom: -1
      });
    }
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
    this.container.style.overflow = 'hidden';

    // Create canvas element for deck.gl
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    this.container.appendChild(canvas);

    return canvas;
  }

  initializeDeck() {
    // Setup container and create canvas
    const canvas = this.setupContainerAndCanvas();

    this.state.deckgl = new Deck({
      canvas,
      width: '100%',
      height: '100%',
      views: [
        // Minimap view (bottom-right overlay)
        new OrthographicView({
          id: 'minimap',
          x: 10,
          y: 10,
          width: 180,
          height: 140,
          clear: { color: [245, 245, 245, 1] },
          flipY: true,
          controller: false
        }),
        // Top-Left Corner: Filler for background
        new OrthographicView({
          id: 'corner',
          x: 0,
          y: 0,
          width: this.LABELS_WIDTH,
          height: this.AXIS_HEIGHT,
          flipY: true,
          controller: false,
          clear: { color: [248, 248, 248, 1] }
        }),
        // Left panel: Fixed width, shows Row Labels
        new OrthographicView({
          id: 'labels',
          x: 0,
          y: this.AXIS_HEIGHT,
          width: this.LABELS_WIDTH,
          height: `calc(100% - ${this.AXIS_HEIGHT}px)`,
          flipY: true,
          controller: false, // Passive, synced via code
          clear: { color: [248, 248, 248, 1] } // Light gray background
        }),
        // Top panel: Fixed height, shows Column Axis
        new OrthographicView({
          id: 'axis',
          x: this.LABELS_WIDTH,
          y: 0,
          width: `calc(100% - ${this.LABELS_WIDTH}px)`,
          height: this.AXIS_HEIGHT,
          flipY: true,
          controller: false,
          clear: { color: [248, 248, 248, 1] }
        }),
        // Right panel: Takes remaining width, shows Main Grid
        new OrthographicView({
          id: 'main',
          x: this.LABELS_WIDTH,
          y: this.AXIS_HEIGHT,
          width: `calc(100% - ${this.LABELS_WIDTH}px)`,
          height: `calc(100% - ${this.AXIS_HEIGHT}px)`,
          flipY: true,
          controller: true, // Interactive
          clear: { color: [255, 255, 255, 1] }
        })
      ],
      // Filter layers to ensuring they render only in their assigned view
      layerFilter: ({ layer, viewport }) => {
        return layer.props.viewId === viewport.id;
      },
      // We must initialize with the composite view state
      viewState: {
        main: { target: [0, 0, 0], zoom: 0 },
        minimap: { target: [0, 0, 0], zoom: -1.5 },
        labels: { target: [0, 0, 0], zoom: 0 },
        axis: { target: [0, 0, 0], zoom: 0 },
        corner: { target: [0, 0, 0], zoom: 0 }
      },
      getCursor: ({isDragging}) => isDragging ? 'grabbing' : 'grab',
      style: {},
      controller: {
        type: OrthographicController,
        dragPan: true,
        inertia: true,
        scrollZoom: { speed: 0.02, smooth: true },
        doubleClickZoom: false,
        keyboard: { zoomSpeed: 0.08 }
      },
      onViewStateChange: ({ viewState }) => {
        this.handleViewStateChange(viewState);
      },
      getTooltip: ({ object }) => {
        return this.getTooltipContent(object);
      }
    });

    // If data was loaded before deck was ready, set initial camera now
    if (this._pendingFitToMSA && this.hasSequences()) {
      this._pendingFitToMSA = false;
      this.initCameraPosition();
      this.render();
    }

    // Setup resize observer to update layout components without auto-zooming
    this.resizeObserver = new ResizeObserver(() => {
      if (this.hasSequences()) {
        this.adjustLabelWidth();
        // Do NOT call fitToMSA here to avoid unwanted auto-zoom
        this.render();
      }
    });
    this.resizeObserver.observe(this.container);
  }

  // =======================================================================
  // DATA LOADING
  // =======================================================================

  loadFromPhyloData(data) {
    const processedData = processPhyloData(data);

    if (!processedData) {
      return false;
    }

    // Preserve current selection if column count is compatible
    const prevSelection = this.state.selection;
    const prevCols = this.state.cols;

    this.state.seqs = processedData.sequences;
    this.state.type = processedData.type;
    this.state.rows = processedData.rows;
    this.state.cols = processedData.cols;
    this.state.consensus = calculateConsensus(this.state.seqs);

    // Dynamic Label Width Adjustment
    this.adjustLabelWidth();

    // Restore selection if still valid for new data, otherwise clear it
    if (prevSelection && prevCols === this.state.cols) {
      // Selection is still valid - keep it
      this.state.selection = prevSelection;
    } else {
      this.state.selection = null;
    }

    console.log(`[MSADeckGLViewer] Loaded ${this.state.rows} sequences, type: ${this.state.type}`);

    // Position camera to start at Top-Left if this is the first load
    const isFirstLoad = !this._hasLoadedOnce;
    if (isFirstLoad) {
      this.initCameraPosition();
      this._hasLoadedOnce = true;
    }

    // Force immediate render
    this.render();

    // Also trigger a second render after a brief delay to ensure visibility
    setTimeout(() => this.render(), 100);

    return true;
  }

  /**
   * Initializes the camera to focus on the Top-Left corner (Seq 1, Res 1)
   * at a readable 1:1 zoom level.
   */
  initCameraPosition() {
    if (!this.container) return;

    // To look at (0,0) with the camera center, we must offset by half the viewport
    const w = this.container.clientWidth - this.LABELS_WIDTH;
    const h = this.container.clientHeight - this.AXIS_HEIGHT;

    // Focus on [0,0] but DeckGL target is center-based
    const initialZoom = 0;
    const scale = Math.pow(2, initialZoom);

    const newViewState = {
      target: [w / 2 / scale, h / 2 / scale, 0],
      zoom: initialZoom
    };

    console.log(`[MSADeckGLViewer] Initializing Top-Left focus:`, newViewState.target);
    this.handleViewStateChange({ main: newViewState });
  }

  /**
   * Fit the camera to show the entire MSA alignment
   */
  fitToMSA() {
    if (!this.hasSequences() || !this.container) return;

    const w = this.container.clientWidth - this.LABELS_WIDTH;
    const h = this.container.clientHeight - this.AXIS_HEIGHT;

    const cellSize = this.options.cellSize;
    const contentWidth = this.state.cols * cellSize;
    const contentHeight = this.state.rows * cellSize;

    // Calculate zoom to fit
    const zoomX = Math.log2(w / contentWidth);
    const zoomY = Math.log2(h / contentHeight);
    const zoom = Math.min(zoomX, zoomY, 0) - 0.1; // Add 10% margin, cap at 1:1

    const newViewState = {
      target: [contentWidth / 2, contentHeight / 2, 0],
      zoom
    };

    // Derive synchronized states for other views (Axis Lock)
    const scale = Math.pow(2, zoom);
    const labelsViewState = { ...newViewState, target: [this.LABELS_WIDTH / 2 / scale, newViewState.target[1], 0] };
    const axisViewState = { ...newViewState, target: [newViewState.target[0], this.AXIS_HEIGHT / 2 / scale, 0] };

    this.handleViewStateChange({
      viewState: {
        main: { ...newViewState, transitionDuration: 400 },
        labels: { ...labelsViewState, transitionDuration: 400 },
        axis: { ...axisViewState, transitionDuration: 400 },
        corner: { ...newViewState, target: [this.LABELS_WIDTH / 2 / scale, this.AXIS_HEIGHT / 2 / scale, 0], transitionDuration: 400 }
      }
    });
  }

  // =======================================================================
  // SELECTION MANAGEMENT
  // =======================================================================

  setSelection(startCol, endCol) {
    if (startCol > endCol) {
      [startCol, endCol] = [endCol, startCol];
    }

    // If data not yet loaded, store selection unclamped - it will be validated on render
    if (this.state.cols > 0) {
      startCol = Math.max(1, Math.min(this.state.cols, startCol));
      endCol = Math.max(1, Math.min(this.state.cols, endCol));
    }

    this.state.selection = { startCol, endCol };
    this.render();
  }

  clearSelection() {
    this.state.selection = null;
    this.render();
  }


  // =======================================================================
  // RENDERING
  // =======================================================================

  render() {
    if (!this.state.deckgl) {
      return;
    }

    // Don't render if no data is loaded
    if (!this.hasSequences()) {
      this.state.deckgl.setProps({ layers: [] });
      return;
    }

    const cs = this.options.cellSize;

    const cellsLayer = this.buildCellsLayer(cs);
    const selectionLayer = this.buildSelectionBorderLayer(cs);
    const lettersLayer = this.buildLettersLayer(cs);
    const rowLabelsLayer = this.buildRowLabelsLayer(cs);
    const columnAxisLayer = this.buildColumnAxisLayer(cs);

    const layers = [
      cellsLayer.clone({ id: 'cells', viewId: 'main' }),
      selectionLayer.clone({ id: 'selectionBorder', viewId: 'main' }),
      lettersLayer.clone({ id: 'letters', viewId: 'main' }),
      rowLabelsLayer.clone({ id: 'rowLabels', viewId: 'labels' }),
      columnAxisLayer.clone({ id: 'columnAxis', viewId: 'axis' }),
      // Minimap layers (lightweight: cells + selection outline only)
      cellsLayer.clone({ id: 'minimap-cells', viewId: 'minimap' }),
      selectionLayer.clone({ id: 'minimap-selectionBorder', viewId: 'minimap' })
    ];

    this.state.deckgl.setProps({ layers });
  }

  renderThrottled() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      this.render();
    });
  }


  getVisibleRange(cellSize) {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const worldPerPixel = 1 / this.getZoomScale();
    const halfW = (w * worldPerPixel) / 2;
    const halfH = (h * worldPerPixel) / 2;
    const [cx, cy] = this.state.viewState.target;

    let c0 = Math.floor((cx - halfW) / cellSize) - 1;
    let c1 = Math.ceil((cx + halfW) / cellSize) + 1;
    let r0 = Math.floor((cy - halfH) / cellSize) - 1;
    let r1 = Math.ceil((cy + halfH) / cellSize) + 1;

    c0 = Math.max(0, Math.min(this.state.cols - 1, c0));
    c1 = Math.max(0, Math.min(this.state.cols - 1, c1));
    r0 = Math.max(0, Math.min(this.state.rows - 1, r0));
    r1 = Math.max(0, Math.min(this.state.rows - 1, r1));

    return { r0, r1, c0, c1 };
  }

  // =======================================================================
  // LAYER BUILDING
  // =======================================================================

  /**
   * Build the cells polygon layer
   * @param {number} cellSize - Size of each cell
   * @returns {PolygonLayer} The cells layer
   */
  buildCellsLayer(cellSize) {
    const visibleRange = this.getVisibleRange(cellSize);
    const cellData = buildCellData(cellSize, this.state.seqs, visibleRange, this.options.MAX_CELLS);
    return createCellsLayer(cellData, this.state.type, this.state.selection, this.options.colorScheme, this.state.consensus);
  }

  /**
   * Build the selection border polygon layer
   * @param {number} cellSize - Size of each cell
   * @returns {PolygonLayer} The selection border layer
   */
  buildSelectionBorderLayer(cellSize) {
    const borderData = buildSelectionBorder(cellSize, this.state.selection, this.state.rows, this.state.cols);
    return createSelectionBorderLayer(borderData);
  }

  /**
   * Build the letters text layer
   * @param {number} cellSize - Size of each cell
   * @returns {TextLayer} The letters layer
   */
  buildLettersLayer(cellSize) {
    const visibleRange = this.getVisibleRange(cellSize);
    const textData = buildTextData(cellSize, this.state.seqs, visibleRange, this.options.showLetters, this.options.cellSize, this.getZoomScale());
    return createLettersLayer(textData);
  }  /**
   * Build the row labels text layer
   * @param {number} cellSize - Size of each cell
   * @returns {TextLayer} The row labels layer
   */
  buildRowLabelsLayer(cellSize) {
    const visibleRange = this.getVisibleRange(cellSize);
    // Pass LABELS_WIDTH to calculate alignment
    const labelsData = buildRowLabels(
      cellSize,
      this.state.seqs,
      visibleRange,
      this.state.viewState,
      this.getZoomScale(),
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
  buildColumnAxisLayer(cellSize) {
    const visibleRange = this.getVisibleRange(cellSize);
    const axisData = buildColumnAxis(cellSize, this.state.viewState, visibleRange, this.state.rows, this.getZoomScale(), this.options.cellSize);
    return createColumnAxisLayer(axisData, this.getZoomScale());
  }

  // =======================================================================
  // PUBLIC API
  // =======================================================================

  setCellSize(size) {
    this.options.cellSize = size;
    this.render();
  }

  setShowLetters(show) {
    this.options.showLetters = show;
    this.render();
  }

  /**
   * Set the color scheme
   * @param {string} scheme - The color scheme name
   */
  setColorScheme(scheme) {
    this.options.colorScheme = scheme;
    this.render();
  }

  setRowColorMap(map) {
    this.options.rowColorMap = map || {};
    this.render();
  }

  // Public API for region selection
  setRegion(startCol, endCol) {
    this.setSelection(startCol, endCol);
  }

  clearRegion() {
    this.clearSelection();
  }

  /**
   * Reset camera to initial MSA overview
   */
  resetCamera() {
    if (this.hasSequences()) {
      this.fitToMSA();
    } else {
      // Reset to default view if no data loaded
      const defaultViewState = {
        target: [0, 0, 0],
        zoom: -1
      };
      this.state.viewState = defaultViewState;
      if (this.state.deckgl) {
        this.state.deckgl.setProps({
          viewState: {
            main: defaultViewState,
            labels: defaultViewState,
            axis: defaultViewState
          }
        });
      }
    }
  }

  /**
   * Adjust LABELS_WIDTH based on the longest sequence ID
   */
  adjustLabelWidth() {
    if (!this.hasSequences()) return;

    let maxWidth = 0;
    this.state.seqs.forEach(s => {
      const w = this._measureTextWidth(s.id);
      if (w > maxWidth) maxWidth = w;
    });

    // Add padding (4px each side)
    const calculatedWidth = Math.max(this.DEFAULT_LABELS_WIDTH, maxWidth + 8);
    // Cap at 30% of container width to avoid taking over the screen
    const screenMaxWidth = this.container.clientWidth * 0.3 || 300;
    this.LABELS_WIDTH = Math.min(calculatedWidth, screenMaxWidth);

    // Construct synchronized view states for labels/axis
    const vs = this.state.viewState;
    const scale = this.getZoomScale();

    const labelsViewState = { ...vs, target: [this.LABELS_WIDTH / 2 / scale, vs.target[1], 0] };
    const axisViewState = { ...vs, target: [vs.target[0], this.AXIS_HEIGHT / 2 / scale, 0] };
    const cornerViewState = { ...vs, target: [this.LABELS_WIDTH / 2 / scale, this.AXIS_HEIGHT / 2 / scale, 0] };

    // Update views if deckgl is initialized
    if (this.state.deckgl) {
      this.state.deckgl.setProps({
        views: [
          new OrthographicView({
            id: 'minimap',
            x: 10,
            y: 10,
            width: 180,
            height: 140,
            clear: { color: [245, 245, 245, 1] },
            flipY: true,
            controller: false
          }),
          new OrthographicView({
            id: 'corner',
            x: 0,
            y: 0,
            width: this.LABELS_WIDTH,
            height: this.AXIS_HEIGHT,
            flipY: true,
            controller: false,
            clear: { color: [248, 248, 248, 1] }
          }),
          new OrthographicView({
            id: 'labels',
            x: 0,
            y: this.AXIS_HEIGHT,
            width: this.LABELS_WIDTH,
            height: `calc(100% - ${this.AXIS_HEIGHT}px)`,
            flipY: true,
            controller: false,
            clear: { color: [248, 248, 248, 1] }
          }),
          new OrthographicView({
            id: 'axis',
            x: this.LABELS_WIDTH,
            y: 0,
            width: `calc(100% - ${this.LABELS_WIDTH}px)`,
            height: this.AXIS_HEIGHT,
            flipY: true,
            controller: false,
            clear: { color: [248, 248, 248, 1] }
          }),
          new OrthographicView({
            id: 'main',
            x: this.LABELS_WIDTH,
            y: this.AXIS_HEIGHT,
            width: `calc(100% - ${this.LABELS_WIDTH}px)`,
            height: `calc(100% - ${this.AXIS_HEIGHT}px)`,
            flipY: true,
            controller: true,
            clear: { color: [255, 255, 255, 1] }
          })
        ],
        viewState: {
          main: vs,
          minimap: this.state.minimapViewState,
          labels: labelsViewState,
          axis: axisViewState,
          corner: cornerViewState
        }
      });
    }
  }

  destroy() {
    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.state.deckgl) {
      this.state.deckgl.finalize();
      this.state.deckgl = null;
    }
  }
}
