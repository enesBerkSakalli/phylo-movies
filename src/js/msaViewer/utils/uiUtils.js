/**
 * UI Utilities for MSA Viewer
 * Contains functions for creating UI components
 */

import { CLASS, UI } from '../constants.js';

/**
 * Creates a label element
 * @param {string} text - The text content for the label
 * @param {string} className - CSS class to add
 * @param {string} id - Optional ID for the element
 * @returns {HTMLSpanElement} The created label element
 */
export function createLabel(text, className = CLASS.label, id = null) {
  const label = document.createElement('span');
  label.classList.add(className);
  label.textContent = text;
  if (id) label.id = id;
  return label;
}

/**
 * Creates a number input element
 * @param {string} placeholder - Placeholder text
 * @param {string} ariaLabel - ARIA label for accessibility
 * @param {string} id - Optional ID for the element
 * @returns {HTMLInputElement} The created input element
 */
export function createNumberInput(placeholder, ariaLabel, id = null) {
  const input = document.createElement('input');
  input.type = 'number';
  input.min = '1';
  input.placeholder = placeholder;
  input.classList.add(CLASS.input);
  input.setAttribute('aria-label', ariaLabel);
  if (id) input.id = id;
  return input;
}

/**
 * Creates a button element
 * @param {string} text - Button text content
 * @param {Array<string>} classes - Array of CSS classes to add
 * @param {Function} onClick - Click event handler
 * @param {string} id - Optional ID for the element
 * @returns {HTMLButtonElement} The created button element
 */
export function createButton(text, classes = [CLASS.button], onClick = null, id = null) {
  const button = document.createElement('button');
  button.textContent = text;
  classes.forEach(className => button.classList.add(className));
  if (onClick) button.onclick = onClick;
  if (id) button.id = id;
  return button;
}

/**
 * Creates region selection controls for the MSA viewer
 * @param {MSADeckGLViewer} renderer - The MSA renderer instance
 * @returns {Object} Object containing the container element and button references for cleanup
 */
export function createRegionControls(renderer) {
  const container = document.createElement('div');
  container.classList.add(CLASS.regionControls);

  // Label
  const label = createLabel(UI.labelRegion, CLASS.label, 'msa-region-label');
  container.appendChild(label);

  // Start column input
  const startInput = createNumberInput('Start', 'Start column number', 'msa-start-input');
  container.appendChild(startInput);

  // To label
  const toLabel = createLabel(UI.labelTo, CLASS.toLabel, 'msa-to-label');
  container.appendChild(toLabel);

  // End column input
  const endInput = createNumberInput('End', 'End column number', 'msa-end-input');
  container.appendChild(endInput);

  // Set button
  const setBtn = createButton(UI.buttonSet, [CLASS.button, CLASS.buttonSet], () => {
    const start = parseInt(startInput.value);
    const end = parseInt(endInput.value);
    if (!isNaN(start) && !isNaN(end) && start > 0 && end > 0 && start < end && renderer) {
      renderer.setRegion(start, end);
    } else {
      alert('Please enter valid start and end positions (start must be less than end, both must be positive numbers)');
    }
  }, 'msa-set-button');
  container.appendChild(setBtn);

  // Clear button
  const clearBtn = createButton(UI.buttonClear, [CLASS.button, CLASS.buttonClear], () => {
    if (renderer) {
      renderer.clearRegion();
      startInput.value = '';
      endInput.value = '';
    }
  }, 'msa-clear-button');
  container.appendChild(clearBtn);

  // Return container and button references for cleanup
  return {
    container,
    setBtn,
    clearBtn
  };
}
