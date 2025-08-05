import { useAppStore } from '../core/store.js';
import { TaxaColoring } from "../treeColoring/index.js";
import { TreeAnimationController } from "../treeVisualisation/TreeAnimationController.js";
import { WebGLTreeAnimationController } from "../treeVisualisation/WebGLTreeAnimationController.js";
import { exportSaveChart } from "../utils/svgExporter.js";
import { handleZoomResize, initializeZoom } from "../zoom/zoomUtils.js";
import { TREE_COLOR_CATEGORIES } from "../core/store.js";
import { applyColoringData } from "../treeColoring/index.js";
import { NavigationController } from "./NavigationController.js";
import { ChartController } from "./ChartController.js";
import { UIController } from "./UIController.js";
import { calculateWindow } from "../utils/windowUtils.js";
import { MovieTimelineManager } from "../timeline/MovieTimelineManager.js";

// ============================================================================
// GUI CLASS - Main controller for phylogenetic tree visualization application
//
// CORE RESPONSIBILITIES:
// - Orchestrates WebGL/SVG tree rendering via TreeAnimationController
// - Manages animation playback with smooth interpolation
// - Handles navigation direction tracking for backward scrubbing support
// - Coordinates UI controllers (Navigation, Chart, UI)
// - Synchronizes with MSA viewer when enabled
// - Provides centralized state management through store integration
//
// ANIMATION SYSTEM:
// - Uses TWEEN.js for smooth easing during playback
// - Supports forward/backward/jump navigation detection
// - Handles interpolated frame rendering for timeline scrubbing
// - Manages render-in-progress state to prevent overlapping renders
//
// STORE INTEGRATION:
// - Single source of truth pattern with useAppStore
// - Reactive updates via store subscriptions
// - Proper cleanup and resource management
// ============================================================================
export default class Gui {
  constructor(movieData, options = {}) {
    // Store options for later use
    this.options = options;

    // Initialize the store first
    useAppStore.getState().initialize(movieData);


    // Initialize controllers, passing 'this' (the Gui instance) where needed
    this.navigationController = new NavigationController(this);
    this.uiController = new UIController(this);
    this.chartController = new ChartController(this, this.navigationController);

    // Movie Timeline Manager for visual active change edge progress tracking
    this.movieTimelineManager = null;

    // Subscribe only to core tree navigation changes
    // Controllers handle their own specific subscriptions
    this.unsubscribeStore = useAppStore.subscribe(
      (state) => ({
        currentTreeIndex: state.currentTreeIndex,
        playing: state.playing,
        subscriptionPaused: state.subscriptionPaused
      }),
      (current, previous) => {
        // Handle playing state changes (start/stop animation)
        if (current.playing !== previous?.playing) {
          // Update button state reactively when playing state changes
          this._updatePlayButtonState();

          if (!current.playing && previous?.playing) {
            // Animation was stopped - ensure controller is also stopped
            this.stop();
          }
          return; // Don't process other updates when animation state changes
        }

        // Skip updates during animation to prevent stuttering
        if (current.playing) {
          return;
        }

        // Skip if subscriptions are paused
        if (current.subscriptionPaused) {
          return;
        }

        // Only update on tree navigation changes
        if (current.currentTreeIndex !== previous?.currentTreeIndex) {
          this.updateMain();
          this.syncMSAIfOpen();
        }
      }
    );
  }


  // ========================================
  // MOVIE PLAYBACK CONTROLS
  // ========================================
  initializeMovie() {
    const { gui } = useAppStore.getState();
    initializeZoom(gui);
    gui.resize();
    gui.update();


    // Initialize Movie Timeline Manager after movie is initialized
    this._initializeMovieTimelineManager();
  }

  // ========================================
  // PLAYBACK BUTTON STATE MANAGEMENT
  // ========================================
  _updatePlayButtonState() {
    const { playing } = useAppStore.getState(); // Get playing state from store
    const startButton = document.getElementById("play-button");

    if (!startButton) return;

    const startIcon = startButton.querySelector(".material-icons");
    const startSrOnly = startButton.querySelector(".sr-only");

    if (playing) { // Use playing from store
      // Update start button to show pause state
      if (startIcon) startIcon.textContent = "pause";
      if (startSrOnly) startSrOnly.textContent = "Pause";
      startButton.setAttribute("title", "Pause animation");
      startButton.setAttribute("aria-label", "Pause animation");
      startButton.classList.add("playing");
    } else {
      // Update start button to show play state
      if (startIcon) startIcon.textContent = "play_arrow";
      if (startSrOnly) startSrOnly.textContent = "Play";
      startButton.setAttribute("title", "Play animation from current position");
      startButton.setAttribute("aria-label", "Play animation");
      startButton.classList.remove("playing");
    }
  }

