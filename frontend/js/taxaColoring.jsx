import {  getColorScheme } from './treeColoring/ColorSchemePresets.js';
import { UIComponentFactory } from './treeColoring/UIComponentFactory.js';
import { COLOR_MAP } from "./treeColoring/ColorMap.js";

/**
 * TaxaColoring: UI/controller for color assignment modal.
 * Collects user color choices for taxa/groups and applies them to the tree visualization.
 */
export default class TaxaColoring {
  /**
   * @param {Array<string>} taxaNames - List of taxa names
   * @param {Object} originalColorMap - Current color map
   * @param {Function} onComplete - Callback when coloring is complete
   */
  constructor(taxaNames, originalColorMap, onComplete) {
    this.taxaNames = taxaNames || [];
    this.onComplete = onComplete || function () {};
    this.taxaColorMap = new Map();
    this.groupColorMap = new Map();
    this.separator = "-";
    this.currentMode = "taxa";
    this.originalColorMap = originalColorMap || {};
    this.selectedStrategyType = null; // To store if grouping is by 'first', 'last', 'first-letter', or 'manual_char'

    // Initialize with colors from original color map
    if (originalColorMap) {
      this.taxaNames.forEach((taxon) => {
        const color = originalColorMap[taxon] || "#000000";
        this.taxaColorMap.set(taxon, color);
      });
    }

    // Color schemes are now imported from ColorSchemePresets.js
    // this.colorSchemes = { ... }; // Removed

    this.initialize();

    // Analyze and suggest separator strategies
    this.suggestedSeparatorStrategies = this.analyzeTaxaSeparators(this.taxaNames);
    console.log("Suggested Separator Strategies:", this.suggestedSeparatorStrategies);
  }

  initialize() {
    // Load CSS if not already loaded
    this.ensureColorigCssLoaded();
    this.launchModal(); // Changed from createModal
  }

  launchModal() {
    const { modalContent, colorWin } = UIComponentFactory.createColorAssignmentModal(() => this.handleCloseModal());
    this.colorWin = colorWin;
    this.modalContent = modalContent; // Store modalContent if needed for later direct manipulations

    // 1. Color Scheme Selector
    const schemeSelectorUI = UIComponentFactory.createColorSchemePresetSelector({
      onSchemeChange: (schemeName) => this.applyColorScheme(schemeName)
    });
    this.modalContent.appendChild(schemeSelectorUI);

    // 2. Main UI (Mode Selector, Dynamic Content Area, Buttons)
    const mainUIComponents = UIComponentFactory.createMainUI(this.modalContent);

    this.dynamicContentPlaceholder = mainUIComponents.dynamicContent; // Store the placeholder for content

    // 3. Separator Dropdown (integrated with mode selector)
    // The modeSelect is appended to modalContent by createMainUI.
    // We need to find it or its container to add the separator UI.
    // Assuming modeSelect is directly in modalContent or in a specific container.
    // For robustness, UIComponentFactory.createMainUI should return the modeContainer.
    // Given current factory, we'll assume mainUIComponents.modeSelect.parentNode is usable.

    // Comment out old separator dropdown (now replaced by manualSeparatorControls)
    // this.separatorSelect = this.createManualSeparatorControls(); // Old call was createSeparatorDropdown
    // if (mainUIComponents.modeSelect && mainUIComponents.modeSelect.parentNode) {
    //   mainUIComponents.modeSelect.parentNode.appendChild(this.separatorSelect.container);
    // }

    // Add new suggested separator UI
    this.suggestedSeparatorUI = UIComponentFactory.createSuggestedSeparatorUI(
        this.suggestedSeparatorStrategies,
        (selectedStrategy) => {
            console.log("Selected suggestion:", selectedStrategy);
            this.separator = selectedStrategy.separator;
            this.selectedStrategyType = selectedStrategy.strategyType;

            // Update UI of manual controls to reflect this selection
            if (this.manualSeparatorControls) { // Check if manual controls are initialized
                if (this.selectedStrategyType === 'first-letter' || this.separator === 'first-letter') {
                    if (this.manualSeparatorControls.firstLetterRadio) this.manualSeparatorControls.firstLetterRadio.checked = true;
                    if(this.manualSeparatorControls.dropdown && this.manualSeparatorControls.dropdown.options.length > 0) {
                        this.manualSeparatorControls.dropdown.value = this.manualSeparatorControls.dropdown.options[0].value; // Reset dropdown
                    }
                } else {
                    if (this.manualSeparatorControls.dropdown) {
                        this.manualSeparatorControls.dropdown.value = selectedStrategy.separator;
                        // Trigger the dropdown change to update occurrence options
                        if (this.manualSeparatorControls.dropdown.onchange) {
                            this.manualSeparatorControls.dropdown.onchange();
                        }
                    }
                    if (this.manualSeparatorControls.occurrenceSelect) {
                        this.manualSeparatorControls.occurrenceSelect.value = selectedStrategy.strategyType;
                    }
                    if (this.manualSeparatorControls.firstLetterRadio) this.manualSeparatorControls.firstLetterRadio.checked = false;
                }
            }
            this.clearContainer(this.dynamicContentPlaceholder);
            this.renderGroupOptions(this.dynamicContentPlaceholder);
        }
    );
    if (mainUIComponents.modeSelect && mainUIComponents.modeSelect.parentNode) {
        mainUIComponents.modeSelect.parentNode.appendChild(this.suggestedSeparatorUI);
    }

    // Create and append manual separator controls
    this.manualSeparatorControls = this.createManualSeparatorControls(); // Renamed method
    if (mainUIComponents.modeSelect && mainUIComponents.modeSelect.parentNode) {
        mainUIComponents.modeSelect.parentNode.appendChild(this.manualSeparatorControls.container);
    }


    // 4. Event Handlers for Mode Select
    mainUIComponents.modeSelect.value = this.currentMode; // Set initial mode
    mainUIComponents.modeSelect.onchange = () => this.handleModeChange(mainUIComponents.modeSelect.value);

    // 5. Action Buttons (now created by UIComponentFactory.createMainUI)
    // The actionButtonContainer is already appended to modalContent by the factory.
    // We just need to attach handlers to the buttons.
    mainUIComponents.resetButton.onclick = () => this.resetColors();
    mainUIComponents.cancelButton.onclick = () => this.colorWin.close();
    mainUIComponents.applyButton.onclick = () => {
      this.applyChanges();
      this.colorWin.close();
    };

    // Initial content rendering
    this.handleModeChange(this.currentMode);
  }

