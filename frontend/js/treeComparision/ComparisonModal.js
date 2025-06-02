import { TreeRenderer } from "./TreeRenderer.js";

// Debounce utility function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Handles modal creation and UI interactions for tree comparisons
 */
export class ComparisonModal {
  constructor() {
    this.renderer = new TreeRenderer();
    // Initialize debounced rerender function
    this.debouncedRerender = debounce(() => this.rerenderTreesWithCurrentOptions(), 250);
  }

  async createSideBySideModal(options) {
    // Store options for later use in event handlers and re-rendering
    this.viewOptions = { ...options };
    this.treeList = options.treeList;
    this.tree1Index = options.tree1Index;
    this.tree2Index = options.tree2Index;

    const {
      treeList, // Already on this.treeList
      tree1Index, // Already on this.tree1Index
      tree2Index, // Already on this.tree2Index
      leaveOrder = [], // Part of this.viewOptions.leaveOrder
      ignoreBranchLengths = false, // Part of this.viewOptions.ignoreBranchLengths
      fontSize = 1.7, // Part of this.viewOptions.fontSize
      strokeWidth = 1, // Part of this.viewOptions.strokeWidth
      toBeHighlighted1 = [], // Part of this.viewOptions.toBeHighlighted1
      toBeHighlighted2 = [], // Part of this.viewOptions.toBeHighlighted2
    } = this.viewOptions;

    this.validateInputs(this.treeList, this.tree1Index, this.tree2Index);

    // Pass initial options to createModalContainer to set initial values for controls
    const container = this.createModalContainer(this.tree1Index, this.tree2Index, this.viewOptions);
    this.modalContainer = container; // Store container reference

    let winboxInstance = null;
    if (window.WinBox) {
      winboxInstance = new window.WinBox({
        title: `Tree Comparison: Tree ${tree1Index + 1} vs Tree ${
          tree2Index + 1
        }`,
        class: ["tree-comparison-winbox"],
        width: "100%",
        height: "100%",
        x: "center",
        y: "center",
        mount: container,
      });
      container.winboxInstance = winboxInstance;
    } else {
      document.body.appendChild(container);
    }

    const { svg1Id, svg2Id } = this.setupSvgContainers(container);
    this.svg1Id = svg1Id; // Store for re-rendering
    this.svg2Id = svg2Id; // Store for re-rendering

    // Get references to control elements
    this.fontSizeSlider = container.querySelector('#compare-font-size');
    this.fontSizeValueDisplay = container.querySelector('#compare-font-size-value');
    this.strokeWidthSlider = container.querySelector('#compare-stroke-width');
    this.strokeWidthValueDisplay = container.querySelector('#compare-stroke-width-value');
    this.ignoreBranchesCheckbox = container.querySelector('#compare-ignore-branches');

    this.attachEventHandlers(container); // Pass container to attachEventHandlers

    const svg1 = document.getElementById(this.svg1Id);
    const svg2 = document.getElementById(this.svg2Id);
    if (svg1 && svg2) {
      try {
        // Pass the initial viewOptions directly
        await this.renderComparisonTrees(
          this.treeList,
          this.tree1Index,
          this.tree2Index,
          this.svg1Id,
          this.svg2Id,
          this.viewOptions
        );
        // Center the trees after rendering
        this.renderer.centerTree(this.svg1Id);
        this.renderer.centerTree(this.svg2Id);
      } catch (error) {
        this.showError(container, error);
      }
      // Removed return; to ensure consistent return value
    }

    return winboxInstance || container;
  }

  validateInputs(treeList, tree1Index, tree2Index) {
    if (!Array.isArray(treeList)) {
      throw new Error("Invalid tree list provided");
    }
    if (!treeList[tree1Index] || !treeList[tree2Index]) {
      throw new Error(`Invalid tree indices: ${tree1Index}, ${tree2Index}`);
    }
    if (tree1Index === tree2Index) {
      throw new Error("Cannot compare tree with itself");
    }
  }

  createModalContainer(tree1Index, tree2Index, initialOptions) {
    const container = document.createElement("div");
    container.className = "tree-comparison-modal";
    container.innerHTML = `
      <div class="comparison-header">
        <h3>Tree Comparison: Tree ${tree1Index + 1} vs Tree ${tree2Index + 1}</h3>
      </div>
      <div class="tree-comparison-row">
        <div class="tree-container">
          <div class="tree-label">Tree ${tree1Index + 1}</div>
          <div class="svg-container" data-tree-container="1"></div>
        </div>
        <div class="tree-container">
          <div class="tree-label">Tree ${tree2Index + 1}</div>
          <div class="svg-container" data-tree-container="2"></div>
        </div>
      </div>
      <div class="comparison-controls">
        <div class="control-group">
          <label for="compare-font-size" class="control-label">Font Size:</label>
          <input type="range" id="compare-font-size" class="mdc-slider" min="0.5" max="3" step="0.1" value="${initialOptions.fontSize || 1.7}">
          <span id="compare-font-size-value" class="control-value-display">${initialOptions.fontSize || 1.7}</span>
        </div>
        <div class="control-group">
          <label for="compare-stroke-width" class="control-label">Stroke Width:</label>
          <input type="range" id="compare-stroke-width" class="mdc-slider" min="0.5" max="5" step="0.1" value="${initialOptions.strokeWidth || 1}">
          <span id="compare-stroke-width-value" class="control-value-display">${initialOptions.strokeWidth || 1}</span>
        </div>
        <div class="control-group switch-row">
          <label class="control-label" for="compare-ignore-branches">Ignore Branch Lengths:</label>
          <label class="switch">
            <input type="checkbox" id="compare-ignore-branches" ${initialOptions.ignoreBranchLengths ? 'checked' : ''}>
            <span class="slider round"></span>
          </label>
        </div>
      </div>
      <div class="comparison-footer">
        <button class="md-button secondary" data-action="close">
          Close
        </button>
      </div>
    `;
    return container;
  }

