/**
 * MSA DeckGL Viewer Module
 * Extracted from msa_viewer.html for integration with WinBox
 */

import { Deck, OrthographicView } from '@deck.gl/core';
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
      MAX_CELLS: 150_000,  // Use numeric separator for readability
      cellSize: 16,
      showLetters: true,
      colorScheme: 'default',
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
      viewState: { target: [0, 0, 0], zoom: -1 }
    };



    // Constants
    // Constants
    this.LABELS_WIDTH = 120; // Fixed width for labels panel
    this.AXIS_HEIGHT = 30;   // Fixed height for top axis panel

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

    // Clamp zoom to prevent performance issues
    // Restrict MIN_ZOOM to -0.5 ensures rows don't get smaller than ~11px, keeping labels redable
    const MIN_ZOOM = -0.5;
    const MAX_ZOOM = 10;
    activeViewState.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, activeViewState.zoom));

    this.state.viewState = activeViewState;

    // Construct synchronized view states
    // Labels view: Sync Y and Zoom, lock X to 0
    const labelsViewState = {
      ...activeViewState,
      target: [0, activeViewState.target[1], 0]
    };

    // Axis view: Sync X and Zoom, lock Y to 0
    const axisViewState = {
      ...activeViewState,
      target: [activeViewState.target[0], 0, 0]
    };

    // Update deck.gl view state
    if (this.state.deckgl) {
      this.state.deckgl.setProps({
        viewState: {
          main: activeViewState,
          labels: labelsViewState,
          axis: axisViewState
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
      zoom: zoom + 0.5
    });
  }

  /**
   * Zoom out by a fixed step
   */
  zoomOut() {
    const { zoom, target } = this.state.viewState;
    this.handleViewStateChange({
      target,
      zoom: zoom - 0.5
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
        // Top panel: Fixed height, shows Column Axis
        new OrthographicView({
          id: 'axis',
          x: this.LABELS_WIDTH,
          y: 0,
          width: `calc(100% - ${this.LABELS_WIDTH}px)`,
          height: this.AXIS_HEIGHT,
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
          controller: false, // Passive, synced via code
          clear: { color: [248, 248, 248, 1] } // Light gray background
        }),
        // Right panel: Takes remaining width, shows Main Grid
        new OrthographicView({
          id: 'main',
          x: this.LABELS_WIDTH,
          y: this.AXIS_HEIGHT,
          width: `calc(100% - ${this.LABELS_WIDTH}px)`,
          height: `calc(100% - ${this.AXIS_HEIGHT}px)`,
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
        main: { target: [0, 0, 0], zoom: -1 },
        labels: { target: [0, 0, 0], zoom: -1 },
        axis: { target: [0, 0, 0], zoom: -1 }
      },
      getCursor: ({isDragging}) => isDragging ? 'grabbing' : 'grab',
      style: {},
      onViewStateChange: ({ viewState }) => {
        this.handleViewStateChange(viewState);
      },
      getTooltip: ({ object }) => {
        return this.getTooltipContent(object);
      }
    });

    // If data was loaded before deck was ready, fit camera now
    if (this._pendingFitToMSA && this.hasSequences()) {
      this._pendingFitToMSA = false;
      this.fitToMSA();
      this.render();
    }

    // Setup resize observer to refit when container is resized
    this.resizeObserver = new ResizeObserver(() => {
      if (this.hasSequences()) {
        this.fitToMSA();
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

    // Restore selection if still valid for new data, otherwise clear it
    if (prevSelection && prevCols === this.state.cols) {
      // Selection is still valid - keep it
      this.state.selection = prevSelection;
    } else {
      this.state.selection = null;
    }

    console.log(`[MSADeckGLViewer] Loaded ${this.state.rows} sequences, type: ${this.state.type}`);

    // Position camera to fit the MSA data
    this.fitToMSA();

    // Force immediate render after fitting
    this.render();

    // Also trigger a second render after a brief delay to ensure visibility
    setTimeout(() => this.render(), 100);

    return true;
  }

  /**
   * Fit the camera to show the entire MSA alignment
   */
  fitToMSA() {
    if (!this.hasSequences()) {
      return;
    }

    // If deck.gl isn't ready yet, defer the fit
    if (!this.state.deckgl) {
      this._pendingFitToMSA = true;
      return;
    }

    const cellSize = this.options.cellSize;
    const totalWidth = this.state.cols * cellSize;
    const totalHeight = this.state.rows * cellSize;

    // Calculate center of the alignment
    const centerX = totalWidth / 2;
    const centerY = -totalHeight / 2; // Negative because of flipY

    // Calculate zoom to fit the entire alignment
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;

    if (containerWidth > 0 && containerHeight > 0) {
      const zoomX = Math.log2(containerWidth / totalWidth);
      const zoomY = Math.log2(containerHeight / totalHeight);
      const fitZoom = Math.min(zoomX, zoomY) - 0.1; // Small margin

      // Clamp zoom to the same bounds as interactive zoom
      const MIN_ZOOM = -0.5;
      const MAX_ZOOM = 10;
      const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, fitZoom));

      // Update view state
      const newViewState = {
        target: [centerX, centerY, 0],
        zoom: clampedZoom
      };

      this.state.viewState = newViewState;
      const labelsViewState = {
        ...newViewState,
        target: [0, centerY, 0]
      };

      const axisViewState = {
        ...newViewState,
        target: [centerX, 0, 0]
      };

      // Update deck.gl view state
      this.state.deckgl.setProps({
        viewState: {
          main: newViewState,
          labels: labelsViewState,
          axis: axisViewState
        }
      });
    }
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

    const layers = [
      this.buildCellsLayer(cs).clone({ id: 'cells', viewId: 'main' }),
      this.buildSelectionBorderLayer(cs).clone({ id: 'selectionBorder', viewId: 'main' }),
      this.buildLettersLayer(cs).clone({ id: 'letters', viewId: 'main' }),
      this.buildRowLabelsLayer(cs).clone({ id: 'rowLabels', viewId: 'labels' }),
      this.buildColumnAxisLayer(cs).clone({ id: 'columnAxis', viewId: 'axis' })
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
    let r0 = Math.floor((-cy - halfH) / cellSize) - 1;
    let r1 = Math.ceil((-cy + halfH) / cellSize) + 1;

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
    const labelsData = buildRowLabels(cellSize, this.state.seqs, visibleRange, this.state.viewState, this.getZoomScale(), this.LABELS_WIDTH);
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
