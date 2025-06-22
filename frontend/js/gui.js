import * as d3 from "d3";
import TaxaColoring from "./taxaColoring.jsx";
import { createSideBySideComparisonModal } from "./treeComparision/treeComparision.js";
import calculateScales, {
  getCurrentScaleValue,
  getMaxScaleValue,
  calculateScalePercentage,
  formatScaleValue
} from "./utils/scaleUtils.js";
import constructTree from "./treeVisualisation/LayoutCalculator.js";
import drawTree from "./treeVisualisation/TreeDrawer.js";
import { exportSaveChart } from "./utils/svgExporter.js";
import { handleZoomResize, initializeZoom } from "./zoom/zoomUtils.js";
import { COLOR_MAP } from "./treeColoring/ColorMap.js";
import TransitionIndexResolver from "./TransitionIndexResolver.js";
import { calculateWindow } from "./utils/windowUtils.js";
import { renderOrUpdateLineChart } from "./charts/lineChartManager.js";
import { openModalChart } from "./charts/windowChartManager.js";
import { STYLE_MAP } from "./treeVisualisation/TreeDrawer.js";
// ===== GUI Class =====
export default class Gui {
  // ===== MSA Sync Toggle =====
  syncMSAEnabled = false;

  // ===== Constructor & Initialization =====
  constructor(
    treeList,
    weightedRobinsonFouldsDistances,
    robinsonFouldsDistances,
    windowSize,
    windowStepSize,
    toBeHighlightedFromBackend, // Highlight data corresponding to "full" trees
    leaveOrder,
    fileName,
    factorValue = 1,
    treeNames = []
  ) {
    this.treeList = treeList || [];
    this.treeNames = Array.isArray(treeNames) && treeNames.length > 0
      ? treeNames
      : this.treeList.map((_, i) => `Tree ${i + 1}`);

    // Unify highlight data into a single, consistent property
    this.highlightData = toBeHighlightedFromBackend.jumping_taxa || [];
    this.s_edges = toBeHighlightedFromBackend.s_edges || [];
    this.covers = toBeHighlightedFromBackend.covers || [];


    this.robinsonFouldsDistances = robinsonFouldsDistances;
    this.fileName = fileName;
    this.scaleList = calculateScales(this.treeList);
    this.msaWindowSize = windowSize;
    this.msaStepSize = windowStepSize;

    document.getElementById("windowSize").innerText = this.msaWindowSize;
    document.getElementById("windowStepSize").innerText = this.msaStepSize;

    console.log("[GUI] Initializing GUI with the following parameters:");
    console.log("[GUI] Tree List:", this.treeList);
    console.log("[GUI] Weighted RFD Distances:", weightedRobinsonFouldsDistances);
    console.log("[GUI] ", toBeHighlightedFromBackend)

    this.windowStart = null;
    this.windowEnd = null;
    this.leaveOrder = leaveOrder;
    this.fontSize = 1.8;
    this.strokeWidth = 3;
    this.weightedRobinsonFouldsDistances = weightedRobinsonFouldsDistances;
    this.barOptionValue = "rfd";
    this.ignoreBranchLengths = false;
    this.currentDistanceChart = null;
    this.lastChartType = null;
    this.maxScale = this.scaleList?.length > 0 ? Math.max(...this.scaleList.map((o) => o.value)) : 0;
    this.currentTreeIndex = 0;
    this.factor = factorValue;
    this.playing = false;

    const taxaColorMap = {};
    if (Array.isArray(this.leaveOrder)) {
      this.leaveOrder.forEach((taxon) => {
          taxaColorMap[taxon] = COLOR_MAP.colorMap.defaultColor;
      });
    }

    requestAnimationFrame(() => {
      this.zoom = initializeZoom(this);
    });

    this._lastSyncTime = 0;
    this._syncThrottleDelay = 250;

    this.initializeTransitionResolver();
  }

  // ===== Movie Controls =====
  initializeMovie() {
    this.resize();
    this.update();
  }

