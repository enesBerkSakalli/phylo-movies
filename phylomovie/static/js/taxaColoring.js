export default class TaxaColoring {
  /**
   * Initializes the TaxaColoring instance.
   * @param {Object} treeData - The tree data structure containing leaf nodes.
   * @param {Function} onComplete - Callback function invoked after applying colors.
   */
  constructor(treeData, onComplete) {
    this.treeData = treeData;
    this.onComplete = onComplete;
    this.taxaColorMap = new Map();
    this.groupColorMap = new Map();
    this.separator = "-"; // Default separator
    this.initialize();
  }

  /**
   * Initializes the taxa names and opens the color assignment modal.
   */
  initialize() {
    // Extract taxa names from the tree data
    this.taxaNames = this.treeData.leaves().map((leaf) => {
      if (leaf.data && leaf.data.name) {
        return leaf.data.name;
      } else {
        console.warn("Leaf data is missing a name:", leaf);
        return "Unknown";
      }
    });
    console.log("Extracted Taxa Names:", this.taxaNames);

    // Open the color assignment modal with a properly constructed UI
    this.openColorAssignmentModal();
  }

  /**
   * Creates and displays the color assignment modal using WinBox.
   */
  openColorAssignmentModal() {
    // Create the modal window content container
    const modalContent = document.createElement("div");
    modalContent.id = "color-assignment-container";
    modalContent.style.padding = "20px";
    modalContent.style.overflowY = "auto";
    modalContent.style.height = "100%";
    modalContent.style.boxSizing = "border-box";
    modalContent.style.fontFamily = "Arial, sans-serif"; // Optional: Set a default font

    // Create the modal window using WinBox
    this.colorWin = new WinBox({
      title: "Assign Colors",
      width: "500px",
      height: "700px",
      x: "center",
      y: "center",
      background: "#f0f0f0",
      border: 4,
      mount: modalContent,
      onclose: () => {
        // Optional: Handle modal close event if needed
      },
    });

    // Build the modal content UI with all the necessary elements
    this.buildColorAssignmentUI(modalContent);
  }

  /**
   * Constructs the main UI within the modal.
   * @param {HTMLElement} container - The container element for the modal content.
   */
  buildColorAssignmentUI(container) {
    // Create a wrapper to hold all UI components
    const wrapper = document.createElement("div");
    wrapper.id = "color-assignment-wrapper";
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.height = "100%";

    // Create a header or instruction text if needed
    const header = document.createElement("h2");
    header.textContent = "Assign Colors to Taxa or Groups";
    header.style.marginBottom = "20px";
    header.style.fontSize = "18px";
    wrapper.appendChild(header);

    // Create a selector for the coloring mode (Taxa/Groups)
    this.createColoringModeSelector(wrapper);

    // Create the dynamic content area where inputs will be rendered
    const dynamicContent = document.createElement("div");
    dynamicContent.id = "dynamic-content";
    dynamicContent.style.flexGrow = "1";
    dynamicContent.style.overflowY = "auto";
    wrapper.appendChild(dynamicContent);

    // Create Apply and Cancel buttons at the bottom
    this.createControlButtons(wrapper);

    container.appendChild(wrapper);

    // Render Taxa Inputs by default
    this.renderTaxaColorInputs(dynamicContent);
  }

  /**
   * Creates the coloring mode selector (Taxa or Groups).
   * @param {HTMLElement} container - The container to append the selector to.
   */
  createColoringModeSelector(container) {
    const modeContainer = document.createElement("div");
    modeContainer.classList.add("coloring-mode-selector");

    const modeLabel = document.createElement("label");
    modeLabel.textContent = "Coloring Mode: ";
    modeLabel.htmlFor = "coloring-mode-selector";
    modeLabel.classList.add("mode-label"); // Moved styles to a class

    const modeSelect = document.createElement("select");
    modeSelect.id = "coloring-mode-selector";
    modeSelect.classList.add("mode-select"); // Class for shared styling

    const optionTaxa = document.createElement("option");
    optionTaxa.value = "taxa";
    optionTaxa.textContent = "Taxa";

    const optionGroups = document.createElement("option");
    optionGroups.value = "groups";
    optionGroups.textContent = "Groups";

    modeSelect.appendChild(optionTaxa);
    modeSelect.appendChild(optionGroups);

    // Add a tooltip
    modeSelect.setAttribute(
      "title",
      "Select whether to color by individual taxa or groups"
    );

    modeSelect.addEventListener("change", () => {
      const mode = modeSelect.value;
      console.log(`Coloring mode changed to: ${mode}`);
      const dynamicContent = document.getElementById("dynamic-content");
      if (dynamicContent) {
        if (mode === "taxa") {
          this.renderTaxaColorInputs(dynamicContent);
        } else if (mode === "groups") {
          this.renderGroupOptions(dynamicContent);
        }
      }
    });

    modeContainer.appendChild(modeLabel);
    modeContainer.appendChild(modeSelect);
    container.appendChild(modeContainer);
  }

  /**
   * Creates the Apply and Cancel buttons.
   * @param {HTMLElement} container - The container to append the buttons to.
   */
  createControlButtons(container) {
    const buttonContainer = document.createElement("div");
    buttonContainer.style.marginTop = "20px";
    buttonContainer.style.textAlign = "right";

    const applyButton = this.createButton(
      "Apply",
      "#4CAF50",
      "apply-button",
      () => {
        const taxaColorMap = this.getTaxaColorMap();
        this.onComplete(taxaColorMap);
        // this.colorWin.destroy();
      }
    );

    const cancelButton = this.createButton(
      "Cancel",
      "#f44336",
      "cancel-button",
      () => {
        //this.colorWin.destroy();
      }
    );

    buttonContainer.appendChild(applyButton);
    buttonContainer.appendChild(cancelButton);
    container.appendChild(buttonContainer);
  }

  /**
   * Helper method to create a styled button.
   * @param {string} text - The button text.
   * @param {string} bgColor - The background color of the button.
   * @param {string} id - The ID to assign to the button.
   * @param {Function} onClick - The click event handler.
   * @returns {HTMLElement} The created button element.
   */
  createButton(text, bgColor, id, onClick) {
    const button = document.createElement("button");
    button.id = id;
    button.textContent = text;
    button.style.padding = "10px 20px";
    button.style.marginRight = "10px";
    button.style.backgroundColor = bgColor;
    button.style.color = "white";
    button.style.border = "none";
    button.style.borderRadius = "4px";
    button.style.cursor = "pointer";
    button.style.fontSize = "14px";
    button.style.transition = "background-color 0.3s";

    // Optional: Add hover effect
    button.addEventListener("mouseover", () => {
      button.style.opacity = "0.8";
    });
    button.addEventListener("mouseout", () => {
      button.style.opacity = "1";
    });

    button.addEventListener("click", onClick);
    return button;
  }

  /**
   * Renders the color inputs for individual taxa.
   * @param {HTMLElement} container - The container to append the inputs to.
   */
  renderTaxaColorInputs(container) {
    // Clear the dynamic content container
    this.clearContainer(container);

    // Taxa color inputs
    const taxaContainer = document.createElement("div");
    taxaContainer.id = "taxa-color-container";
    taxaContainer.style.maxHeight = "500px";
    taxaContainer.style.overflowY = "auto";
    taxaContainer.style.border = "1px solid #ccc";
    taxaContainer.style.padding = "10px";
    taxaContainer.style.borderRadius = "4px";
    taxaContainer.style.backgroundColor = "#fff";

    const gridContainer = document.createElement("div");
    gridContainer.style.display = "grid";
    gridContainer.style.gridTemplateColumns = "1fr 1fr";
    gridContainer.style.gap = "10px";

    // Create color input for each taxon
    this.taxaNames.forEach((taxon) => {
      const taxonDiv = this.createTaxonColorInput(taxon);
      gridContainer.appendChild(taxonDiv);
    });

    taxaContainer.appendChild(gridContainer);
    container.appendChild(taxaContainer);
  }

  /**
   * Renders the group options, including the separator selector and group color inputs.
   * @param {HTMLElement} container - The container to append the group options to.
   */
  renderGroupOptions(container) {
    // Clear the dynamic content container
    this.clearContainer(container);

    const groupContainer = document.createElement("div");
    groupContainer.id = "group-options-container";
    groupContainer.style.border = "1px solid #ccc";
    groupContainer.style.padding = "10px";
    groupContainer.style.borderRadius = "4px";
    groupContainer.style.backgroundColor = "#fff";
    groupContainer.style.marginBottom = "20px";

    // Separator selection
    this.createSeparatorSelector(groupContainer);

    // Render group color inputs based on the separator
    this.renderGroupColorInputs(groupContainer);

    container.appendChild(groupContainer);
  }

  /**
   * Creates the separator selector for grouping taxa.
   * @param {HTMLElement} container - The container to append the selector to.
   */
  createSeparatorSelector(container) {
    const separatorContainer = document.createElement("div");
    separatorContainer.style.marginBottom = "20px";
    separatorContainer.style.display = "flex";
    separatorContainer.style.alignItems = "center";

    const separatorLabel = document.createElement("label");
    separatorLabel.textContent = "Separator: ";
    separatorLabel.style.fontWeight = "bold";
    separatorLabel.style.marginRight = "10px";
    separatorLabel.htmlFor = "separator-selector";

    const separatorSelect = document.createElement("select");
    separatorSelect.id = "separator-selector";
    separatorSelect.style.padding = "5px";
    separatorSelect.style.fontSize = "14px";
    separatorSelect.style.flexGrow = "1";

    // Updated separators array to include "First Letter" option
    const separators = ["-", "_", "+", ":", "|", "First Letter"];
    separators.forEach((sep) => {
      const option = document.createElement("option");
      option.value = sep === "First Letter" ? "firstLetter" : sep;
      option.textContent = sep;
      separatorSelect.appendChild(option);
    });

    separatorSelect.value = this.separator;

    separatorSelect.addEventListener("change", () => {
      this.separator = separatorSelect.value;
      console.log(`Separator changed to: ${this.separator}`);
      this.renderGroupColorInputs(container);
    });

    separatorContainer.appendChild(separatorLabel);
    separatorContainer.appendChild(separatorSelect);
    container.appendChild(separatorContainer);
  }

  /**
   * Renders the color inputs for each identified group.
   * @param {HTMLElement} container - The container to append the group color inputs to.
   */
  renderGroupColorInputs(container) {
    // Remove existing group color container if present
    const existingGroupColorContainer = document.getElementById(
      "group-color-container"
    );
    if (existingGroupColorContainer) {
      container.removeChild(existingGroupColorContainer);
    }

    // Group taxa based on the separator
    this.groups = this.groupTaxa(this.taxaNames, this.separator);

    if (this.groups.length === 0) {
      const noGroupsMsg = document.createElement("p");
      noGroupsMsg.textContent = "No groups found with the selected separator.";
      noGroupsMsg.style.color = "red";
      noGroupsMsg.style.fontWeight = "bold";
      container.appendChild(noGroupsMsg);
      return;
    }

    const groupColorContainer = document.createElement("div");
    groupColorContainer.id = "group-color-container";
    groupColorContainer.style.maxHeight = "400px";
    groupColorContainer.style.overflowY = "auto";
    groupColorContainer.style.border = "1px solid #ccc";
    groupColorContainer.style.padding = "10px";
    groupColorContainer.style.borderRadius = "4px";
    groupColorContainer.style.backgroundColor = "#fff";

    const gridContainer = document.createElement("div");
    gridContainer.style.display = "grid";
    gridContainer.style.gridTemplateColumns = "1fr 1fr";
    gridContainer.style.gap = "10px";

    this.groups.forEach((group) => {
      const groupDiv = this.createGroupColorInput(group);
      gridContainer.appendChild(groupDiv);
    });

    groupColorContainer.appendChild(gridContainer);
    container.appendChild(groupColorContainer);
  }

  /**
   * Creates a color input element for a specific taxon.
   * @param {string} taxon - The name of the taxon.
   * @returns {HTMLElement} The div containing the taxon label and color input.
   */
  createTaxonColorInput(taxon) {
    const taxonDiv = document.createElement("div");
    taxonDiv.style.display = "flex";
    taxonDiv.style.alignItems = "center";
    taxonDiv.style.justifyContent = "space-between";
    taxonDiv.style.padding = "5px 0";

    const taxonLabel = document.createElement("span");
    taxonLabel.textContent = taxon;
    taxonLabel.style.marginRight = "10px";
    taxonLabel.style.fontSize = "14px";
    taxonLabel.style.flexGrow = "1";

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = this.taxaColorMap.get(taxon) || "#000000";
    colorInput.style.width = "50px";
    colorInput.style.height = "30px";
    colorInput.style.border = "none";
    colorInput.style.padding = "0";
    colorInput.style.cursor = "pointer";

    colorInput.addEventListener("input", () => {
      this.taxaColorMap.set(taxon, colorInput.value);
    });

    taxonDiv.appendChild(taxonLabel);
    taxonDiv.appendChild(colorInput);

    return taxonDiv;
  }

  /**
   * Creates a color input element for a specific group.
   * @param {string} group - The name of the group.
   * @returns {HTMLElement} The div containing the group label and color input.
   */
  createGroupColorInput(group) {
    const groupDiv = document.createElement("div");
    groupDiv.style.display = "flex";
    groupDiv.style.alignItems = "center";
    groupDiv.style.justifyContent = "space-between";
    groupDiv.style.padding = "5px 0";

    const groupLabel = document.createElement("span");
    groupLabel.textContent = group;
    groupLabel.style.marginRight = "10px";
    groupLabel.style.fontSize = "14px";
    groupLabel.style.flexGrow = "1";

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = this.groupColorMap.get(group) || "#000000";
    colorInput.style.width = "50px";
    colorInput.style.height = "30px";
    colorInput.style.border = "none";
    colorInput.style.padding = "0";
    colorInput.style.cursor = "pointer";

    colorInput.addEventListener("input", () => {
      this.groupColorMap.set(group, colorInput.value);
    });

    groupDiv.appendChild(groupLabel);
    groupDiv.appendChild(colorInput);

    return groupDiv;
  }

  /**
   * Clears all child elements of a container.
   * @param {HTMLElement} container - The container to clear.
   */
  clearContainer(container) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  }

  /**
   * Groups taxa names based on the specified separator or first letter.
   * @param {Array<string>} taxaNames - The array of taxa names.
   * @param {string} separator - The separator used to define groups or 'firstLetter' for first letter grouping.
   * @returns {Array<string>} An array of unique group names.
   */
  groupTaxa(taxaNames, separator) {
    const groups = new Set();
    taxaNames.forEach((name) => {
      let group;
      if (separator === "firstLetter") {
        group = name.charAt(0).toUpperCase(); // Group by first letter, case-insensitive
        if (group.trim() !== "") {
          groups.add(group);
        }
      } else {
        const parts = name.split(separator);
        if (parts.length > 1 && parts[0].trim() !== "") {
          group = parts[0].trim();
          groups.add(group);
        }
      }
    });
    const groupArray = Array.from(groups);
    console.log(`Separator: "${separator}"`);
    console.log(`Identified Groups:`, groupArray);
    return groupArray;
  }

  /**
   * Constructs the final taxa color mapping based on the selected mode.
   * @returns {Object} An object mapping taxa names to their assigned colors.
   */
  getTaxaColorMap() {
    const taxaColorMap = {};
    const modeSelector = document.getElementById("coloring-mode-selector");
    const mode = modeSelector ? modeSelector.value : "taxa"; // Default to taxa

    if (mode === "taxa") {
      this.taxaNames.forEach((taxon) => {
        taxaColorMap[taxon] = this.taxaColorMap.get(taxon) || "#000000";
      });
    } else if (mode === "groups") {
      this.taxaNames.forEach((taxon) => {
        let group;
        if (this.separator === "firstLetter") {
          group = taxon.charAt(0).toUpperCase();
        } else {
          group = taxon.split(this.separator)[0].trim();
        }
        taxaColorMap[taxon] = this.groupColorMap.get(group) || "#000000";
      });
    }

    return taxaColorMap;
  }
}
