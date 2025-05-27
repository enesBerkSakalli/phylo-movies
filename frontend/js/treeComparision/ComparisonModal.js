import { TreeRenderer } from "./TreeRenderer.js";

/**
 * Handles modal creation and UI interactions for tree comparisons
 */
export class ComparisonModal {
  constructor() {
    this.renderer = new TreeRenderer();
  }

  async createSideBySideModal(options) {
    const {
      treeList,
      tree1Index,
      tree2Index,
      leaveOrder = [],
      ignoreBranchLengths = false,
      fontSize = 1.7,
      strokeWidth = 1,
      toBeHighlighted1 = [],
      toBeHighlighted2 = [],
    } = options;

    this.validateInputs(treeList, tree1Index, tree2Index);

    const container = this.createModalContainer(tree1Index, tree2Index);
    let winboxInstance = null;
    if (window.WinBox) {
      winboxInstance = new window.WinBox({
        title: `Tree Comparison: Tree ${tree1Index + 1} vs Tree ${
          tree2Index + 1
        }`,
        class: ["tree-comparison-winbox"],
        width: 1100,
        height: 600,
        x: "center",
        y: "center",
        mount: container,
      });
      container.winboxInstance = winboxInstance;
    } else {
      document.body.appendChild(container);
    }

    const { svg1Id, svg2Id } = this.setupSvgContainers(container);
    this.attachEventHandlers(container);

    const svg1 = document.getElementById(svg1Id);
    const svg2 = document.getElementById(svg2Id);
    if (svg1 && svg2) {
      try {
        await this.renderComparisonTrees(
          treeList,
          tree1Index,
          tree2Index,
          svg1Id,
          svg2Id,
          {
            leaveOrder,
            ignoreBranchLengths,
            fontSize,
            strokeWidth,
            toBeHighlighted1,
            toBeHighlighted2,
          }
        );
      } catch (error) {
        this.showError(container, error);
      }
      return;
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

  createModalContainer(tree1Index, tree2Index) {
    const container = document.createElement("div");
    container.className = "tree-comparison-modal";
    container.innerHTML = `
      <div class="comparison-header">
        <h3>Tree Comparison: Tree ${tree1Index + 1} vs Tree ${
      tree2Index + 1
    }</h3>
      </div>
      <div class="tree-comparison-row">
        <div class="tree-container">
          <div class="svg-container" data-tree-container="1"></div>
        </div>
        <div class="tree-container">
          <div class="svg-container" data-tree-container="2"></div>
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

  attachEventHandlers(container) {
    container.addEventListener("click", (event) => {
      const action = event.target.dataset.action;
      if (action === "close") {
        if (container.winboxInstance) {
          container.winboxInstance.close();
        } else if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      }
    });
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