  // ===== Timing & Animation =====
  getIntervalDuration() {
    let defaultTime = 1000;
    let factor = this.factor || 1;
    try {
      const factorInput = document.getElementById("factor");
      if (factorInput?.value) {
        const parsedFactor = parseInt(factorInput.value, 10);
        if (!isNaN(parsedFactor) && parsedFactor > 0) {
            factor = parsedFactor;
        }
      }
    } catch (e) {
      console.warn("[gui] Error getting factor:", e);
    }
    return defaultTime * factor;
  }

  play() {
    if (this.playing) return;
    this.playing = true;
    this.lastFrameTime = performance.now();
    this.frameRequest = window.requestAnimationFrame(this.animationLoop.bind(this));
  }

  // ===== Modal Aliases =====
  openScatterplotModal() {
    import("./space/scatterPlot.js").then((scatterPlotModule) => {
      scatterPlotModule.showScatterPlotModal({
        realTreeList: this.realTreeList,
        treeList: this.treeList,
        initialEmbedding: window.emb,
        modals: window.modals || {},
        setModals: (modals) => { window.modals = modals; }
      });
    });
  }

  // ===== Animation Loop =====
  animationLoop(timestamp) {
    if (!this.playing) return;
    const elapsed = timestamp - this.lastFrameTime;
    const interval = this.getIntervalDuration();
    if (elapsed >= interval) {
      this.forward();
      this.lastFrameTime = timestamp;
    }
    this.frameRequest = window.requestAnimationFrame(this.animationLoop.bind(this));
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
    if (this.frameRequest) {
      window.cancelAnimationFrame(this.frameRequest);
      this.frameRequest = null;
    }
  }

  // ===== MSA Viewer Sync =====
  syncMSAIfOpenThrottled() {
    const now = Date.now();
    if (now - this._lastSyncTime < this._syncThrottleDelay) return;
    this._lastSyncTime = now;
    this.syncMSAIfOpen();
  }

  isMSAViewerOpen() {
    return !!document.getElementById("msa-winbox-content");
  }

  syncMSAIfOpen() {
    if (!this.syncMSAEnabled) return;
    const msaPositionInfo = this.calculateMSAPosition();
    const currentFullTreeDataIdx = this.transitionResolver.getDistanceIndex(this.currentTreeIndex);
    const windowData = calculateWindow(currentFullTreeDataIdx, this.msaStepSize, this.msaWindowSize);

    if (windowData) {
      const windowInfo = {
        windowStart: windowData.startPosition,
        windowEnd: windowData.endPosition,
        msaPosition: msaPositionInfo.position,
        msaStepSize: msaPositionInfo.stepSize
      };
      // Dispatch event or call sync function here
    }
  }

  // ===== Main Update Cycle =====
  update(skipAutoCenter = false) {
    this.resize(skipAutoCenter);
    // Pass the correct index type for each chart type
    let chartTreeIndex;
    if (this.barOptionValue === "scale") {
      chartTreeIndex = this.currentTreeIndex; // sequence index for scale charts
    } else {
      chartTreeIndex = this.transitionResolver.getDistanceIndex(this.currentTreeIndex); // transition index for RFD/W-RFD
    }
    this.currentDistanceChartState = this.currentDistanceChartState || { instance: null, type: null };
    this.currentDistanceChartState = renderOrUpdateLineChart({
      data: {
        robinsonFouldsDistances: this.robinsonFouldsDistances,
        weightedRobinsonFouldsDistances: this.weightedRobinsonFouldsDistances,
        scaleList: this.scaleList,
      },
      config: {
        barOptionValue: this.barOptionValue,
        currentTreeIndex: chartTreeIndex,
        stickyChartPositionIfAvailable: this._lastClickedDistancePosition,
      },
      services: {
        transitionResolver: this.transitionResolver,
      },
      chartState: this.currentDistanceChartState,
      callbacks: {
        onGoToPosition: (idx) => this.goToPosition(idx),
        onHandleDrag: (idx) => this.handleDrag(idx),
        onGoToFullTreeDataIndex: (idx) => this.goToFullTreeDataIndex(idx),
      },
      containerId: "lineChart",
    });
    this.currentDistanceChart = this.currentDistanceChartState.instance;
    this.lastChartType = this.currentDistanceChartState.type;
    this.updateControls();
    this.updateMain();
    this.updateScale();
    this.syncMSAIfOpenThrottled();
  }