  /**
   * Creates manual controls for selecting a separator character, occurrence number, and 'First Letter' grouping.
   * This includes a dropdown for specific characters ('-', '_', '.', ' '), an occurrence selector,
   * and a radio button for 'First Letter' grouping. Changes here update `this.separator` and
   * `this.selectedStrategyType`, then refresh the group options display.
   *
   * @returns {Object} An object containing the main container element and the control elements.
   */
  createManualSeparatorControls() {
    const container = document.createElement("div");
    container.className = "manual-separator-controls";

    const titleLabel = document.createElement("label");
    titleLabel.textContent = "Or, define grouping manually:";
    titleLabel.className = "manual-separator-title";
    container.appendChild(titleLabel);

    const controlGroup = document.createElement('div');
    controlGroup.className = "manual-separator-control-group";

    // Dropdown for specific separator characters
    const dropdownWrapper = document.createElement('div');
    dropdownWrapper.className = "manual-dropdown-wrapper";
    const dropdownLabel = document.createElement("label");
    dropdownLabel.textContent = "Separator:";
    dropdownLabel.htmlFor = "manual-separator-dropdown";
    dropdownLabel.style.marginRight = "5px";
    dropdownWrapper.appendChild(dropdownLabel);

    const dropdown = document.createElement("select");
    dropdown.id = "manual-separator-dropdown";
    dropdown.className = "separator-select";

    const defaultSeparators = ['-', '_', '.', ' '];
    defaultSeparators.forEach(sepChar => {
      const option = document.createElement("option");
      option.value = sepChar;
      option.textContent = sepChar === ' ' ? 'Space' : sepChar;
      dropdown.appendChild(option);
    });

    // Occurrence selector
    const occurrenceWrapper = document.createElement('div');
    occurrenceWrapper.className = "manual-occurrence-wrapper";
    const occurrenceLabel = document.createElement("label");
    occurrenceLabel.textContent = "Use:";
    occurrenceLabel.htmlFor = "manual-occurrence-select";
    occurrenceLabel.style.marginLeft = "10px";
    occurrenceLabel.style.marginRight = "5px";
    occurrenceWrapper.appendChild(occurrenceLabel);

    const occurrenceSelect = document.createElement("select");
    occurrenceSelect.id = "manual-occurrence-select";
    occurrenceSelect.className = "occurrence-select";

    // Populate occurrence options based on the current separator and taxa names
    const updateOccurrenceOptions = (selectedSeparator) => {
      // Clear existing options
      occurrenceSelect.innerHTML = '';

      if (!this.taxaNames || this.taxaNames.length === 0) {
        const option = document.createElement("option");
        option.value = "first";
        option.textContent = "First occurrence";
        occurrenceSelect.appendChild(option);
        return;
      }

      // Find max occurrences of the selected separator across all taxa
      const maxOccurrences = Math.max(...this.taxaNames.map(name =>
        (name.split(selectedSeparator).length - 1)
      ));

      // Add "First" and "Last" options
      const firstOption = document.createElement("option");
      firstOption.value = "first";
      firstOption.textContent = "Before first";
      occurrenceSelect.appendChild(firstOption);

      // Add numbered occurrence options if there are multiple occurrences
      if (maxOccurrences > 1) {
        for (let i = 2; i <= Math.min(maxOccurrences, 10); i++) {
          const option = document.createElement("option");
          option.value = `nth-${i}`;
          option.textContent = `Between ${this._getOrdinal(i-1)} and ${this._getOrdinal(i)}`;
          occurrenceSelect.appendChild(option);
        }
      }

      const lastOption = document.createElement("option");
      lastOption.value = "last";
      lastOption.textContent = "Before last";
      occurrenceSelect.appendChild(lastOption);
    };

    // Update the change handler to include occurrence
    const updateGrouping = () => {
      if (firstLetterRadio && firstLetterRadio.checked) return; // Don't update if first letter is selected

      this.separator = dropdown.value;
      this.selectedStrategyType = occurrenceSelect.value;
      this.clearContainer(this.dynamicContentPlaceholder);
      this.renderGroupOptions(this.dynamicContentPlaceholder);
    };

    dropdown.onchange = () => {
      updateOccurrenceOptions(dropdown.value);
      updateGrouping();
      if (firstLetterRadio) firstLetterRadio.checked = false;
    };

    occurrenceSelect.onchange = updateGrouping;

    dropdownWrapper.appendChild(dropdown);
    occurrenceWrapper.appendChild(occurrenceSelect);
    controlGroup.appendChild(dropdownWrapper);
    controlGroup.appendChild(occurrenceWrapper);

    // Radio button for "First Letter"
    const firstLetterWrapper = document.createElement('div');
    firstLetterWrapper.className = "manual-first-letter-wrapper";
    const firstLetterRadio = document.createElement("input");
    firstLetterRadio.type = "radio";
    firstLetterRadio.id = "first-letter-radio";
    firstLetterRadio.name = "manualGroupStrategyRadio";
    firstLetterRadio.value = "first-letter";
    firstLetterRadio.checked = this.separator === 'first-letter' || this.selectedStrategyType === 'first-letter';

    firstLetterRadio.onchange = () => {
      if (firstLetterRadio.checked) {
        this.separator = 'first-letter';
        this.selectedStrategyType = 'first-letter';
        this.clearContainer(this.dynamicContentPlaceholder);
        this.renderGroupOptions(this.dynamicContentPlaceholder);
      }
    };

    const firstLetterLabelText = document.createElement("label");
    firstLetterLabelText.textContent = "First Letter";
    firstLetterLabelText.htmlFor = "first-letter-radio";
    firstLetterLabelText.style.marginLeft = "5px";

    firstLetterWrapper.appendChild(firstLetterRadio);
    firstLetterWrapper.appendChild(firstLetterLabelText);
    controlGroup.appendChild(firstLetterWrapper);

    container.appendChild(controlGroup);

    // Initialize state
    const currentSeparator = defaultSeparators.includes(this.separator) ? this.separator : defaultSeparators[0];
    dropdown.value = currentSeparator;
    updateOccurrenceOptions(currentSeparator);

    if (this.selectedStrategyType === 'first-letter' || this.separator === 'first-letter') {
        firstLetterRadio.checked = true;
    } else {
        firstLetterRadio.checked = false;
        if (this.selectedStrategyType && this.selectedStrategyType !== 'manual_char') {
          occurrenceSelect.value = this.selectedStrategyType;
        } else {
          occurrenceSelect.value = "first"; // Default
          this.selectedStrategyType = "first";
        }
    }

    return { container, dropdown, occurrenceSelect, firstLetterRadio };
  }

