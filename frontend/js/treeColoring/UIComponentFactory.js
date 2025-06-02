// File: UIComponentFactory.js
import { ColorSchemePresets, getColorScheme } from './ColorSchemePresets.js';

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
    modalContent.classList.add('factory-modal-content'); // New class

    // Create heading
    const heading = document.createElement('h2');
    heading.textContent = 'Taxa Color Assignment';
    heading.classList.add('factory-modal-heading'); // New class
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
      modalContainer.classList.add('factory-fallback-modal-container'); // New class

      const modalHeader = document.createElement('div');
      modalHeader.classList.add('factory-fallback-modal-header'); // New class

      const modalTitle = document.createElement('h3');
      modalTitle.textContent = 'Taxa Coloring';
      modalTitle.classList.add('factory-fallback-modal-title'); // New class

      const closeButton = document.createElement('button');
      closeButton.innerHTML = '&times;';
      closeButton.classList.add('factory-fallback-modal-close-button'); // New class
      closeButton.onclick = () => {
        document.body.removeChild(modalContainer);
        if (onClose) onClose();
      };

      modalHeader.appendChild(modalTitle);
      modalHeader.appendChild(closeButton);

      modalContainer.appendChild(modalHeader);
      modalContainer.appendChild(modalContent); // modalContent already styled or given class

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
    modeContainer.className = 'mode-selector'; // Existing class
    modeContainer.classList.add('factory-mode-container'); // New class for margin

    const modeLabel = document.createElement('label');
    modeLabel.textContent = 'Coloring Mode:';
    modeLabel.htmlFor = 'coloring-mode-selector';
    modeLabel.classList.add('factory-mode-label'); // New class for margin

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
    buttonContainer.className = 'button-container'; // Existing class
    buttonContainer.classList.add('factory-button-container'); // New class for flex properties

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
  static createColorSchemePresetSelector({ onSchemeChange }) {
    const container = document.createElement('div');
    container.className = 'color-scheme-presets'; // Existing class
    container.classList.add('factory-csp-container'); // New class for specific factory styling

    const title = document.createElement('h4');
    title.textContent = 'Color Schemes';
    title.classList.add('factory-csp-title'); // New class

    const schemes = document.createElement('div');
    schemes.classList.add('factory-csp-schemes-wrapper'); // New class

    Object.entries(ColorSchemePresets).forEach(([schemeId, schemeColors]) => {
      const schemeButton = document.createElement('button');
      schemeButton.className = 'scheme-button'; // Existing class, CSS covers most styles
      // Add any factory-specific overrides or additional classes if .scheme-button is not sufficient
      // For now, assuming .scheme-button from coloring.css is mostly sufficient.
      // The inline styles for .scheme-button were similar to the CSS.
      // If differences are needed, add a new class like 'factory-scheme-button-override'

      const colorBar = document.createElement('div');
      colorBar.classList.add('factory-csp-color-bar'); // New class
      colorBar.style.background = `linear-gradient(to right, ${schemeColors.join(', ')})`; // Dynamic, stays inline

      const schemeNameElement = document.createElement('span');
      schemeNameElement.textContent = schemeId;
      schemeNameElement.classList.add('factory-csp-scheme-name'); // New class

      schemeButton.appendChild(colorBar);
      schemeButton.appendChild(schemeNameElement);

      schemeButton.addEventListener('click', () => {
        if (onSchemeChange) onSchemeChange(schemeId);
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
    container.classList.add('factory-color-container'); // New class
    return container;
  }

  /**
   * Creates a grid container for color inputs
   * @returns {HTMLElement} Grid container element
   */
  static createColorInputGrid() {
    const grid = document.createElement('div');
    // Reusing .color-input-grid from existing CSS if its single column is acceptable,
    // otherwise, use a new class for the factory's specific grid layout.
    // The existing .color-input-grid becomes 1fr 1fr at @media (min-width: 768px).
    // The factory style is more general.
    grid.classList.add('factory-color-input-grid'); // New class
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
    // .color-input-row from coloring.css already defines:
    // display: flex; align-items: center; padding: 7px 12px;
    // border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 5px;
    // border-radius: 4px; background-color: rgba(0,0,0,0.1);
    // The factory used padding: 5px. We can add a new class or accept .color-input-row's padding.
    inputDiv.className = 'color-input-row'; // Using existing class
    // If specific padding '5px' is crucial and different from '7px 12px', add a modifier class.
    // For now, assume .color-input-row is acceptable.
    // inputDiv.classList.add('factory-color-input-custom-padding');


    const label = document.createElement('label');
    label.textContent = name;
    // .color-input-label from coloring.css has:
    // margin-right: 12px; font-size: 15px; flex-grow: 1; color: #e3eaf2; display: flex; align-items: center;
    // The factory styles are mostly covered or compatible.
    label.className = 'color-input-label'; // Using existing class
    // Add specific factory overrides if needed:
    label.classList.add('factory-color-input-label-overrides'); // For white-space, overflow, text-overflow, flex:1

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
