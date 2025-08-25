/**
 * MSA Viewer Window
 * Simple implementation using WinBox following TaxaColoring pattern
 */

import { MSADeckGLViewer } from './MSADeckGLViewer.js';

export default class MSAViewer {
  constructor(onClose) {
    this.onClose = onClose || (() => {});
    this.winBoxInstance = null;
    this.container = null;
    this.renderer = null;
    
    this.createWindow();
  }

  async createWindow() {
    try {
      // Load WinBox if not already available
      let WinBox = window.WinBox;
      
      if (!WinBox) {
        // Try loading from node_modules
        const script = document.createElement('script');
        script.src = '/node_modules/winbox/dist/winbox.bundle.min.js';
        document.head.appendChild(script);
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          setTimeout(reject, 5000); // 5 second timeout
        });
        
        WinBox = window.WinBox;
      }
      
      if (typeof WinBox !== 'function') {
        console.error('[MSA] WinBox is not a constructor:', typeof WinBox);
        throw new Error('WinBox not available');
      }
      
      // Create container for window content
      this.container = document.createElement('div');
      this.container.style.cssText = `
        height: 100%;
        display: flex;
        flex-direction: column;
      `;
      
      // Create controls container
      const controlsContainer = document.createElement('div');
      controlsContainer.style.cssText = `
        padding: 12px;
        background: var(--md-sys-color-surface-container, #f5f5f5);
        border-bottom: 1px solid var(--md-sys-color-outline-variant, #ddd);
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
      `;
      
      // Create region selection controls
      const regionControls = this.createRegionControls();
      controlsContainer.appendChild(regionControls);
      
      this.container.appendChild(controlsContainer);
      
      // Create renderer container
      const rendererContainer = document.createElement('div');
      rendererContainer.style.cssText = 'flex: 1; min-height: 0;';
      this.container.appendChild(rendererContainer);
      
      // Initialize the deck.gl renderer
      this.renderer = new MSADeckGLViewer(rendererContainer, {
        cellSize: 16,
        showLetters: true,
        MAX_CELLS: 150000
      });
      
      // Create WinBox window
      this.winBoxInstance = new WinBox('MSA Viewer', {
        class: ['msa-winbox', 'no-full'],
        border: 2,
        width: '70%',
        height: '60%',
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
    }
  }
  
  createRegionControls() {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      gap: 8px;
      align-items: center;
    `;
    
    // Label
    const label = document.createElement('span');
    label.style.cssText = `
      font-size: 14px;
      color: var(--md-sys-color-on-surface, #000);
      font-weight: 500;
    `;
    label.textContent = 'Region:';
    container.appendChild(label);
    
    // Start column input
    const startInput = document.createElement('input');
    startInput.type = 'number';
    startInput.min = '1';
    startInput.placeholder = 'Start';
    startInput.style.cssText = `
      width: 80px;
      padding: 6px 8px;
      border: 1px solid var(--md-sys-color-outline, #ccc);
      border-radius: 4px;
      font-size: 14px;
    `;
    container.appendChild(startInput);
    
    // To label
    const toLabel = document.createElement('span');
    toLabel.style.cssText = 'font-size: 14px; color: var(--md-sys-color-on-surface-variant, #666);';
    toLabel.textContent = 'to';
    container.appendChild(toLabel);
    
    // End column input
    const endInput = document.createElement('input');
    endInput.type = 'number';
    endInput.min = '1';
    endInput.placeholder = 'End';
    endInput.style.cssText = `
      width: 80px;
      padding: 6px 8px;
      border: 1px solid var(--md-sys-color-outline, #ccc);
      border-radius: 4px;
      font-size: 14px;
    `;
    container.appendChild(endInput);
    
    // Set button
    const setBtn = document.createElement('button');
    setBtn.textContent = 'Set';
    setBtn.style.cssText = `
      padding: 6px 16px;
      background: var(--md-sys-color-primary, #006a6a);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    setBtn.onclick = () => {
      const start = parseInt(startInput.value);
      const end = parseInt(endInput.value);
      if (!isNaN(start) && !isNaN(end) && this.renderer) {
        this.renderer.setRegion(start, end);
      }
    };
    container.appendChild(setBtn);
    
    // Clear button
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear';
    clearBtn.style.cssText = `
      padding: 6px 16px;
      background: var(--md-sys-color-error, #ba1a1a);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    clearBtn.onclick = () => {
      if (this.renderer) {
        this.renderer.clearRegion();
        startInput.value = '';
        endInput.value = '';
      }
    };
    container.appendChild(clearBtn);
    
    return container;
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
    this.winBoxInstance = null;
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