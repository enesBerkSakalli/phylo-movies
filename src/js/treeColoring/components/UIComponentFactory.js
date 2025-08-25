// UIComponentFactory.js - Simplified UI component factory

// WinBox will be imported dynamically
import { CATEGORICAL_PALETTES, getPaletteInfo } from '../../constants/ColorPalettes.js';
import { ColorPicker } from './ColorPicker.js';

/**
 * A factory for creating UI elements for the Taxa Coloring window
 */
export class UIComponentFactory {

  /**
   * Creates the main window for the color assignment tool
   * @param {Function} onClose - A callback function for when the window is closed
   * @returns {{windowContent: HTMLElement, colorWin: WinBox}} An object containing the window's content container and the WinBox instance
   */
  static async createColorAssignmentWindow(onClose) {
    const windowContent = document.createElement('div');
    windowContent.className = 'tc-container'; // Use a specific prefix 'tc-' for Taxa Coloring

    // Try to get WinBox from global scope first, then dynamic import
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
        });
        
        WinBox = window.WinBox;
      } catch (error) {
        throw new Error(`Failed to load WinBox bundle: ${error.message}`);
      }
    }

    if (typeof WinBox !== 'function') {
      throw new Error(`WinBox is not available as a constructor. Type: ${typeof WinBox}. Available on window: ${typeof window.WinBox}`);
    }

    const colorWin = new WinBox({
      title: 'Taxa Color Assignment',
      width: '700px',
      height: '85%',
      x: 'center',
      y: 'center',
      mount: windowContent,
      onclose: onClose,
      class: ["no-full", "tc-winbox"], // Add a scoping class to the WinBox instance
    });

    return { windowContent, colorWin };
  }

  /**
   * Creates a selector for applying a predefined color scheme
   * Each scheme is a button showing a gradient of its colors
   * @param {{onSchemeChange: Function}} options - The configuration options
   * @returns {HTMLElement} The color scheme selector element
   */
  static createColorSchemeSelector({ onSchemeChange }) {
    const container = document.createElement('div');
    container.className = 'tc-section';

    const title = document.createElement('h3');
    title.className = 'tc-section-title';
    title.textContent = 'Apply a Color Scheme';

    const schemesContainer = document.createElement('div');
    schemesContainer.className = 'tc-scheme-grid';

    Object.entries(CATEGORICAL_PALETTES).forEach(([schemeId, schemeColors]) => {
      const paletteInfo = getPaletteInfo(schemeId);
      const schemeButton = document.createElement('button');
      schemeButton.className = 'tc-scheme-button';
      schemeButton.title = paletteInfo.description;

      const colorBar = document.createElement('div');
      colorBar.className = 'tc-scheme-gradient';
      colorBar.style.background = `linear-gradient(to right, ${schemeColors.join(', ')})`;

      const schemeNameContainer = document.createElement('div');
      schemeNameContainer.style.display = 'flex';
      schemeNameContainer.style.alignItems = 'center';
      schemeNameContainer.style.gap = '4px';
      
      const schemeName = document.createElement('span');
      schemeName.className = 'tc-scheme-name';
      schemeName.textContent = schemeId;
      schemeNameContainer.appendChild(schemeName);
      
      // Add color-blind safe indicator
      if (paletteInfo.colorBlindSafe) {
        const indicator = document.createElement('span');
        indicator.textContent = '👁';
        indicator.title = 'Color-blind safe';
        indicator.style.fontSize = '12px';
        schemeNameContainer.appendChild(indicator);
      }

      schemeButton.appendChild(colorBar);
      schemeButton.appendChild(schemeNameContainer);
      schemeButton.addEventListener('click', () => onSchemeChange(schemeId));
      schemesContainer.appendChild(schemeButton);
    });

    container.appendChild(title);
    container.appendChild(schemesContainer);
    return container;
  }

  /**
   * Creates a grid container for individual color inputs
   * @returns {HTMLElement} The grid container element
   */
  static createColorInputGrid() {
    const grid = document.createElement('div');
    grid.className = 'tc-color-input-grid';
    return grid;
  }

  /**
   * Creates a Material Design-compliant color input using ColorPicker
   * @param {string|HTMLElement} name - The label for the color input
   * @param {string} color - The initial color value
   * @param {Function} onChange - A callback function for when the color is changed
   * @returns {HTMLElement} The color input component
   */
  static createColorInput(name, color, onChange) {
    return ColorPicker.createColorInput(name, color, onChange);
  }
}