  async play() {
    let { playing, treeController } = useAppStore.getState();
    if (playing) return;

    // Ensure we have a tree controller before starting animation
    if (!treeController) {
      await this.updateMain();
      // Re-fetch the controller that was just created
      treeController = useAppStore.getState().treeController;
    }

    // Start animation on controller - controller will update store state
    if (treeController && typeof treeController.startAnimation === 'function') {
      treeController.startAnimation();
    } else {
      console.warn('[GUI] Cannot start animation - no valid tree controller');
      return;
    }

    // Button state will be updated automatically via store subscription
  }



  stop() {
    const { treeController } = useAppStore.getState();

    // Stop animation first if controller has the method
    if (treeController && typeof treeController.stopAnimation === 'function') {
      treeController.stopAnimation();
    }

    // Then update store state
    useAppStore.getState().stop();

    // Button state will be updated automatically via store subscription
  }




  // ========================================
  // MSA VIEWER SYNCHRONIZATION
  // ========================================
  _syncMSAIfOpenThrottled() {
    // Simple throttling with 100ms delay
    if (!this._lastSyncTime) this._lastSyncTime = 0;
    const now = Date.now();
    if (now - this._lastSyncTime < 100) return;
    this._lastSyncTime = now;
    this.syncMSAIfOpen();
  }

  isMSAViewerOpen() {
    // Check if MSA viewer window (WinBox modal) is currently open
    return !!document.getElementById("msa-winbox-content");
  }

  syncMSAIfOpen() {
    const { currentTreeIndex, movieData, transitionResolver, msaWindowSize, msaStepSize, syncMSAEnabled } = useAppStore.getState(); // Get state from store
    if (!syncMSAEnabled) {
      return;
    }
    if (!this.isMSAViewerOpen()) {
      return;
    }

    const msaPositionInfo = this.calculateMSAPosition();
    const currentFullTreeDataIdx = transitionResolver.getDistanceIndex(currentTreeIndex); // Use from store
    const windowData = calculateWindow(currentFullTreeDataIdx, msaStepSize, msaWindowSize, movieData.interpolated_trees.length); // Use from store


    if (windowData) {
      const windowInfo = {
        windowStart: windowData.startPosition,
        windowEnd: windowData.endPosition,
        msaPosition: msaPositionInfo.position,
        msaStepSize: msaPositionInfo.stepSize
      };

      // Dispatch sync event to MSA viewer
      window.dispatchEvent(new CustomEvent('msa-sync-request', {
        detail: {
          position: msaPositionInfo.position,
          windowInfo: windowInfo,
          treeIndex: currentTreeIndex,
          fullTreeIndex: currentFullTreeDataIdx
        }
      }));

    }
  }

  // ========================================
  // MAIN UPDATE CYCLE
  // ========================================
  async update(skipAutoCenter = false) {
    // 1. Handle layout/sizing first
    this.resize(skipAutoCenter);

    // 2. Render tree content
    await this.updateMain();

    // 3. Update chart indicators to match tree position
    await this.chartController.updateChart();

    // 4. Update UI elements with current state
    this.uiController.update();

    // 5. Sync external viewers if needed
    this._syncMSAIfOpenThrottled();
  }

  // ========================================
  // UI EVENT HANDLERS
  // ========================================

  getCurrentWindow() {
    const { currentTreeIndex, transitionResolver, movieData, msaWindowSize, msaStepSize, setWindowStart, setWindowEnd } = useAppStore.getState(); // Get state from store
    const currentFullTreeDataIdx = transitionResolver.getDistanceIndex(currentTreeIndex);
    const window = calculateWindow(currentFullTreeDataIdx, msaStepSize, msaWindowSize, movieData.interpolated_trees.length); // Use from store
    setWindowStart(window.startPosition);
    setWindowEnd(window.endPosition);
    return window;
  }

