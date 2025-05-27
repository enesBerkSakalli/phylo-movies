// File: UIComponentFactory.js
/**
 * Factory for creating UI components for tree coloring
 */
export class UIComponentFactory {
  /**
   * Creates a modal window for color assignment
   * @param {Function} onClose - Callback when modal is closed
   * @returns {Object} Modal content and WinBox instance
   */
  static createColorAssignmentModal(onClose) {
    // Create modal content container
    const modalContent = document.createElement('div');
    modalContent.className = 'color-assignment-modal';
    modalContent.style.padding = '20px';
    modalContent.style.height = '100%';
    modalContent.style.overflowY = 'auto';

    // Create heading
    const heading = document.createElement('h2');
    heading.textContent = 'Taxa Color Assignment';
    heading.style.marginBottom = '20px';
    modalContent.appendChild(heading);

    // Create WinBox modal if available, otherwise use a simple div
    let colorWin;
    
    if (window.WinBox) {
      colorWin = new window.WinBox({
        title: 'Taxa Coloring',
        width: '600px',
        height: '80%',
        x: 'center',
        y: 'center',
        mount: modalContent,
        onclose: onClose
      });
    } else {
      // Fallback if WinBox is not available
      const modalContainer = document.createElement('div');
      modalContainer.style.position = 'fixed';
      modalContainer.style.top = '10%';
      modalContainer.style.left = '50%';
      modalContainer.style.transform = 'translateX(-50%)';
      modalContainer.style.width = '600px';
      modalContainer.style.maxHeight = '80%';
      modalContainer.style.backgroundColor = '#373747';
      modalContainer.style.color = 'white';
      modalContainer.style.borderRadius = '8px';
      modalContainer.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
      modalContainer.style.zIndex = '1000';
      modalContainer.style.overflowY = 'auto';
      
      const modalHeader = document.createElement('div');
      modalHeader.style.padding = '15px 20px';
      modalHeader.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
      modalHeader.style.display = 'flex';
      modalHeader.style.justifyContent = 'space-between';
      modalHeader.style.alignItems = 'center';
      
      const modalTitle = document.createElement('h3');
      modalTitle.textContent = 'Taxa Coloring';
      modalTitle.style.margin = '0';
      
      const closeButton = document.createElement('button');
      closeButton.innerHTML = '&times;';
      closeButton.style.background = 'none';
      closeButton.style.border = 'none';
      closeButton.style.color = 'white';
      closeButton.style.fontSize = '24px';
      closeButton.style.cursor = 'pointer';
      closeButton.onclick = () => {
        document.body.removeChild(modalContainer);
        if (onClose) onClose();
      };
      
      modalHeader.appendChild(modalTitle);
      modalHeader.appendChild(closeButton);
      
      modalContainer.appendChild(modalHeader);
      modalContainer.appendChild(modalContent);
      
      document.body.appendChild(modalContainer);
      
      // Implement a minimal WinBox-like interface
      colorWin = {
        dom: modalContainer,
        resize: (width, height) => {
          modalContainer.style.width = width;
          modalContainer.style.maxHeight = height;
        },
        close: () => {
          document.body.removeChild(modalContainer);
          if (onClose) onClose();
        }
      };
    }

    return { modalContent, colorWin };
  }

  /**
   * Creates the main UI structure for the color assignment modal
   * @param {HTMLElement} container - The container element
   * @param {Function} renderTaxaFn - Function to render taxa inputs
   * @param {Function} renderGroupsFn - Function to render group inputs
   * @returns {Object} UI components
   */
  static createMainUI(container, renderTaxaFn, renderGroupsFn) {
    // Create mode selector
    const modeContainer = document.createElement('div');
    modeContainer.className = 'mode-selector';
    modeContainer.style.marginBottom = '20px';
    
    const modeLabel = document.createElement('label');
    modeLabel.textContent = 'Coloring Mode:';
    modeLabel.htmlFor = 'coloring-mode-selector';
    modeLabel.style.marginRight = '10px';
    
    const modeSelect = document.createElement('select');
    modeSelect.id = 'coloring-mode-selector';
    modeSelect.className = 'mdc-select';
    
    const taxaOption = document.createElement('option');
    taxaOption.value = 'taxa';
    taxaOption.textContent = 'Individual Taxa';
    
    const groupsOption = document.createElement('option');
    groupsOption.value = 'groups';
    groupsOption.textContent = 'Taxa Groups';
    
    modeSelect.appendChild(taxaOption);
    modeSelect.appendChild(groupsOption);
    
    modeContainer.appendChild(modeLabel);
    modeContainer.appendChild(modeSelect);
    container.appendChild(modeContainer);
    
    // Create dynamic content area
    const dynamicContent = document.createElement('div');
    dynamicContent.id = 'dynamic-content';
    container.appendChild(dynamicContent);
    
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container';
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.marginTop = '20px';
    buttonContainer.style.gap = '10px';
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.className = 'md-button';
    
    const applyButton = document.createElement('button');
    applyButton.textContent = 'Apply';
    applyButton.className = 'md-button primary';
    
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(applyButton);
    container.appendChild(buttonContainer);
    
    return {
      modeSelect,
      dynamicContent,
      cancelButton,
      applyButton
    };
  }

