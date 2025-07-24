import { calculateWindow } from "../utils/windowUtils.js";
import { getCurrentScaleValue, calculateScalePercentage, formatScaleValue } from "../utils/scaleUtils.js";
import { useAppStore } from '../core/store.js'; // Import useAppStore

/**
 * Manages all updates to the informational UI elements (labels, counters, progress bars).
 * This controller isolates DOM manipulation and caches DOM elements for performance.
 */
export class UIController {
  /**
   * @param {Gui} gui - The main GUI instance to source data from.
   */
  constructor(gui) {
    this.gui = gui; // Keep gui reference for now, but state is from store

    // Cache all DOM element references for performance
    this.elements = {
      // Removed: currentTree, numberOfTrees, treeLabel (now handled by MovieTimelineManager)
      windowArea: document.getElementById("windowArea"),
      currentScaleText: document.getElementById("currentScaleText"),
      maxScaleText: document.getElementById("maxScaleText"),
      scaleProgressBar: document.querySelector(".scale-progress-bar"),
      // maxScaleElement: Element with ID "maxScale" doesn't exist, using maxScaleText instead
    };

    // Log any missing elements for debugging
    Object.entries(this.elements).forEach(([key, element]) => {
      if (!element) {
        console.warn(`[UIController] Element not found: ${key}`);
      }
    });
  }

  /**
   * Updates all controlled UI elements with the latest data from the Gui instance.
   */
  update() {
    const { currentTreeIndex, movieData, transitionResolver, msaStepSize, msaWindowSize } = useAppStore.getState();

    const maxScale = movieData.maxScale; // Assuming maxScale is part of movieData or calculated and stored
    const scaleList = movieData.scaleList; // Assuming scaleList is part of movieData or calculated and stored
    const numberOfFullTrees = movieData.fullTreeIndices ? movieData.fullTreeIndices.length : 0; // Assuming fullTreeIndices is part of movieData

    if (!transitionResolver) {
      console.warn("[UIController] TransitionResolver not available, skipping update");
      return;
    }

    // Remove tree counter updates since elements are deleted
    // Tree position and type information now handled by MovieTimelineManager

    // Get transition distance index for both MSA and scale calculations
    const transitionDistanceIdx = transitionResolver.getDistanceIndex(currentTreeIndex);

    // Update MSA window information
    if (transitionDistanceIdx >= 0 && numberOfFullTrees > 0) {
      const window = calculateWindow(transitionDistanceIdx, msaStepSize, msaWindowSize, numberOfFullTrees);

      // Determine tree type for better user context
      const isFullTree = transitionResolver.isFullTree(currentTreeIndex);
      const isConsensusTree = transitionResolver.isConsensusTree(currentTreeIndex);

      let windowDisplay = `${window.startPosition} - ${window.endPosition}`;
      let treeTypeIndicator = "";

      if (isFullTree) {
        treeTypeIndicator = " (F)"; // Full tree indicator
      } else if (isConsensusTree) {
        treeTypeIndicator = " (C)"; // Consensus tree indicator
      } else {
        treeTypeIndicator = " (I)"; // Interpolated tree indicator
      }

      if (this.elements.windowArea) {
        this.elements.windowArea.innerText = windowDisplay + treeTypeIndicator;
      }
    } else {
      if (this.elements.windowArea) {
        this.elements.windowArea.innerText = "No MSA data";
      }
    }

    // Update scale using the same transition distance index
    const currentScale = getCurrentScaleValue(scaleList, transitionDistanceIdx);

    if (this.elements.currentScaleText) {
      this.elements.currentScaleText.innerText = formatScaleValue(currentScale);
    }
    if (this.elements.maxScaleText) {
      this.elements.maxScaleText.innerText = formatScaleValue(maxScale);
    }

    // Update scale progress bar (vertical orientation)
    if (this.elements.scaleProgressBar) {
      const percent = calculateScalePercentage(currentScale, maxScale);
      this.elements.scaleProgressBar.style.height = `${percent}%`;
    }

    // Legacy scale display code removed - using scaleProgressBar only
  }

  /**
   * Clean up resources when the controller is destroyed
   */
  destroy() {
    // Clear cached element references
    this.elements = {};
    this.gui = null;
  }
}