  handleModeChange(newMode) {
    this.currentMode = newMode;
    if (this.suggestedSeparatorUI) {
        this.suggestedSeparatorUI.style.display = this.currentMode === 'groups' ? 'block' : 'none';
    }
    if (this.manualSeparatorControls && this.manualSeparatorControls.container) {
        this.manualSeparatorControls.container.style.display = this.currentMode === 'groups' ? 'block' : 'none';
    }
    // Remove commented out/old logic for this.separatorSelect
    // if (this.separatorSelect && this.separatorSelect.container) {
    //     this.separatorSelect.container.style.display = this.currentMode === "groups" ? "flex": "none";
    // }

    this.clearContainer(this.dynamicContentPlaceholder);
    if (this.currentMode === "taxa") {
      this.renderTaxaColorInputs(this.dynamicContentPlaceholder);
    } else {
      this.renderGroupOptions(this.dynamicContentPlaceholder);
    }
  }

  handleCloseModal() {
    // Perform any cleanup if necessary when modal is closed
    // For example, removing event listeners not tied to WinBox's own lifecycle
    console.log("Coloring modal closed.");
  }

  ensureColorigCssLoaded() {
    // Check if the CSS is already loaded
    if (!document.getElementById("coloring-css")) {
      const link = document.createElement("link");
      link.id = "coloring-css";
      link.rel = "stylesheet";
      link.type = "text/css";
      link.href = "/css/coloring.css";
      document.head.appendChild(link);
    }
  }

