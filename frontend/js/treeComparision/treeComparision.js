import * as d3 from "d3";
import { TreeRenderer } from "./TreeRenderer.js";
import { ComparisonModal } from "./ComparisonModal.js";

/**
 * Main tree comparison manager - now simplified and focused
 */
class TreeComparisonManager {
  constructor() {
    this.renderer = new TreeRenderer();
    this.modal = new ComparisonModal();
  }

  async createSideBySideComparison(options) {
    const {
      treeList,
      tree1Index,
      tree2Index,
      leaveOrder = [],
      ignoreBranchLengths = false,
      fontSize = 1.7,
      strokeWidth = 1,
      toBeHighlighted = [],
    } = options;


    // Pass all options, including specific guiSettings properties, to createSideBySideModal
    const modalInstance = await this.modal.createSideBySideModal(options);

    console.log('[CompareDebug] modalInstance:', modalInstance);
    console.log('[CompareDebug] modalInstance.svgUp:', modalInstance?.svgUp);
    console.log('[CompareDebug] modalInstance.svgDown:', modalInstance?.svgDown);

    if (modalInstance && modalInstance.svgUp && modalInstance.svgDown) {
        // Construct guiSettings from the destructured options or directly from options.guiSettings if that was the structure
        const guiSettingsForDraw = {
            leaveOrder: options.leaveOrder,
            ignoreBranchLengths: options.ignoreBranchLengths,
            fontSize: options.fontSize,
            strokeWidth: options.strokeWidth,
            toBeHighlighted: options.toBeHighlighted
        };

        drawSpecificTrees(
            { svgUp: modalInstance.svgUp, svgDown: modalInstance.svgDown },
            tree1Index,
            tree2Index,
            treeList,
            guiSettingsForDraw
        );
    } else {
        console.error("[CompareDebug] Modal SVGs (svgUp or svgDown) not found on modalInstance. Cannot draw trees.");
    }
    return modalInstance;
  }
  /**
   * Render single tree with all parameters and ensure proper centering
   */
  async renderTree(treeData, svgId, options = {}) {
    return await this.renderer.renderTree(treeData, svgId, options);
  }

  /**
   * Generate unique SVG ID
   */
  generateSvgId(prefix) {
    return this.renderer.generateSvgId(prefix);
  }

  /**
   * Create SVG container with proper centering setup
   */
  createSvgContainer(id, parentElement) {
    return this.renderer.createSvgContainer(id, parentElement);
  }

  /**
   * Center tree after rendering - delegates to TreeRenderer
   */
  centerTree(svgId) {
    return this.renderer.centerTree(svgId);
  }
}

// Create singleton instance
const treeComparisonManager = new TreeComparisonManager();

// Public API - clean and focused
export async function createSideBySideComparisonModal(options) {
  // options now includes guiSettings implicitly if passed by the caller
  return await treeComparisonManager.createSideBySideComparison(options);
}

// --- drawSpecificTrees and its helpers (moved from TreeSelectionService.js) ---

// Helper to handle errors consistently within the drawing logic
function _handleErrorDrawing(message, error) {
  console.error(message, error);
  // Avoid alert if possible, or make it conditional
  // alert(`${message.replace(":", "")} - ${error.message}`);
}

// Helper to handle tree rendering errors specifically for SVG fallbacks
function _handleTreeRenderingErrorDrawing(error, svgUpId = "comparison-g-up", svgDownId = "comparison-g-down") {
  console.error("Error drawing specific trees:", error);
  try {
    const svgUp = document.getElementById(svgUpId);
    const svgDown = document.getElementById(svgDownId);
    if (svgUp) svgUp.innerHTML = `<text x="20" y="20" fill="red">Error loading tree: ${error.message}</text>`;
    if (svgDown) svgDown.innerHTML = `<text x="20" y="20" fill="red">Error loading tree: ${error.message}</text>`;
  } catch (e) {
    console.error("Could not add error message to DOM:", e);
  }
}


async function _importTreeDrawer() {
  const module = await import("../treeVisualisation/TreeDrawer.js");
  return {
    TreeDrawer: module.TreeDrawer || module.default,
    default: module.default,
  };
}

async function _importTreeConstructor() {
  return (await import("../treeVisualisation/TreeConstructor.js")).default;
}

function _validateTreeDrawingInputs(guiInstance, treeList, tree1Index, tree2Index) {
  if (!treeList || !treeList[tree1Index] || !treeList[tree2Index]) {
    console.error("Tree data or indices are invalid for drawing.");
    return false;
  }
  // guiInstance here refers to the modal's content area or specific SVG elements
  if (!guiInstance?.svgUp || !guiInstance?.svgDown) {
    _handleErrorDrawing("SVG elements for comparison not found in guiInstance", new Error("Missing SVG elements"));
    return false;
  }
  return true;
}

