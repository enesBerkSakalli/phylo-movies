import * as d3 from "d3";
import { useAppStore } from './store.js';
import TaxaColoring from "./taxaColoring.jsx";
import { createSideBySideComparisonModal } from "./treeComparision/treeComparision.js";
import calculateScales, {
  getMaxScaleValue
} from "./utils/scaleUtils.js";
import { TreeAnimationController } from "./treeVisualisation/TreeAnimationController.js";
import { exportSaveChart } from "./utils/svgExporter.js";
import { handleZoomResize, initializeZoom } from "./zoom/zoomUtils.js";
import { COLOR_MAP } from "./treeColoring/ColorMap.js";
import { applyColoringData } from "./treeColoring/TaxaGroupingUtils.js";
import { NavigationController } from "./navigation/NavigationController.js";
import {
  HandleDragCommand,
} from "./navigation/NavigationCommands.js";
import { ChartController } from "./controllers/ChartController.js";
import { UIController } from "./controllers/UIController.js";
import { calculateWindow } from "./utils/windowUtils.js";
import { transformBranchLengths } from "./utils/branchTransformUtils.js";
import { MovieTimelineManager } from "./moviePlayer/MovieTimelineManager.js";

// ============================================================================
// GUI CLASS - Main interface for phylogenetic tree visualization
//
// VARIABLE-LENGTH S-EDGE SUPPORT:
// This GUI correctly handles variable interpolation counts per s-edge based on
// actual topological differences between trees:
//
// REAL DATA STRUCTURE EXAMPLES:
// - pair_0_1: 15 interpolated trees (complex structural differences)
// - pair_1_2: 0 interpolated trees (identical trees, no interpolation needed)
// - pair_2_3: 8 interpolated trees (moderate differences)
//
// KEY DESIGN PRINCIPLES:
// 1. NO HARDCODED ASSUMPTIONS about "5 trees per s-edge"
// 2. Dynamic adaptation to actual brancharchitect output
// 3. Uses s_edge_metadata.trees_per_s_edge object for per-s-edge counts
// 4. Supports phases: ORIGINAL, DOWN_PHASE, COLLAPSE_PHASE, REORDER_PHASE, PRE_SNAP_PHASE, SNAP_PHASE
// 5. S-edge navigation methods adapt to actual sequence lengths
//
// INTEGRATION WITH SCRUBBING:
// - MovieTimelineManager creates bars with variable segment counts
// - TransitionIndexResolver maps indices correctly for each s-edge length
// - UI labels show actual step counts (e.g., "Step 3/15" not "Step 3/5")
// ============================================================================
export default class Gui {
  constructor(movieData, factorValue = 1) {
    // Initialize the store first
    useAppStore.getState().initialize(movieData);


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
      // Check if any visual-related state changed
      const hasVisualChange = state.currentTreeIndex !== prevState?.currentTreeIndex ||
                             state.fontSize !== prevState?.fontSize ||
                             state.strokeWidth !== prevState?.strokeWidth ||
                             state.ignoreBranchLengths !== prevState?.ignoreBranchLengths ||
                             state.branchTransformation !== prevState?.branchTransformation ||
                             state.monophyleticColoringEnabled !== prevState?.monophyleticColoringEnabled ||
                             state.barOptionValue !== prevState?.barOptionValue;

      if (hasVisualChange) {
        console.log('[GUI] Visual change detected:', {
          currentTreeIndex: state.currentTreeIndex !== prevState?.currentTreeIndex,
          fontSize: state.fontSize !== prevState?.fontSize,
          strokeWidth: state.strokeWidth !== prevState?.strokeWidth,
          ignoreBranchLengths: state.ignoreBranchLengths !== prevState?.ignoreBranchLengths,
          branchTransformation: state.branchTransformation !== prevState?.branchTransformation,
          monophyleticColoringEnabled: state.monophyleticColoringEnabled !== prevState?.monophyleticColoringEnabled,
          barOptionValue: state.barOptionValue !== prevState?.barOptionValue
        });

        // Skip if subscriptions are paused
        if (state.subscriptionPaused) {
          return;
        }

        if (typeof this.updateMain === 'function') {
          console.log('[GUI] Calling updateMain due to visual change');
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
  // TIMING & ANIMATION UTILITIES
  // ========================================
  _getIntervalDuration() {
    const { factor } = useAppStore.getState(); // Get factor from store
    let defaultTime = 1000;
    let currentFactor = factor || 1; // Use factor from store
    return defaultTime / currentFactor;
  }

  /**
   * Get the duration for tree rendering animations (separate from playback interval)
   * This should be shorter than interval to prevent overlapping animations
   */
  _getRenderDuration() {
    const interval = this._getIntervalDuration();
    // Use 80% of the interval duration for animations (increased from 70%)
    // This leaves 20% buffer to prevent overlapping while giving more time for smooth transitions
    return Math.max(400, interval * 0.8); // Minimum 400ms, max 80% of interval
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
    const { playing, play: storePlay } = useAppStore.getState(); // Get playing state and play action from store
    if (playing) return;
    storePlay(); // Dispatch play action to store
    this._updatePlayButtonState();
    this.lastFrameTime = performance.now();
    this.frameRequest = window.requestAnimationFrame(this._animationLoop.bind(this));
  }


  // ========================================
  // ANIMATION LOOP & PLAYBACK
  // ========================================
  async _animationLoop(timestamp) {
    const { playing } = useAppStore.getState(); // Get playing state from store
    if (!playing) return;
    const elapsed = timestamp - this.lastFrameTime;
    const interval = this._getIntervalDuration();
    if (elapsed >= interval) {
      await this.forward();
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
  }

  // ========================================
  // MSA VIEWER SYNCHRONIZATION
  // ========================================
  _syncMSAIfOpenThrottled() {
    const now = Date.now();
    if (now - this._lastSyncTime < this._syncThrottleDelay) return;
    this._lastSyncTime = now;
    this.syncMSAIfOpen();
  }

  isMSAViewerOpen() {
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
      previousTreeIndex,
      movieData,
      transitionResolver,
      fontSize,
      strokeWidth,
      ignoreBranchLengths,
      branchTransformation,
      monophyleticColoringEnabled,
      setTreeController,
      treeController: currentTreeController,
      renderInProgress,
      setRenderInProgress
    } = useAppStore.getState();

    // Skip if render is already in progress to prevent overlapping renders
    if (renderInProgress) return;

    const drawDuration = this._getRenderDuration();
    const tree = movieData.interpolated_trees[currentTreeIndex]; // Use movieData from store

    if (!tree) {
      return;
    }

    const actualHighlightData = useAppStore.getState().getActualHighlightData(); // Get from store action

    // Get tree type information for transition detection
    const currentTreeInfo = transitionResolver ? transitionResolver.getTreeInfo(currentTreeIndex) : null;
    const previousTreeInfo = previousTreeIndex >= 0 && transitionResolver ?
      transitionResolver.getTreeInfo(previousTreeIndex) : null;

    // Create TreeAnimationController instance on first use and set it into the store
    let treeControllerToUse;
    if (!currentTreeController) {
      const newTreeController = new TreeAnimationController(null, "application");
      setTreeController(newTreeController);
      treeControllerToUse = newTreeController;
    } else {
      treeControllerToUse = currentTreeController;
    }

    const lattice_edge = movieData.lattice_edge_tracking[currentTreeIndex];

    // Apply branch length transformation if specified
    const transformedTree = branchTransformation !== 'none'
      ? transformBranchLengths(tree, branchTransformation)
      : tree;

    // --- PATCH: Propagate styleConfig to all renderers ---
    const { styleConfig } = useAppStore.getState();
    // Removed updateSizeConfig calls: dynamic updates not needed

    // Update parameters efficiently - now includes layout calculation
    treeControllerToUse.updateParameters({
      treeData: transformedTree,
      ignoreBranchLengths: ignoreBranchLengths,
      drawDuration: drawDuration,
      marked: actualHighlightData,
      lattice_edges: [lattice_edge],
      fontSize: fontSize,
      strokeWidth: strokeWidth,
      monophyleticColoring: monophyleticColoringEnabled !== false,
      currentTreeType: currentTreeInfo?.type,
      previousTreeType: previousTreeInfo?.type
    });

    if (renderInProgress) {
      return;
    }

    setRenderInProgress(true);
    try {
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


  async prevTree() {
    const { currentTreeIndex, goToPosition } = useAppStore.getState();
    goToPosition(currentTreeIndex - 1);
    this.updateTreeNavigationState();
  }

  async nextTree() {
    const { currentTreeIndex, movieData, goToPosition } = useAppStore.getState();
    goToPosition(currentTreeIndex + 1);
    this.updateTreeNavigationState();
  }

  async manualNextTree() {
    const { currentTreeIndex, movieData, goToPosition } = useAppStore.getState();
    goToPosition(currentTreeIndex + 1);
    this.updateTreeNavigationState();
  }

  async manualPrevTree() {
    const { currentTreeIndex, goToPosition } = useAppStore.getState();
    goToPosition(currentTreeIndex - 1);
    this.updateTreeNavigationState();
  }

  // ========================================
  // S-EDGE NAVIGATION METHODS
  //
  // These methods provide intelligent navigation through variable-length s-edge sequences.
  // They dynamically adapt to actual interpolation counts rather than assuming fixed lengths.
  //
  // SUPPORTED NAVIGATION PATTERNS:
  // - goToNextSEdge(): Jump to next tree pair transition (handles 0-length s-edges)
  // - goToPrevSEdge(): Jump to previous tree pair transition
  // - goToSEdgeStep(step): Navigate to specific step within current s-edge (1 to N)
  // - getCurrentSEdgeInfo(): Get current position context with actual step counts
  //
  // DATA FLOW:
  // Uses tree_metadata.tree_pair_key + step_in_pair for precise positioning
  // Validates steps against s_edge_metadata.trees_per_s_edge[pairKey] for safety
  // ========================================

  /**
   * Navigate to the next s_edge (next tree pair transition)
   */
  async goToNextSEdge() {
    const { transitionResolver, movieData, goToPosition, currentTreeIndex } = useAppStore.getState();
    if (!transitionResolver) {
      return;
    }

    const currentMetadata = movieData.tree_metadata?.[currentTreeIndex];
    if (!currentMetadata?.tree_pair_key) {
      return;
    }

    const nextIndex = transitionResolver.getNextSEdgeFirstTreeIndex(currentMetadata.tree_pair_key);
    if (nextIndex !== null) {
      goToPosition(nextIndex);
    }
  }

  /**
   * Navigate to the previous s_edge (previous tree pair transition)
   */
  async goToPrevSEdge() {
    const { transitionResolver, movieData, goToPosition, currentTreeIndex } = useAppStore.getState();
    if (!transitionResolver) {
      return;
    }

    const currentMetadata = movieData.tree_metadata?.[currentTreeIndex];
    if (!currentMetadata?.tree_pair_key) {
      return;
    }

    const prevIndex = transitionResolver.getPrevSEdgeFirstTreeIndex(currentMetadata.tree_pair_key);
    if (prevIndex !== null) {
      goToPosition(prevIndex);
    }
  }

  /**
   * Navigate to a specific step within the current s_edge (variable length)
   * Steps are 1-based and depend on the actual s_edge sequence length
   */
  async goToSEdgeStep(step) {
    const { transitionResolver, movieData, goToPosition, currentTreeIndex } = useAppStore.getState();
    if (!transitionResolver) {
      return;
    }

    const currentMetadata = movieData.tree_metadata?.[currentTreeIndex];
    if (!currentMetadata?.tree_pair_key) {
      return;
    }

    const sEdgeInfo = transitionResolver.getSEdgeInfo(currentTreeIndex);
    if (step < 1 || step > sEdgeInfo.totalSteps) {
      return;
    }

    const targetIndex = transitionResolver.getTreeIndexForSEdgeStep(currentMetadata.tree_pair_key, step);
    if (targetIndex !== null) {
      goToPosition(targetIndex);
    }
  }

  /**
   * Get current s_edge information for UI display
   */
  getCurrentSEdgeInfo() {
    const { transitionResolver, currentTreeIndex } = useAppStore.getState();
    return transitionResolver.getSEdgeInfo(currentTreeIndex);
  }

  // ========================================
  // CHART MODAL DISPLAY
  // ========================================
  displayCurrentChartInModal() {
    this.chartController.displayCurrentChartInModal();
  }


  async goToPosition(position) {
    const { goToPosition: storeGoToPosition } = useAppStore.getState();
    storeGoToPosition(position);
  }

  // ========================================
  // TREE POSITIONING & NAVIGATION HELPERS
  // ========================================
  async goToFullTreeDataIndex(transitionIndex) {
    const { goToPosition: storeGoToPosition } = useAppStore.getState();
    storeGoToPosition(transitionIndex);
  }


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
    const sEdgeInfo = this.getCurrentSEdgeInfo();
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
  // COMPARISON & TAXA COLORING MODALS
  // ========================================
  async openComparisonModal() {
    const { currentTreeIndex, transitionResolver, movieData, ignoreBranchLengths, fontSize, strokeWidth } = useAppStore.getState(); // Get from store
    this.comparisonModals = this.comparisonModals || {};
    const nextIndex = Math.min(currentTreeIndex + 1, movieData.interpolated_trees.length - 1); // Use movieData from store
    const highlightIndex = transitionResolver.getHighlightingIndex(currentTreeIndex); // Use from store

    let comparisonParams = {
        leaveOrder: movieData.sorted_leaves, // Use movieData from store
        ignoreBranchLengths: ignoreBranchLengths, // Get from store
        fontSize: fontSize, // Get from store
        strokeWidth: strokeWidth, // Get from store
        treeList: movieData.interpolated_trees, // Use movieData from store
        comparisonModals: this.comparisonModals,
        toBeHighlighted: movieData.highlighted_elements[highlightIndex] || [], // Use movieData from store
    };

    if (currentTreeIndex === nextIndex && currentTreeIndex > 0) {
        await createSideBySideComparisonModal({...comparisonParams, tree1Index: currentTreeIndex - 1, tree2Index: currentTreeIndex});
    } else if (currentTreeIndex !== nextIndex) {
        await createSideBySideComparisonModal({...comparisonParams, tree1Index: currentTreeIndex, tree2Index: nextIndex});
    } else {
        alert("Not enough trees to compare.");
    }
  }

  openTaxaColoringModal() {
    const { movieData } = useAppStore.getState(); // Get from store
    if (!movieData.sorted_leaves?.length) { // Use movieData from store
      alert("No taxa names available for coloring.");
      return;
    }
    new TaxaColoring(
      movieData.sorted_leaves, // Use movieData from store
      { ...COLOR_MAP.colorMap },
      (colorData) => this._handleTaxaColoringComplete(colorData)
    );
  }

  async _handleTaxaColoringComplete(colorData) {
    const { movieData } = useAppStore.getState(); // Get from store
    const newColorMap = applyColoringData(colorData, movieData.sorted_leaves, COLOR_MAP.colorMap); // Use movieData from store
    // Ensure the global color map is updated so label colors are correct
    Object.assign(COLOR_MAP.colorMap, newColorMap);
    // Color changes will trigger re-render through normal update cycle
  }


  openMSAViewer() {
    window.dispatchEvent(new CustomEvent("open-msa-viewer", {
      detail: {
        source: 'gui',
        currentPosition: this.calculateMSAPosition().position,
        windowInfo: this.getCurrentWindow(),
      }
    }));
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
  // CONTRACT VALIDATION & INITIALIZATION
  // ========================================



  _initializeTransitionResolver() {
    // This method is now largely handled by useAppStore.getState().initialize()
    // The Gui constructor calls initialize, so this method might become redundant or simplified.
    // For now, ensure it reads from the store if it's still needed for derived properties.
    const { movieData, transitionResolver } = useAppStore.getState();

    if (!movieData.tree_metadata || movieData.tree_metadata.length === 0) {
        // The store's initialize should handle this.
        return;
    }

    // The resolver is already initialized in the store. Just get it.
    this.transitionResolver = transitionResolver;

    // Update derived properties from the store
    this.fullTreeIndices = transitionResolver.fullTreeIndices;
    this.numberOfFullTrees = this.fullTreeIndices.length;
    this.sEdgeCount = movieData.s_edge_metadata.s_edge_count; // Use movieData from store

    // Recalculate scales with s_edge awareness (this might need to be an an action in the store)
    // For now, keep it here, but note for future refactoring.
    this.scaleList = calculateScales(movieData.interpolated_trees, this.fullTreeIndices);
    this.maxScale = getMaxScaleValue(this.scaleList);

    // Store s_edge navigation helper methods on the instance for external access
    this.sEdgeNavigation = {
      goToNextSEdge: () => this.goToNextSEdge(),
      goToPrevSEdge: () => this.goToPrevSEdge(),
      goToSEdgeStep: (step) => this.goToSEdgeStep(step),
      getCurrentSEdgeInfo: () => this.getCurrentSEdgeInfo(),
      getCurrentTreeInfo: () => this.getCurrentTreeInfo()
    };

    // Validate the resolver (already done in store's initialize)
    const validation = transitionResolver.validateData();
    if (!validation.isValid) {
    } else {
    }
  }


  // ========================================
  // STYLING UPDATES
  // ========================================

  async setFontSize(fontSize) {
    const { setFontSize: storeSetFontSize } = useAppStore.getState();
    // Normalize font size to ensure it has a valid CSS unit
    if (typeof fontSize === 'number') {
      storeSetFontSize(fontSize + 'em');
    } else if (typeof fontSize === 'string' && !fontSize.match(/(px|em|rem|pt|%)$/)) {
      storeSetFontSize(fontSize + 'em');
    } else {
      storeSetFontSize(fontSize);
    }
  }

  /**
   * Toggle monophyletic group coloring for tree branches
   * @param {boolean} enabled - Whether to enable monophyletic coloring
   */
  async setMonophyleticColoring(enabled) {
    const { setMonophyleticColoring: storeSetMonophyleticColoring } = useAppStore.getState();
    storeSetMonophyleticColoring(enabled);
  }

  /**
   * Update tree navigation to be s_edge-aware for better UX
   */
  updateTreeNavigationState() {
    const { currentTreeIndex, movieData } = useAppStore.getState(); // Get from store
    const sEdgeInfo = this.getCurrentSEdgeInfo();
    const treeInfo = this.getCurrentTreeInfo();

    // Dispatch custom event for UI components to update s_edge navigation state
    window.dispatchEvent(new CustomEvent('tree-navigation-updated', {
      detail: {
        currentIndex: currentTreeIndex, // Use from store
        sEdgeInfo,
        treeInfo,
        canGoToNextSEdge: sEdgeInfo.sEdgeIndex < (movieData.s_edge_metadata?.s_edge_count || 0) - 1, // Use movieData from store
        canGoToPrevSEdge: sEdgeInfo.sEdgeIndex > 0,
        hasNextTree: currentTreeIndex < movieData.interpolated_trees.length - 1, // Use movieData from store
        hasPrevTree: currentTreeIndex > 0
      }
    }));
  }

  /**
   * Clean up resources when GUI is destroyed
   */
  destroy() {
    const { treeController } = useAppStore.getState();
    if (treeController) {
      // Clear any ongoing animations
      this.stop();
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

    // Clean up s_edge navigation helper
    this.sEdgeNavigation = null;

    // Clean up Movie Timeline Manager
    if (this.movieTimelineManager) {
      this.movieTimelineManager.destroy();
      this.movieTimelineManager = null;
    }
  }
}
