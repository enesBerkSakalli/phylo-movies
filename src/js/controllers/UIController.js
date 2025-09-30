import { getCurrentScaleValue, formatScaleValue } from "../utils/scaleUtils.js";
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
      // Removed: window chip handling; managed by MovieTimelineManager only
      currentScaleText: document.getElementById("currentScaleText"),
      maxScaleText: document.getElementById("maxScaleText"),
      // Use the Material Web linear progress element defined in the partial
      scaleProgress: document.getElementById("scale-progress"),
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
    const { movieData } = useAppStore.getState();

    const maxScale = movieData.maxScale; // Assuming maxScale is part of movieData or calculated and stored
    const scaleList = movieData.scaleList; // Assuming scaleList is part of movieData or calculated and stored
    // transitionResolver not required here; using centralized mappings

    // Remove tree counter updates since elements are deleted
    // Tree position and type information now handled by MovieTimelineManager

    // Get distance index directly using TransitionIndexResolver
    const { currentTreeIndex, transitionResolver } = useAppStore.getState();
    const transitionDistanceIdx = transitionResolver.getSourceTreeIndex(currentTreeIndex);

    // MSA window chip is updated centrally by MovieTimelineManager only.

    // Update scale using the same transition distance index
    const currentScale = getCurrentScaleValue(scaleList, transitionDistanceIdx);

    if (this.elements.currentScaleText) {
      this.elements.currentScaleText.innerText = formatScaleValue(currentScale);
    }
    if (this.elements.maxScaleText) {
      this.elements.maxScaleText.innerText = formatScaleValue(maxScale);
    }

    // Update the Material linear progress (expects a value in [0, 1])
    if (this.elements.scaleProgress) {
      const progress = maxScale > 0 ? Math.max(0, Math.min(1, currentScale / maxScale)) : 0;
      try {
        this.elements.scaleProgress.value = progress;
      } catch {}
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
