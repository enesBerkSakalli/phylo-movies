
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
 * Handles WinBox creation and UI interactions for tree comparisons
 */
export class ComparisonWindow {
  constructor() {
    this.svgCounter = 0;
    this.debouncedRerender = debounce(() => this.rerenderTreesWithCurrentOptions(), 250);
    this.renderer = new TreeRenderer();
  }

  async createSideBySideWindow(options) {
    this.viewOptions = { ...options };
    this.treeList = options.treeList;
    this.tree1Index = options.tree1Index;
    this.tree2Index = options.tree2Index;

    this.validateInputs(this.treeList, this.tree1Index, this.tree2Index);

    const container = this.createWindowContainer(this.tree1Index, this.tree2Index, this.viewOptions);
    this.windowContainer = container;

    let winboxInstance = null;
    if (window.WinBox) {
      winboxInstance = new window.WinBox({
        title: `Tree Comparison: Tree ${this.tree1Index + 1} vs Tree ${this.tree2Index + 1}`,
        class: ["tree-comparison-winbox"],
        width: "90%",
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
    this.svg1Id = svg1Id;
    this.svg2Id = svg2Id;

    this.fontSizeSlider = container.querySelector('#compare-font-size');
    this.fontSizeValueDisplay = container.querySelector('#compare-font-size-value');
    this.strokeWidthSlider = container.querySelector('#compare-stroke-width');
    this.strokeWidthValueDisplay = container.querySelector('#compare-stroke-width-value');
    this.ignoreBranchesCheckbox = container.querySelector('#compare-ignore-branches');

    this.attachEventHandlers(container);

    const svg1 = document.getElementById(this.svg1Id);
    const svg2 = document.getElementById(this.svg2Id);
    if (svg1 && svg2) {
      try {
        await this.renderComparisonTrees(
          this.treeList,
          this.tree1Index,
          this.tree2Index,
          this.svg1Id,
          this.svg2Id,
          this.viewOptions
        );
      } catch (error) {
        this.showError(container, error);
      }
    }

    return winboxInstance || container;
  }

  /**
   * Generate unique SVG ID
   */
  generateSvgId(prefix = 'tree-svg') {
    return `${prefix}-${Date.now()}-${++this.svgCounter}`;
  }

  createWindowContainer(tree1Index, tree2Index, initialOptions) {
    const container = document.createElement("div");
    container.className = "tree-comparison-modal";
    container.innerHTML = `
      <div class="comparison-header">
        <h3>Tree Comparison: Tree ${tree1Index + 1} vs Tree ${tree2Index + 1}</h3>
      </div>
      <div class="tree-comparison-row"></div>
      <div class="comparison-controls">
        <div class="control-group">
          <label for="compare-font-size" class="control-label">Font Size:</label>
          <div class="control-input-group">
            <input type="range" id="compare-font-size" class="mdc-slider" min="0.5" max="3" step="0.1" value="${initialOptions.fontSize || 1.7}">
            <span id="compare-font-size-value" class="control-value-display">${initialOptions.fontSize || 1.7}</span>
          </div>
        </div>
        <div class="control-group">
          <label for="compare-stroke-width" class="control-label">Stroke Width:</label>
          <div class="control-input-group">
            <input type="range" id="compare-stroke-width" class="mdc-slider" min="0.5" max="5" step="0.1" value="${initialOptions.strokeWidth || 1}">
            <span id="compare-stroke-width-value" class="control-value-display">${initialOptions.strokeWidth || 1}</span>
          </div>
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
    const svgId = this.generateSvgId("comparison");
    const svgContainer = container.querySelector('.tree-comparison-row');

    // Ensure proper height for the container
    svgContainer.style.height = "600px";
    svgContainer.style.minHeight = "600px";

    // Create single SVG with side-by-side groups
    const containerInfo = this.renderer.createSideBySideContainer(svgId, svgContainer);

    this.svgId = svgId;
    this.tree1GroupId = containerInfo.tree1GroupId;
    this.tree2GroupId = containerInfo.tree2GroupId;

    return { svg1Id: this.tree1GroupId, svg2Id: this.tree2GroupId };
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

  attachEventHandlers(container) {
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
    if (!this.svgId || !this.treeList) {
      console.error("Cannot re-render trees: missing essential data.");
      return;
    }

    try {
      // Clear both tree groups
      const tree1Group = document.getElementById(this.tree1GroupId);
      const tree2Group = document.getElementById(this.tree2GroupId);
      if (tree1Group) tree1Group.innerHTML = '';
      if (tree2Group) tree2Group.innerHTML = '';

      await this.renderComparisonTrees(
        this.treeList,
        this.tree1Index,
        this.tree2Index,
        this.tree1GroupId,
        this.tree2GroupId,
        this.viewOptions
      );
    } catch (error) {
      console.error("Error re-rendering comparison trees:", error);
      if (this.windowContainer) {
        this.showError(this.windowContainer, error);
      }
    }
  }

  async renderComparisonTrees(treeList, tree1Index, tree2Index, svg1Id, svg2Id, options) {
    const renderOptions = {
      leaveOrder: options.leaveOrder || [],
      ignoreBranchLengths: options.ignoreBranchLengths || false,
      fontSize: options.fontSize || 1.7,
      strokeWidth: options.strokeWidth || 1,
      toBeHighlighted1: options.toBeHighlighted1 || [],
      toBeHighlighted2: options.toBeHighlighted2 || [],
      drawDuration: 0,
    };

    // Use the renderer's side-by-side method
    await this.renderer.renderSideBySideTrees(
      treeList[tree1Index],
      treeList[tree2Index],
      this.svgId, // Use the main SVG ID
      renderOptions
    );
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