  /**
   * Creates a color scheme preset selector UI
   * @param {Object} options - Configuration options
   * @returns {HTMLElement} The preset selector element
   */
  static createColorSchemePresetSelector({ onSchemeChange, onApply }) {
    const container = document.createElement('div');
    container.className = 'color-scheme-presets';
    container.style.marginBottom = '20px';
    container.style.padding = '15px';
    container.style.backgroundColor = 'rgba(0,0,0,0.15)';
    container.style.borderRadius = '6px';
    
    const title = document.createElement('h4');
    title.textContent = 'Color Schemes';
    title.style.marginTop = '0';
    title.style.marginBottom = '10px';
    
    const schemes = document.createElement('div');
    schemes.style.display = 'flex';
    schemes.style.gap = '10px';
    schemes.style.flexWrap = 'wrap';
    
    const schemeOptions = [
      { id: 'default', name: 'Default', colors: ['#3498db', '#9b59b6', '#2ecc71', '#f1c40f', '#e74c3c'] },
      { id: 'rainbow', name: 'Rainbow', colors: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF'] },
      { id: 'viridis', name: 'Viridis', colors: ['#440154', '#414487', '#2a788e', '#22a884', '#7ad151'] }
    ];
    
    schemeOptions.forEach(scheme => {
      const schemeButton = document.createElement('button');
      schemeButton.className = 'scheme-button';
      schemeButton.style.display = 'flex';
      schemeButton.style.flexDirection = 'column';
      schemeButton.style.alignItems = 'center';
      schemeButton.style.padding = '8px';
      schemeButton.style.backgroundColor = 'rgba(255,255,255,0.1)';
      schemeButton.style.border = '1px solid rgba(255,255,255,0.2)';
      schemeButton.style.borderRadius = '4px';
      schemeButton.style.cursor = 'pointer';
      
      const colorBar = document.createElement('div');
      colorBar.style.width = '60px';
      colorBar.style.height = '8px';
      colorBar.style.marginBottom = '5px';
      colorBar.style.borderRadius = '4px';
      colorBar.style.background = `linear-gradient(to right, ${scheme.colors.join(', ')})`;
      
      const schemeName = document.createElement('span');
      schemeName.textContent = scheme.name;
      schemeName.style.fontSize = '12px';
      
      schemeButton.appendChild(colorBar);
      schemeButton.appendChild(schemeName);
      
      schemeButton.addEventListener('click', () => {
        if (onSchemeChange) onSchemeChange(scheme.id);
      });
      
      schemes.appendChild(schemeButton);
    });
    
    container.appendChild(title);
    container.appendChild(schemes);
    
    return container;
  }

  /**
   * Creates a container for color inputs
   * @param {string} id - Container ID
   * @returns {HTMLElement} Container element
   */
  static createColorContainer(id) {
    const container = document.createElement('div');
    container.id = id;
    container.style.marginTop = '15px';
    return container;
  }

  /**
   * Creates a grid container for color inputs
   * @returns {HTMLElement} Grid container element
   */
  static createColorInputGrid() {
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
    grid.style.gap = '10px';
    return grid;
  }

  /**
   * Creates a color input for a taxon or group
   * @param {string} name - Taxon or group name
   * @param {string} color - Initial color value
   * @param {Function} onChange - Color change callback
   * @returns {HTMLElement} Color input element
   */
  static createColorInput(name, color, onChange) {
    const inputDiv = document.createElement('div');
    inputDiv.className = 'color-input';
    inputDiv.style.display = 'flex';
    inputDiv.style.alignItems = 'center';
    inputDiv.style.padding = '5px';
    inputDiv.style.backgroundColor = 'rgba(0,0,0,0.1)';
    inputDiv.style.borderRadius = '4px';
    
    const label = document.createElement('label');
    label.textContent = name;
    label.style.flex = '1';
    label.style.whiteSpace = 'nowrap';
    label.style.overflow = 'hidden';
    label.style.textOverflow = 'ellipsis';
    label.style.marginRight = '10px';
    
    const input = document.createElement('input');
    input.type = 'color';
    input.value = color || '#000000';
    input.id = `taxa-${name}`;
    
    if (onChange) {
      input.addEventListener('change', (e) => onChange(e.target.value));
    }
    
    inputDiv.appendChild(label);
    inputDiv.appendChild(input);
    
    return inputDiv;
  }
}