  // ===== UI Event Handlers =====
  handleDrag(position) {
    this._lastClickedDistancePosition = undefined;
    this.currentTreeIndex = Math.max(0, Math.min(position, this.treeList.length - 1));
    this.update();
  }

  getCurrentWindow() {
    const currentFullTreeDataIdx = this.transitionResolver.getDistanceIndex(this.currentTreeIndex);
    const window = calculateWindow(currentFullTreeDataIdx, this.msaStepSize, this.msaWindowSize);
    this.windowStart = window.startPosition;
    this.windowEnd = window.endPosition;
    return window;
  }

  // ===== Tree Navigation & State =====
  updateMain() {
    const drawDuration = this.getIntervalDuration();
    const tree = this.treeList[this.currentTreeIndex];
    const d3tree = constructTree(tree, this.ignoreBranchLengths);
    const highlightIndex = this.transitionResolver.getHighlightingIndex(this.currentTreeIndex);
    const tree_s_edges = this.s_edges[highlightIndex] || [];

    const actualHighlightData = this.getActualHighlightData();

    // Determine which cover set to use for the current tree
    let atomCovers = [];
    const coversObj = this.covers?.[highlightIndex];
    if (coversObj && coversObj.t1 && coversObj.t2) {
      const fullTreeIndices = this.transitionResolver.fullTreeIndices;
      if (fullTreeIndices && fullTreeIndices.length > 1) {
        if (this.currentTreeIndex === fullTreeIndices[highlightIndex]) {
          atomCovers = coversObj.t1;
        } else if (this.currentTreeIndex === fullTreeIndices[highlightIndex + 1]) {
          atomCovers = coversObj.t2;
        }
      }
    }

    requestAnimationFrame(() => {
      drawTree({
        treeConstructor: d3tree,
        toBeHighlighted: actualHighlightData,
        drawDurationFrontend: drawDuration,
        leaveOrder: this.leaveOrder,
        fontSize: this.fontSize,
        strokeWidth: this.strokeWidth,
        s_edges: tree_s_edges,
        atomCovers, // Only the correct cover set for this tree
      });
    });
  }

  resize(skipAutoCenter = false) {
    handleZoomResize(skipAutoCenter);
  }

  backward() {
    this._lastClickedDistancePosition = undefined;
    if (!this.transitionResolver) return;
    const prevPosition = this.transitionResolver.getPreviousPosition(this.currentTreeIndex);
    if (prevPosition !== this.currentTreeIndex) {
      this.currentTreeIndex = prevPosition;
    }
    this.update(true);
    if (this.syncMSAEnabled && this.isMSAViewerOpen()) this.syncMSAIfOpen();
  }

  forward() {
    this._lastClickedDistancePosition = undefined;
    if (!this.transitionResolver) return;
    const nextPosition = this.transitionResolver.getNextPosition(this.currentTreeIndex);
    if (nextPosition !== this.currentTreeIndex) {
      this.currentTreeIndex = nextPosition;
    }
    this.update(true);
    if (this.syncMSAEnabled && this.isMSAViewerOpen()) this.syncMSAIfOpen();
  }

  prevTree() {
    this._lastClickedDistancePosition = undefined;
    if (!this.transitionResolver) return;
    const prevSequenceIndex = this.transitionResolver.getPreviousFullTreeSequenceIndex(this.currentTreeIndex);
    if (prevSequenceIndex !== this.currentTreeIndex) {
        this.currentTreeIndex = prevSequenceIndex;
    }
    this.update(true);
  }

  nextTree() {
    this._lastClickedDistancePosition = undefined;
    if (!this.transitionResolver) return;
    const nextSequenceIndex = this.transitionResolver.getNextFullTreeSequenceIndex(this.currentTreeIndex);
    if (nextSequenceIndex !== this.currentTreeIndex) {
        this.currentTreeIndex = nextSequenceIndex;
    }
    this.update(true);
  }

