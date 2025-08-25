/**
 * MSA Window Manager
 * Manages WinBox window for deck.gl MSA viewer
 */

import { MSADeckGLViewer } from './MSADeckGLViewer.js';
import { MSAViewerControls } from '../components/MSAViewerControls.js';

// We'll access WinBox dynamically to avoid build-time issues

export class MSAWindowManager {
  constructor() {
    this.winbox = null;
    this.viewer = null;
    this.container = null;
    this.controls = null;

    // Bind event listener
    this.handleOpenEvent = this.handleOpenEvent.bind(this);
    this.handleSyncEvent = this.handleSyncEvent.bind(this);

    // Register event listeners
    window.addEventListener('open-msa-viewer', this.handleOpenEvent);
    window.addEventListener('msa-sync-request', this.handleSyncEvent);
  }

  handleOpenEvent(event) {
    const { detail } = event;
    this.open(detail);
  }

  handleSyncEvent(event) {
    if (!this.viewer) return;

    const { detail = {} } = event;
    const { position, windowInfo } = detail;

    // TODO: Implement synchronization with tree position
    console.log('[MSA] Sync request:', { position, windowInfo });
  }

  isOpen() {
    return !!this.winbox;
  }

  async open(data) {
    // Focus existing window if open
    if (this.winbox) {
      this.winbox.focus();
      return;
    }

    // Create container for MSA viewer using controls component
    this.controls = new MSAViewerControls();
    this.container = this.controls.createContainer();

    // Load WinBox using the same approach as TaxaColoring
    let WinBox = window.WinBox;

    if (!WinBox) {
      try {
        // Try loading the bundled version
        const script = document.createElement('script');
        script.src = '/node_modules/winbox/dist/winbox.bundle.min.js';
        document.head.appendChild(script);

        // Wait for script to load
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          setTimeout(reject, 5000); // 5 second timeout
        });

        WinBox = window.WinBox;
      } catch (error) {
        console.error('[MSA] Failed to load WinBox:', error);
        alert('Failed to load window manager. Please refresh the page and try again.');
        return;
      }
    }

    if (typeof WinBox !== 'function') {
      console.error('[MSA] WinBox is not a constructor:', typeof WinBox);
      return;
    }

    this.winbox = new WinBox('Multiple Sequence Alignment Viewer', {
        class: ['msa-winbox', 'no-full'],
        border: 2,
        width: '80%',
        height: '70%',
        x: 'center',
        y: 'center',
        mount: this.container,
        overflow: false,

        onclose: () => {
          this.cleanup();
        },

        onresize: () => {
          if (this.viewer) {
            // Delay resize to ensure DOM has updated
            setTimeout(() => {
              this.viewer.resize();
              this.updateViewInfo();
            }, 50);
          }
        }
    });

    // Wait for DOM to be ready before initializing
    setTimeout(() => {
      this.initializeViewer(data);
    }, 100);
  }


  async initializeViewer(data) {
    // Get viewer container from controls
    const { viewerContainer } = this.controls.getControls();
    if (!viewerContainer) {
      console.error('[MSA] Viewer container not found');
      return;
    }

    // Create deck.gl viewer instance
    this.viewer = new MSADeckGLViewer(viewerContainer, {
      cellSize: 16,
      showLetters: true
    });

    // Set up view state change callback
    this.viewer.onViewStateChange = () => {
      this.updateViewInfo();
    };

    // Set up control event handlers
    this.setupControls();

    // Load MSA data if available
    this.loadMSAData(data);
  }

  setupControls() {
    const { 
      cellSizeSlider, 
      showLettersSwitch, 
      fitButton,
      setRegionButton,
      zoomRegionButton,
      clearRegionButton
    } = this.controls.getControls();

    if (cellSizeSlider) {
      // Material Design slider uses 'input' event
      cellSizeSlider.addEventListener('input', (e) => {
        if (this.viewer) {
          this.viewer.setCellSize(Number(e.target.value));
        }
      });
    }

    if (showLettersSwitch) {
      // Material Design switch uses 'change' event and 'selected' property
      showLettersSwitch.addEventListener('change', (e) => {
        if (this.viewer) {
          this.viewer.setShowLetters(e.target.selected);
        }
      });
    }

    if (fitButton) {
      fitButton.addEventListener('click', () => {
        if (this.viewer) {
          this.viewer.fitToView();
        }
      });
    }

    if (setRegionButton) {
      setRegionButton.addEventListener('click', () => {
        this.handleSetRegion();
      });
    }

    if (zoomRegionButton) {
      zoomRegionButton.addEventListener('click', () => {
        if (this.viewer) {
          this.viewer.zoomToSelection();
        }
      });
    }

    if (clearRegionButton) {
      clearRegionButton.addEventListener('click', () => {
        this.handleClearRegion();
      });
    }
  }

  async loadMSAData(data) {
    try {
      if (data && data.phyloMovieData && data.phyloMovieData.msa && data.phyloMovieData.msa.sequences && this.viewer) {
        const sequences = data.phyloMovieData.msa.sequences;
        let fastaString = "";
        for (const id in sequences) {
          fastaString += `>${id}\n${sequences[id]}\n`;
        }

        if (fastaString) {
          console.log("[MSA] Loading FASTA data from JSON, length:", fastaString.length);
          const success = this.viewer.loadFasta(fastaString);
          if (success) {
            this.updateInfo();
            this.updateViewInfo();
            
            // Update column input max values
            const controls = this.controls.getControls();
            if (controls.endColInput) {
              controls.endColInput.setAttribute('max', this.viewer.state.cols);
              controls.endColInput.value = Math.min(100, this.viewer.state.cols);
            }
          }
        } else {
          console.log("[MSA] No sequences found in JSON data");
        }
      } else {
        console.log("[MSA] No MSA data available in the provided data object, showing empty viewer");
      }
    } catch (error) {
      console.error("[MSA] Error loading data from JSON:", error);
    }
  }

  updateInfo() {
    if (this.viewer && this.controls) {
      const { rows, cols } = this.viewer.state;
      this.controls.updateInfo(`${rows} sequences × ${cols} positions`);
    }
  }

  updateViewInfo() {
    if (!this.viewer || !this.controls) return;

    const { rows, cols, viewState } = this.viewer.state;
    const cs = this.viewer.options.cellSize;
    const { r0, r1, c0, c1 } = this.viewer.getVisibleRange(cs);
    const visibleRows = r1 - r0 + 1;
    const visibleCols = c1 - c0 + 1;
    const visibleCells = visibleRows * visibleCols;
    const totalCells = rows * cols;

    // Update view info chip
    this.controls.updateViewInfo({
      visible: visibleCells.toLocaleString(),
      total: totalCells.toLocaleString()
    });

    // Update detailed info
    const pixelsPerCell = cs * Math.pow(2, viewState.zoom || 0);
    this.controls.updateDetailedInfo({
      zoom: viewState.zoom || 0,
      cellPixels: pixelsPerCell,
      visibleRows,
      visibleCols
    });
  }

  handleSetRegion() {
    if (!this.viewer || !this.controls) {
      console.warn('[MSA] Viewer or controls not initialized');
      return;
    }

    const { startColInput, endColInput } = this.controls.getControls();
    if (!startColInput || !endColInput) {
      console.warn('[MSA] Column input fields not found');
      return;
    }

    let startCol = parseInt(startColInput.value, 10);
    let endCol = parseInt(endColInput.value, 10);

    if (isNaN(startCol) || isNaN(endCol)) {
      console.warn('[MSA] Invalid column values:', startColInput.value, endColInput.value);
      return;
    }

    console.log('[MSA] Setting region:', startCol, 'to', endCol);
    this.viewer.setSelection(startCol, endCol);
    this.controls.updateSelectionInfo(this.viewer.state.selection);
  }

  handleClearRegion() {
    if (!this.viewer || !this.controls) return;

    this.viewer.clearSelection();
    this.controls.updateSelectionInfo(null);
  }

  cleanup() {
    // Clean up viewer
    if (this.viewer) {
      this.viewer.destroy();
      this.viewer = null;
    }

    // Clean up controls
    if (this.controls) {
      this.controls.destroy();
      this.controls = null;
    }

    // Clean up container
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;

    // Clear WinBox reference
    this.winbox = null;
  }

  destroy() {
    // Close window if open
    if (this.winbox) {
      this.winbox.close();
    }

    // Remove event listeners
    window.removeEventListener('open-msa-viewer', this.handleOpenEvent);
    window.removeEventListener('msa-sync-request', this.handleSyncEvent);
  }
}