  renderTaxaColorInputs(placeholder) {
    this.clearContainer(placeholder);
    const taxaContainer = UIComponentFactory.createColorContainer("taxa-color-inputs");
    taxaContainer.className = "coloring-grid-panel"; // Keep existing styling

    if (!this.taxaNames || this.taxaNames.length === 0) {
      const noTaxaMessage = document.createElement("div");
      noTaxaMessage.className = "color-scheme-info"; // Keep existing styling
      noTaxaMessage.textContent = "No taxa found to color.";
      taxaContainer.appendChild(noTaxaMessage);
      placeholder.appendChild(taxaContainer);
      return;
    }

    const taxaHeader = document.createElement("div");
    taxaHeader.className = "color-scheme-heading"; // Keep existing styling
    taxaHeader.textContent = `Individual Taxa (${this.taxaNames.length})`;
    taxaContainer.appendChild(taxaHeader);

    const colorInputContainer = document.createElement("div"); // Scrollable area
    colorInputContainer.className = "color-input-container"; // Keep existing styling

    const colorGrid = UIComponentFactory.createColorInputGrid();

    this.taxaNames.forEach((taxon) => {
      const taxonColor = this.taxaColorMap.get(taxon) || "#000000";
      const colorInputEl = UIComponentFactory.createColorInput(taxon, taxonColor, (newColor) => {
        this.taxaColorMap.set(taxon, newColor);
        // Update border of the parent of the input if needed, or handle in createColorInput itself
        // For now, assuming createColorInput returns the main div for the row.
        if (colorInputEl.style) { // colorInputEl is the inputDiv from factory
            colorInputEl.style.borderLeft = `4px solid ${newColor}`;
        }
      });
      // Set initial border color for the row
      if (colorInputEl.style) {
        colorInputEl.style.borderLeft = `4px solid ${taxonColor}`;
      }
      colorGrid.appendChild(colorInputEl);
    });

    colorInputContainer.appendChild(colorGrid);
    taxaContainer.appendChild(colorInputContainer);
    placeholder.appendChild(taxaContainer);
  }

