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

// ============================================================================
// GUI CLASS - Main interface for phylogenetic tree visualization
// ============================================================================
export default class Gui {
  // ========================================
  // CLASS PROPERTIES
  // ========================================
  syncMSAEnabled = false;

  // ========================================
  // CONSTRUCTOR & INITIALIZATION
  // ========================================
  constructor(movieData, factorValue = 1) {
    // Store the complete movieData object for direct access
    this.movieData = movieData;

    // Validate essential data exists
    if (!movieData || !movieData.trees || !movieData.trees.interpolated_trees) {
      throw new Error('Invalid movieData: missing interpolated_trees');
    }

    // Make this instance globally available for debugging
    window.gui = this;

    // Initialize debug panel
    this.debugPanel = new DebugPanel();
    window.debugPanel = this.debugPanel;

    // Quick access properties for commonly used data
    this.treeList = movieData.trees.interpolated_trees;
    this.treeNames = movieData.trees.tree_names;
    this.robinsonFouldsDistances = movieData.trees.distances.robinson_foulds;
    this.weightedRobinsonFouldsDistances = movieData.trees.distances.weighted_robinson_foulds;
    this.highlightData = movieData.visualization.highlighted_elements;
    this.lattice_edge_tracking = movieData.visualization.highlighted_elements.lattice_edge_tracking;
    this.covers = movieData.visualization.highlighted_elements.covers;
    this.leaveOrder = movieData.visualization.sorted_leaves;
    this.scaleList = calculateScales(this.treeList);


    console.log(this.lattice_edge_tracking.length, "Lattice edge tracking length");

    // Initialize MSA parameters with error handling and defaults
    try {
      this.msaWindowSize = movieData.msa?.window_params?.size ?? 1000;
      this.msaStepSize = movieData.msa?.window_params?.step ?? 50;

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

    // Initialize TreeAnimationController instance for reuse
    this.treeController = null; // Will be created on first use

    // Initialize NavigationController
    this.navigationController = new NavigationController(this);

    // Initialize ChartController
    this.chartController = new ChartController(this, this.navigationController);

    // Initialize UIController
    this.uiController = new UIController(this);

    requestAnimationFrame(() => {
      this.zoom = initializeZoom(this);
      // Initialize button states
      this._updatePlayButtonState();
    });

    this._lastSyncTime = 0;
    this._syncThrottleDelay = 250;

    // Initialize synchronously to ensure transitionResolver exists
    this._initializeTransitionResolver();

    // Defer contract validation to avoid blocking constructor
    setTimeout(() => this._performContractValidation(), 0);
  }

  // ========================================
  // MOVIE PLAYBACK CONTROLS
  // ========================================
  initializeMovie() {
    this.resize();
    this.update();
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

    if (!startButton || !stopButton) return;

    const startIcon = startButton.querySelector(".material-icons");
    const startSrOnly = startButton.querySelector(".sr-only");

    if (this.playing) {
      // Update start button to show pause state
      if (startIcon) startIcon.textContent = "pause";
      if (startSrOnly) startSrOnly.textContent = "Pause";
      startButton.setAttribute("title", "Pause animation");
      startButton.setAttribute("aria-label", "Pause animation");

      // Update stop button to be more prominent
      stopButton.classList.add("active");
    } else {
      // Update start button to show play state
      if (startIcon) startIcon.textContent = "play_arrow";
      if (startSrOnly) startSrOnly.textContent = "Play";
      startButton.setAttribute("title", "Play animation from current position");
      startButton.setAttribute("aria-label", "Play animation");

      // Remove active state from stop button
      stopButton.classList.remove("active");
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



    // Update debug panel with current tree info
    if (this.debugPanel?.isShowing()) {
      this.debugPanel.updateDebugInfo({
        currentTreeIndex: this.currentTreeIndex,
        treeNames: this.treeNames,
        transitionResolver: this.transitionResolver,
        lattice_edge_tracking: this.lattice_edge_tracking,
        treeController: this.treeController,
        actualHighlightData: actualHighlightData
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

    try {
      await this.treeController.renderAllElements();
    } catch (error) {
      console.error("[GUI] Tree drawing failed:", error);
    }

    // Update previous tree index after successful render
    this.previousTreeIndex = this.currentTreeIndex;
  }


  resize(skipAutoCenter = false) {
    handleZoomResize(skipAutoCenter);
  }

  /**
   * Toggle debug panel visibility (can be called from console: window.gui.toggleDebug())
   */
  toggleDebug() {
    this.debugPanel.toggle();
    // If we just showed it, update with current data
    if (this.debugPanel.isShowing()) {
      const actualHighlightData = this.getActualHighlightData();
      this.debugPanel.updateDebugInfo({
        currentTreeIndex: this.currentTreeIndex,
        treeNames: this.treeNames,
        transitionResolver: this.transitionResolver,
        lattice_edge_tracking: this.lattice_edge_tracking,
        treeController: this.treeController,
        actualHighlightData: actualHighlightData
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
  }

  async nextTree() {
    await this.navigationController.execute(new NextTreeCommand(this));
  }

  async manualNextTree() {
    await this.navigationController.execute(new ManualNextTreeCommand(this));
  }

  async manualPrevTree() {
    await this.navigationController.execute(new ManualPrevTreeCommand(this));
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
    const latticeEdges = this.highlightData?.lattice_edge;

    if (!latticeEdges || highlightIndex < 0 || highlightIndex >= latticeEdges.length) {
      return [];
    }

    const treePairSolution = latticeEdges[highlightIndex];
    if (!treePairSolution?.lattice_edge_solutions) {
      return [];
    }

    const edgeKey = `[${s_edge.join(', ')}]`;
    const latticeEdgeData = treePairSolution.lattice_edge_solutions[edgeKey];

    return latticeEdgeData || [];
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
    const baseName = this.treeNames?.[this.currentTreeIndex] || `Tree ${this.currentTreeIndex + 1}`;
    if (this.transitionResolver) {
      const highlightIndex = this.transitionResolver.getHighlightingIndex(this.currentTreeIndex);
      if (highlightIndex !== -1) {
        return `${baseName} (Transition ${highlightIndex})`;
      }
    }
    return `${baseName} (No transition data)`;
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
  // CONTRACT VALIDATION & INITIALIZATION
  // ========================================

  _performContractValidation() {
    // Perform contract validation after initialization
    const contractValidation = validateBackendData({
      treeList: this.treeList,
      treeNames: this.treeNames,
      robinsonFouldsDistances: this.robinsonFouldsDistances,
      weightedRobinsonFouldsDistances: this.weightedRobinsonFouldsDistances,
      highlightData: {
        lattice_edge: this.highlightData,
        lattice_edge_tracking: this.s_edges,
        covers: this.covers
      },
      scaleList: this.scaleList
    }, { logLevel: 'info' });

    if (!contractValidation.isValid) {
      console.error('[GUI] Backend contract validation failed:', contractValidation.issues);
    } else {
      console.log('[GUI] Backend contract validation passed:', contractValidation.summary);
    }

    if (contractValidation.warnings.length > 0) {
      console.warn('[GUI] Contract warnings:', contractValidation.warnings);
    }

    this.contractValidation = contractValidation;
  }

  _initializeTransitionResolver() {
    if (!this.treeNames || this.treeNames.length === 0) {
        console.warn("[GUI] Cannot initialize TransitionIndexResolver: treeNames is empty or undefined.");
        this.transitionResolver = new TransitionIndexResolver([], [], [], false, 0); // Basic fallback
        return;
    }
    const resolverSequenceData = this.treeNames.map(name => {
        let type = 'UNKNOWN'; // Default type

        // Rule for Full Trees (T followed by digits only)
        if (/^T\d+$/.test(name)) {
            type = 'T';
        }
        // Rule for Intermediate Trees
        else if (name.startsWith('IT')) {
            type = 'IT';
        }
        // Rule for Consensus Trees
        else if (name.startsWith('C')) { // Adjusted to be less strict if format is C0_1, etc.
            type = 'C';
        }

        return { name, type };
    });


    const highlightDataForResolver = this.highlightData?.lattice_edge || [];
    const numOriginalTransitions = highlightDataForResolver.length;
    const distanceDataForResolver = this.robinsonFouldsDistances || [];
    const debugResolver = true;
    this.transitionResolver = new TransitionIndexResolver(
        resolverSequenceData,
        highlightDataForResolver,
        distanceDataForResolver,
        debugResolver,
        numOriginalTransitions
    );
    this.fullTreeIndices = this.transitionResolver.fullTreeIndices;
    this.scaleList = calculateScales(this.treeList, this.fullTreeIndices);
    this.maxScale = getMaxScaleValue(this.scaleList);
    this.numberOfFullTrees = this.fullTreeIndices.length;


    if (debugResolver || !this.transitionResolver.validateData().isValid) {
        const validation = this.transitionResolver.validateData();
        if (!validation.isValid) {
            console.warn("[GUI] TransitionIndexResolver validation issues:", validation.issues);
        }
    }
    // Cross-validate with contract validation results
    if (this.contractValidation) {
      const resolverValidation = this.transitionResolver.validateData();
      if (!resolverValidation.isValid) {
        console.error('[GUI] TransitionIndexResolver validation failed after contract validation:', resolverValidation.issues);
      }

      // Compare expected vs actual tree counts
      const contractFullTrees = this.contractValidation.warnings.find(w => w.includes('full tree'));
      const resolverFullTrees = this.transitionResolver.fullTreeIndices.length;
      if (contractFullTrees && resolverFullTrees === 0) {
        console.warn('[GUI] Tree count mismatch between contract validation and resolver');
      }
    }
  }

  // Moved this method INSIDE the Gui class.
  generateRealTreeList() {
    if (!Array.isArray(this.treeList)) return [];
    const realTreeData = [];
    const fullTreeIndices = this.transition. Resolver.fullTreeIndices;
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
  }
}
