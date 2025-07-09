import * as d3 from "d3";
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
import TransitionIndexResolver from "./TransitionIndexResolver.js";
import { NavigationController } from "./navigation/NavigationController.js";
import {
  ForwardCommand,
  BackwardCommand,
  NextTreeCommand,
  PrevTreeCommand,
  ManualNextTreeCommand,
  ManualPrevTreeCommand,
  GoToPositionCommand,
  HandleDragCommand,
  GoToFullTreeDataIndexCommand
} from "./navigation/NavigationCommands.js";
import { ChartController } from "./controllers/ChartController.js";
import { UIController } from "./controllers/UIController.js";
import { calculateWindow } from "./utils/windowUtils.js";
import { STYLE_MAP } from "./treeVisualisation/TreeAnimationController.js";
import { validateBackendData } from "./utils/contractValidator.js";
import { DebugPanel } from "./utils/DebugPanel.js";
import { transformBranchLengths } from "./utils/branchTransformUtils.js";
import { SEdgeBarManager } from "./moviePlayer/SEdgeBarManager.js";

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
// - SEdgeBarManager creates bars with variable segment counts
// - TransitionIndexResolver maps indices correctly for each s-edge length
// - UI labels show actual step counts (e.g., "Step 3/15" not "Step 3/5")
// ============================================================================
export default class Gui {
  renderInProgress = false;
  // ========================================
  // CLASS PROPERTIES
  // ========================================
  syncMSAEnabled = false;
  lastUpdateTime = 0;
  updateThrottleTime = 100; // milliseconds

  // ========================================
  // CONSTRUCTOR & INITIALIZATION
  // ========================================
  constructor(movieData, factorValue = 1) {
    // Store the complete movieData object for direct access
    this.movieData = movieData;

    // Debug logging for s_edge data flow verification
    console.log("[DEBUG] GUI constructor received movieData:");
    console.log("[DEBUG]   - tree_metadata:", movieData.tree_metadata ? movieData.tree_metadata.length : "undefined", "items");
    console.log("[DEBUG]   - s_edge_metadata:", movieData.s_edge_metadata);
    console.log("[DEBUG]   - lattice_edge_tracking:", movieData.lattice_edge_tracking ? movieData.lattice_edge_tracking.length : "undefined", "items");
    if (movieData.tree_metadata && movieData.tree_metadata.length > 0) {
      console.log("[DEBUG]   - Sample tree_metadata[0]:", movieData.tree_metadata[0]);
    }
    console.log("[DEBUG]   - movieData.highlighted_elements (raw):", movieData.highlighted_elements);

    // Validate essential data exists
    if (!movieData || !movieData.interpolated_trees) {
      throw new Error('Invalid movieData: missing interpolated_trees');
    }

    // Make this instance globally available for debugging
    window.gui = this;

    // Initialize debug panel
    this.debugPanel = new DebugPanel();
    window.debugPanel = this.debugPanel;

    // Quick access properties for commonly used data - using InterpolationSequence-aligned flat structure
    this.treeList = movieData.interpolated_trees;
    this.treeNames = movieData.tree_names;
    this.robinsonFouldsDistances = movieData.rfd_list;
    this.weightedRobinsonFouldsDistances = movieData.wrfd_list;
    this.highlightData = movieData.highlighted_elements;
    this.lattice_edge_tracking = movieData.lattice_edge_tracking;
    this.covers = movieData.covers;

    // Debug log assignments after they've been made
    console.log("[DEBUG]   - this.highlightData (from movieData.highlighted_elements):", this.highlightData);
    console.log("[DEBUG]   - this.lattice_edge_tracking (from movieData.lattice_edge_tracking):", this.lattice_edge_tracking);
    console.log("[DEBUG]   - this.covers (from movieData.covers):", this.covers);
    this.leaveOrder = movieData.sorted_leaves;
    this.scaleList = calculateScales(this.treeList);


    console.log(this.lattice_edge_tracking.length, "Lattice edge tracking length");

    // Initialize MSA parameters with error handling and defaults
    try {
      this.msaWindowSize = movieData.msa?.window_size ?? 1000;
      this.msaStepSize = movieData.msa?.step_size ?? 50;

      if (!this.msaWindowSize || this.msaWindowSize <= 0) {
        console.warn("[GUI] Invalid msaWindowSize from data, using default:", 1000);
        this.msaWindowSize = 1000;
      }

      if (!this.msaStepSize || this.msaStepSize <= 0) {
        console.warn("[GUI] Invalid msaStepSize from data, using default:", 50);
        this.msaStepSize = 50;
      }
    } catch (error) {
      console.warn("[GUI] Error initializing MSA parameters, using defaults:", error);
      this.msaWindowSize = 30;
      this.msaStepSize = 15;
    }

    document.getElementById("windowSize").value = this.msaWindowSize;
    document.getElementById("windowStepSize").value = this.msaStepSize;


    // Initialize GUI properties
    this.windowStart = null;
    this.windowEnd = null;
    this.fontSize = 1.8;
    this.strokeWidth = 3;
    this.barOptionValue = "rfd";
    this.ignoreBranchLengths = false;
    this.branchTransformation = 'none';
    this.maxScale = this.scaleList.length > 0 ? Math.max(...this.scaleList.map((o) => o.value)) : 0;
    this.currentTreeIndex = 0;
    this.previousTreeIndex = -1; // Track previous tree for transition detection
    this.factor = factorValue;
    this.playing = false;

    // Initialize TransitionIndexResolver first, as other controllers depend on it
    this._initializeTransitionResolver();

    // Initialize controllers
    this.navigationController = new NavigationController(this);
    this.uiController = new UIController(this);
    this.chartController = new ChartController(this, this.navigationController);

    // Initialize TreeAnimationController instance for reuse
    this.treeController = null; // Will be created on first use

    // Initialize S-Edge Bar Manager for visual s_edge progress tracking
    this.sEdgeBarManager = null;
  }

