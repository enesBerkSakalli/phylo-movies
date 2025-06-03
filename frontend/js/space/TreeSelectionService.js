import { createSideBySideComparisonModal } from "../treeComparision/treeComparision.js";

/**
 * @module TreeSelectionService
 * Handles tree filtering, selection, and comparison functionality
 */

const TreeSelectionService = {
  /**
   * Filters a list of trees. Currently, if `sampleEveryFifthTree` is true, it samples
   * every 5th tree. Otherwise, it returns the original list.
   * @param {Array} treeList - Full list of trees.
   * @param {boolean} sampleEveryFifthTree - If true, samples every 5th tree.
   * @returns {Object} Object containing `filteredTreeList` and `treeIndices` (original indices).
   */
  filterTrees(treeList, sampleEveryFifthTree) {
    if (!sampleEveryFifthTree) {
      return {
        filteredTreeList: treeList,
        treeIndices: Array.from({ length: treeList.length }, (_, i) => i),
      };
    }

    const filteredTreeList = [];
    const treeIndices = [];

    for (let i = 0; i < treeList.length; i++) {
      if (i % 5 === 0) { // Current logic: "full tree" means every 5th tree.
        filteredTreeList.push(treeList[i]);
        treeIndices.push(i);
      }
    }

    console.log(
      `Sampling every 5th tree: ${filteredTreeList.length} of ${treeList.length} shown.`
    );

    return { filteredTreeList, treeIndices };
  },

  /**
   * Compare two trees in a modal window.
   * @param {number} tree1Index - Index of first tree to compare from the original treeList.
   * @param {number} tree2Index - Index of second tree to compare from the original treeList.
   * @param {Object} context - Context object.
   * @param {Array} context.treeList - The full list of trees.
   * @param {Object} context.comparisonModals - Object to store active comparison modals.
   * @param {Object} context.guiSettings - Object containing settings previously from `window.gui`.
   *   Expected properties: `leaveOrder`, `ignoreBranchLengths`, `fontSize`, `strokeWidth`, `toBeHighlighted`.
   */
  async compareTrees(tree1Index, tree2Index, { treeList, comparisonModals, guiSettings }) {
    const connectionId = `${tree1Index}-${tree2Index}`;

    // Note: The actual drawing (drawSpecificTrees) will be moved.
    // This function will now primarily manage modal creation and delegate drawing.
    // For now, we adjust the parameters for createSideBySideComparisonModal call.

    if (this._windowExists(comparisonModals, connectionId)) {
      return;
    }

    try {
      if (!this._isWinBoxAvailable()) {
        return;
      }

      // Create the comparison modal with full context, passing guiSettings
      const modal = await createSideBySideComparisonModal({ // This function itself will be updated later if it calls drawSpecificTrees
        tree1Index,
        tree2Index,
        treeList,
        // Pass settings from guiSettings object
        leaveOrder: guiSettings?.leaveOrder || [],
        ignoreBranchLengths: guiSettings?.ignoreBranchLengths || false,
        fontSize: guiSettings?.fontSize || 1.7, // Default from original code
        strokeWidth: guiSettings?.strokeWidth || 1, // Default from original code
        toBeHighlighted: guiSettings?.toBeHighlighted || [] // Default from original code
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
  // drawSpecificTrees and its helpers (_importTreeDrawer, _importTreeConstructor, etc.) are removed from here.
  // They are now expected to be in treeComparision.js.
  // The compareTrees function above now passes guiSettings to createSideBySideComparisonModal,
  // which in turn (after its own refactoring) will call the moved drawSpecificTrees.
};

export { TreeSelectionService };