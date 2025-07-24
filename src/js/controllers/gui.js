import { useAppStore } from '../core/store.js';
import { TaxaColoring } from "../treeColoring/index.js";
import { TreeAnimationController } from "../treeVisualisation/TreeAnimationController.js";
import { WebGLTreeAnimationController } from "../treeVisualisation/WebGLTreeAnimationController.js";
import { exportSaveChart } from "../utils/svgExporter.js";
import { handleZoomResize, initializeZoom } from "../zoom/zoomUtils.js";
import { TREE_COLOR_CATEGORIES } from "../core/store.js";
import { applyColoringData } from "../treeColoring/index.js";
import { NavigationController } from "./NavigationController.js";
import {
  HandleDragCommand,
} from "../core/NavigationCommands.js";
import { ChartController } from "./ChartController.js";
import { UIController } from "./UIController.js";
import { calculateWindow } from "../utils/windowUtils.js";
import { MovieTimelineManager } from "../timeline/MovieTimelineManager.js";
import TWEEN from 'three/addons/libs/tween.module.js';

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
  constructor(movieData) {
    // Initialize the store first
    useAppStore.getState().initialize(movieData);

    // Initialize navigation direction tracking for proper interpolation
    this.navigationDirection = 'forward'; // 'forward', 'backward', or 'jump'
    this.lastTreeIndex = 0;
    this.navigationTimestamp = 0;

    // Initialize controllers, passing 'this' (the Gui instance) where needed
    this.navigationController = new NavigationController(this);
    this.uiController = new UIController(this);
    this.chartController = new ChartController(this, this.navigationController);

    // TreeAnimationController instance will be created and set into store later
    this.treeController = null; // Will be created on first use in updateMain

    // Movie Timeline Manager for visual s_edge progress tracking
    this.movieTimelineManager = null;

    // Subscribe to state changes that require visualization updates
    this.unsubscribeStore = useAppStore.subscribe((state, prevState) => {
      // Detect and track navigation direction for proper interpolation handling
      if (state.currentTreeIndex !== prevState?.currentTreeIndex) {
        this._updateNavigationDirection(state.currentTreeIndex, prevState?.currentTreeIndex);
      }

      // Check if any visual-related state changed
      const hasVisualChange = state.currentTreeIndex !== prevState?.currentTreeIndex ||
                             state.fontSize !== prevState?.fontSize ||
                             state.strokeWidth !== prevState?.strokeWidth ||
                             state.branchTransformation !== prevState?.branchTransformation ||
                             state.monophyleticColoringEnabled !== prevState?.monophyleticColoringEnabled ||
                             state.barOptionValue !== prevState?.barOptionValue;

      if (hasVisualChange) {
        // Skip if subscriptions are paused
        if (state.subscriptionPaused) {
          return;
        }

        if (typeof this.updateMain === 'function') {
          this.updateMain();
        }

        // Handle MSA-specific updates
        if (this.uiController) {
          this.uiController.update();
        }
        this.syncMSAIfOpen();
      }
    });
  }

  // ========================================
  // NAVIGATION DIRECTION TRACKING
  // ========================================

  /**
   * Updates navigation direction tracking for proper interpolation handling.
   * Essential for backward scrubbing animations to display correctly.
   * @private
   * @param {number} currentIndex - New tree index
   * @param {number} previousIndex - Previous tree index
   */
  _updateNavigationDirection(currentIndex, previousIndex) {
    if (previousIndex == null) {
      this.navigationDirection = 'forward';
      this.lastTreeIndex = currentIndex;
      this.navigationTimestamp = performance.now();
      return;
    }

    const indexDiff = currentIndex - previousIndex;
    const now = performance.now();

    // Determine navigation direction
    if (indexDiff === 1) {
      this.navigationDirection = 'forward';
    } else if (indexDiff === -1) {
      this.navigationDirection = 'backward';
    } else if (Math.abs(indexDiff) > 1) {
      this.navigationDirection = 'jump';
    } else {
      // Same index, no direction change
      return;
    }

    // Store for future reference
    this.lastTreeIndex = currentIndex;
    this.navigationTimestamp = now;

    // Notify tree controller about direction change if it exists
    const { treeController } = useAppStore.getState();
    if (treeController && typeof treeController.setNavigationDirection === 'function') {
      treeController.setNavigationDirection(this.navigationDirection);
    }

    console.log(`[GUI] Navigation direction: ${this.navigationDirection} (${previousIndex} → ${currentIndex})`);
  }

  /**
   * Gets the current navigation direction state.
   * @returns {string} Current navigation direction ('forward', 'backward', 'jump')
   */
  getNavigationDirection() {
    return this.navigationDirection;
  }

  /**
   * Checks if the current navigation direction is backward.
   * @returns {boolean} True if navigating backward, false otherwise
   */
  isNavigatingBackward() {
    return this.navigationDirection === 'backward';
  }

  /**
   * Sets navigation direction directly. Used by timeline scrubbing to ensure
   * proper interpolation direction during manual navigation.
   * @param {string} direction - Navigation direction ('forward', 'backward', 'jump')
   */
  setNavigationDirection(direction) {
    this.navigationDirection = direction;

    // Update tree controller if available
    const { treeController } = useAppStore.getState();
    if (treeController && typeof treeController.setNavigationDirection === 'function') {
      treeController.setNavigationDirection(direction);
    }
  }

  // ========================================
  // MOVIE PLAYBACK CONTROLS
  // ========================================
  initializeMovie() {
    const { gui } = useAppStore.getState();
    initializeZoom(gui);
    gui.resize();
    gui.update();

    // Initialize navigation direction for first tree
    const { currentTreeIndex } = useAppStore.getState();
    this.lastTreeIndex = currentTreeIndex;
    this.navigationDirection = 'forward';
    this.navigationTimestamp = performance.now();

    // Initialize Movie Timeline Manager after movie is initialized
    this._initializeMovieTimelineManager();
  }

  // ========================================
  // TIMING & ANIMATION UTILITIES
  // ========================================
  _getIntervalDuration() {
    const { animationSpeed } = useAppStore.getState(); // Get animation speed from store
    let defaultTime = 1000;
    let currentSpeed = animationSpeed || 1; // Use speed from store
    return defaultTime / currentSpeed;
  }



  // ========================================
  // PLAYBACK BUTTON STATE MANAGEMENT
  // ========================================
  _updatePlayButtonState() {
    const { playing } = useAppStore.getState(); // Get playing state from store
    const startButton = document.getElementById("start-button");
    const stopButton = document.getElementById("stop-button");

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

      // Update stop button to be more prominent (if it exists)
      if (stopButton) stopButton.classList.add("active");
    } else {
      // Update start button to show play state
      if (startIcon) startIcon.textContent = "play_arrow";
      if (startSrOnly) startSrOnly.textContent = "Play";
      startButton.setAttribute("title", "Play animation from current position");
      startButton.setAttribute("aria-label", "Play animation");
      startButton.classList.remove("playing");

      // Remove active state from stop button (if it exists)
      if (stopButton) stopButton.classList.remove("active");
    }
  }

  play() {
    const { playing, play: storePlay, treeController } = useAppStore.getState(); // Get playing state and play action from store
    if (playing) return;

    // Ensure we have a base render before starting animation
    // This is needed because interpolation expects existing meshes
    if (treeController && !treeController.root) {
      // No tree has been rendered yet, do a full render first
      this.updateMain();
    }

    storePlay(); // Dispatch play action to store
    this._updatePlayButtonState();
    this.lastFrameTime = performance.now();
    this.animationState = null; // Reset animation state
    this.frameRequest = window.requestAnimationFrame(this._animationLoop.bind(this));
  }


  // ========================================
  // ANIMATION LOOP & PLAYBACK
  // ========================================
  async _animationLoop(timestamp) {
    const { playing } = useAppStore.getState(); // Get playing state from store
    if (!playing) return;

    // Initialize animation state if needed
    if (!this.animationState) {
      this._initializeAnimationState();
    }

    const elapsed = timestamp - this.lastFrameTime;
    const frameDuration = 1000 / 60; // 60 FPS for smooth animation

    if (elapsed >= frameDuration) {
      await this._updateSmoothAnimation(timestamp);
      this.lastFrameTime = timestamp;
    }

    this.frameRequest = window.requestAnimationFrame(this._animationLoop.bind(this));
  }

  stop() {
    const { playing, stop: storeStop } = useAppStore.getState(); // Get playing state and stop action from store
    if (!playing) return;
    storeStop(); // Dispatch stop action to store
    this._updatePlayButtonState();
    if (this.frameRequest) {
      window.cancelAnimationFrame(this.frameRequest);
      this.frameRequest = null;
    }
    this.animationState = null; // Reset animation state

    // Force a fresh render after stopping animation
    // This ensures we display the exact tree state without interpolation artifacts
    setTimeout(() => {
      this.updateMain(); // renderAllElements now always clears first
    }, 50);
  }

  /**
   * Initializes animation state for smooth movie playback.
   * Sets up timing, progress tracking, and TWEEN.js integration.
   * @private
   */
  _initializeAnimationState() {
    const { currentTreeIndex, movieData } = useAppStore.getState();
    const totalTrees = movieData.interpolated_trees.length;

    this.animationState = {
      startTreeIndex: currentTreeIndex,
      currentProgress: 0, // 0-1 progress through the entire movie
      totalTrees: totalTrees,
      animationSpeed: 1.0, // Trees per second
      startTime: performance.now(),
      currentTween: null // Track active animation tween
    };
  }

  /**
   * Update smooth animation using TWEEN.js for natural transitions
   * @param {number} timestamp - Current timestamp
   * @private
   */
  async _updateSmoothAnimation(timestamp) {
    const { movieData, treeController } = useAppStore.getState();

    if (!this.animationState || !movieData || !treeController) {
      return;
    }

    const { totalTrees, animationSpeed, startTime } = this.animationState;
    const elapsed = (timestamp - startTime) / 1000; // Convert to seconds

    // Calculate current progress through the movie
    const totalProgress = (elapsed * animationSpeed) / (totalTrees - 1);

    // Handle end of animation
    if (totalProgress >= 1.0) {
      this.stop();
      return;
    }

    // Calculate which trees to interpolate between
    const exactTreeIndex = totalProgress * (totalTrees - 1);
    const fromTreeIndex = Math.floor(exactTreeIndex);
    const toTreeIndex = Math.min(fromTreeIndex + 1, totalTrees - 1);

    // Instead of linear progress, use TWEEN.js for smooth easing
    const segmentProgress = exactTreeIndex - fromTreeIndex;

    // Apply easing for more natural phylogenetic transitions
    // Use easeInOutCubic for smooth biological-feeling growth
    const easedProgress = this._easeInOutCubic(segmentProgress);

    // Clamp indices
    const clampedFromIndex = Math.max(0, Math.min(fromTreeIndex, totalTrees - 1));
    const clampedToIndex = Math.max(0, Math.min(toTreeIndex, totalTrees - 1));

    // Get tree data for interpolation
    const fromTree = movieData.interpolated_trees[clampedFromIndex];
    const toTree = movieData.interpolated_trees[clampedToIndex];

    if (!fromTree || !toTree) {
      return;
    }

    // Get highlight edges for the interpolated position
    const interpolatedIndex = Math.round(exactTreeIndex);
    const latticeEdge = movieData.lattice_edge_tracking?.[interpolatedIndex];
    const highlightEdges = latticeEdge ? [latticeEdge] : [];

    // Update store position to sync charts (use the closest discrete tree)
    const closestTreeIndex = Math.round(exactTreeIndex);
    const { currentTreeIndex, setSubscriptionPaused } = useAppStore.getState();
    if (currentTreeIndex !== closestTreeIndex) {
      // Temporarily pause subscriptions to prevent navigation direction conflicts during animation
      setSubscriptionPaused(true);
      useAppStore.getState().goToPosition(closestTreeIndex);
      setSubscriptionPaused(false);
    }

    // For smooth animation playback, we always move forward through the tree sequence
    // Unlike scrubbing, animation playback doesn't go backward

    // Ensure tree controller uses forward direction for animation playback
    if (typeof treeController.setNavigationDirection === 'function') {
      treeController.setNavigationDirection('forward');
    }

    // Render interpolated frame with eased progress for natural transitions
    try {
      treeController.renderInterpolatedFrame(
        fromTree,    // Always the earlier tree in sequence
        toTree,      // Always the later tree in sequence
        easedProgress, // Use eased progress instead of linear
        {
          highlightEdges: highlightEdges,
          showExtensions: true,
          showLabels: true
        }
      );
    } catch (error) {
      console.error('[GUI] Error rendering interpolated frame:', error);
    }

    // Update TWEEN.js animations
    TWEEN.update();

    // Update animation state
    this.animationState.currentProgress = totalProgress;
  }

  /**
   * Cubic ease-in-out easing function for natural biological transitions
   * @param {number} x - Progress value (0-1)
   * @returns {number} Eased progress value
   * @private
   */
  _easeInOutCubic(x) {
    return x ** 2 * 3 - x ** 3 * 2;
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

      // Get highlighted taxa for synchronization
      const highlightedTaxa = useAppStore.getState().getActualHighlightData(); // Use from store action

      // Dispatch sync event to MSA viewer
      window.dispatchEvent(new CustomEvent('msa-sync-request', {
        detail: {
          position: msaPositionInfo.position,
          windowInfo: windowInfo,
          highlightedTaxa: highlightedTaxa,
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
    this.resize(skipAutoCenter);

    // Delegate chart update to ChartController
    await this.chartController.updateChart();

    // Delegate UI update to UIController
    this.uiController.update();
    await this.updateMain();
    this._syncMSAIfOpenThrottled();
  }

  // ========================================
  // UI EVENT HANDLERS
  // ========================================
  async handleDrag(position) {
    await this.navigationController.execute(new HandleDragCommand(position));
  }

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
  async updateMain() {
    const {
      currentTreeIndex,
      movieData,
      setTreeController,
      treeController: currentTreeController,
      renderInProgress,
      setRenderInProgress
    } = useAppStore.getState();

    // Skip if render is already in progress to prevent overlapping renders
    if (renderInProgress) return;

    const tree = movieData.interpolated_trees[currentTreeIndex];

    if (!tree) {
      return;
    }

    // Create appropriate controller based on WebGL mode
    let treeControllerToUse;
    if (!currentTreeController) {
      // Check if WebGL mode is enabled from store
      const { webglEnabled } = useAppStore.getState();

      let newTreeController;
      if (webglEnabled) {
        console.log('[GUI] Creating new WebGL controller');
        // Use WebGL controller for Three.js rendering with navigation direction awareness
        newTreeController = new WebGLTreeAnimationController(null, {
          useWebGL: true,
          navigationDirection: this.navigationDirection
        });
      } else {
        console.log('[GUI] Creating new SVG controller');
        // Use standard SVG controller
        newTreeController = new TreeAnimationController(null, "application");
      }

      // Set navigation direction on new controller
      if (typeof newTreeController.setNavigationDirection === 'function') {
        newTreeController.setNavigationDirection(this.navigationDirection);
      }

      // Store handles all controller lifecycle management
      setTreeController(newTreeController);
      treeControllerToUse = newTreeController;
    } else {
      treeControllerToUse = currentTreeController;
    }

    // Update controller from store - single source of truth approach
    // All data is now retrieved directly from the store by the controller
    treeControllerToUse.updateFromStore();

    if (renderInProgress) {
      return;
    }

    setRenderInProgress(true);
    try {
      // Always do a fresh render - renderAllElements now clears automatically
      await treeControllerToUse.renderAllElements();
    } catch (error) {
      console.error('Error during tree rendering:', error);
    } finally {
      setRenderInProgress(false);
    }

    // Update S-Edge bars if available
    if (this.movieTimelineManager) {
      this.movieTimelineManager.updateCurrentPosition();
    }
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


  // ========================================
  // CHART MODAL DISPLAY
  // ========================================
  displayCurrentChartInModal() {
    this.chartController.displayCurrentChartInModal();
  }


  async goToPosition(position) {
    const { goToPosition: storeGoToPosition } = useAppStore.getState();

    // Just navigate - renderAllElements will clear and refresh automatically
    storeGoToPosition(position);
  }

  // ========================================
  // TREE POSITIONING & NAVIGATION HELPERS
  // ========================================


  getActualHighlightData() {
    const { getActualHighlightData: storeGetActualHighlightData } = useAppStore.getState();
    return storeGetActualHighlightData();
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
        // Extract s_edge index for cleaner display
        const match = sEdgeInfo.match(/pair_(\d+)_(\d+)/);
        const sEdgeIndex = match ? `S-edge ${parseInt(match[1])}` : sEdgeInfo;
        const totalSteps = movieData.s_edge_metadata?.trees_per_s_edge?.[sEdgeInfo] || step; // Use movieData from store
        return `${baseName} (${sEdgeIndex}, Step ${step}/${totalSteps}, ${phase})`;
    }

    return `${baseName} (${phase || 'Unknown phase'})`;
  }


  /**
   * Get enhanced tree information including s_edge context
   */
  getCurrentTreeInfo() {
    const { currentTreeIndex, movieData, transitionResolver } = useAppStore.getState(); // Get from store
    const metadata = movieData.tree_metadata?.[currentTreeIndex]; // Use movieData from store
    const sEdgeInfo = transitionResolver?.getSEdgeInfo(currentTreeIndex) || { sEdgeIndex: -1 };
    const treeInfo = transitionResolver?.getTreeInfo(currentTreeIndex); // Use from store

    return {
      index: currentTreeIndex,
      totalTrees: movieData.interpolated_trees.length, // Use movieData from store
      label: this.getCurrentTreeLabel(),
      metadata: metadata || {},
      sEdgeInfo,
      treeInfo: treeInfo || {},
      isInSEdge: sEdgeInfo.sEdgeIndex >= 0,
      isOriginalTree: metadata?.phase === 'ORIGINAL'
    };
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



  // ========================================
  // STYLING UPDATES
  // ========================================

  // Note: Removed redundant styling methods that simply delegated to store actions
  // These functions can be called directly from the store using:
  // useAppStore.getState().setFontSize(), setStrokeWidth(), and setMonophyleticColoring()


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

    // Clean up navigation direction tracking
    this.navigationDirection = null;
    this.lastTreeIndex = null;
    this.navigationTimestamp = null;
  }
}