  renderGroupOptions(placeholder) {
    this.clearContainer(placeholder);
    const groupsContainer = UIComponentFactory.createColorContainer("group-color-inputs");
    groupsContainer.className = "coloring-grid-panel"; // Keep existing styling

    const groups = this.detectGroups();

    if (groups.length === 0) {
      const noGroupsMessage = document.createElement("div");
      noGroupsMessage.className = "color-scheme-info"; // Keep existing styling
      noGroupsMessage.textContent = "No groups could be detected with the current separator.";
      groupsContainer.appendChild(noGroupsMessage);
      placeholder.appendChild(groupsContainer);
      return;
    }

    const groupsHeader = document.createElement("div");
    groupsHeader.className = "color-scheme-heading"; // Keep existing styling
    groupsHeader.textContent = `Taxa Groups (${groups.length})`;
    groupsContainer.appendChild(groupsHeader);

    const colorInputContainer = document.createElement("div"); // Scrollable area
    colorInputContainer.className = "color-input-container"; // Keep existing styling

    const colorGrid = UIComponentFactory.createColorInputGrid();

    groups.forEach((group) => {
      const groupColor = this.groupColorMap.get(group) || this.getRandomColor();
      this.groupColorMap.set(group, groupColor); // Ensure new groups get a color

      // Create a rich label element with group name and count
      const groupLabelContent = document.createElement('div');
      groupLabelContent.className = "color-input-label"; // Match styling

      const labelText = document.createElement("span");
      labelText.textContent = group;
      groupLabelContent.appendChild(labelText);

      const countBadge = document.createElement("span");
      countBadge.className = "group-count-badge"; // Keep existing styling
      countBadge.textContent = this.getGroupMemberCount(group);
      groupLabelContent.appendChild(countBadge);

      // Use the enhanced createColorInput with HTML element label
      const colorInputEl = UIComponentFactory.createColorInput(groupLabelContent, groupColor, (newColor) => {
        this.groupColorMap.set(group, newColor);
        if (colorInputEl.style) {
             colorInputEl.style.borderLeft = `4px solid ${newColor}`;
        }
      });

      // Set initial border color for the row
      if (colorInputEl.style) {
        colorInputEl.style.borderLeft = `4px solid ${groupColor}`;
      }

      colorGrid.appendChild(colorInputEl);
    });

    colorInputContainer.appendChild(colorGrid);
    groupsContainer.appendChild(colorInputContainer);
    placeholder.appendChild(groupsContainer);
  }

  getGroupMemberCount(groupName) {
    let count = 0;
    this.taxaNames.forEach((taxon) => {
      if (this.getTaxonGroup(taxon) === groupName) {
        count++;
      }
    });
    return count;
  }

  detectGroups() {
    const groupSet = new Set();

    this.taxaNames.forEach((taxon) => {
      const groupName = this.getTaxonGroup(taxon);
      groupSet.add(groupName);
    });

    return Array.from(groupSet);
  }

  /**
   * Determines the group for a given taxon name based on the currently selected
   * separator and strategy type (`this.separator` and `this.selectedStrategyType`).
   *
   * @param {string} taxon - The taxon name to determine the group for.
   * @returns {string} The determined group name, or "Ungrouped" if no group can be formed.
   */
  getTaxonGroup(taxon) {
    const effectiveSeparator = this.separator;
    const effectiveStrategyType = this.selectedStrategyType;

    if (effectiveStrategyType === 'first-letter' || effectiveSeparator === 'first-letter') {
      // Group by the first letter of the taxon name, case-insensitive (converted to uppercase).
      return taxon && taxon.length > 0 ? taxon.charAt(0).toUpperCase() : "Ungrouped";
    } else if (effectiveStrategyType && effectiveStrategyType.startsWith('between-')) {
      // Handle between-separators strategy
      const group = this._getGroupForStrategy(taxon, effectiveSeparator, effectiveStrategyType);
      return group !== null ? group : "Ungrouped";
    } else if (effectiveStrategyType === 'first' || effectiveStrategyType === 'last' || (effectiveStrategyType && effectiveStrategyType.startsWith('nth-'))) {
      // This case is for when a suggested strategy or nth occurrence was selected.
      const group = this._getGroupForStrategy(taxon, effectiveSeparator, effectiveStrategyType);
      return group !== null ? group : "Ungrouped"; // Fallback to "Ungrouped" if _getGroupForStrategy returns null.
    } else {
      // This covers 'manual_char' (manual character separator selection),
      // or the initial state (where selectedStrategyType is null and separator is a default character).
      // It relies on this.separator being a single character (e.g., '-', '_').
      if (!effectiveSeparator || typeof effectiveSeparator !== 'string' || effectiveSeparator.length === 0 || effectiveSeparator === 'first-letter') {
          // Safety check: if separator is somehow invalid for splitting or is 'first-letter' here, treat as Ungrouped.
          // The 'first-letter' case should have been caught by the first condition.
          return "Ungrouped";
      }
      const parts = taxon.split(effectiveSeparator);
      if (parts.length > 1) {
        // Default behavior for character separators: use the part before the first occurrence.
        return parts[0];
      }
      return "Ungrouped"; // Taxon name doesn't contain the separator.
    }
  }

