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
    // Chart state - moved from GUI
    this.currentDistanceChartState = null;
    this.currentDistanceChart = null;
    this.lastChartType = null;
    this.gui = gui; // Keep gui reference for now
    this.navigationController = navigationController; // Keep navigationController reference for now
    this.barOptionHandler = null; // Store handler reference for proper cleanup

    // Subscribe only to relevant changes (chart type or index)
    useAppStore.subscribe(
      (state) => ({
        barOption: state.barOptionValue,
        index: state.currentTreeIndex
      }),
      (currentState) => {
        console.log('[ChartController] Store subscription triggered - barOption:', currentState.barOption, 'index:', currentState.index);
        this.updateChart();
      },
      {
        equalityFn: (a, b) => {
          const isEqual = a.barOption === b.barOption && a.index === b.index;
          if (!isEqual) {
            console.log('[ChartController] State changed - old:', a, 'new:', b);
          }
          return isEqual;
        }
      }
    );

    // Ensure UI reflects available datasets (disable options lacking data)
    this.ensureBarOptionsAvailability();

    // Bind direct listeners to the select as a fallback for shadow-DOM quirks
    // Delay to ensure Material Design component is fully initialized
    setTimeout(() => {
      this.bindBarOptionSelectListeners();
    }, 100);

    // Render initial chart once after construction
    setTimeout(() => this.updateChart(), 0);
  }

  /**
   * Initialize or update the main line chart
   * This delegates to the existing lineChartManager system
   * @returns {Promise<void>}
   */
  async updateChart() {
    console.log('[ChartController] updateChart called');
    
    const appStoreState = useAppStore.getState();
    const lineChartElem = document.getElementById('lineChart');
    if (!lineChartElem) {
      console.warn('[ChartController] lineChart element not found');
      return;
    }

    const chartProps = appStoreState.getLineChartProps();
    if (!chartProps) {
      console.warn('[ChartController] No chart props available');
      return;
    }
    
    console.log('[ChartController] Updating chart with barOptionValue:', chartProps.barOptionValue);

    // Initialize chart state if not exists
    if (!this.currentDistanceChartState) {
      this.currentDistanceChartState = { instance: null, type: null };
    }

    // Split chartProps into data, config, services
    const { barOptionValue, currentTreeIndex, robinsonFouldsDistances, weightedRobinsonFouldsDistances, scaleList, transitionResolver } = chartProps;
    const data = { robinsonFouldsDistances, weightedRobinsonFouldsDistances, scaleList };
    // Distances expect distance index; scale expects sequence index of the nearest full tree
    const distanceIdx = Math.round(Number(currentTreeIndex));
    const nearestFullTreeSeq = useAppStore.getState().getNearestAnchorSeqIndex();
    const config = {
      barOptionValue,
      currentTreeIndex: barOptionValue === 'scale' ? nearestFullTreeSeq : distanceIdx,
    };
    const services = { transitionResolver };

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

    // Keep UI select options in sync with available datasets
    this.ensureBarOptionsAvailability();

    // Ensure indicator initializes at the current position immediately after render
    try {
      const seqIndexForIndicator = barOptionValue === 'scale'
        ? config.currentTreeIndex // nearest full tree sequence index
        : transitionResolver.getTreeIndexForDistanceIndex(distanceIdx); // map distance → sequence
      if (this.currentDistanceChart?.updatePosition) {
        this.currentDistanceChart.updatePosition(seqIndexForIndicator);
      }
    } catch (_) { /* no-op */ }
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

    // Open modal chart with current configuration
    openModalChart({
      barOptionValue,
      currentTreeIndex,
      robinsonFouldsDistances: movieData?.distances?.robinson_foulds,
      weightedRobinsonFouldsDistances: movieData?.distances?.weighted_robinson_foulds,
      scaleList: movieData?.scaleList,
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

  /**
   * Check if chart is ready for display
   * @returns {boolean} True if all required data is available
   */
  isChartDataReady() {
    const { transitionResolver, movieData, barOptionValue } = useAppStore.getState();
    if (!transitionResolver || !movieData) return false;
    if (barOptionValue === 'rfd') {
      return Array.isArray(movieData?.distances?.robinson_foulds) && movieData.distances.robinson_foulds.length > 0;
    }
    if (barOptionValue === 'w-rfd') {
      return Array.isArray(movieData?.distances?.weighted_robinson_foulds) && movieData.distances.weighted_robinson_foulds.length > 0;
    }
    if (barOptionValue === 'scale') {
      return Array.isArray(movieData?.scaleList) && movieData.scaleList.length > 0;
    }
    return false;
  }

  /**
   * Handle chart resize events
   */
  handleResize() {
    // If there's a current chart, it will be updated in the next update cycle
    // The existing chart system handles responsive sizing
  }

  /**
   * Disable unavailable chart options (e.g., W‑RFD when weighted data is missing).
   * If current selection becomes invalid, switch to a valid option.
   */
  ensureBarOptionsAvailability() {
    const { movieData, barOptionValue } = useAppStore.getState();
    const hasWRFD = Array.isArray(movieData?.distances?.weighted_robinson_foulds) && movieData.distances.weighted_robinson_foulds.length > 0;

    const selectEl = document.getElementById('barPlotOption');
    if (selectEl) {
      const wOpt = selectEl.querySelector('md-select-option[value="w-rfd"]');
      if (wOpt) {
        if (!hasWRFD) {
          wOpt.setAttribute('disabled', 'true');
          // If currently selected, fallback to RFD if available, else scale
          if (barOptionValue === 'w-rfd') {
            const hasRFD = Array.isArray(movieData?.distances?.robinson_foulds) && movieData.distances.robinson_foulds.length > 0;
            const fallback = hasRFD ? 'rfd' : 'scale';
            selectEl.value = fallback;
            useAppStore.getState().setBarOption(fallback);
          }
        } else {
          wOpt.removeAttribute('disabled');
        }
      }
    }
  }

  /**
   * Attach direct listeners to the bar option select to ensure store updates
   * even if component-specific events differ across versions.
   */
  bindBarOptionSelectListeners() {
    const selectEl = document.getElementById('barPlotOption');
    if (!selectEl) {
      console.warn('[ChartController] barPlotOption select element not found, retrying in 500ms');
      setTimeout(() => this.bindBarOptionSelectListeners(), 500);
      return;
    }
    
    // Create handler if it doesn't exist
    if (!this.barOptionHandler) {
      this.barOptionHandler = (event) => {
        // For Material Design components, check multiple value sources
        const value = event?.target?.value || event?.currentTarget?.value || selectEl.value;
        const currentValue = useAppStore.getState().barOptionValue;
        console.log('[ChartController] Bar option changed to:', value, 'current:', currentValue);
        
        if (value && value !== currentValue) {
          console.log('[ChartController] Setting bar option in store to:', value);
          useAppStore.getState().setBarOption(value);
          // Force chart update immediately after store update
          setTimeout(() => {
            console.log('[ChartController] Store barOptionValue after update:', useAppStore.getState().barOptionValue);
            this.updateChart();
          }, 0);
        }
      };
    }
    
    // Remove any existing listeners first to avoid duplicates
    selectEl.removeEventListener('change', this.barOptionHandler);
    selectEl.removeEventListener('input', this.barOptionHandler);
    
    // Attach multiple event types for better Material Design compatibility
    selectEl.addEventListener('change', this.barOptionHandler);
    selectEl.addEventListener('input', this.barOptionHandler);
    
    // For Material Design selects, also listen to click events on options
    const options = selectEl.querySelectorAll('md-select-option');
    options.forEach(option => {
      option.addEventListener('click', () => {
        // Get the value directly from the clicked option
        const clickedValue = option.getAttribute('value') || option.value;
        const currentValue = useAppStore.getState().barOptionValue;
        console.log('[ChartController] Option clicked, value from option:', clickedValue, 'current:', currentValue);
        
        if (clickedValue && clickedValue !== currentValue) {
          console.log('[ChartController] Setting bar option from option click to:', clickedValue);
          useAppStore.getState().setBarOption(clickedValue);
          // Force chart update
          setTimeout(() => this.updateChart(), 0);
        }
      });
    });
    
    console.log('[ChartController] Bar option select listeners bound successfully');
  }
}
