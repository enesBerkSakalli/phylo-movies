/**
 * MSA Viewer Controls Component
 * Material Design controls for the MSA viewer window
 */

export class MSAViewerControls {
  constructor() {
    this.container = null;
    this.headerElement = null;
    this.viewerContainer = null;
  }

  /**
   * Creates the main container with Material Design styling
   * @returns {HTMLElement} The container element
   */
  createContainer() {
    this.container = document.createElement('div');
    this.container.id = 'msa-winbox-content';
    this.container.style.cssText = `
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
      font-family: var(--md-sys-typescale-body-large-font, system-ui);
    `;

    // Create and append header
    this.headerElement = this.createHeader();
    this.container.appendChild(this.headerElement);

    // Create and append viewer container
    this.viewerContainer = this.createViewerContainer();
    this.container.appendChild(this.viewerContainer);

    return this.container;
  }

  /**
   * Creates the header with Material Design controls
   * @returns {HTMLElement} The header element
   */
  createHeader() {
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 16px;
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
      background: var(--md-sys-color-surface-container-low);
      display: flex;
      gap: 12px;
      align-items: center;
      flex-shrink: 0;
    `;

    header.innerHTML = this.getHeaderHTML();
    return header;
  }

  /**
   * Returns the HTML for header controls
   * @returns {string} Header HTML
   */
  getHeaderHTML() {
    return `
      <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
        <!-- Cell Size Control -->
        <div style="display: flex; align-items: center; gap: 8px;">
          <md-icon style="color: var(--md-sys-color-primary); font-size: 18px;">text_fields</md-icon>
          <span style="color: var(--md-sys-color-on-surface-variant); font-size: 12px;">Cell size</span>
          <md-slider 
            id="msa-cell-size" 
            min="6" 
            max="28" 
            value="16"
            step="1"
            labeled
            style="width: 120px;">
          </md-slider>
        </div>
        
        <!-- Show Letters Toggle -->
        <md-switch 
          id="msa-show-letters"
          selected
          style="--md-switch-selected-track-color: var(--md-sys-color-primary);">
        </md-switch>
        <label for="msa-show-letters" style="color: var(--md-sys-color-on-surface-variant); font-size: 12px; cursor: pointer;">
          Show letters
        </label>
        
        <!-- Action Buttons -->
        <md-filled-tonal-button id="msa-fit-btn" has-icon>
          <md-icon slot="icon">fit_screen</md-icon>
          Fit to View
        </md-filled-tonal-button>
      </div>
      
      <!-- Spacer -->
      <div style="flex: 1;"></div>
      
      <!-- Info Chips -->
      <md-chip-set style="margin-left: auto; display: flex; gap: 8px;">
        <md-assist-chip id="msa-info-chip" elevated>
          <md-icon slot="icon">info</md-icon>
          <span id="msa-info">No data loaded</span>
        </md-assist-chip>
        <md-assist-chip id="msa-view-info-chip" elevated>
          <md-icon slot="icon">visibility</md-icon>
          <span id="msa-view-info">—</span>
        </md-assist-chip>
      </md-chip-set>
    `;
  }

  /**
   * Creates the viewer container for deck.gl
   * @returns {HTMLElement} The viewer container element
   */
  createViewerContainer() {
    const container = document.createElement('div');
    container.style.cssText = `
      flex: 1;
      display: flex;
      overflow: hidden;
      position: relative;
    `;

    // Create sidebar for region selection
    const sidebar = document.createElement('div');
    sidebar.style.cssText = `
      width: 280px;
      padding: 12px;
      background: var(--md-sys-color-surface-container-low);
      border-right: 1px solid var(--md-sys-color-outline-variant);
      overflow-y: auto;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;

    sidebar.innerHTML = this.getSidebarHTML();
    container.appendChild(sidebar);

    // Create the actual viewer container
    const viewerContainer = document.createElement('div');
    viewerContainer.id = 'msa-deck-container';
    viewerContainer.style.cssText = `
      flex: 1;
      position: relative;
      overflow: hidden;
      background: var(--md-sys-color-surface);
      min-width: 0;
      min-height: 0;
    `;
    container.appendChild(viewerContainer);

    // Store references
    this.viewerContainer = viewerContainer;
    this.sidebar = sidebar;

    return container;
  }

