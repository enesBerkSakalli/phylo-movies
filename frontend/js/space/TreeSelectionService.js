import { createSideBySideComparisonModal } from "../treeComparision/treeComparision.js";

/**
 * @module TreeSelectionService
 * Handles tree filtering, selection, and comparison functionality
 */

const TreeSelectionService = {
  /**
   * Filter trees to show only full trees or all trees
   * @param {Array} treeList - Full list of trees
   * @param {boolean} showOnlyFullTrees - Whether to filter for only full trees
   * @returns {Object} Object containing filtered trees and indices
   */
  filterTrees(treeList, showOnlyFullTrees) {
    if (!showOnlyFullTrees) {
      return {
        filteredTreeList: treeList,
        treeIndices: Array.from({ length: treeList.length }, (_, i) => i),
      };
    }

    const filteredTreeList = [];
    const treeIndices = [];

    for (let i = 0; i < treeList.length; i++) {
      if (i % 5 === 0) {
        // Every 5th tree is a full tree
        filteredTreeList.push(treeList[i]);
        treeIndices.push(i);
      }
    }

    console.log(
      `Showing only full trees: ${filteredTreeList.length} of ${treeList.length}`
    );

    return { filteredTreeList, treeIndices };
  },

  /**
   * Compare two trees in a modal window
   * @param {number} tree1Index - Index of first tree to compare
   * @param {number} tree2Index - Index of second tree to compare
   * @param {Object} context - Context containing treeList and modals
   */
  async compareTrees(tree1Index, tree2Index, { treeList, comparisonModals }) {
    const connectionId = `${tree1Index}-${tree2Index}`;

    if (this._windowExists(comparisonModals, connectionId)) {
      return;
    }

    try {
      if (!this._isWinBoxAvailable()) {
        return;
      }

      // Create the comparison modal with full context
      const modal = await createSideBySideComparisonModal({
        tree1Index,
        tree2Index,
        treeList,
        leaveOrder: window.gui?.leaveOrder || [],
        ignoreBranchLengths: window.gui?.ignoreBranchLengths || false,
        fontSize: window.gui?.fontSize || 1.7,
        strokeWidth: window.gui?.strokeWidth || 1,
        toBeHighlighted: window.gui?.toBeHighlighted || []
      });

      // Store the modal reference
      comparisonModals[connectionId] = modal;

    } catch (error) {
      this._handleError("Error opening tree comparison:", error);
    }
  },

  /**
   * Check if a comparison window already exists
   * @private
   */
  _windowExists(comparisonModals, connectionId) {
    if (comparisonModals[connectionId]?.el) {
      comparisonModals[connectionId].focus();
      return true;
    }
    return false;
  },

  /**
   * Check if WinBox library is available
   * @private
   */
  _isWinBoxAvailable() {
    if (typeof WinBox === "undefined") {
      console.error(
        "WinBox is not defined. Make sure to include the WinBox library before using compareTrees."
      );
      alert(
        "Comparison tool is unavailable. The required library (WinBox) is not loaded."
      );
      return false;
    }
    return true;
  },

  /**
   * Handle errors with console logging and alerts
   * @private
   */
  _handleError(message, error) {
    console.error(message, error);
    alert(`${message.replace(":", "")} - ${error.message}`);
  },

  /**
   * Draw specific trees in the comparison modal
   * @param {Object} guiInstance - GUI-like object with necessary properties
   * @param {number} tree1Index - Index of first tree to draw
   * @param {number} tree2Index - Index of second tree to draw
   * @param {Array} treeList - List of all trees
   */
  async drawSpecificTrees(guiInstance, tree1Index, tree2Index, treeList) {
    try {
      const { TreeDrawer: drawer, default: drawTree } =
        await this._importTreeDrawer();
      const constructTree = await this._importTreeConstructor();

      if (
        !this._validateTreeDrawingInputs(
          guiInstance,
          treeList,
          tree1Index,
          tree2Index
        )
      ) {
        return;
      }

      const { treeOne, treeTwo, svgUp, svgDown } = this._prepareTreeData(
        guiInstance,
        treeList,
        tree1Index,
        tree2Index
      );
      const toBeHighlighted = this._getHighlightData(tree1Index);

      await this._renderTrees(
        drawTree,
        constructTree,
        treeOne,
        treeTwo,
        svgUp,
        svgDown,
        toBeHighlighted,
        guiInstance
      );

      this._adjustSvgViewports(svgUp, svgDown);
    } catch (error) {
      this._handleTreeRenderingError(error);
    }
  },

  /**
   * Import TreeDrawer module
   * @private
   */
  async _importTreeDrawer() {
    const module = await import("../treeVisualisation/TreeDrawer.js");
    return {
      TreeDrawer: module.TreeDrawer || module.default,
      default: module.default,
    };
  },

  /**
   * Import TreeConstructor module
   * @private
   */
  async _importTreeConstructor() {
    return (await import("../treeVisualisation/TreeConstructor.js")).default;
  },

  /**
   * Validate inputs needed for tree drawing
   * @private
   */
  _validateTreeDrawingInputs(guiInstance, treeList, tree1Index, tree2Index) {
    if (!treeList[tree1Index] || !treeList[tree2Index]) {
      console.error("Tree indices are invalid");
      return false;
    }

    if (!guiInstance?.svgUp || !guiInstance?.svgDown) {
      throw new Error("SVG elements not found");
    }

    return true;
  },

  /**
   * Prepare tree data for rendering
   * @private
   */
  _prepareTreeData(guiInstance, treeList, tree1Index, tree2Index) {
    const treeOne = treeList[tree1Index];
    const treeTwo = treeList[tree2Index];

    const svgUp = guiInstance.svgUp;
    const svgDown = guiInstance.svgDown;

    // Clear previous content
    svgUp.innerHTML = '<g id="comparison-g-up"></g>';
    svgDown.innerHTML = '<g id="comparison-g-down"></g>';

    return { treeOne, treeTwo, svgUp, svgDown };
  },

  /**
   * Get highlighting data for trees
   * @private
   */
  _getHighlightData(tree1Index) {
    const colorIndex = Math.floor(tree1Index / 5);
    return window.gui?.toBeHighlighted
      ? window.gui.toBeHighlighted[colorIndex]
      : [];
  },

  /**
   * Render both trees in the comparison view
   * @private
   */
  async _renderTrees(
    drawTree,
    constructTree,
    treeOne,
    treeTwo,
    svgUp,
    svgDown,
    toBeHighlighted,
    guiInstance
  ) {
    // Prepare trees for drawing
    const treeUpward = constructTree(treeOne, false);
    const treeDownward = constructTree(treeTwo, false);

    try {
      if (typeof drawTree === "function") {
        this._renderWithDrawTreeFunction(
          drawTree,
          treeUpward,
          treeDownward,
          toBeHighlighted,
          guiInstance
        );
      } else {
        this._renderWithTreeDrawerClass(
          drawTree,
          treeUpward,
          treeDownward,
          toBeHighlighted,
          guiInstance
        );
      }
    } catch (importError) {
      this._renderFallbackText(importError, tree1Index, tree2Index);
    }
  },

  /**
   * Render trees using the drawTree function
   * @private
   */
  _renderWithDrawTreeFunction(
    drawTree,
    treeUpward,
    treeDownward,
    toBeHighlighted,
    guiInstance
  ) {
    drawTree(
      treeUpward,
      toBeHighlighted,
      0,
      guiInstance.leaveOrder,
      guiInstance.fontSize,
      guiInstance.strokeWidth,
      "comparison-g-up"
    );

    drawTree(
      treeDownward,
      toBeHighlighted,
      0,
      guiInstance.leaveOrder,
      guiInstance.fontSize,
      guiInstance.strokeWidth,
      "comparison-g-down"
    );
  },

  /**
   * Render trees using the TreeDrawer class
   * @private
   */
  _renderWithTreeDrawerClass(
    TreeDrawer,
    treeUpward,
    treeDownward,
    toBeHighlighted,
    guiInstance
  ) {
    // Create new instances or use static method depending on implementation
    const upTreeDrawer = new TreeDrawer();
    const downTreeDrawer = new TreeDrawer();

    // Check if it's an instance method or static method
    const drawMethod =
      upTreeDrawer.draw || upTreeDrawer.drawTree || TreeDrawer.drawTree;

    if (!drawMethod) {
      throw new Error("No drawing method found on TreeDrawer");
    }

    if (upTreeDrawer.draw) {
      this._drawWithInstanceMethod(
        "draw",
        upTreeDrawer,
        downTreeDrawer,
        treeUpward,
        treeDownward,
        toBeHighlighted,
        guiInstance
      );
    } else if (upTreeDrawer.drawTree) {
      this._drawWithInstanceMethod(
        "drawTree",
        upTreeDrawer,
        downTreeDrawer,
        treeUpward,
        treeDownward,
        toBeHighlighted,
        guiInstance
      );
    } else if (TreeDrawer.drawTree) {
      this._drawWithStaticMethod(
        TreeDrawer,
        treeUpward,
        treeDownward,
        toBeHighlighted,
        guiInstance
      );
    }
  },

  /**
   * Draw trees using an instance method
   * @private
   */
  _drawWithInstanceMethod(
    methodName,
    upDrawer,
    downDrawer,
    treeUpward,
    treeDownward,
    toBeHighlighted,
    guiInstance
  ) {
    upDrawer[methodName](
      treeUpward,
      toBeHighlighted,
      0,
      guiInstance.leaveOrder,
      guiInstance.fontSize,
      guiInstance.strokeWidth,
      "comparison-g-up"
    );

    downDrawer[methodName](
      treeDownward,
      toBeHighlighted,
      0,
      guiInstance.leaveOrder,
      guiInstance.fontSize,
      guiInstance.strokeWidth,
      "comparison-g-down"
    );
  },

  /**
   * Draw trees using a static method
   * @private
   */
  _drawWithStaticMethod(
    TreeDrawer,
    treeUpward,
    treeDownward,
    toBeHighlighted,
    guiInstance
  ) {
    TreeDrawer.drawTree(
      treeUpward,
      toBeHighlighted,
      0,
      guiInstance.leaveOrder,
      guiInstance.fontSize,
      guiInstance.strokeWidth,
      "comparison-g-up"
    );

    TreeDrawer.drawTree(
      treeDownward,
      toBeHighlighted,
      0,
      guiInstance.leaveOrder,
      guiInstance.fontSize,
      guiInstance.strokeWidth,
      "comparison-g-down"
    );
  },

  /**
   * Render fallback text when tree drawing fails
   * @private
   */
  _renderFallbackText(error, tree1Index, tree2Index) {
    console.error("Error using imported TreeDrawer:", error);
    document.getElementById(
      "comparison-g-up"
    ).innerHTML = `<text x="20" y="20" fill="white">Tree ${tree1Index}</text>`;
    document.getElementById(
      "comparison-g-down"
    ).innerHTML = `<text x="20" y="20" fill="white">Tree ${tree2Index}</text>`;
  },

  /**
   * Adjust SVG viewports to properly display trees
   * @private
   */
  _adjustSvgViewports(svgUp, svgDown) {
    setTimeout(() => {
      [svgUp, svgDown].forEach((svg) => {
        const group = svg.querySelector("g");
        if (group) {
          const bbox = group.getBBox();
          svg.setAttribute(
            "viewBox",
            `${bbox.x - 10} ${bbox.y - 10} ${bbox.width + 20} ${
              bbox.height + 20
            }`
          );
          svg.style.width = "100%";
          svg.style.height = "100%";
          svg.style.overflow = "visible";
        }
      });
    }, 100);
  },

  /**
   * Handle errors in tree rendering
   * @private
   */
  _handleTreeRenderingError(error) {
    console.error("Error drawing specific trees:", error);
    try {
      document.getElementById(
        "comparison-g-up"
      ).innerHTML = `<text x="20" y="20" fill="red">Error loading tree: ${error.message}</text>`;
      document.getElementById(
        "comparison-g-down"
      ).innerHTML = `<text x="20" y="20" fill="red">Error loading tree: ${error.message}</text>`;
    } catch (e) {
      console.error("Could not add error message to DOM:", e);
    }
  },
};

export { TreeSelectionService };