  // ========================================
  // TREE NAVIGATION & STATE MANAGEMENT
  // ========================================

  /**
   * Validates that rendering can proceed
   * @returns {Object|null} Validation result with tree data, or null if invalid
   */
  _validateRenderState() {
    const {
      currentTreeIndex,
      movieData,
      renderInProgress
    } = useAppStore.getState();

    // Skip if render is already in progress to prevent overlapping renders
    if (renderInProgress) {
      return null;
    }

    const tree = movieData.interpolated_trees[currentTreeIndex];
    if (!tree) {
      return null;
    }

    return { currentTreeIndex, movieData, tree };
  }

  /**
   * Ensures we have the appropriate tree controller (WebGL or SVG)
   * @returns {Object} Tree controller ready for rendering
   */
  _ensureTreeController() {
    const {
      setTreeController,
      treeController: currentTreeController,
      webglEnabled
    } = useAppStore.getState();

    if (currentTreeController) {
      return currentTreeController;
    }

    // Create new controller based on WebGL mode and options
    let newTreeController;
    if (this.options.TreeController) {
      // Use provided controller class (e.g., DeckGLTreeAnimationController)
      newTreeController = new this.options.TreeController();
    } else {
      // Use default logic
      newTreeController = webglEnabled
        ? new WebGLTreeAnimationController()
        : new TreeAnimationController(null, "application");
    }

    // Store handles all controller lifecycle management
    setTreeController(newTreeController);
    return newTreeController;
  }

  /**
   * Performs the actual tree rendering with proper error handling
   * @param {Object} treeController - The controller to use for rendering
   */
  async _performTreeRender(treeController) {
    const { setRenderInProgress } = useAppStore.getState();

    setRenderInProgress(true);
    try {
      // Always do a fresh render - renderAllElements now clears automatically
      await treeController.renderAllElements();
    } catch (error) {
      console.error('Error during tree rendering:', error);
      throw error; // Re-throw so caller can handle if needed
    } finally {
      setRenderInProgress(false);
    }
  }

  /**
   * Updates auxiliary UI components after successful render
   */
  _updatePostRenderComponents() {
    // Update S-Edge bars if available
    if (this.movieTimelineManager) {
      this.movieTimelineManager.updateCurrentPosition();
    }
  }

  /**
   * Main tree update orchestrator - coordinates the rendering pipeline
   */
  async updateMain() {
    // 1. Validate that we can proceed with rendering
    const validationResult = this._validateRenderState();
    if (!validationResult) {
      return; // Early exit - either already rendering or no valid tree
    }

    // 2. Ensure we have the right controller for current mode
    const treeController = this._ensureTreeController();

    // 3. Perform the actual rendering
    try {
      await this._performTreeRender(treeController);
    } catch (error) {
      // Error already logged in _performTreeRender, just return
      return;
    }

    // 4. Update auxiliary components
    this._updatePostRenderComponents();
  }


  resize(skipAutoCenter = false) {
    handleZoomResize(skipAutoCenter);
  }


  async backward() {
    const { backward: storeBackward } = useAppStore.getState();
    storeBackward();
  }

  async forward() {
    const { forward: storeForward } = useAppStore.getState();
    storeForward();
  }

  async goToPosition(position) {
    const { goToPosition: storeGoToPosition } = useAppStore.getState();

    // Just navigate - renderAllElements will clear and refresh automatically
    storeGoToPosition(position);
  }

  // ========================================
  // EXPORT & SAVE FUNCTIONALITY
  // ========================================
  saveSVG() {
    const { currentTreeIndex } = useAppStore.getState(); // Get from store
    const button = document.getElementById("save-svg-button");
    if (button) {
      button.disabled = true;
      button.innerText = "Saving...";
    }
    const fileName = `${this.fileName || "chart"}-${currentTreeIndex + 1}-${this.getCurrentTreeLabel()}.svg`;
    exportSaveChart(this, "application-container", fileName)
      .finally(() => {
        if (button) {
          button.disabled = false;
          button.innerText = "Save SVG";
        }
      });
  }