  manualNextTree() {
    this.currentTreeIndex = Math.min(this.currentTreeIndex + 1, this.treeList.length - 1);
    this.stop();
    this.update();
  }

  manualPrevTree() {
    this.currentTreeIndex = Math.max(this.currentTreeIndex - 1, 0);
    this.stop();
    this.update();
  }

  // ===== Modal Chart (Bootstrap-based) =====
  displayCurrentChartInModal() {
    if (this.playing) this.stop();
    if (!this.transitionResolver || !this.robinsonFouldsDistances || !this.weightedRobinsonFouldsDistances || !this.scaleList) {
      console.warn("[GUI] Data not ready for modal chart.");
      return;
    }
    openModalChart({
      barOptionValue: this.barOptionValue,
      currentTreeIndex: this.currentTreeIndex,
      robinsonFouldsDistances: this.robinsonFouldsDistances,
      weightedRobinsonFouldsDistances: this.weightedRobinsonFouldsDistances,
      scaleList: this.scaleList,
      transitionResolver: this.transitionResolver,
      onGoToFullTreeDataIndex: this.goToFullTreeDataIndex?.bind(this),
      onGoToPosition: this.goToPosition?.bind(this)
    });
  }

  // ===== UI Controls =====
  updateControls() {
    const fullTreeIndices = this.fullTreeIndices;
    const currentFullTreeIndex = fullTreeIndices.indexOf(this.currentTreeIndex);
    document.getElementById("currentFullTree").innerText =
      currentFullTreeIndex !== -1 ? (currentFullTreeIndex + 1) : "-";
    document.getElementById("numberOfFullTrees").innerText = this.numberOfFullTrees;
    document.getElementById("currentTree").innerText = this.currentTreeIndex + 1;
    document.getElementById("numberOfTrees").innerText = this.treeList.length;
    document.getElementById("treeLabel").innerText = this.getCurrentTreeLabel();
    // Only call calculateWindow if currentFullTreeIndex is valid
    if (currentFullTreeIndex !== -1) {
        const window = calculateWindow(currentFullTreeIndex, this.msaStepSize, this.msaWindowSize);
        document.getElementById("windowArea").innerText = `${window.startPosition} - ${window.endPosition}`;
    } else {
        document.getElementById("windowArea").innerText = "-";
    }
    // Update scale: always use the transitionResolver.getDistanceIndex for scale
    const transitionDistanceIdx = this.transitionResolver.getDistanceIndex(this.currentTreeIndex);
    const currentScale = getCurrentScaleValue(this.scaleList, transitionDistanceIdx);
    const maxScale = this.maxScale;
    document.getElementById("currentScaleText").innerText = formatScaleValue(currentScale);
    document.getElementById("maxScaleText").innerText = formatScaleValue(maxScale);
    // Update scale progress bar
    const percent = calculateScalePercentage(currentScale, maxScale);
    const progressBar = document.querySelector(".scale-progress-bar");
    if (progressBar) progressBar.style.width = `${percent}%`;
  }

  goToPosition(position) {
    this._lastClickedDistancePosition = undefined;
    if (isNaN(position) || position < 0 || position >= this.treeList.length) return;
    this.currentTreeIndex = position;
    this.update();
  }

  // ===== Helper Methods for Full Tree Logic =====
  goToFullTreeDataIndex(transitionIndex) {
    if (!this.transitionResolver) return;
    const fullTreeIndices = this.transitionResolver.fullTreeIndices;
    const numTransitions = Math.max(0, fullTreeIndices.length - 1);
    if (transitionIndex < 0 || transitionIndex >= numTransitions) return;
    this._lastClickedDistancePosition = transitionIndex;
    if (transitionIndex < fullTreeIndices.length) {
      this.currentTreeIndex = fullTreeIndices[transitionIndex];
    }
    this.update();
  }

