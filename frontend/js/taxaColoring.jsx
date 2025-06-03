import { ColorSchemePresets, getColorScheme } from './treeColoring/ColorSchemePresets.js';
import { UIComponentFactory } from './treeColoring/UIComponentFactory.js';

/**
 * TaxaColoring: UI/controller for color assignment modal.
 * Collects user color choices for taxa/groups and applies them to the tree visualization.
 */
export default class TaxaColoring {
  /**
   * @param {Array<string>} taxaNames - List of taxa names
   * @param {Array<string>} groupNames - List of group names
   * @param {Object} originalColorMap - Current color map
   * @param {Function} onComplete - Callback when coloring is complete
   */
  constructor(taxaNames, groupNames, originalColorMap, onComplete) {
    this.taxaNames = taxaNames || [];
    this.groupNames = groupNames || [];
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
                    if (this.manualSeparatorControls.dropdown) this.manualSeparatorControls.dropdown.value = selectedStrategy.separator;
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
   * Creates manual controls for selecting a separator character or 'First Letter' grouping.
   * This includes a dropdown for specific characters ('-', '_', '.', ' ') and a radio
   * button for 'First Letter' grouping. Changes here update `this.separator` and
   * `this.selectedStrategyType`, then refresh the group options display.
   *
   * @returns {Object} An object containing the main container element, the dropdown select element,
   * and the first letter radio button element.
   *   - `container` (HTMLElement): The main div holding these manual controls.
   *   - `dropdown` (HTMLSelectElement): The dropdown for selecting a separator character.
   *   - `firstLetterRadio` (HTMLInputElement): The radio button for 'First Letter' option.
   */
  createManualSeparatorControls() {
    const container = document.createElement("div");
    container.className = "manual-separator-controls"; // For CSS styling
    // Basic styling for layout, ideally enhanced by CSS.
    // container.style.marginTop = '15px'; // CSS: .manual-separator-controls
    // container.style.borderTop = '1px solid #ccc'; // CSS: .manual-separator-controls
    // container.style.paddingTop = '10px'; // CSS: .manual-separator-controls

    const titleLabel = document.createElement("label");
    titleLabel.textContent = "Or, define grouping manually:";
    titleLabel.className = "manual-separator-title"; // For CSS styling
    // titleLabel.style.display = 'block'; // CSS: .manual-separator-title
    // titleLabel.style.marginBottom = '8px'; // CSS: .manual-separator-title
    container.appendChild(titleLabel);

    const controlGroup = document.createElement('div');
    controlGroup.className = "manual-separator-control-group"; // For CSS styling (e.g., flex)

    // Dropdown for specific separator characters
    const dropdownWrapper = document.createElement('div');
    dropdownWrapper.className = "manual-dropdown-wrapper";
    const dropdownLabel = document.createElement("label");
    dropdownLabel.textContent = "Separator Character:";
    dropdownLabel.htmlFor = "manual-separator-dropdown";
    dropdownLabel.style.marginRight = "5px"; // Spacing between label and dropdown
    dropdownWrapper.appendChild(dropdownLabel);

    const dropdown = document.createElement("select"); // The actual dropdown element
    dropdown.id = "manual-separator-dropdown";
    dropdown.className = "separator-select"; // Reuse existing class for styling

    const defaultSeparators = ['-', '_', '.', ' ']; // 'first-letter' is handled by radio
    defaultSeparators.forEach(sepChar => {
      const option = document.createElement("option");
      option.value = sepChar;
      option.textContent = sepChar === ' ' ? 'Space' : sepChar;
      dropdown.appendChild(option);
    });
    // Set initial value carefully based on current state, excluding 'first-letter'
    dropdown.value = defaultSeparators.includes(this.separator) && this.separator !== 'first-letter'
                     ? this.separator
                     : defaultSeparators[0]; // Default to the first separator if current is 'first-letter' or not in list

    dropdown.onchange = () => {
      this.separator = dropdown.value;
      this.selectedStrategyType = 'manual_char'; // Indicate manual character selection
      if (firstLetterRadio) firstLetterRadio.checked = false; // Uncheck radio if dropdown is used
      this.clearContainer(this.dynamicContentPlaceholder);
      this.renderGroupOptions(this.dynamicContentPlaceholder);
    };
    dropdownWrapper.appendChild(dropdown);
    controlGroup.appendChild(dropdownWrapper);

    // Radio button for "First Letter"
    const firstLetterWrapper = document.createElement('div');
    firstLetterWrapper.className = "manual-first-letter-wrapper";
    const firstLetterRadio = document.createElement("input");
    firstLetterRadio.type = "radio";
    firstLetterRadio.id = "first-letter-radio";
    firstLetterRadio.name = "manualGroupStrategyRadio"; // Name for the radio group
    firstLetterRadio.value = "first-letter";
    // Initial check based on this.separator or this.selectedStrategyType
    firstLetterRadio.checked = this.separator === 'first-letter' || this.selectedStrategyType === 'first-letter';

    firstLetterRadio.onchange = () => {
      if (firstLetterRadio.checked) {
        this.separator = 'first-letter';
        this.selectedStrategyType = 'first-letter';
        // Reset dropdown to its first option as it's not "active" for grouping
        if (dropdown.options.length > 0) {
            dropdown.value = dropdown.options[0].value;
        }
        this.clearContainer(this.dynamicContentPlaceholder);
        this.renderGroupOptions(this.dynamicContentPlaceholder);
      }
    };

    const firstLetterLabelText = document.createElement("label");
    firstLetterLabelText.textContent = "First Letter";
    firstLetterLabelText.htmlFor = "first-letter-radio";
    firstLetterLabelText.style.marginLeft = "5px"; // Spacing between radio and its label text

    firstLetterWrapper.appendChild(firstLetterRadio);
    firstLetterWrapper.appendChild(firstLetterLabelText);
    controlGroup.appendChild(firstLetterWrapper);

    container.appendChild(controlGroup);

    // Ensure initial state of controls is consistent
    if (this.selectedStrategyType === 'first-letter' || this.separator === 'first-letter') {
        firstLetterRadio.checked = true;
        if (dropdown.options.length > 0) dropdown.value = dropdown.options[0].value;
    } else if (this.selectedStrategyType === 'manual_char' || (this.selectedStrategyType === null && defaultSeparators.includes(this.separator))) {
        dropdown.value = this.separator; // this.separator should be a char here
        firstLetterRadio.checked = false;
    } else { // Default initial state if no specific strategy/separator is set that matches controls
        if (dropdown.options.length > 0) dropdown.value = dropdown.options[0].value; // Default to first char separator
        this.separator = dropdown.value; // Explicitly set this.separator
        this.selectedStrategyType = 'manual_char'; // And the type
        firstLetterRadio.checked = false;
    }

    return { container, dropdown, firstLetterRadio };
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

      // For group label with count badge
      const groupLabelContent = document.createElement('div');
      groupLabelContent.className = "color-input-label"; // Match styling if possible

      const labelText = document.createElement("span");
      labelText.textContent = group;
      groupLabelContent.appendChild(labelText);

      const countBadge = document.createElement("span");
      countBadge.className = "group-count-badge"; // Keep existing styling
      countBadge.textContent = this.getGroupMemberCount(group);
      groupLabelContent.appendChild(countBadge);

      // UIComponentFactory.createColorInput expects a string name, not an element.
      // So, we pass group name and recreate the label structure if factory doesn't support rich labels.
      // Or, modify createColorInput to accept an element or string for label.
      // For now, we'll just pass the group name. The factory creates a simple label.
      // The count badge will be lost with the current factory method.
      // This is a limitation to note or address by modifying the factory.
      // Workaround: Create the input with factory, then replace its label.
      const colorInputEl = UIComponentFactory.createColorInput(group, groupColor, (newColor) => {
        this.groupColorMap.set(group, newColor);
        if (colorInputEl.style) { // colorInputEl is the inputDiv from factory
             colorInputEl.style.borderLeft = `4px solid ${newColor}`;
        }
      });
      // Set initial border color for the row
      if (colorInputEl.style) {
        colorInputEl.style.borderLeft = `4px solid ${groupColor}`;
      }

      // Replace the simple label from factory with our rich label (name + badge)
      const factoryLabel = colorInputEl.querySelector('label');
      if (factoryLabel && factoryLabel.parentNode) {
        factoryLabel.parentNode.replaceChild(groupLabelContent, factoryLabel);
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
    } else if (effectiveStrategyType === 'first' || effectiveStrategyType === 'last') {
      // This case is for when a suggested strategy ('first' or 'last' occurrence of a separator) was clicked.
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
   * Helper function to extract a group name from a taxon name based on a separator and strategy.
   * Used by `analyzeTaxaSeparators` and `getTaxonGroup` (when a suggested strategy is active).
   *
   * @param {string} taxonName - The full name of the taxon.
   * @param {string} separator - The character used to split the taxon name.
   * @param {string} strategyType - Either 'first' (part before the first separator) or
   * 'last' (part before the last separator).
   * @returns {string|null} The extracted group name, or null if the separator is not found
   * or results in no meaningful group (e.g., taxon "A" with separator ".").
   * @private
   */
  _getGroupForStrategy(taxonName, separator, strategyType) {
    const parts = taxonName.split(separator);
    if (parts.length <= 1) {
      return null; // No group if separator not present or only one part (e.g. "A" or "A.noc")
    }

    if (strategyType === 'first') {
      return parts[0]; // e.g., "A" from "A.B.C"
    } else if (strategyType === 'last') {
      return parts.slice(0, -1).join(separator); // e.g., "A.B" from "A.B.C"
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
      const strategyTypes = ['first', 'last']; // Types of strategies to check for each separator

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
            description = `Prefix before first '${separator}'`;
          } else if (strategyType === 'last') {
            description = `Prefix before last '${separator}'`;
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
    // Sort suggested strategies, perhaps by totalGroups or another metric? For now, order is by separator, then type.
    return suggestedStrategies;
  }
}