  setupSvgContainers(container) {
    const svg1Id = this.renderer.generateSvgId("comparison-tree1");
    const svg2Id = this.renderer.generateSvgId("comparison-tree2");

    const container1 = container.querySelector('[data-tree-container="1"]');
    const container2 = container.querySelector('[data-tree-container="2"]');

    this.renderer.createSvgContainer(svg1Id, container1);
    this.renderer.createSvgContainer(svg2Id, container2);

    return { svg1Id, svg2Id };
  }

  attachEventHandlers(container) { // container is this.modalContainer
    // Close button handler
    const closeButton = container.querySelector('[data-action="close"]');
    if (closeButton) {
      closeButton.addEventListener("click", () => {
        if (container.winboxInstance) {
          container.winboxInstance.close();
        } else if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      });
    }

    // Font size slider
    if (this.fontSizeSlider) {
      this.fontSizeSlider.addEventListener('input', (event) => {
        const newValue = parseFloat(event.target.value);
        this.viewOptions.fontSize = newValue;
        if (this.fontSizeValueDisplay) {
          this.fontSizeValueDisplay.textContent = newValue.toFixed(1);
        }
        console.log("Updated viewOptions fontSize to:", newValue);
        this.debouncedRerender();
      });
    }

    // Stroke width slider
    if (this.strokeWidthSlider) {
      this.strokeWidthSlider.addEventListener('input', (event) => {
        const newValue = parseFloat(event.target.value);
        this.viewOptions.strokeWidth = newValue;
        if (this.strokeWidthValueDisplay) {
          this.strokeWidthValueDisplay.textContent = newValue.toFixed(1);
        }
        console.log("Updated viewOptions strokeWidth to:", newValue);
        this.debouncedRerender();
      });
    }

    // Ignore branch lengths checkbox
    if (this.ignoreBranchesCheckbox) {
      this.ignoreBranchesCheckbox.addEventListener('change', (event) => {
        this.viewOptions.ignoreBranchLengths = event.target.checked;
        console.log("Updated viewOptions ignoreBranchLengths to:", event.target.checked);
        this.rerenderTreesWithCurrentOptions(); // Direct call for checkbox
      });
    }
  }

  async rerenderTreesWithCurrentOptions() {
    if (!this.svg1Id || !this.svg2Id || !this.treeList) {
      console.error("Cannot re-render trees: missing essential data.", this);
      return;
    }
    console.log("Re-rendering trees with options:", this.viewOptions);
    try {
      // Clear existing SVGs before re-rendering
      const svg1Element = document.getElementById(this.svg1Id);
      if (svg1Element) svg1Element.innerHTML = '';
      const svg2Element = document.getElementById(this.svg2Id);
      if (svg2Element) svg2Element.innerHTML = '';

      await this.renderComparisonTrees(
        this.treeList,
        this.tree1Index,
        this.tree2Index,
        this.svg1Id,
        this.svg2Id,
        this.viewOptions // Pass the updated viewOptions
      );
      // Center the trees again after re-rendering
      this.renderer.centerTree(this.svg1Id);
      this.renderer.centerTree(this.svg2Id);
    } catch (error) {
      console.error("Error re-rendering comparison trees:", error);
      // Optionally, display this error in the modal using this.showError or similar
      if (this.modalContainer) { // Check if modalContainer is available
        this.showError(this.modalContainer, error); // Simplified error display
      }
    }
  }

  async renderComparisonTrees(
    treeList,
    tree1Index,
    tree2Index,
    svg1Id,
    svg2Id,
    options
  ) {
    const renderOptions = {
      ...options,
      drawDuration: 0,
    };

    await Promise.all([
      this.renderer.renderTree(treeList[tree1Index], svg1Id, {
        ...renderOptions,
        toBeHighlighted: options.toBeHighlighted1,
      }),
      this.renderer.renderTree(treeList[tree2Index], svg2Id, {
        ...renderOptions,
        toBeHighlighted: options.toBeHighlighted2,
      }),
    ]);
  }

  showError(container, error) {
    console.error("Tree comparison error:", error);
    container.innerHTML = `
      <div class="error-message">
        <h4>Error</h4>
        <p>${error.message}</p>
      </div>
    `;
  }
}
