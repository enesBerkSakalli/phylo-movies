/**
 * MSA DeckGL Viewer Module
 * Extracted from msa_viewer.html for integration with WinBox
 */

import { Deck, OrthographicView } from '@deck.gl/core';
import { processPhyloData } from './utils/dataUtils.js';
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
      ...options
    };

    this.state = {
      deckgl: null,
      seqs: [],
      type: 'protein',
      rows: 0,
      cols: 0,
      selection: null,
      viewState: { target: [0, 0, 0], zoom: -1 }  // Start with reasonable zoom
    };

    this.frame = null;
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
    // Clamp zoom to prevent performance issues
    const MIN_ZOOM = -5;
    const MAX_ZOOM = 10;
    viewState.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewState.zoom));

    this.state.viewState = viewState;

    // Only render if we have data
    if (this.hasSequences()) {
      this.renderThrottled();
    }

    // Dispatch custom event for view updates
    if (this.onViewStateChange) {
      this.onViewStateChange(viewState);
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
      width: '100%',    // Let deck.gl handle automatic resize
      height: '100%',   // No more manual resize() method needed
      views: [new OrthographicView({
        id: 'ortho',
        flipY: true,  // Top-left origin for UI consistency
        clear: { color: [255, 255, 255, 1] }  // White background
      })],
      controller: true,  // Enable controller at Deck level
      initialViewState: {
        target: [0, 0, 0],  // Will be updated when data loads
        zoom: -1,            // Start slightly zoomed out for MSA viewing
        minZoom: -5,
        maxZoom: 10
      },
      getCursor: ({isDragging}) => isDragging ? 'grabbing' : 'grab',
      // Don't override container styles
      style: {},
      onViewStateChange: ({ viewState }) => {
        this.handleViewStateChange(viewState);
      },
      getTooltip: ({ object }) => {
        return this.getTooltipContent(object);
      }
    });
  }

  // =======================================================================
  // DATA LOADING
  // =======================================================================

  loadFromPhyloData(data) {
    const processedData = processPhyloData(data);

    if (!processedData) {
      return false;
    }

    this.state.seqs = processedData.sequences;
    this.state.type = processedData.type;
    this.state.rows = processedData.rows;
    this.state.cols = processedData.cols;
    this.state.selection = null;

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
    if (!this.hasSequences() || !this.state.deckgl) {
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

      // Clamp zoom to reasonable bounds
      const clampedZoom = Math.max(-2, Math.min(5, fitZoom));

      // Update view state
      const newViewState = {
        target: [centerX, centerY, 0],
        zoom: clampedZoom
      };

      this.state.viewState = newViewState;

      // Update deck.gl view state - use viewState instead of initialViewState for immediate update
      this.state.deckgl.setProps({
        viewState: newViewState,
        initialViewState: newViewState
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

    startCol = Math.max(1, Math.min(this.state.cols, startCol));
    endCol = Math.max(1, Math.min(this.state.cols, endCol));

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
      console.warn('[MSA] Cannot render - deck.gl not initialized');
      return;
    }

    // Don't render if no data is loaded
    if (!this.hasSequences()) {
      this.state.deckgl.setProps({ layers: [] });
      return;
    }

    const cs = this.options.cellSize;

    const layers = [
      this.buildCellsLayer(cs),
      this.buildSelectionBorderLayer(cs),
      this.buildLettersLayer(cs),
      this.buildRowLabelsLayer(cs),
      this.buildColumnAxisLayer(cs)
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
    return createCellsLayer(cellData, this.state.type, this.state.selection);
  }

  /**
   * Build the selection border polygon layer
   * @param {number} cellSize - Size of each cell
   * @returns {PolygonLayer} The selection border layer
   */
  buildSelectionBorderLayer(cellSize) {
    const borderData = buildSelectionBorder(cellSize, this.state.selection, this.state.rows);
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
    const labelsData = buildRowLabels(cellSize, this.state.seqs, visibleRange, this.state.viewState, this.getZoomScale());
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

  // Public API for region selection (alias for setSelection/clearSelection)
  setRegion(startCol, endCol) {
    this.setSelection(startCol, endCol);
  }

  clearRegion() {
    this.clearSelection();
  }

  /**
   * Fit camera to show entire MSA alignment
   */
  fitCameraToMSA() {
    this.fitToMSA();
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
          viewState: defaultViewState,
          initialViewState: defaultViewState
        });
      }
    }
  }

  destroy() {
    if (this.state.deckgl) {
      this.state.deckgl.finalize();
      this.state.deckgl = null;
    }
  }
}