  applyColorScheme(schemeName) {
    const scheme = getColorScheme(schemeName); // Uses imported function

    if (this.currentMode === "taxa") {
      // For taxa mode, assign colors cyclically
      this.taxaNames.forEach((taxon, i) => {
        const colorIndex = i % scheme.length;
        this.taxaColorMap.set(taxon, scheme[colorIndex]);
      });

      // Rerender the taxa inputs to show the new colors
      this.clearContainer(this.dynamicContentPlaceholder);
      this.renderTaxaColorInputs(this.dynamicContentPlaceholder);
    } else {
      // For group mode, assign a color to each group
      const groups = this.detectGroups();
      groups.forEach((group, i) => {
        const colorIndex = i % scheme.length;
        this.groupColorMap.set(group, scheme[colorIndex]);
      });

      // Rerender the group inputs to show the new colors
      this.clearContainer(this.dynamicContentPlaceholder);
      this.renderGroupOptions(this.dynamicContentPlaceholder);
    }
  }

  getRandomColor() {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  applyChanges() {
    // Collect all color values from inputs
    if (this.currentMode === "taxa") {
      this.taxaNames.forEach((taxon) => {
        const input = document.getElementById(`taxa-${taxon}`);
        if (input) {
          this.taxaColorMap.set(taxon, input.value);
        }
      });
    } else {
      const groups = this.detectGroups();
      groups.forEach((group) => {
        const input = document.getElementById(`group-${group}`);
        if (input) {
          this.groupColorMap.set(group, input.value);
        }
      });
    }

    // Call the completion callback with all the color data
    this.onComplete({
      mode: this.currentMode,
      taxaColorMap: this.taxaColorMap,
      groupColorMap: this.groupColorMap,
      separator: this.separator, // This should be the actual character or "first-letter"
      strategyType: this.selectedStrategyType, // Pass the strategy type
    });
  }

  resetColors() {
    this.taxaColorMap = new Map();
    this.groupColorMap = new Map();

    // Reset to original colors
    if (this.originalColorMap) {
      this.taxaNames.forEach((taxon) => {
        const color = this.originalColorMap[taxon] || "#000000";
        this.taxaColorMap.set(taxon, color);
      });
    }

    // Rerender the content to show reset colors
    this.clearContainer(this.dynamicContentPlaceholder);
    if (this.currentMode === "taxa") {
      this.renderTaxaColorInputs(this.dynamicContentPlaceholder);
    } else {
      this.renderGroupOptions(this.dynamicContentPlaceholder);
    }
  }

  clearContainer(container) {
    while (container && container.firstChild) {
      container.removeChild(container.firstChild);
    }
  }

  /**
   * Enhanced function to extract text between different separators
   * @param {string} taxonName - The taxon name to process
   * @param {string} startSeparator - The starting separator
   * @param {number} startOccurrence - Which occurrence of start separator (1-based)
   * @param {string} endSeparator - The ending separator
   * @param {number} endOccurrence - Which occurrence of end separator (1-based)
   * @returns {string|null} The extracted text between separators, or null if not found
   * @private
   */
  _getGroupBetweenSeparators(taxonName, startSeparator, startOccurrence, endSeparator, endOccurrence) {
    // Find the position of the start separator (nth occurrence)
    let startPos = -1;
    let currentOccurrence = 0;
    for (let i = 0; i < taxonName.length; i++) {
      if (taxonName[i] === startSeparator) {
        currentOccurrence++;
        if (currentOccurrence === startOccurrence) {
          startPos = i;
          break;
        }
      }
    }

    if (startPos === -1) {
      return null; // Start separator not found at specified occurrence
    }

    // Find the position of the end separator (nth occurrence) after the start position
    let endPos = -1;
    currentOccurrence = 0;
    for (let i = startPos + 1; i < taxonName.length; i++) {
      if (taxonName[i] === endSeparator) {
        currentOccurrence++;
        if (currentOccurrence === endOccurrence) {
          endPos = i;
          break;
        }
      }
    }

    if (endPos === -1) {
      // If end separator not found, take until the end of string
      return taxonName.substring(startPos + 1);
    }

    return taxonName.substring(startPos + 1, endPos);
  }

  /**
   * Helper function to extract a group name from a taxon name based on a separator and strategy.
   * Used by `analyzeTaxaSeparators` and `getTaxonGroup` (when a suggested strategy is active).
   *
   * @param {string} taxonName - The full name of the taxon.
   * @param {string} separator - The character used to split the taxon name.
   * @param {string} strategyType - Either 'first' (part before the first separator),
   * 'last' (part before the last separator), 'nth-N' where N is the occurrence number,
   * or 'between-X-Y' for between separators strategy.
   * @param {number} [nthOccurrence] - For 'nth' strategy, which occurrence to use (1-based).
   * @returns {string|null} The extracted group name, or null if the separator is not found
   * or results in no meaningful group (e.g., taxon "A" with separator ".").
   * @private
   */
  _getGroupForStrategy(taxonName, separator, strategyType, nthOccurrence = 1) {
    // Handle new 'between' strategy type
    if (strategyType && strategyType.startsWith('between-')) {
      // Parse between strategy: 'between-_-1---1' means between 1st '_' and 1st '-'
      const parts = strategyType.split('-');
      if (parts.length >= 6) {
        const startSep = parts[1];
        const startOcc = parseInt(parts[2]) || 1;
        const endSep = parts[4];
        const endOcc = parseInt(parts[5]) || 1;
        return this._getGroupBetweenSeparators(taxonName, startSep, startOcc, endSep, endOcc);
      }
      return null;
    }

    const parts = taxonName.split(separator);
    if (parts.length <= 1) {
      return null; // No group if separator not present or only one part (e.g. "A" or "A.noc")
    }

    if (strategyType === 'first') {
      return parts[0]; // e.g., "A" from "A.B.C"
    } else if (strategyType === 'last') {
      return parts.slice(0, -1).join(separator); // e.g., "A.B" from "A.B.C"
    } else if (strategyType.startsWith('nth-')) {
      const occurrenceNum = parseInt(strategyType.split('-')[1]) || nthOccurrence;
      if (occurrenceNum === 1) {
        return parts[0]; // First occurrence: text before first separator
      } else if (occurrenceNum >= 2 && occurrenceNum <= parts.length) {
        return parts[occurrenceNum - 1]; // nth occurrence: text between (nth-1) and nth separator
      }
      return null; // Invalid occurrence number
    }
    return null; // Should not happen if strategyType is validated
  }

  /**
   * Analyzes the provided list of taxa names to identify potential grouping strategies
   * based on common separators like '.', '-', '_', and ' '.
   * It checks for strategies like "group by prefix before first separator" and
   * "group by prefix before last separator".
   *
   * @param {Array<string>} taxaNames - An array of taxa names.
   * @returns {Array<Object>} An array of suggested strategy objects. Each object includes:
   *   - `separator` (string): The separator character.
   *   - `strategyType` (string): 'first' or 'last'.
   *   - `description` (string): A human-readable description of the strategy.
   *   - `groupsPreview` (Array<{groupName: string, count: number}>): A sample of up to 5 groups.
   *   - `totalGroups` (number): Total number of unique groups found by this strategy.
   * Returns an empty array if no meaningful strategies are found or if taxaNames is empty.
   */
  analyzeTaxaSeparators(taxaNames) {
    if (!taxaNames || taxaNames.length === 0) {
      return [];
    }

    const potentialSeparators = ['.', '-', '_', ' ']; // Common separators to check
    const suggestedStrategies = [];
    const totalTaxa = taxaNames.length;

    potentialSeparators.forEach(separator => {
      // Find the maximum number of occurrences of this separator across all taxa
      const maxOccurrences = Math.max(...taxaNames.map(name => (name.split(separator).length - 1)));

      const strategyTypes = ['first', 'last']; // Original strategy types

      // Add nth occurrence strategies for separators that appear multiple times
      if (maxOccurrences > 1) {
        for (let i = 2; i <= Math.min(maxOccurrences, 5); i++) { // Limit to 5 occurrences to avoid UI clutter
          strategyTypes.push(`nth-${i}`);
        }
      }

      strategyTypes.forEach(strategyType => {
        const groupCounts = new Map(); // To count occurrences of each potential group
        taxaNames.forEach(taxonName => {
          const groupName = this._getGroupForStrategy(taxonName, separator, strategyType);
          // A group is meaningful if it's not null (separator was found and split occurred)
          // and the group name is not the same as the original taxon name (i.e., it actually grouped something)
          if (groupName !== null && groupName !== taxonName) {
            groupCounts.set(groupName, (groupCounts.get(groupName) || 0) + 1);
          }
        });

        // A strategy is considered valid if it produces more than one group,
        // but not so many groups that every taxon is its own group (or nearly so).
        if (groupCounts.size > 1 && groupCounts.size < totalTaxa) {
          const groupsPreview = [];
          for (const [groupName, count] of groupCounts) {
            groupsPreview.push({ groupName, count });
          }
          // Sort groups by count (descending) for a more informative preview
          groupsPreview.sort((a, b) => b.count - a.count);

          let description = ``; // Dynamically create description
          if (strategyType === 'first') {
            description = `Text before first '${separator}'`;
          } else if (strategyType === 'last') {
            description = `Text before last '${separator}'`;
          } else if (strategyType.startsWith('nth-')) {
            const occurrenceNum = parseInt(strategyType.split('-')[1]);
            if (occurrenceNum === 2) {
              description = `Text between 1st and 2nd '${separator}'`;
            } else {
              description = `Text between ${this._getOrdinal(occurrenceNum-1)} and ${this._getOrdinal(occurrenceNum)} '${separator}'`;
            }
          }

          suggestedStrategies.push({
            separator: separator,
            strategyType: strategyType,
            description: description,
            groupsPreview: groupsPreview.slice(0, 5), // Show a preview of up to 5 largest groups
            totalGroups: groupCounts.size
          });
        }
      });
    });

    // Add enhanced "between separators" strategies
    const betweenSeparatorCombinations = [
      { start: '_', startOcc: 1, end: '-', endOcc: 1, description: "Between 1st '_' and 1st '-'" },
      { start: '.', startOcc: 1, end: '_', endOcc: 1, description: "Between 1st '.' and 1st '_'" },
      { start: '.', startOcc: 1, end: '.', endOcc: 2, description: "Between 1st '.' and 2nd '.'" },
      { start: '_', startOcc: 1, end: '-', endOcc: 2, description: "Between 1st '_' and 2nd '-'" },
      { start: '-', startOcc: 1, end: '_', endOcc: 1, description: "Between 1st '-' and 1st '_'" },
      { start: '.', startOcc: 2, end: '_', endOcc: 1, description: "Between 2nd '.' and 1st '_'" }
    ];

    betweenSeparatorCombinations.forEach(combo => {
      // Check if both separators exist in the taxa names
      const hasStartSep = taxaNames.some(name => name.includes(combo.start));
      const hasEndSep = taxaNames.some(name => name.includes(combo.end));

      if (!hasStartSep || !hasEndSep) return;

      const strategyType = `between-${combo.start}-${combo.startOcc}--${combo.end}-${combo.endOcc}`;
      const groupCounts = new Map();

      taxaNames.forEach(taxonName => {
        const groupName = this._getGroupBetweenSeparators(
          taxonName,
          combo.start,
          combo.startOcc,
          combo.end,
          combo.endOcc
        );

        if (groupName !== null && groupName !== taxonName && groupName.trim() !== '') {
          groupCounts.set(groupName, (groupCounts.get(groupName) || 0) + 1);
        }
      });

      // Only add strategies that create meaningful groups
      if (groupCounts.size > 1 && groupCounts.size < totalTaxa && groupCounts.size <= 20) {
        const groupsPreview = [];
        for (const [groupName, count] of groupCounts) {
          groupsPreview.push({ groupName, count });
        }
        groupsPreview.sort((a, b) => b.count - a.count);

        suggestedStrategies.push({
          separator: `${combo.start}...${combo.end}`, // Indicate it's a between strategy
          strategyType: strategyType,
          description: combo.description,
          groupsPreview: groupsPreview.slice(0, 5),
          totalGroups: groupCounts.size
        });
      }
    });

    // Sort suggested strategies, perhaps by totalGroups or another metric? For now, order is by separator, then type.
    return suggestedStrategies;
  }

  /**
   * Helper method to convert numbers to ordinal form (1st, 2nd, 3rd, etc.)
   * @param {string|number} num - The number to convert
   * @returns {string} The ordinal form
   */
  _getOrdinal(num) {
    const n = parseInt(num);
    const suffix = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
  }
}
