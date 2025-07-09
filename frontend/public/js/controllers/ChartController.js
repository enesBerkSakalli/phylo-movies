/**
 * ChartController - Manages chart-related functionality and state for the GUI
 *
 * This controller acts as a facade over the existing chart rendering system,
 * providing a clean interface while respecting the current architecture.
 * It works with:
 * - lineChartManager.js for main chart rendering
 * - windowChartManager.js for modal charts
 * - chartGenerator.js for low-level rendering
 *
 * Key responsibilities:
 * - Chart state management
 * - Coordination between navigation and charts
 * - Chart type switching
 * - Modal chart display
 */
export class ChartController {
  /**
   * @param {Gui} gui - The main GUI instance
   * @param {NavigationController} navigationController - The navigation controller instance
   */
  constructor(gui, navigationController) {
    this.gui = gui;
    this.navigationController = navigationController;

    // Chart state - moved from GUI
    this.currentDistanceChartState = null;
    this.currentDistanceChart = null;
    this.lastChartType = null;
  }

  /**
   * Initialize or update the main line chart
   * This delegates to the existing lineChartManager system
   * @returns {Promise<void>}
   */
  async updateChart() {
    // Import dynamically to avoid circular dependencies
    const { renderOrUpdateLineChart } = await import('../charts/lineChartManager.js');

    // Debug: Confirm updateChart is called and #lineChart exists
    console.log('[ChartController] updateChart called');
    const lineChartElem = document.getElementById('lineChart');
    if (!lineChartElem) {
      console.warn('[ChartController] #lineChart element not found in DOM when updateChart called');
    } else {
      console.log('[ChartController] #lineChart element found, proceeding with chart render');
    }

    // Get the appropriate tree index based on chart type
    const chartTreeIndex = this.navigationController.getChartTreeIndex(this.gui.barOptionValue);

    // Initialize chart state if not exists
    if (!this.currentDistanceChartState) {
      this.currentDistanceChartState = { instance: null, type: null };
    }

    // Render or update the chart using existing lineChartManager
    this.currentDistanceChartState = renderOrUpdateLineChart({
      data: {
        robinsonFouldsDistances: this.gui.robinsonFouldsDistances,
        weightedRobinsonFouldsDistances: this.gui.weightedRobinsonFouldsDistances,
        scaleList: this.gui.scaleList,
      },
      config: {
        barOptionValue: this.gui.barOptionValue,
        currentTreeIndex: chartTreeIndex,
        stickyChartPositionIfAvailable: this.navigationController.getStickyPosition(),
      },
      services: {
        transitionResolver: this.gui.transitionResolver,
      },
      chartState: this.currentDistanceChartState,
      callbacks: this.navigationController.getChartNavigationCallbacks(),
      containerId: "lineChart",
    });

    // Update references
    this.currentDistanceChart = this.currentDistanceChartState.instance;
    this.lastChartType = this.currentDistanceChartState.type;
  }

  /**
   * Display the current chart in a modal window
   * This delegates to the existing windowChartManager system
   */
  async displayCurrentChartInModal() {
    // Stop playback if running
    if (this.gui.playing) {
      this.gui.stop();
    }

    // Validate data availability
    if (!this.isChartDataReady()) {
      console.warn("[ChartController] Data not ready for modal chart.");
      return;
    }

    // Import dynamically to avoid circular dependencies
    const { openModalChart } = await import('../charts/windowChartManager.js');

    // Open modal chart with current configuration
    openModalChart({
      barOptionValue: this.gui.barOptionValue,
      currentTreeIndex: this.gui.currentTreeIndex,
      robinsonFouldsDistances: this.gui.robinsonFouldsDistances,
      weightedRobinsonFouldsDistances: this.gui.weightedRobinsonFouldsDistances,
      scaleList: this.gui.scaleList,
      transitionResolver: this.gui.transitionResolver,
      onGoToFullTreeDataIndex: this.gui.goToFullTreeDataIndex?.bind(this.gui),
      onGoToPosition: this.gui.goToPosition?.bind(this.gui)
    });
  }

  /**
   * Set the chart type (bar option value)
   * @param {string} value - The chart type ('rfd', 'w-rfd', 'scale')
   */
  setBarOptionValue(value) {
    this.gui.barOptionValue = value;
  }

  /**
   * Get the current chart type
   * @returns {string} The current bar option value
   */
  getBarOptionValue() {
    return this.gui.barOptionValue;
  }

  /**
   * Get the current chart instance
   * @returns {Object|null} The current chart instance
   */
  getCurrentChart() {
    return this.currentDistanceChart;
  }

  /**
   * Get the current chart state
   * @returns {Object|null} The current chart state
   */
  getChartState() {
    return this.currentDistanceChartState;
  }

  /**
   * Reset chart state (useful when loading new data)
   */
  resetChartState() {
    this.currentDistanceChartState = null;
    this.currentDistanceChart = null;
    this.lastChartType = null;
  }

  /**
   * Check if chart is ready for display
   * @returns {boolean} True if all required data is available
   */
  isChartDataReady() {
    return !!(this.gui.transitionResolver &&
              this.gui.robinsonFouldsDistances &&
              this.gui.weightedRobinsonFouldsDistances &&
              this.gui.scaleList);
  }

  /**
   * Handle chart resize events
   */
  handleResize() {
    // If there's a current chart, it will be updated in the next update cycle
    // The existing chart system handles responsive sizing
  }
}
