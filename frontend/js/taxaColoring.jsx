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
    // Note: createMainUI in the provided factory file doesn't return buttonContainer.
    // We will create our own button container.
    const mainUIComponents = UIComponentFactory.createMainUI(
      this.modalContent,
      // Passing functions to render content later is not how createMainUI is structured.
      // It directly appends modeSelect and dynamicContent to the passed container.
      // So, we pass this.modalContent and it will append to it.
      // The renderTaxaFn and renderGroupsFn are not used by the factory's createMainUI.
    );

    this.dynamicContentPlaceholder = mainUIComponents.dynamicContent; // Store the placeholder for content

    // 3. Separator Dropdown (integrated with mode selector)
    // The modeSelect is appended to modalContent by createMainUI.
    // We need to find it or its container to add the separator UI.
    // Assuming modeSelect is directly in modalContent or in a specific container.
    // For robustness, UIComponentFactory.createMainUI should return the modeContainer.
    // Given current factory, we'll assume mainUIComponents.modeSelect.parentNode is usable.
    this.separatorSelect = this.createSeparatorDropdown();
    // Append separatorSelect next to or below mainUIComponents.modeSelect
    // This might require mainUIComponents.modeSelect.parentNode or a dedicated container from factory.
    // For now, let's assume mainUIComponents.modeSelect.parentNode is the modeContainer.
    if (mainUIComponents.modeSelect && mainUIComponents.modeSelect.parentNode) {
      mainUIComponents.modeSelect.parentNode.appendChild(this.separatorSelect.container);
    }


    // 4. Event Handlers for Mode Select
    mainUIComponents.modeSelect.value = this.currentMode; // Set initial mode
    mainUIComponents.modeSelect.onchange = () => this.handleModeChange(mainUIComponents.modeSelect.value);


    // 5. Action Buttons
    const actionButtonContainer = document.createElement("div");
    actionButtonContainer.className = "modal-footer"; // Use existing CSS class if suitable

    const resetButton = document.createElement("button");
    resetButton.className = "coloring-btn"; // Use existing CSS class
    resetButton.textContent = "Reset";
    resetButton.onclick = () => this.resetColors();

    // Append factory buttons and reset button to our new container
    actionButtonContainer.appendChild(resetButton);
    actionButtonContainer.appendChild(mainUIComponents.cancelButton); // From factory
    actionButtonContainer.appendChild(mainUIComponents.applyButton);   // From factory

    this.modalContent.appendChild(actionButtonContainer);

    // Attach handlers to factory-created buttons
    mainUIComponents.cancelButton.onclick = () => this.colorWin.close();
    mainUIComponents.applyButton.onclick = () => {
      this.applyChanges();
      this.colorWin.close();
    };

    // Initial content rendering
    this.handleModeChange(this.currentMode);
  }

  createSeparatorDropdown() {
    const separatorContainer = document.createElement("div");
    separatorContainer.className = "separator-container"; // Match existing style
    separatorContainer.id = "separator-container";
    separatorContainer.style.display = this.currentMode === "groups" ? "flex" : "none"; // Initial visibility
    separatorContainer.style.marginTop = '10px'; // Add some spacing

    const separatorLabel = document.createElement("label");
    separatorLabel.className = "separator-label"; // Match existing style
    separatorLabel.textContent = "Group By:";
    separatorLabel.htmlFor = "separator-selector";

    const separatorSelectElement = document.createElement("select");
    separatorSelectElement.className = "separator-select"; // Match existing style
    separatorSelectElement.id = "separator-selector";

    [
      { value: "-", label: "Dash (-)" },
      { value: "_", label: "Underscore (_)" },
      { value: ".", label: "Dot (.)" },
      { value: " ", label: "Space" },
      { value: "first-letter", label: "First Letter" },
    ].forEach((opt) => {
      const option = document.createElement("option");
      option.value = opt.value;
      option.textContent = opt.label;
      separatorSelectElement.appendChild(option);
    });
    separatorSelectElement.value = this.separator;

    separatorSelectElement.onchange = () => {
      this.separator = separatorSelectElement.value;
      if (this.currentMode === "groups") {
        this.clearContainer(this.dynamicContentPlaceholder);
        this.renderGroupOptions(this.dynamicContentPlaceholder);
      }
    };

    separatorContainer.appendChild(separatorLabel);
    separatorContainer.appendChild(separatorSelectElement);

    return { container: separatorContainer, selectElement: separatorSelectElement };
  }

  handleModeChange(newMode) {
    this.currentMode = newMode;
    if (this.separatorSelect && this.separatorSelect.container) {
      this.separatorSelect.container.style.display = this.currentMode === "groups" ? "flex" : "none";
    }
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

  // createModal() and buildModalContent() are removed as their functionality is
  // now handled by launchModal() using UIComponentFactory.

  // addColorSchemePresets(container) is removed (was already a no-op).

  // addModeSelector(container) is removed; its core logic (separator dropdown) is
  // now in createSeparatorDropdown() and event handling in launchModal() & handleModeChange().

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

  getTaxonGroup(taxon) {
    if (this.separator === "first-letter") {
      return taxon.charAt(0);
    } else {
      const parts = taxon.split(this.separator);
      if (parts.length > 1) {
        return parts[0];
      }
      return "Ungrouped";
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
      separator: this.separator,
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
    this.clearContainer(this.dynamicContent);
    if (this.currentMode === "taxa") {
      this.renderTaxaColorInputs(this.dynamicContent);
    } else {
      this.renderGroupOptions(this.dynamicContent);
    }
  }

  clearContainer(container) {
    while (container && container.firstChild) {
      container.removeChild(container.firstChild);
    }
  }
}
