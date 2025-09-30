/**
 * MSA Viewer Window
 * Simple implementation using WinBox following TaxaColoring pattern
 */

import { MSADeckGLViewer } from './MSADeckGLViewer.js';
import { CLASS, UI, DEFAULTS } from './constants.js';
import { createRegionControls } from './utils/uiUtils.js';

export default class MSAViewer {
  constructor(onClose) {
    this.onClose = onClose || (() => {});
    this.winBoxInstance = null;
    this.container = null;
    this.renderer = null;
    this.setBtn = null;
    this.clearBtn = null;
    this._pendingData = null;
    this._pendingRegion = null;
    this._pendingClear = false;
    // Kick off async creation and expose a readiness promise
    this.ready = (async () => {
      await this.createWindow();
      if (this._pendingData && this.renderer) {
        this.renderer.loadFromPhyloData(this._pendingData);
        this._pendingData = null;
      }
      if (this._pendingRegion && this.renderer) {
        const { start, end } = this._pendingRegion;
        this.renderer.setRegion(start, end);
        this._pendingRegion = null;
      }
      if (this._pendingClear && this.renderer) {
        this.renderer.clearRegion();
        this._pendingClear = false;
      }
    })();
  }

  async createWindow() {
    try {
      // Load WinBox if not already available. Prefer ESM import.
      let WinBox = window.WinBox;
      if (!WinBox) {
        let WinBoxCtor = null;
        try {
          const mod = await import('winbox/src/js/winbox.js');
          WinBoxCtor = mod?.default || mod?.WinBox || mod;
        } catch {}
        if (!WinBoxCtor) {
          try {
            const mod = await import('winbox');
            WinBoxCtor = mod?.default || mod?.WinBox || null;
          } catch {}
        }
        if (!WinBoxCtor) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/winbox@0.2.82/dist/winbox.bundle.min.js';
          document.head.appendChild(script);
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            setTimeout(reject, 5000);
          });
          WinBoxCtor = window.WinBox;
        }
        WinBox = WinBoxCtor;
      }

      if (typeof WinBox !== 'function') {
        console.error('[MSA] WinBox is not a constructor:', typeof WinBox);
        throw new Error('WinBox not available');
      }

      // Create container for window content
      this.container = document.createElement('div');
      this.container.classList.add(CLASS.container);

      // Create renderer container first
      const rendererContainer = document.createElement('div');
      rendererContainer.classList.add(CLASS.rendererContainer);
      this.container.appendChild(rendererContainer);

      // Initialize the deck.gl renderer BEFORE creating controls
      this.renderer = new MSADeckGLViewer(rendererContainer, { ...DEFAULTS.renderer });

      const controlsContainer = document.createElement('div');
      controlsContainer.classList.add(CLASS.controls);

      // Create region selection controls with properly initialized renderer
      const regionControlsData = createRegionControls(this.renderer);
      controlsContainer.appendChild(regionControlsData.container);

      // Store button references for cleanup
      this.setBtn = regionControlsData.setBtn;
      this.clearBtn = regionControlsData.clearBtn;

      this.container.appendChild(controlsContainer);

      // Create WinBox window
      this.winBoxInstance = new WinBox(UI.windowTitle, {
        class: [CLASS.winbox, CLASS.winboxNoFull],
        border: DEFAULTS.window.border,
        width: DEFAULTS.window.width,
        height: DEFAULTS.window.height,
        x: 'center',
        y: 'center',
        mount: this.container,
        overflow: false,

        onclose: () => {
          this.handleClose();
          // Don't return false - let WinBox handle the close normally
        },

        onresize: () => {
          console.log('[MSA] Window resized');
        }
      });

      console.log('[MSA] Window created successfully');

    } catch (error) {
      console.error('[MSA] Failed to create window:', error);
      alert(`Failed to open MSA viewer window: ${error.message}`);
    }
  }

  /**
   * Load data into the MSA viewer
   * @param {Object} data - Phylo movie data with msa.sequences
   */
  loadData(data) {
    if (this.renderer) {
      this.renderer.loadFromPhyloData(data);
    } else {
      // Queue until renderer is ready
      this._pendingData = data;
    }
  }

  /**
   * Programmatically set the visible MSA region.
   * Safe to call before the viewer is ready; it will queue the update.
   */
  setRegion(start, end) {
    if (this.renderer) {
      this.renderer.setRegion(start, end);
    } else {
      this._pendingRegion = { start, end };
      this._pendingClear = false;
    }
  }

  /**
   * Programmatically clear the visible MSA region.
   * Safe to call before the viewer is ready; it will queue the update.
   */
  clearRegion() {
    if (this.renderer) {
      this.renderer.clearRegion();
    } else {
      this._pendingRegion = null;
      this._pendingClear = true;
    }
  }

  handleClose() {
    console.log('[MSA] Closing MSA viewer window');
    if (this.onClose) {
      this.onClose();
    }
    // Don't call close again - WinBox is already closing
    this.cleanup();
  }

  cleanup() {
    // Remove event listeners from buttons
    if (this.setBtn) {
      this.setBtn.onclick = null;
      this.setBtn = null;
    }
    if (this.clearBtn) {
      this.clearBtn.onclick = null;
      this.clearBtn = null;
    }

    // Clean up WinBox
    if (this.winBoxInstance) {
      // Remove WinBox event listeners if possible
      this.winBoxInstance = null;
    }

    // Null out other references
    this.container = null;
    this.renderer = null;
  }

  show() {
    if (this.winBoxInstance) {
      this.winBoxInstance.focus();
    }
  }

  hide() {
    if (this.winBoxInstance) {
      this.winBoxInstance.minimize();
    }
  }

  destroy() {
    if (this.winBoxInstance) {
      this.winBoxInstance.close();
    }
    this.cleanup();
  }
}
