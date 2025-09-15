import { useAppStore } from '../core/store.js';
import { renderOrUpdateLineChart } from '../charts/lineChartManager.js';
import { openModalChart } from '../charts/windowChartManager.js';

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
    console.log('ChartController: constructor called');
    // Chart state - moved from GUI
    this.currentDistanceChartState = null;
    this.currentDistanceChart = null;
    this.lastChartType = null;
    this.gui = gui; // Keep gui reference for now
    this.navigationController = navigationController; // Keep navigationController reference for now

    // Subscribe to chart type changes (full re-render needed)
    useAppStore.subscribe(
      (state) => state.barOptionValue,
      (barOption) => {
        this.updateChart();
      }
    );

    // Subscribe to position changes (just update indicator)
    // This setup correctly listens for changes to a specific part of the state.
    useAppStore.subscribe(
      (state) => state.currentTreeIndex,
      (currentTreeIndex, previousTreeIndex) => {
        if (currentTreeIndex !== previousTreeIndex) {
          console.log('*** TIMELINE MOVED: currentTreeIndex =', currentTreeIndex);
          try {
            this.updateIndicatorPosition(currentTreeIndex);
          } catch (error) {
            console.error('ChartController: Error in updateIndicatorPosition:', error);
          }
        }
      }
    );

    // Render initial chart once after construction
    console.log('ChartController: Scheduling initial chart update');
    setTimeout(() => this.updateChart(), 0);
  }

  /**
   * Initialize or update the main line chart
   * This delegates to the existing lineChartManager system
   * @returns {Promise<void>}
   */
  async updateChart() {

    const appStoreState = useAppStore.getState();

    const chartProps = appStoreState.getLineChartProps();

    this.currentDistanceChartState = this.currentDistanceChartState || { instance: null, type: null };


    // Split chartProps into data, config, services
    const { barOptionValue, currentTreeIndex, robinsonFouldsDistances, weightedRobinsonFouldsDistances, scaleList, transitionResolver } = chartProps;
    const data = { robinsonFouldsDistances, weightedRobinsonFouldsDistances, scaleList };

    // THE FIX: Do NOT convert the index here. The lineChartManager is responsible
    // for handling the index conversion based on the specific chart type.
    // We must pass the raw, unconverted currentTreeIndex.
    const config = {
      barOptionValue,
      currentTreeIndex: currentTreeIndex, // Pass the raw index
    };
    const services = { transitionResolver };

    // Destroy the old chart instance if it exists to prevent memory leaks
    if (this.currentDistanceChartState.instance && this.currentDistanceChartState.instance.destroy) {
        this.currentDistanceChartState.instance.destroy();
    }

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

    console.log('ChartController: Chart updated, currentDistanceChart is:', this.currentDistanceChart);
    console.log('ChartController: Chart has updatePosition method:', !!this.currentDistanceChart?.updatePosition);

    // Initialize indicator at current position after chart creation
    const currentIndex = useAppStore.getState().currentTreeIndex;
    this.updateIndicatorPosition(currentIndex);
  }

  /**
   * Update only the chart indicator position (no full re-render)
   * @param {number} currentTreeIndex - The new tree index
   */
  updateIndicatorPosition(currentTreeIndex) {
    // THE FIX: Always get the chart instance from the state object,
    // which is guaranteed to be the most current one.
    const chart = this.currentDistanceChartState?.instance;

    console.log('ChartController: updateIndicatorPosition called', {
      currentTreeIndex,
      hasChart: !!chart,
      hasUpdateMethod: !!chart?.updatePosition,
    });

    if (!chart) {
      console.warn('ChartController: No current distance chart state instance');
      return;
    }

    if (!chart.updatePosition) {
      console.warn('ChartController: Chart has no updatePosition method');
      return;
    }

    console.log('ChartController: Calling chart.updatePosition with currentTreeIndex:', currentTreeIndex);
    chart.updatePosition(currentTreeIndex);
    console.log('ChartController: chart.updatePosition completed');
  }

  /**
   * Display the current chart in a modal window
   * This delegates to the existing windowChartManager system
   */
  async displayCurrentChartInModal() {
    const { stop, barOptionValue, currentTreeIndex, movieData, transitionResolver } = useAppStore.getState();
    stop();

    // THE FIX: Also remove the incorrect conversion here for consistency.
    // The modal chart rendering logic should also handle its own index resolution.
    openModalChart({
      barOptionValue,
      currentTreeIndex: currentTreeIndex, // Pass the raw index
      robinsonFouldsDistances: movieData.distances.robinson_foulds,
      weightedRobinsonFouldsDistances: movieData.distances.weighted_robinson_foulds,
      scaleList: movieData.scaleList,
      transitionResolver,
      onGoToFullTreeDataIndex: this.navigationController.getChartNavigationCallbacks().onGoToFullTreeDataIndex,
      onGoToPosition: this.navigationController.getChartNavigationCallbacks().onGoToPosition
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

  isChartDataReady() {
    return useAppStore.getState().movieData !== null;
  }

  handleResize() {
  }

}