function _prepareTreeData(guiInstance, treeList, tree1Index, tree2Index) {
  const treeOne = treeList[tree1Index];
  const treeTwo = treeList[tree2Index];

  const svgUp = guiInstance.svgUp;
  const svgDown = guiInstance.svgDown;

  svgUp.innerHTML = '<g id="comparison-g-up"></g>';
  svgDown.innerHTML = '<g id="comparison-g-down"></g>';

  return { treeOne, treeTwo, svgUp, svgDown };
}

function _getHighlightData(tree1OriginalIndex, guiSettings) {
  // Uses tree1OriginalIndex to find the corresponding highlight data
  // Assumes guiSettings.toBeHighlighted is an array or object mapping.
  // The original logic `Math.floor(tree1Index / 5)` was tied to the "every 5th tree" sampling.
  // This might need to be more robust if toBeHighlighted is structured differently.
  // For now, if it's an array, we'll assume it's indexed corresponding to original tree indices.
  if (guiSettings?.toBeHighlighted && Array.isArray(guiSettings.toBeHighlighted)) {
    return guiSettings.toBeHighlighted[tree1OriginalIndex] || [];
  }
  return [];
}

async function _renderTrees(
  drawTreeFnOrClass, // This is the resolved import (TreeDrawer class or drawTree function)
  constructTree,
  treeOneData,
  treeTwoData,
  svgUpElement,
  svgDownElement,
  highlightData, //toBeHighlighted (for treeOne, assuming symmetry or specific logic)
  guiSettings // Contains leaveOrder, fontSize, strokeWidth
) {
  const treeUpward = constructTree(treeOneData, false);
  const treeDownward = constructTree(treeTwoData, false);

  const renderOptions = {
    leaveOrder: guiSettings.leaveOrder,
    fontSize: guiSettings.fontSize,
    strokeWidth: guiSettings.strokeWidth,
    ignoreBranchLengths: guiSettings.ignoreBranchLengths // Added this
  };

  try {
    if (typeof drawTreeFnOrClass === "function") {
      // Case 1: drawTree is a standalone function
      drawTreeFnOrClass(treeUpward, highlightData, 0, renderOptions.leaveOrder, renderOptions.fontSize, renderOptions.strokeWidth, "comparison-g-up", renderOptions.ignoreBranchLengths);
      drawTreeFnOrClass(treeDownward, highlightData, 0, renderOptions.leaveOrder, renderOptions.fontSize, renderOptions.strokeWidth, "comparison-g-down", renderOptions.ignoreBranchLengths);
    } else { // Case 2: drawTree is a class (TreeDrawer)
      const TreeDrawerClass = drawTreeFnOrClass;
      const upTreeDrawer = new TreeDrawerClass();
      const downTreeDrawer = new TreeDrawerClass();

      // Attempt to find the correct drawing method on the instance or class
      const drawMethodName = upTreeDrawer.draw ? "draw" : (upTreeDrawer.drawTree ? "drawTree" : null);
      const staticDrawMethodName = TreeDrawerClass.drawTree ? "drawTree" : null;

      if (drawMethodName) {
        upTreeDrawer[drawMethodName](treeUpward, highlightData, 0, renderOptions.leaveOrder, renderOptions.fontSize, renderOptions.strokeWidth, "comparison-g-up", renderOptions.ignoreBranchLengths);
        downTreeDrawer[drawMethodName](treeDownward, highlightData, 0, renderOptions.leaveOrder, renderOptions.fontSize, renderOptions.strokeWidth, "comparison-g-down", renderOptions.ignoreBranchLengths);
      } else if (staticDrawMethodName) {
        TreeDrawerClass[staticDrawMethodName](treeUpward, highlightData, 0, renderOptions.leaveOrder, renderOptions.fontSize, renderOptions.strokeWidth, "comparison-g-up", renderOptions.ignoreBranchLengths);
        TreeDrawerClass[staticDrawMethodName](treeDownward, highlightData, 0, renderOptions.leaveOrder, renderOptions.fontSize, renderOptions.strokeWidth, "comparison-g-down", renderOptions.ignoreBranchLengths);
      } else {
        throw new Error("No compatible drawing method found on TreeDrawer class/instance.");
      }
    }
  } catch (error) {
    _handleErrorDrawing("Error during tree rendering dispatch", error);
    // Fallback text is handled by _handleTreeRenderingErrorDrawing called by the public drawSpecificTrees
    throw error; // Re-throw to be caught by drawSpecificTrees
  }
}

