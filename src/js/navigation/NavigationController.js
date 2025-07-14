import { useAppStore } from '../store.js'; // <-- IMPORT THE STORE

/**
 * NavigationController - Manages all tree navigation logic, state, and race condition prevention.
 * 
 * This class implements the Facade pattern to provide a simplified interface to the navigation
 * system, while using the Strategy pattern internally to execute different navigation commands.
 * 
 * Key responsibilities:
 * - Prevent race conditions during navigation using the isNavigating lock
 * - Orchestrate execution of navigation commands
 * - Provide error handling and logging for navigation operations
 * - Maintain separation of concerns between GUI rendering and navigation logic
 * - Manage chart-navigation integration and sticky position state
 */
export class NavigationController {
  constructor() {
    this.isNavigating = false;
  }

  /**
   * Executes a navigation command, ensuring only one navigation action runs at a time.
   * This method implements the core race condition prevention logic.
   * 
   * @param {Object} command - An object with an `execute` method that performs the navigation logic.
   * @returns {Promise<void>}
   */
  async execute(command) {
    if (this.isNavigating) {
      console.log("[NavigationController] Navigation locked, ignoring request.");
      return;
    }
    
    this.isNavigating = true;

    try {
      await command.execute();
    } catch (error) {
      console.error("[NavigationController] Error during navigation execution:", error);
      throw error;
    } finally {
      this.isNavigating = false;
    }
  }
  isLocked() {
    return this.isNavigating;
  }

  /**
   * Emergency method to unlock navigation if something goes wrong
   * Should only be used in exceptional circumstances
   */
  forceUnlock() {
    console.warn("[NavigationController] Force unlocking navigation - this should only be used in emergencies");
    this.isNavigating = false;
  }

  /**
   * Clear the sticky chart position (called during most navigation operations)
   */
  clearStickyPosition() {
    useAppStore.getState().clearStickyChartPosition();
  }

  /**
   * Set the sticky chart position (called when clicking on chart data points)
   * @param {number} position - The position index to remember
   */
  setStickyPosition(position) {
    useAppStore.getState().setStickyChartPosition(position);
  }

  /**
   * Get the sticky chart position if available
   * @returns {number|undefined} The last clicked distance position
   */
  getStickyPosition() {
    return useAppStore.getState().stickyChartPosition;
  }

  /**
   * Get the appropriate tree index for chart display based on chart type
   * @param {string} chartType - The type of chart ('scale', 'rfd', 'w-rfd')
   * @returns {number} The appropriate index for the chart
   */
  getChartTreeIndex(chartType) {
    const { currentTreeIndex, transitionResolver } = useAppStore.getState();
    if (chartType === "scale") {
      return currentTreeIndex; // sequence index for scale charts
    } else {
      // transition index for RFD/W-RFD charts
      return transitionResolver ? 
        transitionResolver.getDistanceIndex(currentTreeIndex) : 
        currentTreeIndex;
    }
  }

  /**
   * Generate navigation callbacks for chart interaction
   * @returns {Object} Object containing callback functions for chart events
   */
  getChartNavigationCallbacks() {
    return {
      onGoToPosition: async (idx) => {
        const { goToPosition } = useAppStore.getState(); // Get action from store
        goToPosition(idx); // Dispatch action
      },
      onHandleDrag: async (idx) => {
        const { goToPosition } = useAppStore.getState(); // Get action from store
        goToPosition(idx); // Dispatch action
      },
      onGoToFullTreeDataIndex: async (idx) => {
        const { setStickyChartPosition, goToPosition } = useAppStore.getState(); // Get actions from store
        setStickyChartPosition(idx); // Dispatch action
        goToPosition(idx); // Dispatch action
      }
    };
  }
}