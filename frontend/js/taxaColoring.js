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

    // Color schemes
    this.colorSchemes = {
      default: [
        "#3498db",
        "#9b59b6",
        "#2ecc71",
        "#f1c40f",
        "#e74c3c",
        "#e67e22",
        "#1abc9c",
        "#34495e",
      ],
      rainbow: [
        "#FF0000",
        "#FF7F00",
        "#FFFF00",
        "#00FF00",
        "#0000FF",
        "#4B0082",
        "#9400D3",
      ],
      viridis: [
        "#440154",
        "#414487",
        "#2a788e",
        "#22a884",
        "#7ad151",
        "#fde725",
      ],
      pastel: [
        "#f7d1cd",
        "#e8c2ca",
        "#d1b3c4",
        "#b392ac",
        "#735d78",
        "#2e294e",
      ],
      forest: [
        "#4a5859",
        "#537072",
        "#87b3a5",
        "#add9c9",
        "#def3de",
        "#f0f4f4",
      ],
      autumn: [
        "#c1502e",
        "#e5734f",
        "#ff9068",
        "#ffc3a0",
        "#ffd8be",
        "#fff5ea",
      ],
    };

    this.initialize();
  }

  initialize() {
    // Load CSS if not already loaded
    this.ensureColorigCssLoaded();
    this.createModal();
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

  createModal() {
    let modalContent;

    // Create modal using WinBox if available
    if (window.WinBox) {
      this.colorWin = new window.WinBox({
        title: "Taxa Coloring",
        width: "650px",
        height: "80%",
        x: "center",
        y: "center",
        class: ["modern", "modal"],
        background: "#373747",
        border: 1,
        onclose: () => {
          // Clean up any resources or remove event listeners if needed
        },
      });

      modalContent = document.createElement("div");
      modalContent.className = "coloring-modal-content";
      this.colorWin.mount(modalContent);
    } else {
      // Create a fallback modal if WinBox is not available
      const modalOverlay = document.createElement("div");
      modalOverlay.className = "modal-overlay";

      const modalWindow = document.createElement("div");
      modalWindow.className = "color-assignment-container";

      const modalHeader = document.createElement("div");
      modalHeader.className = "modal-header";

      const modalTitle = document.createElement("h3");
      modalTitle.className = "color-assignment-header";
      modalTitle.textContent = "Taxa Coloring";

      const closeButton = document.createElement("button");
      closeButton.className = "modal-close-button";
      closeButton.innerHTML = "&times;";
      closeButton.onclick = () => {
        document.body.removeChild(modalOverlay);
      };

      modalHeader.appendChild(modalTitle);
      modalHeader.appendChild(closeButton);
      modalWindow.appendChild(modalHeader);

      modalContent = document.createElement("div");
      modalContent.className = "coloring-modal-content";
      modalWindow.appendChild(modalContent);

      modalOverlay.appendChild(modalWindow);
      document.body.appendChild(modalOverlay);

      // Add WinBox-like interface for compatibility
      this.colorWin = {
        dom: modalWindow,
        mount: (content) => {
          modalContent.appendChild(content);
        },
        close: () => {
          if (modalOverlay.parentNode) {
            document.body.removeChild(modalOverlay);
          }
        },
      };
    }

    this.buildModalContent(modalContent);
  }

  buildModalContent(container) {
    // Add color scheme presets section
    this.addColorSchemePresets(container);

    // Add mode selector (taxa vs groups)
    this.addModeSelector(container);

    // Create dynamic content container
    this.dynamicContent = document.createElement("div");
    this.dynamicContent.className = "dynamic-content";
    this.dynamicContent.id = "dynamic-content";
    container.appendChild(this.dynamicContent);

    // Render appropriate content based on current mode
    if (this.currentMode === "taxa") {
      this.renderTaxaColorInputs(this.dynamicContent);
    } else {
      this.renderGroupOptions(this.dynamicContent);
    }

    // Add action buttons
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "modal-footer";

    const resetButton = document.createElement("button");
    resetButton.className = "coloring-btn";
    resetButton.textContent = "Reset";
    resetButton.onclick = () => this.resetColors();

    const cancelButton = document.createElement("button");
    cancelButton.className = "coloring-btn coloring-btn-cancel-button";
    cancelButton.textContent = "Cancel";
    cancelButton.onclick = () => this.colorWin.close();

    const applyButton = document.createElement("button");
    applyButton.className = "coloring-btn coloring-btn-apply-button";
    applyButton.textContent = "Apply";
    applyButton.onclick = () => {
      this.applyChanges();
      this.colorWin.close();
    };

    buttonContainer.appendChild(resetButton);
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(applyButton);
    container.appendChild(buttonContainer);
  }

  addColorSchemePresets(container) {
    const presetsSection = document.createElement("div");
    presetsSection.className = "color-scheme-card";

    const presetsHeader = document.createElement("div");
    presetsHeader.className = "color-scheme-heading";
    presetsHeader.textContent = "Color Schemes";
    presetsSection.appendChild(presetsHeader);

    const schemeSelector = document.createElement("div");
    schemeSelector.className = "color-scheme-selector-row";

    // Create a grid for scheme buttons
    const schemeGrid = document.createElement("div");
    schemeGrid.className = "color-preview-grid";

    // Create a button for each color scheme
    Object.keys(this.colorSchemes).forEach((schemeName) => {
      const colors = this.colorSchemes[schemeName];
      const schemeButton = document.createElement("button");
      schemeButton.className = "scheme-button";
      schemeButton.dataset.scheme = schemeName;
      schemeButton.title =
        schemeName.charAt(0).toUpperCase() + schemeName.slice(1);

      // Create mini color swatches for each scheme
      colors.slice(0, 4).forEach((color) => {
        const colorSwatch = document.createElement("div");
        colorSwatch.style.backgroundColor = color;
        schemeButton.appendChild(colorSwatch);
      });

      schemeButton.onclick = () => this.applyColorScheme(schemeName);
      schemeGrid.appendChild(schemeButton);
    });

    schemeSelector.appendChild(schemeGrid);
    presetsSection.appendChild(schemeSelector);
    container.appendChild(presetsSection);
  }

  addModeSelector(container) {
    const modeSection = document.createElement("div");
    modeSection.className = "color-scheme-card";

    const modeHeader = document.createElement("div");
    modeHeader.className = "color-scheme-heading";
    modeHeader.textContent = "Coloring Mode";
    modeSection.appendChild(modeHeader);

    // Mode selector row
    const modeSelector = document.createElement("div");
    modeSelector.className = "coloring-mode-selector";

    const modeLabel = document.createElement("label");
    modeLabel.className = "mode-label";
    modeLabel.textContent = "Mode:";
    modeLabel.htmlFor = "coloring-mode-selector";

    const modeSelect = document.createElement("select");
    modeSelect.className = "mode-select";
    modeSelect.id = "coloring-mode-selector";

    const taxaOption = document.createElement("option");
    taxaOption.value = "taxa";
    taxaOption.textContent = "Individual Taxa";

    const groupsOption = document.createElement("option");
    groupsOption.value = "groups";
    groupsOption.textContent = "Taxa Groups";

    modeSelect.appendChild(taxaOption);
    modeSelect.appendChild(groupsOption);
    modeSelect.value = this.currentMode;

    modeSelector.appendChild(modeLabel);
    modeSelector.appendChild(modeSelect);
    modeSection.appendChild(modeSelector);

    // Separator selector
    const separatorContainer = document.createElement("div");
    separatorContainer.className = "separator-container";
    separatorContainer.id = "separator-container";
    separatorContainer.style.display =
      this.currentMode === "groups" ? "flex" : "none";

    const separatorLabel = document.createElement("label");
    separatorLabel.className = "separator-label";
    separatorLabel.textContent = "Group By:";
    separatorLabel.htmlFor = "separator-selector";

    const separatorSelect = document.createElement("select");
    separatorSelect.className = "separator-select";
    separatorSelect.id = "separator-selector";

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
      separatorSelect.appendChild(option);
    });

    separatorSelect.value = this.separator;

    separatorContainer.appendChild(separatorLabel);
    separatorContainer.appendChild(separatorSelect);
    modeSection.appendChild(separatorContainer);

    // Add event listeners
    modeSelect.onchange = () => {
      this.currentMode = modeSelect.value;
      separatorContainer.style.display =
        this.currentMode === "groups" ? "flex" : "none";
      this.clearContainer(this.dynamicContent);

      if (this.currentMode === "taxa") {
        this.renderTaxaColorInputs(this.dynamicContent);
      } else {
        this.renderGroupOptions(this.dynamicContent);
      }
    };

    separatorSelect.onchange = () => {
      this.separator = separatorSelect.value;
      if (this.currentMode === "groups") {
        this.clearContainer(this.dynamicContent);
        this.renderGroupOptions(this.dynamicContent);
      }
    };

    container.appendChild(modeSection);
  }

  renderTaxaColorInputs(container) {
    const taxaContainer = document.createElement("div");
    taxaContainer.className = "coloring-grid-panel";

    if (!this.taxaNames || this.taxaNames.length === 0) {
      const noTaxaMessage = document.createElement("div");
      noTaxaMessage.className = "color-scheme-info";
      noTaxaMessage.textContent = "No taxa found to color.";
      taxaContainer.appendChild(noTaxaMessage);
      container.appendChild(taxaContainer);
      return;
    }

    const taxaHeader = document.createElement("div");
    taxaHeader.className = "color-scheme-heading";
    taxaHeader.textContent = `Individual Taxa (${this.taxaNames.length})`;
    taxaContainer.appendChild(taxaHeader);

    // Create a scrollable area for the taxa colors
    const colorInputContainer = document.createElement("div");
    colorInputContainer.className = "color-input-container";
    colorInputContainer.id = "taxa-color-container";

    // Create the grid for color inputs
    const colorGrid = document.createElement("div");
    colorGrid.className = "color-input-grid";

    this.taxaNames.forEach((taxon) => {
      const taxonColor = this.taxaColorMap.get(taxon) || "#000000";

      const colorRow = document.createElement("div");
      colorRow.className = "color-input-row";
      colorRow.style.borderLeft = `4px solid ${taxonColor}`;

      const taxonLabel = document.createElement("label");
      taxonLabel.className = "color-input-label";
      taxonLabel.textContent = taxon;

      const colorPicker = document.createElement("input");
      colorPicker.className = "color-input";
      colorPicker.type = "color";
      colorPicker.value = taxonColor;
      colorPicker.id = `taxa-${taxon}`;

      colorPicker.addEventListener("change", (e) => {
        this.taxaColorMap.set(taxon, e.target.value);
        colorRow.style.borderLeft = `4px solid ${e.target.value}`;
      });

      colorRow.appendChild(taxonLabel);
      colorRow.appendChild(colorPicker);
      colorGrid.appendChild(colorRow);
    });

    colorInputContainer.appendChild(colorGrid);
    taxaContainer.appendChild(colorInputContainer);
    container.appendChild(taxaContainer);
  }

  renderGroupOptions(container) {
    // Detect the groups based on current separator
    const groups = this.detectGroups();

    const groupsContainer = document.createElement("div");
    groupsContainer.className = "coloring-grid-panel";

    if (groups.length === 0) {
      const noGroupsMessage = document.createElement("div");
      noGroupsMessage.className = "color-scheme-info";
      noGroupsMessage.textContent =
        "No groups could be detected with the current separator.";
      groupsContainer.appendChild(noGroupsMessage);
      container.appendChild(groupsContainer);
      return;
    }

    const groupsHeader = document.createElement("div");
    groupsHeader.className = "color-scheme-heading";
    groupsHeader.textContent = `Taxa Groups (${groups.length})`;
    groupsContainer.appendChild(groupsHeader);

    // Create a scrollable area for the group colors
    const colorInputContainer = document.createElement("div");
    colorInputContainer.className = "color-input-container";
    colorInputContainer.id = "group-color-container";

    // Create the grid for color inputs
    const colorGrid = document.createElement("div");
    colorGrid.className = "color-input-grid";

    // Create an entry for each group
    groups.forEach((group) => {
      const groupColor = this.groupColorMap.get(group) || this.getRandomColor();
      this.groupColorMap.set(group, groupColor);

      const colorRow = document.createElement("div");
      colorRow.className = "color-input-row";
      colorRow.style.borderLeft = `4px solid ${groupColor}`;

      const groupLabel = document.createElement("div");
      groupLabel.className = "color-input-label";

      // Add label with count
      const labelText = document.createElement("span");
      labelText.textContent = group;
      groupLabel.appendChild(labelText);

      // Add count badge
      const countBadge = document.createElement("span");
      countBadge.className = "group-count-badge";
      countBadge.textContent = this.getGroupMemberCount(group);
      groupLabel.appendChild(countBadge);

      const colorPicker = document.createElement("input");
      colorPicker.className = "color-input";
      colorPicker.type = "color";
      colorPicker.value = groupColor;
      colorPicker.id = `group-${group}`;

      colorPicker.addEventListener("change", (e) => {
        this.groupColorMap.set(group, e.target.value);
        colorRow.style.borderLeft = `4px solid ${e.target.value}`;
      });

      colorRow.appendChild(groupLabel);
      colorRow.appendChild(colorPicker);
      colorGrid.appendChild(colorRow);
    });

    colorInputContainer.appendChild(colorGrid);
    groupsContainer.appendChild(colorInputContainer);
    container.appendChild(groupsContainer);
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
    const scheme = this.colorSchemes[schemeName] || this.colorSchemes.default;

    if (this.currentMode === "taxa") {
      // For taxa mode, assign colors cyclically
      this.taxaNames.forEach((taxon, i) => {
        const colorIndex = i % scheme.length;
        this.taxaColorMap.set(taxon, scheme[colorIndex]);
      });

      // Rerender the taxa inputs to show the new colors
      this.clearContainer(this.dynamicContent);
      this.renderTaxaColorInputs(this.dynamicContent);
    } else {
      // For group mode, assign a color to each group
      const groups = this.detectGroups();
      groups.forEach((group, i) => {
        const colorIndex = i % scheme.length;
        this.groupColorMap.set(group, scheme[colorIndex]);
      });

      // Rerender the group inputs to show the new colors
      this.clearContainer(this.dynamicContent);
      this.renderGroupOptions(this.dynamicContent);
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