  /**
   * Returns the HTML for sidebar controls
   * @returns {string} Sidebar HTML
   */
  getSidebarHTML() {
    return `
      <!-- Region Selection Card -->
      <div style="
        background: var(--md-sys-color-surface-container);
        border-radius: 12px;
        padding: 16px;
        border: 1px solid var(--md-sys-color-outline-variant);
      ">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <md-icon style="color: var(--md-sys-color-primary); font-size: 20px;">select_all</md-icon>
          <span style="font-weight: 500; color: var(--md-sys-color-on-surface);">Column Selection</span>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <md-outlined-text-field 
            id="msa-start-col" 
            label="Start Column"
            type="number"
            min="1"
            value="1"
            style="width: 100%;">
          </md-outlined-text-field>
          
          <md-outlined-text-field 
            id="msa-end-col" 
            label="End Column"
            type="number"
            min="1"
            value="1"
            style="width: 100%;">
          </md-outlined-text-field>
        </div>
        
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <md-filled-button id="msa-set-region-btn" has-icon>
            <md-icon slot="icon">done</md-icon>
            Set
          </md-filled-button>
          
          <md-outlined-button id="msa-zoom-region-btn" has-icon>
            <md-icon slot="icon">zoom_in</md-icon>
            Zoom
          </md-outlined-button>
          
          <md-text-button id="msa-clear-region-btn" has-icon>
            <md-icon slot="icon">clear</md-icon>
            Clear
          </md-text-button>
        </div>
        
        <div id="msa-selection-info" style="
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--md-sys-color-outline-variant);
          color: var(--md-sys-color-on-surface-variant);
          font-size: 12px;
        ">
          No selection
        </div>
      </div>

      <!-- Detailed Info Card -->
      <div style="
        background: var(--md-sys-color-surface-container);
        border-radius: 12px;
        padding: 16px;
        border: 1px solid var(--md-sys-color-outline-variant);
      ">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <md-icon style="color: var(--md-sys-color-primary); font-size: 20px;">analytics</md-icon>
          <span style="font-weight: 500; color: var(--md-sys-color-on-surface);">View Details</span>
        </div>
        
        <div id="msa-detailed-info" style="
          color: var(--md-sys-color-on-surface-variant);
          font-size: 12px;
          line-height: 1.6;
        ">
          <div>Zoom: <b>—</b></div>
          <div>Cell pixels: <b>—</b></div>
          <div>Visible area: <b>—</b></div>
        </div>
      </div>
    `;
  }

  /**
   * Gets references to all control elements
   * @returns {Object} Object containing control element references
   */
  getControls() {
    if (!this.container) return {};
    
    return {
      cellSizeSlider: this.container.querySelector('#msa-cell-size'),
      showLettersSwitch: this.container.querySelector('#msa-show-letters'),
      fitButton: this.container.querySelector('#msa-fit-btn'),
      infoElement: this.container.querySelector('#msa-info'),
      viewInfoElement: this.container.querySelector('#msa-view-info'),
      detailedInfoElement: this.container.querySelector('#msa-detailed-info'),
      selectionInfoElement: this.container.querySelector('#msa-selection-info'),
      startColInput: this.container.querySelector('#msa-start-col'),
      endColInput: this.container.querySelector('#msa-end-col'),
      setRegionButton: this.container.querySelector('#msa-set-region-btn'),
      zoomRegionButton: this.container.querySelector('#msa-zoom-region-btn'),
      clearRegionButton: this.container.querySelector('#msa-clear-region-btn'),
      viewerContainer: this.viewerContainer
    };
  }

  /**
   * Updates the info display
   * @param {string} text - Text to display in the info chip
   */
  updateInfo(text) {
    const infoElement = this.container?.querySelector('#msa-info');
    if (infoElement) {
      infoElement.textContent = text;
    }
  }

  /**
   * Updates the view info display
   * @param {Object} viewInfo - View information
   */
  updateViewInfo(viewInfo) {
    const viewInfoElement = this.container?.querySelector('#msa-view-info');
    if (viewInfoElement && viewInfo) {
      const { visible, total } = viewInfo;
      viewInfoElement.textContent = `${visible} / ${total} cells`;
    }
  }

  /**
   * Updates the detailed info display
   * @param {Object} details - Detailed view information
   */
  updateDetailedInfo(details) {
    const detailedInfoElement = this.container?.querySelector('#msa-detailed-info');
    if (detailedInfoElement && details) {
      detailedInfoElement.innerHTML = `
        <div>Zoom: <b>${details.zoom.toFixed(2)}</b></div>
        <div>Cell pixels: <b>${details.cellPixels.toFixed(1)}</b></div>
        <div>Visible: <b>${details.visibleRows}×${details.visibleCols}</b></div>
      `;
    }
  }

  /**
   * Updates the selection info display
   * @param {Object|null} selection - Selection information
   */
  updateSelectionInfo(selection) {
    const selectionInfoElement = this.container?.querySelector('#msa-selection-info');
    if (selectionInfoElement) {
      if (selection) {
        const width = selection.endCol - selection.startCol + 1;
        selectionInfoElement.innerHTML = `
          Selected: <b>Columns ${selection.startCol} - ${selection.endCol}</b><br>
          Width: <b>${width} columns</b>
        `;
      } else {
        selectionInfoElement.textContent = 'No selection';
      }
    }
  }

  /**
   * Clean up the component
   */
  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.headerElement = null;
    this.viewerContainer = null;
  }
}