  getActualHighlightData() {
    if (!this.transitionResolver) return [];
    const highlightIndex = this.transitionResolver.getHighlightingIndex(this.currentTreeIndex);
    if (highlightIndex === -1) return [];
    // Highlight if:
    // - The current element is NOT a full tree (interpolated),
    // - OR it is the first tree (T0),
    // - OR it is the second tree (T1, i.e., the first transition's end tree)
    const isFullTree = this.transitionResolver.isFullTree(this.currentTreeIndex);
    if (isFullTree) {
        // Find all full tree indices
        const fullTreeIndices = this.transitionResolver.fullTreeIndices;
        // Highlight if this is the first or second full tree
        if (this.currentTreeIndex !== fullTreeIndices[0] && this.currentTreeIndex !== fullTreeIndices[1]) {
            return [];
        }
    }
    return this.highlightData[highlightIndex] || [];
  }

  // ===== Export & Save =====
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

  // ===== Modal Management =====
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

  _handleTaxaColoringComplete(colorData) {
    const newColorMap = {};
    if (colorData.mode === "taxa") {
      for (const [taxon, color] of colorData.taxaColorMap) {
        newColorMap[taxon] = color;
      }
    } else if (colorData.mode === "groups") {
      this.leaveOrder.forEach((taxon) => {
        const group = this._getGroupForTaxon(taxon, colorData.separator, colorData.strategyType);
        const groupColor = colorData.groupColorMap.get(group);
        if (groupColor) {
          newColorMap[taxon] = groupColor;
        } else {
          newColorMap[taxon] = COLOR_MAP.colorMap[taxon] || COLOR_MAP.colorMap.defaultColor || "#000000";
        }
      });
    }
    // --- Ensure the global color map is updated so label colors are correct ---
    Object.assign(COLOR_MAP.colorMap, newColorMap);
    this.updateMain();
  }

  _getGroupForTaxon(taxon, separator, strategyType) {
    if (!taxon) return undefined;

    // Handle first-letter grouping
    if (separator === "first-letter" || strategyType === "first-letter") {
      return taxon.charAt(0).toUpperCase();
    }

    // Use the same logic as taxaColoring.jsx
    return this._getGroupForStrategy(taxon, separator, strategyType);
  }

  /**
   * Extract group name using the same logic as taxaColoring.jsx
   * This ensures consistency between the UI preview and the actual coloring
   */
  _getGroupForStrategy(taxonName, separator, strategyType, nthOccurrence = 1) {
    // Handle new 'between' strategy type
    if (strategyType && strategyType.startsWith('between-')) {
      // Parse between strategy: 'between-_-1---1' means between 1st '_' and 1st '-'
      const parts = strategyType.split('-');
      if (parts.length >= 6) {
        const startSep = parts[1];
        const startOcc = parseInt(parts[2]) || 1;
        const endSep = parts[4];
        const endOcc = parseInt(parts[5]) || 1;
        return this._getGroupBetweenSeparators(taxonName, startSep, startOcc, endSep, endOcc);
      }
      return null;
    }

    const parts = taxonName.split(separator);
    if (parts.length <= 1) {
      return null; // No group if separator not present or only one part
    }

    if (strategyType === 'first') {
      return parts[0]; // e.g., "A" from "A.B.C"
    } else if (strategyType === 'last') {
      return parts.slice(0, -1).join(separator); // e.g., "A.B" from "A.B.C"
    } else if (strategyType && strategyType.startsWith('nth-')) {
      const occurrenceNum = parseInt(strategyType.split('-')[1]) || nthOccurrence;
      if (occurrenceNum === 1) {
        return parts[0]; // First occurrence: text before first separator
      } else if (occurrenceNum >= 2 && occurrenceNum <= parts.length) {
        return parts[occurrenceNum - 1]; // nth occurrence: text between (nth-1) and nth separator
      }
      return null; // Invalid occurrence number
    }

    return null; // Should not happen if strategyType is validated
  }

