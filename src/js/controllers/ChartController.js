import { useAppStore } from '../core/store.js';

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
    // Chart state - moved from GUI
    this.currentDistanceChartState = null;
    this.currentDistanceChart = null;
    this.lastChartType = null;
    this.gui = gui; // Keep gui reference for now
    this.navigationController = navigationController; // Keep navigationController reference for now

    useAppStore.subscribe(
      (state) => ({
        barOption: state.barOptionValue,
        index: state.currentTreeIndex,
        subscriptionPaused: state.subscriptionPaused // Track subscription state for debugging
      }),
      (current, previous) => {
        // Debug: Log subscription trigger

        // ChartController should continue updating during scrubbing
        // Charts need to stay synchronized regardless of GUI subscription state
        this.updateChart();
      }
    );
  }

  /**
   * Initialize or update the main line chart
   * This delegates to the existing lineChartManager system
   * @returns {Promise<void>}
   */
  async updateChart() {
    // Import dynamically to avoid circular dependencies
    const { renderOrUpdateLineChart } = await import('../charts/lineChartManager.js');
    const appStoreState = useAppStore.getState();

    // Debug: Confirm updateChart is called and #lineChart exists
    console.log('[ChartController] updateChart called, subscriptionPaused:', appStoreState.subscriptionPaused);
    const lineChartElem = document.getElementById('lineChart');
    if (!lineChartElem) {
      console.warn('[ChartController] #lineChart element not found in DOM when updateChart called');
    } else {
      console.log('[ChartController] #lineChart element found, proceeding with chart render');
    }

    const chartProps = appStoreState.getLineChartProps();
    if (!chartProps) return;

    // Initialize chart state if not exists
    if (!this.currentDistanceChartState) {
      this.currentDistanceChartState = { instance: null, type: null };
    }

    // Split chartProps into data, config, services
    const { barOptionValue, currentTreeIndex, robinsonFouldsDistances, weightedRobinsonFouldsDistances, scaleList, transitionResolver } = chartProps;
    const data = { robinsonFouldsDistances, weightedRobinsonFouldsDistances, scaleList };
    const config = { barOptionValue, currentTreeIndex };
    const services = { transitionResolver };

    // Debug logging
    console.log('[ChartController] Chart data:', {
      robinsonFouldsDistances: robinsonFouldsDistances?.length,
      weightedRobinsonFouldsDistances: weightedRobinsonFouldsDistances?.length,
      scaleList: scaleList?.length,
      barOptionValue,
      currentTreeIndex
    });

    this.currentDistanceChartState = renderOrUpdateLineChart({
      data,
      config,
      services,
      chartState: this.currentDistanceChartState,
      callbacks: this.navigationController.getChartNavigationCallbacks(), // Pass callbacks from navigationController
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
    const { stop, barOptionValue, currentTreeIndex, movieData, transitionResolver } = useAppStore.getState();
    // Stop playback if running
    if (useAppStore.getState().playing) {
      stop();
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
      barOptionValue: barOptionValue,
      currentTreeIndex: currentTreeIndex,
      robinsonFouldsDistances: movieData.rfd_list,
      weightedRobinsonFouldsDistances: movieData.wrfd_list,
      scaleList: movieData.scaleList,
      transitionResolver: transitionResolver,
      onGoToFullTreeDataIndex: this.navigationController.getChartNavigationCallbacks().onGoToFullTreeDataIndex, // Use navigationController's callback
      onGoToPosition: this.navigationController.getChartNavigationCallbacks().onGoToPosition // Use navigationController's callback
    });
  }

  /**
   * Set the chart type (bar option value)
   * @param {string} value - The chart type ('rfd', 'w-rfd', 'scale')
   */
  setBarOptionValue(value) {
    useAppStore.getState().setBarOption(value);
  }

  /**
   * Get the current chart type
   * @returns {string} The current bar option value
   */
  getBarOptionValue() {
    return useAppStore.getState().barOptionValue;
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
    const { transitionResolver, movieData } = useAppStore.getState();
    return !!(transitionResolver &&
      movieData?.rfd_list &&
      movieData?.wrfd_list &&
      movieData?.scaleList);
  }

  /**
   * Handle chart resize events
   */
  handleResize() {
    // If there's a current chart, it will be updated in the next update cycle
    // The existing chart system handles responsive sizing
  }
}