  // ========================================
  // MOVIE PLAYBACK CONTROLS
  // ========================================
  initializeMovie() {
    initializeZoom(this);
    this.resize();
    this.update();

    // Initialize S-Edge Bar Manager after movie is initialized
    this._initializeSEdgeBarManager();
  }

  // ========================================
  // TIMING & ANIMATION UTILITIES
  // ========================================
  _getIntervalDuration() {
    let defaultTime = 1000;
    let factor = this.factor || 1;
    try {
      const factorInput = document.getElementById("factor-range");
      if (factorInput && factorInput.value) {
        const parsedFactor = parseFloat(factorInput.value);
        if (!isNaN(parsedFactor) && parsedFactor >= 0.1 && parsedFactor <= 5) {
            factor = parsedFactor;
        }
      }
    } catch (e) {
      console.warn("[gui] Error getting factor:", e);
    }
    return defaultTime / factor;
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
    const startButton = document.getElementById("start-button");
    const stopButton = document.getElementById("stop-button");

    if (!startButton) return;

    const startIcon = startButton.querySelector(".material-icons");
    const startSrOnly = startButton.querySelector(".sr-only");

    if (this.playing) {
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
    if (this.playing) return;
    this.playing = true;
    this._updatePlayButtonState();
    this.lastFrameTime = performance.now();
    this.frameRequest = window.requestAnimationFrame(this._animationLoop.bind(this));
  }

  // ========================================
  // MODAL WINDOW MANAGEMENT
  // ========================================
  openScatterplotModal() {
    import("./space/scatterPlot.js").then((scatterPlotModule) => {
      scatterPlotModule.showScatterPlotModal({
        realTreeList: this.generateRealTreeList(),
        treeList: this.treeList,
        initialEmbedding: window.emb,
        modals: window.modals || {},
        setModals: (modals) => { window.modals = modals; }
      });
    });
  }

  // ========================================
  // ANIMATION LOOP & PLAYBACK
  // ========================================
  async _animationLoop(timestamp) {
    if (!this.playing) return;
    const elapsed = timestamp - this.lastFrameTime;
    const interval = this._getIntervalDuration();
    if (elapsed >= interval) {
      await this.forward();
      this.lastFrameTime = timestamp;
    }
    this.frameRequest = window.requestAnimationFrame(this._animationLoop.bind(this));
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
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
    if (!this.syncMSAEnabled) {
      return;
    }
    if (!this.isMSAViewerOpen()) {
      return;
    }

    const msaPositionInfo = this.calculateMSAPosition();
    const currentFullTreeDataIdx = this.transitionResolver.getDistanceIndex(this.currentTreeIndex);
    const windowData = calculateWindow(currentFullTreeDataIdx, this.msaStepSize, this.msaWindowSize, this.numberOfFullTrees);


    if (windowData) {
      const windowInfo = {
        windowStart: windowData.startPosition,
        windowEnd: windowData.endPosition,
        msaPosition: msaPositionInfo.position,
        msaStepSize: msaPositionInfo.stepSize
      };

      // Get highlighted taxa for synchronization
      const highlightedTaxa = this.getActualHighlightData ? this.getActualHighlightData() : {};

      // Dispatch sync event to MSA viewer
      window.dispatchEvent(new CustomEvent('msa-sync-request', {
        detail: {
          position: msaPositionInfo.position,
          windowInfo: windowInfo,
          highlightedTaxa: highlightedTaxa,
          treeIndex: this.currentTreeIndex,
          fullTreeIndex: currentFullTreeDataIdx
        }
      }));

    }
  }

  // ========================================
  // MAIN UPDATE CYCLE
  // ========================================
  async update(skipAutoCenter = false) {
    console.log("[GUI] update() called");
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
    await this.navigationController.execute(new HandleDragCommand(this, position));
  }

  getCurrentWindow() {
    const currentFullTreeDataIdx = this.transitionResolver.getDistanceIndex(this.currentTreeIndex);
    const window = calculateWindow(currentFullTreeDataIdx, this.msaStepSize, this.msaWindowSize, this.numberOfFullTrees);
    this.windowStart = window.startPosition;
    this.windowEnd = window.endPosition;
    return window;
  }

  // ========================================
  // TREE NAVIGATION & STATE MANAGEMENT
  // ========================================
  async updateMain() {
    const drawDuration = this._getRenderDuration();
    const tree = this.treeList[this.currentTreeIndex];

    if (!tree) {
      console.error(`[GUI] No tree at index ${this.currentTreeIndex}. TreeList length: ${this.treeList.length}`);
      return;
    }

    const actualHighlightData = this.getActualHighlightData();

    // Get tree type information for transition detection
    const currentTreeInfo = this.transitionResolver ? this.transitionResolver.getTreeInfo(this.currentTreeIndex) : null;
    const previousTreeInfo = this.previousTreeIndex >= 0 && this.transitionResolver ?
      this.transitionResolver.getTreeInfo(this.previousTreeIndex) : null;



    // Update debug panel with current tree info including s_edge data
    if (this.debugPanel?.isShowing()) {
      this.debugPanel.updateDebugInfo({
        currentTreeIndex: this.currentTreeIndex,
        treeNames: this.treeNames,
        transitionResolver: this.transitionResolver,
        lattice_edge_tracking: this.lattice_edge_tracking,
        treeController: this.treeController,
        actualHighlightData: actualHighlightData,
        sEdgeInfo: this.getCurrentSEdgeInfo(),
        treeInfo: this.getCurrentTreeInfo(),
        sEdgeMetadata: this.movieData.s_edge_metadata
      });
    }

    // Create TreeAnimationController instance on first use
    if (!this.treeController) {
      this.treeController = new TreeAnimationController(null, "application");
    }

    const lattice_edge = this.lattice_edge_tracking[this.currentTreeIndex]

    // Apply branch length transformation if specified
    const transformedTree = this.branchTransformation !== 'none'
      ? transformBranchLengths(tree, this.branchTransformation)
      : tree;

    // Update parameters efficiently - now includes layout calculation
    this.treeController.updateParameters({
      treeData: transformedTree,
      ignoreBranchLengths: this.ignoreBranchLengths,
      drawDuration: drawDuration,
      marked: actualHighlightData,
      leaveOrder: this.leaveOrder,
      lattice_edges: [lattice_edge],
      fontSize: this.fontSize,
      strokeWidth: this.strokeWidth,
      monophyleticColoring: this.monophyleticColoringEnabled !== false,
      currentTreeType: currentTreeInfo?.type,
      previousTreeType: previousTreeInfo?.type
    });

    if (this.renderInProgress) {
      console.warn("[GUI] Render already in progress, skipping update.");
      return;
    }
    this.renderInProgress = true;
    try {
      await this.treeController.renderAllElements();
    } catch (error) {
      console.error("[GUI] Tree drawing failed:", error);
    } finally {
      this.renderInProgress = false;
    }

    // Update previous tree index after successful render
    this.previousTreeIndex = this.currentTreeIndex;

    // Update S-Edge bars if available
    if (this.sEdgeBarManager) {
      console.log("[GUI] Calling sEdgeBarManager.updateCurrentPosition()");
      this.sEdgeBarManager.updateCurrentPosition();
      console.log("[GUI] sEdgeBarManager.updateCurrentPosition() called.");
    }
  }


  resize(skipAutoCenter = false) {
    handleZoomResize(skipAutoCenter);
  }

  /**
   * Toggle debug panel visibility (can be called from console: window.gui.toggleDebug())
   */
  toggleDebug() {
    this.debugPanel.toggle();
    // If we just showed it, update with current data including s_edge info
    if (this.debugPanel.isShowing()) {
      const actualHighlightData = this.getActualHighlightData();
      this.debugPanel.updateDebugInfo({
        currentTreeIndex: this.currentTreeIndex,
        treeNames: this.treeNames,
        transitionResolver: this.transitionResolver,
        lattice_edge_tracking: this.lattice_edge_tracking,
        treeController: this.treeController,
        actualHighlightData: actualHighlightData,
        sEdgeInfo: this.getCurrentSEdgeInfo(),
        treeInfo: this.getCurrentTreeInfo(),
        sEdgeMetadata: this.movieData.s_edge_metadata
      });
    }
  }

  async backward() {
    await this.navigationController.execute(new BackwardCommand(this));
  }

  async forward() {
    await this.navigationController.execute(new ForwardCommand(this));
  }


  async prevTree() {
    await this.navigationController.execute(new PrevTreeCommand(this));
    this.updateTreeNavigationState();
  }

  async nextTree() {
    await this.navigationController.execute(new NextTreeCommand(this));
    this.updateTreeNavigationState();
  }

  async manualNextTree() {
    await this.navigationController.execute(new ManualNextTreeCommand(this));
    this.updateTreeNavigationState();
  }

  async manualPrevTree() {
    await this.navigationController.execute(new ManualPrevTreeCommand(this));
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
    if (!this.transitionResolver) {
      console.warn('[GUI] TransitionResolver not initialized for s_edge navigation');
      return;
    }

    const currentMetadata = this.movieData.tree_metadata?.[this.currentTreeIndex];
    if (!currentMetadata?.tree_pair_key) {
      console.warn('[GUI] Current tree has no s_edge information');
      return;
    }

    const nextIndex = this.transitionResolver.getNextSEdgeFirstTreeIndex(currentMetadata.tree_pair_key);
    if (nextIndex !== null) {
      await this.goToPosition(nextIndex);
    } else {
      console.log('[GUI] Already at last s_edge');
    }
  }

  /**
   * Navigate to the previous s_edge (previous tree pair transition)
   */
  async goToPrevSEdge() {
    if (!this.transitionResolver) {
      console.warn('[GUI] TransitionResolver not initialized for s_edge navigation');
      return;
    }

    const currentMetadata = this.movieData.tree_metadata?.[this.currentTreeIndex];
    if (!currentMetadata?.tree_pair_key) {
      console.warn('[GUI] Current tree has no s_edge information');
      return;
    }

    const prevIndex = this.transitionResolver.getPrevSEdgeFirstTreeIndex(currentMetadata.tree_pair_key);
    if (prevIndex !== null) {
      await this.goToPosition(prevIndex);
    } else {
      console.log('[GUI] Already at first s_edge');
    }
  }

  /**
   * Navigate to a specific step within the current s_edge (variable length)
   * Steps are 1-based and depend on the actual s_edge sequence length
   */
  async goToSEdgeStep(step) {
    if (!this.transitionResolver) {
      console.warn('[GUI] TransitionResolver not initialized for s_edge navigation');
      return;
    }

    const currentMetadata = this.movieData.tree_metadata?.[this.currentTreeIndex];
    if (!currentMetadata?.tree_pair_key) {
      console.warn('[GUI] Current tree has no s_edge information');
      return;
    }

    const sEdgeInfo = this.transitionResolver.getSEdgeInfo(this.currentTreeIndex);
    if (step < 1 || step > sEdgeInfo.totalSteps) {
      console.warn(`[GUI] Invalid s_edge step: ${step} (must be 1-${sEdgeInfo.totalSteps} for ${sEdgeInfo.pairKey})`);
      return;
    }

    const targetIndex = this.transitionResolver.getTreeIndexForSEdgeStep(currentMetadata.tree_pair_key, step);
    if (targetIndex !== null) {
      await this.goToPosition(targetIndex);
    } else {
      console.warn(`[GUI] Step ${step} not found in current s_edge ${currentMetadata.tree_pair_key}`);
    }
  }

  /**
   * Get current s_edge information for UI display
   */
  getCurrentSEdgeInfo() {
    return this.transitionResolver.getSEdgeInfo(this.currentTreeIndex);
  }

  // ========================================
  // CHART MODAL DISPLAY
  // ========================================
  displayCurrentChartInModal() {
    this.chartController.displayCurrentChartInModal();
  }


  async goToPosition(position) {
    await this.navigationController.execute(new GoToPositionCommand(this, position));
  }

  // ========================================
  // TREE POSITIONING & NAVIGATION HELPERS
  // ========================================
  async goToFullTreeDataIndex(transitionIndex) {
    await this.navigationController.execute(new GoToFullTreeDataIndexCommand(this, transitionIndex));
  }

  /**
   * Retrieves highlight data for a specific tree index.
   * @param {number} index - The index of the tree to get highlight data for.
   * @returns {Array} The highlight data array, or an empty array if none.
   * @private
   */
  _getHighlightDataForIndex(index) {
    if (index < 0) {
      return [];
    }

    const isConsensus = this.transitionResolver.isConsensusTree(index);
    const s_edge = this.lattice_edge_tracking?.[index];

    if (!isConsensus || !s_edge) {
      return [];
    }

    const highlightIndex = this.transitionResolver.getHighlightingIndex(index);

    if (highlightIndex < 0 || highlightIndex >= this.highlightData.length) {
      return [];
    }

    const treePairSolution = this.highlightData[highlightIndex];
    if (!treePairSolution?.lattice_edge_solutions) {
      return [];
    }

    const edgeKey = `[${s_edge.join(', ')}]`;
    const latticeEdgeData = treePairSolution.lattice_edge_solutions[edgeKey];

    // Flatten the array: from [[[9, 10, 11]]] to [[9, 10, 11]]
    // And then ensure each inner array is treated as a component
    if (latticeEdgeData && Array.isArray(latticeEdgeData)) {
      // Assuming latticeEdgeData is like [[[9, 10, 11]]]
      // We want to extract the inner arrays like [9, 10, 11]
      return latticeEdgeData.flat();
    }

    return [];
  }

  getActualHighlightData() {
    const currentIndex = this.currentTreeIndex;
    const highlightIndex = this.transitionResolver.getHighlightingIndex(currentIndex);

    // If the current tree is not in a highlightable transition segment, return empty.
    if (highlightIndex === -1) {
      return [];
    }

    const fullTreeIndices = this.transitionResolver.fullTreeIndices;
    // The segment starts at the full tree that defines this transition.
    const segmentStartIndex = fullTreeIndices[highlightIndex];

    const uniqueSolutions = new Map();

    // Iterate from the beginning of the segment up to the current tree.
    for (let i = segmentStartIndex; i <= currentIndex; i++) {
      // We only care about consensus trees within this range.
      if (this.transitionResolver.isConsensusTree(i)) {
        const dataForIndex = this._getHighlightDataForIndex(i);

        if (Array.isArray(dataForIndex)) {
          for (const solution of dataForIndex) {
            // Use a stringified version of the solution as a key to ensure uniqueness.
            uniqueSolutions.set(JSON.stringify(solution), solution);
          }
        }
      }
    }

    return Array.from(uniqueSolutions.values());
  }

  // ========================================
  // EXPORT & SAVE FUNCTIONALITY
  // ========================================
  saveSVG() {
    const button = document.getElementById("save-svg-button");
    if (button) {
      button.disabled = true;
      button.innerText = "Saving...";
    }
    const fileName = `${this.fileName || "chart"}-${this.currentTreeIndex + 1}-${this.getCurrentTreeLabel()}.svg`;
    exportSaveChart(this, "application-container", fileName)
      .finally(() => {
        if (button) {
          button.disabled = false;
          button.innerText = "Save SVG";
        }
      });
  }

  getCurrentTreeLabel() {
    const metadata = this.movieData.tree_metadata?.[this.currentTreeIndex];
    if (!metadata) {
        return `Tree ${this.currentTreeIndex + 1}`;
    }

    const baseName = metadata.tree_name;
    const phase = metadata.phase;
    const sEdgeInfo = metadata.tree_pair_key;
    const step = metadata.step_in_pair;

    if (sEdgeInfo && step && phase !== 'ORIGINAL') {
        // Extract s_edge index for cleaner display
        const match = sEdgeInfo.match(/pair_(\d+)_(\d+)/);
        const sEdgeIndex = match ? `S-edge ${parseInt(match[1])}` : sEdgeInfo;
        const totalSteps = this.movieData.s_edge_metadata?.trees_per_s_edge?.[sEdgeInfo] || step;
        return `${baseName} (${sEdgeIndex}, Step ${step}/${totalSteps}, ${phase})`;
    }

    return `${baseName} (${phase || 'Unknown phase'})`;
  }

  /**
   * Get compact, user-friendly tree label that explains the transition type
   * Returns minimal but meaningful descriptions for the movie player bar
   */
  getCurrentTreeLabelCompact() {
    const metadata = this.movieData.tree_metadata?.[this.currentTreeIndex];
    if (!metadata) {
        return 'Tree';
    }

    const phase = metadata.phase;
    const step = metadata.step_in_pair;

    // For transition trees, show step progress with meaningful phase names
    if (step && phase !== 'ORIGINAL') {
        // Get total steps for this s_edge dynamically
        const totalSteps = metadata.tree_pair_key ?
            this.movieData.s_edge_metadata?.trees_per_s_edge?.[metadata.tree_pair_key] || step : step;

        switch (phase) {
            case 'DOWN_PHASE':
                return `Trans ${step}/${totalSteps}`; // Transition step X of N
            case 'COLLAPSE_PHASE':
                return `Consensus`; // Simplified tree
            case 'REORDER_PHASE':
                return `Reorder`; // Reordered consensus
            case 'PRE_SNAP_PHASE':
                return `Trans ${step}/${totalSteps}`; // Transition step X of N
            case 'SNAP_PHASE':
                return `Trans ${step}/${totalSteps}`; // Final transition step
            default:
                return `Trans ${step}/${totalSteps}`;
        }
    }

    // For original/reconstructed trees
    switch (phase) {
        case 'ORIGINAL':
            return 'Original'; // Original reconstructed tree
        case 'CONSENSUS':
            return 'Consensus'; // Consensus tree
        case 'FULL':
            return 'Full'; // Full tree
        default:
            return 'Tree';
    }
  }

  /**
   * Get enhanced tree information including s_edge context
   */
  getCurrentTreeInfo() {
    const metadata = this.movieData.tree_metadata?.[this.currentTreeIndex];
    const sEdgeInfo = this.getCurrentSEdgeInfo();
    const treeInfo = this.transitionResolver?.getTreeInfo(this.currentTreeIndex);

    return {
      index: this.currentTreeIndex,
      totalTrees: this.treeList.length,
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
    this.comparisonModals = this.comparisonModals || {};
    const currentIndex = this.currentTreeIndex;
    const nextIndex = Math.min(currentIndex + 1, this.treeList.length - 1);
    const highlightIndex = this.transitionResolver.getHighlightingIndex(currentIndex);

    let comparisonParams = {
        leaveOrder: this.leaveOrder,
        ignoreBranchLengths: this.ignoreBranchLengths,
        fontSize: this.fontSize,
        strokeWidth: this.strokeWidth,
        treeList: this.treeList,
        comparisonModals: this.comparisonModals,
        toBeHighlighted: this.highlightData[highlightIndex] || [],
    };

    if (currentIndex === nextIndex && currentIndex > 0) {
        await createSideBySideComparisonModal({...comparisonParams, tree1Index: currentIndex - 1, tree2Index: currentIndex});
    } else if (currentIndex !== nextIndex) {
        await createSideBySideComparisonModal({...comparisonParams, tree1Index: currentIndex, tree2Index: nextIndex});
    } else {
        alert("Not enough trees to compare.");
    }
  }

  openTaxaColoringModal() {
    if (!this.leaveOrder?.length) {
      alert("No taxa names available for coloring.");
      return;
    }
    new TaxaColoring(
      this.leaveOrder,
      { ...COLOR_MAP.colorMap },
      (colorData) => this._handleTaxaColoringComplete(colorData)
    );
  }

  async _handleTaxaColoringComplete(colorData) {
    const newColorMap = applyColoringData(colorData, this.leaveOrder, COLOR_MAP.colorMap);
    // Ensure the global color map is updated so label colors are correct
    Object.assign(COLOR_MAP.colorMap, newColorMap);
    await this.updateMain();
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
    const transitionStep = this.transitionResolver.getDistanceIndex(this.currentTreeIndex);
    return {
      position: this.currentTreeIndex + 1,
      stepSize: this.msaStepSize,
      steps: transitionStep * this.msaStepSize,
      treeIndex: this.currentTreeIndex
    };
  }

  // ========================================
  // S-EDGE BAR MANAGER INITIALIZATION
  // ========================================

  /**
   * Initialize S-Edge Bar Manager for visual progress tracking
   * @private
   */
  _initializeSEdgeBarManager() {
    try {
      this.sEdgeBarManager = new SEdgeBarManager(this.movieData, this);
      console.log('[GUI] S-Edge Bar Manager initialized successfully');
    } catch (error) {
      console.error('[GUI] Failed to initialize S-Edge Bar Manager:', error);
      this.sEdgeBarManager = null;
    }
  }

  // ========================================
  // CONTRACT VALIDATION & INITIALIZATION
  // ========================================



  _initializeTransitionResolver() {
    if (!this.movieData.tree_metadata || this.movieData.tree_metadata.length === 0) {
        console.warn("[GUI] Cannot initialize TransitionIndexResolver: tree_metadata is missing.");
        this.transitionResolver = new TransitionIndexResolver([], [], [], {}, false);
        return;
    }

    const treeMetadata = this.movieData.tree_metadata;
    const highlightData = this.highlightData || [];
    const distanceData = this.robinsonFouldsDistances || [];
    const sEdgeMetadata = this.movieData.s_edge_metadata || {
        s_edge_count: 0,
        trees_per_s_edge: {}, // Variable counts per s-edge
        total_interpolated_trees: 0,
        phase_distribution: {}
    };

    console.log("[DEBUG] Initializing TransitionIndexResolver with:");
    console.log("[DEBUG]   - tree_metadata:", treeMetadata.length, "items");
    console.log("[DEBUG]   - s_edge_metadata:", sEdgeMetadata);
    console.log("[DEBUG]   - highlight_data:", highlightData.length, "items", highlightData);
    console.log("[DEBUG]   - distance_data:", distanceData.length, "items", distanceData);

    this.transitionResolver = new TransitionIndexResolver(
        treeMetadata,
        highlightData,
        distanceData,
        sEdgeMetadata,
        true // debug
    );

    // Update derived properties
    this.fullTreeIndices = this.transitionResolver.fullTreeIndices;
    this.numberOfFullTrees = this.fullTreeIndices.length;
    this.sEdgeCount = sEdgeMetadata.s_edge_count;

    // Recalculate scales with s_edge awareness
    this.scaleList = calculateScales(this.treeList, this.fullTreeIndices);
    this.maxScale = getMaxScaleValue(this.scaleList);

    // Store s_edge navigation helper methods on the instance for external access
    this.sEdgeNavigation = {
      goToNextSEdge: () => this.goToNextSEdge(),
      goToPrevSEdge: () => this.goToPrevSEdge(),
      goToSEdgeStep: (step) => this.goToSEdgeStep(step),
      getCurrentSEdgeInfo: () => this.getCurrentSEdgeInfo(),
      getCurrentTreeInfo: () => this.getCurrentTreeInfo()
    };

    // Validate the resolver
    const validation = this.transitionResolver.validateData();
    if (!validation.isValid) {
        console.warn("[GUI] TransitionIndexResolver validation issues:", validation.issues);
    } else {
        console.log("[GUI] TransitionIndexResolver initialized successfully");
        console.log("[GUI] Debug info:", this.transitionResolver.getDebugInfo());
    }
  }

  // Moved this method INSIDE the Gui class.
  generateRealTreeList() {
    if (!Array.isArray(this.treeList)) return [];
    const realTreeData = [];
    const fullTreeIndices = this.transitionResolver.fullTreeIndices;
    fullTreeIndices.forEach((index) => {
      if (this.treeList[index] !== undefined) {
        realTreeData.push(this.treeList[index]);
      }
    });
    return realTreeData;
  }

  // ========================================
  // STYLING UPDATES
  // ========================================

  async setFontSize(fontSize) {
    // Normalize font size to ensure it has a valid CSS unit
    if (typeof fontSize === 'number') {
      this.fontSize = fontSize + 'em';
    } else if (typeof fontSize === 'string' && !fontSize.match(/(px|em|rem|pt|%)$/)) {
      this.fontSize = fontSize + 'em';
    } else {
      this.fontSize = fontSize;
    }

    STYLE_MAP.fontSize = this.fontSize;

    await this.updateMain();
  }

  /**
   * Toggle monophyletic group coloring for tree branches
   * @param {boolean} enabled - Whether to enable monophyletic coloring
   */
  async setMonophyleticColoring(enabled) {
    // Store the setting for future tree drawings
    this.monophyleticColoringEnabled = enabled;

    // Redraw the current tree with the new setting
    await this.updateMain();
  }

  /**
   * Update tree navigation to be s_edge-aware for better UX
   */
  updateTreeNavigationState() {
    const sEdgeInfo = this.getCurrentSEdgeInfo();
    const treeInfo = this.getCurrentTreeInfo();

    // Dispatch custom event for UI components to update s_edge navigation state
    window.dispatchEvent(new CustomEvent('tree-navigation-updated', {
      detail: {
        currentIndex: this.currentTreeIndex,
        sEdgeInfo,
        treeInfo,
        canGoToNextSEdge: sEdgeInfo.sEdgeIndex < (this.movieData.s_edge_metadata?.s_edge_count || 0) - 1,
        canGoToPrevSEdge: sEdgeInfo.sEdgeIndex > 0,
        hasNextTree: this.currentTreeIndex < this.treeList.length - 1,
        hasPrevTree: this.currentTreeIndex > 0
      }
    }));
  }

  /**
   * Clean up resources when GUI is destroyed
   */
  destroy() {
    if (this.treeController) {
      // Clear any ongoing animations
      this.stop();
      this.treeController = null;
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

    // Clean up S-Edge Bar Manager
    if (this.sEdgeBarManager) {
      this.sEdgeBarManager.destroy();
      this.sEdgeBarManager = null;
    }
  }
}