  /**
   * Get text between two different separators at specific occurrences
   */
  _getGroupBetweenSeparators(taxonName, startSeparator, startOccurrence, endSeparator, endOccurrence) {
    // Find the position of the start separator (nth occurrence)
    let startPos = -1;
    let currentOccurrence = 0;
    for (let i = 0; i < taxonName.length; i++) {
      if (taxonName[i] === startSeparator) {
        currentOccurrence++;
        if (currentOccurrence === startOccurrence) {
          startPos = i;
          break;
        }
      }
    }

    if (startPos === -1) {
      return null; // Start separator not found at specified occurrence
    }

    // Find the position of the end separator (nth occurrence) after the start position
    let endPos = -1;
    currentOccurrence = 0;
    for (let i = startPos + 1; i < taxonName.length; i++) {
      if (taxonName[i] === endSeparator) {
        currentOccurrence++;
        if (currentOccurrence === endOccurrence) {
          endPos = i;
          break;
        }
      }
    }

    if (endPos === -1) {
      // If end separator not found, take until the end of string
      return taxonName.substring(startPos + 1);
    }

    return taxonName.substring(startPos + 1, endPos);
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

  // ===== MSA Position Tracking =====
  calculateMSAPosition() {
    const transitionStep = this.transitionResolver.getDistanceIndex(this.currentTreeIndex);
    return {
      position: this.currentTreeIndex + 1,
      stepSize: this.msaStepSize,
      steps: transitionStep * this.msaStepSize,
      treeIndex: this.currentTreeIndex
    };
  }

  // TransitionIndexResolver Initialization
  // Reordered to initialize the resolver before using it.
initializeTransitionResolver() {
    if (!this.treeNames || this.treeNames.length === 0) {
        console.warn("[GUI] Cannot initialize TransitionIndexResolver: treeNames is empty or undefined.");
        this.transitionResolver = new TransitionIndexResolver([], [], [], false, 0); // Basic fallback
        return;
    }
    const resolverSequenceData = this.treeNames.map(name => {
        let type = 'UNKNOWN';
        if (name.startsWith('IT')) {
            type = 'IT';
        } else if (name.startsWith('C_')) {
            type = 'C';
        } else if (name.startsWith('T') && /T\d+$/.test(name)) {
            type = 'T';
        }
        return { name, type };
    });
    const highlightDataForResolver = this.highlightData || [];
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
        console.log("[GUI] TransitionIndexResolver initialized.");
        console.log("[GUI] Resolver Debug Info:", this.transitionResolver.getDebugInfo());
        const validation = this.transitionResolver.validateData();
        if (!validation.isValid) {
            console.warn("[GUI] TransitionIndexResolver validation issues:", validation.issues);
        }
    }
    // Any other logic that depends on the resolver being initialized
    // For example, updating the UI based on the initial state.
    // this.updateUIForSequencePosition(this.currentSequenceIndex);
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

  // ===== Scale Bar Update =====
  updateScale() {
    const fullTreeIndices = this.fullTreeIndices;
    // Use the unified transition distance index for scale display
    const transitionDistanceIdx = this.transitionResolver.getDistanceIndex(this.currentTreeIndex);
    const currentScaleValue = getCurrentScaleValue(this.scaleList, transitionDistanceIdx);
    const maxScale = this.maxScale || 1;
    const scaleProgressBar = document.querySelector(".scale-progress-bar");
    if (scaleProgressBar) {
      const percentValue = calculateScalePercentage(currentScaleValue, maxScale);
      scaleProgressBar.style.width = `${percentValue}%`;
      return;
    }
    const maxScaleElement = document.getElementById("maxScale");
    if (maxScaleElement) {
      const width = maxScaleElement.offsetWidth;
      const currentScaleWidth = (width * currentScaleValue) / maxScale;
      d3.select("#currentScaleText").transition().duration(1000).style("width", `${currentScaleWidth}px`);
    }
  }

  setFontSize(fontSize) {
    // Normalize font size to ensure it has a valid CSS unit
    if (typeof fontSize === 'number') {
      this.fontSize = fontSize + 'em';
    } else if (typeof fontSize === 'string' && !fontSize.match(/(px|em|rem|pt|%)$/)) {
      this.fontSize = fontSize + 'em';
    } else {
      this.fontSize = fontSize;
    }

    STYLE_MAP.fontSize = this.fontSize;

    this.updateMain();
  }
}
