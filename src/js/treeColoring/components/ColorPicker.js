// ColorPicker.js - Simplified color picker component

import { CATEGORICAL_PALETTES } from '../../constants/ColorPalettes.js';

/**
 * Simplified color picker for taxa coloring
 */
export class ColorPicker {
  /**
   * Creates a Material Design-compliant color input with popover
   * @param {string|HTMLElement} name - The label for the color input
   * @param {string} color - The initial color value
   * @param {Function} onChange - Callback when color changes
   * @returns {HTMLElement} The color input component
   */
  static createColorInput(name, color, onChange) {
    const inputContainer = document.createElement('div');
    inputContainer.className = 'tc-color-input';

    const label = document.createElement('label');
    label.className = 'tc-color-input-label';
    if (typeof name === 'string') {
      label.textContent = name;
    } else {
      label.appendChild(name);
    }

    const swatchContainer = document.createElement('div');
    swatchContainer.className = 'tc-swatch-container';

    const swatch = document.createElement('div');
    swatch.className = 'tc-swatch';
    swatch.style.backgroundColor = color || '#000000';

    const popover = this._createColorPickerPopover(newColor => {
      swatch.style.backgroundColor = newColor;
      onChange(newColor);
    }, color);

    swatch.addEventListener('click', e => {
      e.stopPropagation();
      // Close other popovers before opening a new one
      document.querySelectorAll('.tc-popover.visible').forEach(p => p.classList.remove('visible'));
      popover.classList.toggle('visible');
    });

    swatchContainer.appendChild(swatch);
    swatchContainer.appendChild(popover);
    inputContainer.appendChild(label);
    inputContainer.appendChild(swatchContainer);

    // Global click listener to close the popover
    document.addEventListener('click', () => popover.classList.remove('visible'), { once: true });

    return inputContainer;
  }

  /**
   * Creates the color picker popover element
   * @private
   */
  static _createColorPickerPopover(onColorSelect, initialColor) {
    const popover = document.createElement('div');
    popover.className = 'tc-popover';
    popover.addEventListener('click', e => e.stopPropagation()); // Prevent closing when clicking inside

    const quickColorsTitle = document.createElement('h4');
    quickColorsTitle.className = 'tc-popover-title';
    quickColorsTitle.textContent = 'Quick Colors';
    popover.appendChild(quickColorsTitle);

    const swatchGrid = document.createElement('div');
    swatchGrid.className = 'tc-popover-grid';
    
    // Use first 4 color schemes for quick colors (using accessible palettes)
    const presetColors = new Set([].concat(
      ...Object.values(CATEGORICAL_PALETTES).slice(0, 4).map(palette => palette.slice(0, 5))
    ));

    presetColors.forEach(color => {
      const swatch = document.createElement('button');
      swatch.className = 'tc-popover-swatch';
      swatch.style.backgroundColor = color;
      swatch.addEventListener('click', () => {
        onColorSelect(color);
        popover.classList.remove('visible');
      });
      swatchGrid.appendChild(swatch);
    });
    popover.appendChild(swatchGrid);

    const customColorTitle = document.createElement('h4');
    customColorTitle.className = 'tc-popover-title';
    customColorTitle.textContent = 'Custom Color';
    popover.appendChild(customColorTitle);

    const customInput = document.createElement('input');
    customInput.type = 'color';
    customInput.className = 'tc-popover-input';
    customInput.value = initialColor || '#000000';
    customInput.addEventListener('input', e => onColorSelect(e.target.value));
    popover.appendChild(customInput);

    return popover;
  }
}