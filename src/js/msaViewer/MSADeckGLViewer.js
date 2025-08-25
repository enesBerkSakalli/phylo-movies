/**
 * MSA DeckGL Viewer Module
 * Extracted from msa_viewer.html for integration with WinBox
 */

import { Deck, OrthographicView, OrthographicController } from '@deck.gl/core';
import { PolygonLayer, TextLayer } from '@deck.gl/layers';

export class MSADeckGLViewer {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      MAX_CELLS: 150000,
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
      viewState: { target: [0, 0, 0], zoom: 0 }
    };

    this.frame = null;
    // Delay initialization to ensure container has dimensions
    setTimeout(() => this.initializeDeck(), 50);
  }

  // =======================================================================
  // UTILITIES
  // =======================================================================

  parseFastaAligned(fasta) {
    const lines = (fasta || '').trim().split(/\r?\n/);
    const recs = [];
    let id = null, seq = [];

    for (const line of lines) {
      if (!line) continue;
      if (line[0] === '>') {
        if (id) recs.push({id, seq: seq.join('').toUpperCase()});
        id = line.slice(1).trim();
        seq = [];
      } else {
        seq.push(line.trim());
      }
    }

    if (id) recs.push({id, seq: seq.join('').toUpperCase()});
    if (!recs.length) throw new Error('No sequences parsed.');

    const L = recs[0].seq.length;
    for (const r of recs) {
      if (r.seq.length !== L) {
        throw new Error(`Sequences must be equal length (got ${L} and ${r.seq.length}).`);
      }
    }
    return recs;
  }

  rgba(r, g, b, a = 255) {
    return [r, g, b, a];
  }

  gray(v, a = 255) {
    return [v, v, v, a];
  }

  dnaColor(ch) {
    switch(ch) {
      case 'A': return this.rgba(0, 200, 0);      // Bright green
      case 'C': return this.rgba(0, 100, 255);    // Bright blue
      case 'G': return this.rgba(255, 165, 0);    // Orange
      case 'T': case 'U': return this.rgba(255, 0, 0);  // Red
      case '-': return this.gray(220);
      default: return this.gray(180);
    }
  }

  proteinColor(ch) {
    const hydrophobic = new Set(['A','V','I','L','M','F','W','Y','P']);
    const polar = new Set(['S','T','N','Q','C','G']);
    const positive = new Set(['K','R','H']);
    const negative = new Set(['D','E']);

    if (ch === '-') return this.gray(220);
    if (hydrophobic.has(ch)) return this.rgba(255, 200, 0);   // Yellow/gold - hydrophobic
    if (polar.has(ch)) return this.rgba(0, 150, 255);        // Light blue - polar
    if (positive.has(ch)) return this.rgba(0, 0, 255);       // Dark blue - positive
    if (negative.has(ch)) return this.rgba(255, 0, 0);       // Red - negative
    return this.gray(180);
  }

  guessTypeFromSeqs(recs) {
    const letters = new Set('ACGTU-');
    for (const r of recs) {
      for (const ch of r.seq) {
        if (!letters.has(ch)) return 'protein';
      }
    }
    return 'dna';
  }

  // =======================================================================
  // DECK.GL INITIALIZATION
  // =======================================================================

  initializeDeck() {
    // Ensure container has dimensions before initializing
    if (!this.container.offsetWidth || !this.container.offsetHeight) {
      console.warn('[MSA] Container has no dimensions, deferring deck initialization');
      setTimeout(() => this.initializeDeck(), 100);
      return;
    }

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

    this.state.deckgl = new Deck({
      canvas,
      width: this.container.offsetWidth,
      height: this.container.offsetHeight,
      views: [new OrthographicView({ 
        id: 'ortho',
        flipY: true  // Top-left origin for UI consistency
      })],
      controller: true,  // Enable controller at Deck level
      initialViewState: { 
        target: [0, 0, 0], 
        zoom: 0,
        minZoom: -5,  // Allow more zooming out
        maxZoom: 10   // Allow much more zooming in (2^10 = 1024x magnification)
      },
      getCursor: ({isDragging}) => isDragging ? 'grabbing' : 'grab',
      // Don't override container styles
      style: {},
      onViewStateChange: ({ viewState }) => {
        // Clamp zoom to prevent issues
        viewState.zoom = Math.max(-5, Math.min(10, viewState.zoom));
        this.state.viewState = viewState;
        // Only render if we have data
        if (this.state.seqs && this.state.seqs.length > 0) {
          this.renderThrottled();
        }
        // Dispatch custom event for view updates
        if (this.onViewStateChange) {
          this.onViewStateChange(viewState);
        }
      },
      getTooltip: ({ object }) => {
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
    });
  }

  // =======================================================================
  // DATA LOADING
  // =======================================================================

  loadFasta(fasta, type = null) {
    try {
      const seqs = this.parseFastaAligned(fasta);
      const dataType = type || this.guessTypeFromSeqs(seqs);

      this.state.seqs = seqs;
      this.state.type = dataType;
      this.state.rows = seqs.length;
      this.state.cols = seqs.length > 0 ? seqs[0].seq.length : 0;
      this.state.selection = null;

      // Render the data
      this.render();
      return true;
    } catch (error) {
      console.error('Error loading FASTA:', error);
      return false;
    }
  }

  loadFromPhyloData(data) {
    if (!data?.msa?.sequences) {
      console.warn('[MSADeckGLViewer] No MSA sequences found in data');
      return false;
    }

    // Convert dictionary to array format expected by deck.gl viewer
    const seqs = Object.entries(data.msa.sequences).map(([name, seq]) => ({
      id: name,
      seq: seq.toUpperCase()
    }));

    const dataType = this.guessTypeFromSeqs(seqs);

    this.state.seqs = seqs;
    this.state.type = dataType;
    this.state.rows = seqs.length;
    this.state.cols = seqs.length > 0 ? seqs[0].seq.length : 0;
    this.state.selection = null;

    console.log(`[MSADeckGLViewer] Loaded ${this.state.rows} sequences, type: ${this.state.type}`);

    // Check if deck.gl is ready before rendering
    if (this.state.deckgl) {
      // Render the data
      this.render();
    } else {
      console.log('[MSADeckGLViewer] Deck.gl not ready, deferring render');
      // Retry after deck.gl initializes
      setTimeout(() => {
        if (this.state.deckgl) {
          this.render();
        }
      }, 200);
    }
    return true;
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
    if (!this.state.seqs || this.state.seqs.length === 0) {
      this.state.deckgl.setProps({ layers: [] });
      return;
    }

    const cs = this.options.cellSize;

    const layers = [
      new PolygonLayer({
        id: 'cells',
        data: this.buildCellData(cs),
        pickable: true,
        autoHighlight: true,
        extruded: false,
        stroked: false,
        filled: true,
        getPolygon: d => d.polygon,
        getFillColor: d => {
          const baseColor = (this.state.type === 'dna' ? this.dnaColor : this.proteinColor).call(this, d.ch);
          // Dim colors outside the selection
          if (this.state.selection) {
            const { startCol, endCol } = this.state.selection;
            if (d.col < startCol - 1 || d.col > endCol - 1) {
              // Dim by reducing saturation and brightness
              return [
                baseColor[0] * 0.3 + 180,  // Blend with gray
                baseColor[1] * 0.3 + 180,
                baseColor[2] * 0.3 + 180,
                baseColor[3]
              ];
            }
          }
          return baseColor;
        },
      }),
      new PolygonLayer({
        id: 'selection-border',
        data: this.buildSelectionBorder(cs),
        pickable: false,
        stroked: true,
        filled: false,
        lineWidthMinPixels: 3,
        getPolygon: d => d.polygon,
        getLineColor: [255, 140, 0, 255],  // Bright orange border
      }),
      new TextLayer({
        id: 'letters',
        data: this.buildTextData(cs),
        pickable: false,
        getText: d => d.text,
        getPosition: d => d.position,
        getSize: 14,
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      }),
      new TextLayer({
        id: 'rowLabels',
        data: this.buildRowLabels(cs),
        pickable: true,
        getText: d => d.text,
        getPosition: d => d.position,
        getSize: 12,
        getTextAnchor: 'end',
        getAlignmentBaseline: 'center',
        background: true,
        getBackgroundColor: [15, 21, 48, 160],
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, "Helvetica Neue", Arial'
      }),
      new TextLayer({
        id: 'columnAxis',
        data: this.buildColumnAxis(cs),
        pickable: false,
        getText: d => d.text,
        getPosition: d => d.position,
        getSize: 12,
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'bottom',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, "Helvetica Neue", Arial'
      })
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
    const worldPerPixel = 1 / Math.pow(2, (this.state.viewState.zoom || 0));
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

  buildCellData(cellSize) {
    if (!this.state.seqs || this.state.seqs.length === 0) {
      return [];
    }

    const { r0, r1, c0, c1 } = this.getVisibleRange(cellSize);
    const nR = r1 - r0 + 1;
    const nC = c1 - c0 + 1;
    const step = Math.max(1, Math.ceil(Math.sqrt(nR * nC / this.options.MAX_CELLS)));
    const data = [];

    for (let r = r0; r <= r1; r += step) {
      for (let c = c0; c <= c1; c += step) {
        if (r >= this.state.seqs.length) continue;
        const seq = this.state.seqs[r];
        if (!seq || !seq.seq) continue;
        
        const x = c * cellSize;
        const y = -r * cellSize;
        const w = cellSize * Math.min(step, (c1 - c + 1));
        const h = cellSize * Math.min(step, (r1 - r + 1));

        data.push({
          kind: 'cell',
          row: r,
          col: c,
          ch: seq.seq[c] || '-',
          polygon: [[x, y], [x + w, y], [x + w, y - h], [x, y - h]]
        });
      }
    }

    return data;
  }

  buildTextData(cellSize) {
    if (!this.options.showLetters ||
        (this.options.cellSize * Math.pow(2, this.state.viewState.zoom || 0) < 12) ||
        !this.state.seqs || this.state.seqs.length === 0) {
      return [];
    }

    const { r0, r1, c0, c1 } = this.getVisibleRange(cellSize);
    const data = [];

    for (let r = r0; r <= r1; r++) {
      if (r >= this.state.seqs.length) continue;
      const seq = this.state.seqs[r];
      if (!seq || !seq.seq) continue;
      
      for (let c = c0; c <= c1; c++) {
        const ch = seq.seq[c] || '-';
        if (ch !== '-') {
          data.push({
            kind: 'text',
            position: [c * cellSize + cellSize / 2, -r * cellSize - cellSize / 2, 0],
            text: ch
          });
        }
      }
    }

    return data;
  }

  buildRowLabels(cellSize) {
    if (this.state.viewState.zoom <= -2 || !this.state.seqs || this.state.seqs.length === 0) {
      return [];
    }

    const { r0, r1 } = this.getVisibleRange(cellSize);
    const data = [];
    const pad = Math.max(8, cellSize * 0.25);

    for (let r = r0; r <= r1; r++) {
      if (r >= this.state.seqs.length) continue;
      const seq = this.state.seqs[r];
      if (!seq) continue;
      
      data.push({
        kind: 'label',
        row: r,
        text: seq.id || `Seq ${r + 1}`,
        position: [-pad, -r * cellSize - cellSize / 2, 0]
      });
    }

    return data;
  }

  buildColumnAxis(cellSize) {
    if (this.state.viewState.zoom <= -2) return [];

    const { c0, c1 } = this.getVisibleRange(cellSize);
    const data = [];
    const pad = 8;

    const pixelsPerCell = this.options.cellSize * Math.pow(2, this.state.viewState.zoom || 0);
    let step = 1;
    if (pixelsPerCell < 5) step = 10;
    if (pixelsPerCell < 2) step = 50;
    if (pixelsPerCell < 0.5) step = 200;
    if (pixelsPerCell < 0.1) step = 1000;

    for (let c = c0; c <= c1; c++) {
      if ((c + 1) % step === 0) {
        data.push({
          text: `${c + 1}`,
          position: [c * cellSize + cellSize / 2, pad, 0]
        });
      }
    }

    return data;
  }

  buildSelectionBorder(cellSize) {
    if (!this.state.selection) return [];

    const { startCol, endCol } = this.state.selection;
    const x = (startCol - 1) * cellSize;
    const w = (endCol - startCol + 1) * cellSize;
    const h = this.state.rows * cellSize;

    return [{
      polygon: [[x, 0], [x + w, 0], [x + w, -h], [x, -h]]
    }];
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

  // Public API for region selection
  setRegion(startCol, endCol) {
    this.setSelection(startCol, endCol);
  }

  clearRegion() {
    this.clearSelection();
  }

  getSelection() {
    return this.state.selection;
  }

  resize() {
    if (this.state.deckgl) {
      // Update deck.gl dimensions
      this.state.deckgl.setProps({
        width: this.container.offsetWidth,
        height: this.container.offsetHeight
      });
      // Update view if data is loaded
      if (this.state.rows > 0 && this.state.cols > 0) {
        requestAnimationFrame(() => {
          this.render();
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