function _adjustSvgViewports(svgUp, svgDown) {
  setTimeout(() => {
    [svgUp, svgDown].forEach((svg) => {
      const group = svg.querySelector("g");
      if (group) {
        const bbox = group.getBBox();
        svg.setAttribute(
          "viewBox",
          `${bbox.x - 10} ${bbox.y - 10} ${bbox.width + 20} ${bbox.height + 20}`
        );
        svg.style.width = "100%";
        svg.style.height = "100%";
        svg.style.overflow = "visible";
      }
    });
  }, 100); // Delay to allow DOM to update
}

/**
 * Draws two specified trees into provided SVG elements within a GUI context (e.g., a modal).
 * It handles fetching tree drawing utilities, preparing data, rendering, and adjusting viewports.
 *
 * @param {Object} guiInstance - An object representing the UI context, expected to have `svgUp` and `svgDown` HTMLElement properties.
 * @param {number} tree1Index - The original index of the first tree in `treeList`.
 * @param {number} tree2Index - The original index of the second tree in `treeList`.
 * @param {Array} treeList - The full list of tree data objects.
 * @param {Object} guiSettings - An object containing settings for drawing:
 *   - `leaveOrder` (Array): Order of leaves for the tree.
 *   - `fontSize` (number): Font size for labels.
 *   - `strokeWidth` (number): Stroke width for branches.
 *   - `toBeHighlighted` (Array): Data for highlighting specific nodes/branches.
 *   - `ignoreBranchLengths` (boolean): Whether to ignore branch lengths.
 */
export async function drawSpecificTrees(guiInstance, tree1Index, tree2Index, treeList, guiSettings) {
  console.log('[CompareDebug] drawSpecificTrees called with:', { guiInstance, tree1Index, tree2Index, treeListLength: treeList?.length, guiSettings });
  try {
    const { TreeDrawer: drawerModule, default: drawTreeFunction } = await _importTreeDrawer();
    const constructTree = await _importTreeConstructor();

    console.log('[CompareDebug] drawTreeResource (imported TreeDrawer):', drawerModule || drawTreeFunction);
    console.log('[CompareDebug] treeConstructorResource (imported TreeConstructor):', constructTree);

    if (!guiSettings) {
        _handleErrorDrawing("[CompareDebug] guiSettings are undefined in drawSpecificTrees", new Error("Missing guiSettings"));
        return;
    }

    if (!_validateTreeDrawingInputs(guiInstance, treeList, tree1Index, tree2Index)) {
      console.error("[CompareDebug] Validation of tree drawing inputs failed.");
      return;
    }

    const { treeOne, treeTwo, svgUp, svgDown } = _prepareTreeData(
      guiInstance, treeList, tree1Index, tree2Index
    );

    console.log('[CompareDebug] treeOne:', treeOne, 'treeTwo:', treeTwo);
    if (!treeOne) console.error("[CompareDebug] treeOne data is null/undefined after _prepareTreeData.");
    if (!treeTwo) console.error("[CompareDebug] treeTwo data is null/undefined after _prepareTreeData.");

    const highlightDataForTreeOne = _getHighlightData(tree1Index, guiSettings);
    // Assuming same highlight data for treeTwo for now, or it needs its own.
    // const highlightDataForTreeTwo = _getHighlightData(tree2Index, guiSettings);


    // Determine if TreeDrawer is a class or the default export is the function
    const drawTreeResource = drawerModule || drawTreeFunction; // This is the actual resource to be used for drawing

    console.log('[CompareDebug] Attempting to find drawing method for drawTreeResource.');
    await _renderTrees(
      drawTreeResource,
      constructTree,
      treeOne,
      treeTwo,
      svgUp,
      svgDown,
      highlightDataForTreeOne,
      guiSettings
    );

    _adjustSvgViewports(svgUp, svgDown);
  } catch (error) {
    console.error("[CompareDebug] Error in drawSpecificTrees main try-catch:", error);
    _handleTreeRenderingErrorDrawing(error, guiInstance.svgUp?.id, guiInstance.svgDown?.id);
  }
}
// --- End of moved functions ---


export async function renderTreeInContainer(treeData, svgId, options = {}) {
  return await treeComparisonManager.renderTree(treeData, svgId, options);
}

export function generateSvgId(prefix) {
  return treeComparisonManager.generateSvgId(prefix);
}

export function createSvgContainer(id, parentElement) {
  return treeComparisonManager.createSvgContainer(id, parentElement);
}

// Legacy compatibility functions (deprecated)
export async function createComparisonContent(gui) {
  console.warn(
    "createComparisonContent is deprecated, use createSideBySideComparisonModal instead"
  );
  return document.createElement("div");
}

export async function createInterpolationModal(options) {
  console.warn(
    "createInterpolationModal will be implemented in ComparisonModal"
  );
  return null;
}