  // ========================================
  // CHART MODAL FUNCTIONALITY
  // ========================================
  displayCurrentChartInModal() {
    // Delegate to ChartController
    return this.chartController.displayCurrentChartInModal();
  }

  getCurrentTreeLabel() {
    const { currentTreeIndex, movieData } = useAppStore.getState(); // Get from store
    const metadata = movieData.tree_metadata?.[currentTreeIndex]; // Use movieData from store
    if (!metadata) {
        return `Tree ${currentTreeIndex + 1}`;
    }

    const baseName = metadata.tree_name;
    const phase = metadata.phase;
    const sEdgeInfo = metadata.tree_pair_key;
    const step = metadata.step_in_pair;

    if (sEdgeInfo && step && phase !== 'ORIGINAL') {
        // Extract active change edge index for cleaner display
        const match = sEdgeInfo.match(/pair_(\d+)_(\d+)/);
        const sEdgeIndex = match ? `S-edge ${parseInt(match[1])}` : sEdgeInfo;
        const totalSteps = movieData.activeChangeEdge_metadata?.treesPerActiveChangeEdge?.[sEdgeInfo] || step; // Use movieData from store
        return `${baseName} (${sEdgeIndex}, Step ${step}/${totalSteps}, ${phase})`;
    }

    return `${baseName} (${phase || 'Unknown phase'})`;
  }


  // ========================================
  // TAXA COLORING WINDOW
  // ========================================

  openTaxaColoringWindow() {
    const { movieData } = useAppStore.getState(); // Get from store
    if (!movieData.sorted_leaves?.length) { // Use movieData from store
      alert("No taxa names available for coloring.");
      return;
    }
    new TaxaColoring(
      movieData.sorted_leaves, // Use movieData from store
      { ...TREE_COLOR_CATEGORIES },
      (colorData) => this._handleTaxaColoringComplete(colorData)
    );
  }

  async _handleTaxaColoringComplete(colorData) {
    const { movieData } = useAppStore.getState(); // Get from store
    const newColorMap = applyColoringData(colorData, movieData.sorted_leaves, TREE_COLOR_CATEGORIES); // Use movieData from store
    // Ensure the global color map is updated so label colors are correct
    Object.assign(TREE_COLOR_CATEGORIES, newColorMap);
    // Color changes will trigger re-render through normal update cycle
  }



  // ========================================
  // MSA POSITION TRACKING
  // ========================================
  calculateMSAPosition() {
    const { currentTreeIndex, transitionResolver, msaStepSize } = useAppStore.getState(); // Get from store
    const transitionStep = transitionResolver.getDistanceIndex(currentTreeIndex); // Use from store
    return {
      position: currentTreeIndex + 1,
      stepSize: msaStepSize, // Get from store
      steps: transitionStep * msaStepSize, // Get from store
      treeIndex: currentTreeIndex
    };
  }

  // ========================================
  // MOVIE TIMELINE MANAGER INITIALIZATION
  // ========================================

  /**
   * Initialize Movie Timeline Manager for visual progress tracking
   * @private
   */
  _initializeMovieTimelineManager() {
    try {
      const { movieData, transitionResolver } = useAppStore.getState();
      this.movieTimelineManager = new MovieTimelineManager(movieData, transitionResolver);
    } catch (error) {
      this.movieTimelineManager = null;
    }
  }



  /**
   * Clean up resources when GUI is destroyed
   */
  destroy() {
    const { treeController, setTreeController } = useAppStore.getState();
    if (treeController) {
      // Clear any ongoing animations
      this.stop();
      // Let store handle controller cleanup
      setTreeController(null);
    }

    // Clean up store subscription
    if (this.unsubscribeStore) {
      this.unsubscribeStore();
      this.unsubscribeStore = null;
    }

    // Clean up controllers
    if (this.uiController) {
      this.uiController.destroy();
      this.uiController = null;
    }

    if (this.chartController) {
      // ChartController cleanup if it has a destroy method
      this.chartController = null;
    }

    if (this.navigationController) {
      // NavigationController cleanup if it has a destroy method
      this.navigationController = null;
    }


    // Clean up Movie Timeline Manager
    if (this.movieTimelineManager) {
      this.movieTimelineManager.destroy();
      this.movieTimelineManager = null;
    }

  }
}
