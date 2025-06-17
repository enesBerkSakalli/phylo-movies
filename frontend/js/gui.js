import * as d3 from "d3";
import { generateDistanceChart } from "./charts/distanceChart.js";
import TaxaColoring from "./taxaColoring.jsx";
import { createSideBySideComparisonModal } from "./treeComparision/treeComparision.js";
import calculateScales from "./utils/MathUtils.js";
import constructTree from "./treeVisualisation/LayoutCalculator.js";
import drawTree from "./treeVisualisation/TreeDrawer.js";
import { exportSaveChart } from "./utils/svgExporter.js";
import { handleZoomResize, initializeZoom } from "./zoom/zoomUtils.js";
import { COLOR_MAP } from "./treeColoring/ColorMap.js";
import TransitionIndexResolver from "./TransitionIndexResolver.js";
import { calculateWindow } from "./utils/windowUtils.js";
import { renderOrUpdateLineChart } from "./charts/lineChartManager.js";
import { openModalChart } from "./charts/modalChartManager.js";
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

    // FIX: Unify highlight data into a single, consistent property
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
    const nextFullTreeIndex = this.transitionResolver.getHighlightingIndex(this.currentTreeIndex);

    this.currentDistanceChartState = this.currentDistanceChartState || { instance: null, type: null };
    this.currentDistanceChartState = renderOrUpdateLineChart({
      data: {
        robinsonFouldsDistances: this.robinsonFouldsDistances,
        weightedRobinsonFouldsDistances: this.weightedRobinsonFouldsDistances,
        scaleList: this.scaleList,
      },
      config: {
        barOptionValue: this.barOptionValue,
        currentTreeIndex: nextFullTreeIndex,
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
    this.updateMain();
  }

  manualPrevTree() {
    this.currentTreeIndex = Math.max(this.currentTreeIndex - 1, 0);
    this.stop();
    this.updateMain();
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
    const distanceIndex = this.transitionResolver.getDistanceIndex(this.currentTreeIndex);
    document.getElementById("currentFullTree").innerHTML = (distanceIndex + 1).toString();
    const numberOfFullTrees = this.transitionResolver?.fullTreeIndices.length || 0;
    document.getElementById("numberOfFullTrees").innerHTML = numberOfFullTrees.toString();
    document.getElementById("currentTree").innerHTML = (this.currentTreeIndex + 1).toString();
    document.getElementById("numberOfTrees").innerHTML = this.treeList.length;
    document.getElementById("treeLabel").innerHTML = this.getCurrentTreeLabel();
    const window = calculateWindow(distanceIndex, this.msaStepSize, this.msaWindowSize);
    document.getElementById("windowArea").innerHTML = `${window.startPosition} - ${window.endPosition}`;
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
    const fileName = `${this.fileName || "chart"}-${this.currentTreeIndex + 1}-${this.getTreeName()}.svg`;
    exportSaveChart(this, "application-container", fileName)
      .finally(() => {
        if (button) {
          button.disabled = false;
          button.innerText = "Save SVG";
        }
      });
  }

  getTreeName() {
    return this.getCurrentTreeLabel();
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
        const group = this._getGroupForTaxon(taxon, colorData.separator);
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

  _getGroupForTaxon(taxon, separator) {
    if (!taxon) return undefined;
    if (separator === "first-letter") return taxon.charAt(0).toUpperCase();
    return taxon.split(separator)[0];
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

  // ===== TransitionIndexResolver Initialization =====
  // FIX: Reordered to initialize the resolver before using it.
initializeTransitionResolver() {
    if (!this.treeNames || this.treeNames.length === 0) {
        console.warn("[GUI] Cannot initialize TransitionIndexResolver: treeNames is empty or undefined.");
        // Optionally, create a non-functional resolver or handle this state appropriately
        this.transitionResolver = new TransitionIndexResolver([], [], [], false, 0); // Basic fallback
        return;
    }

    const resolverSequenceData = this.treeNames.map(name => {
        let type = 'UNKNOWN';
        // Log for debugging
        if (name.startsWith('IT')) {
            type = 'IT';
        } else if (name.startsWith('C_')) {
            type = 'C';
        } else if (name.startsWith('T') && /T\d+$/.test(name)) {
            type = 'T';
        }
        return { name, type };
    });

    // Use the canonical highlightData property everywhere
    const highlightDataForResolver = this.highlightData || [];
    const numOriginalTransitions = highlightDataForResolver.length;

    // Ensure this.robinsonFouldsDistances is the correct distance data array
    const distanceDataForResolver = this.robinsonFouldsDistances || []; // Use an empty array if undefined

    // Enable debug mode for the resolver (set to true or false as needed)
    const debugResolver = true;

    this.transitionResolver = new TransitionIndexResolver(
        resolverSequenceData,
        highlightDataForResolver,
        distanceDataForResolver,
        debugResolver,
        numOriginalTransitions
    );

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

  // FIX: Moved this method INSIDE the Gui class.
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
    const currentScaleValue = this.getCurrentScaleValue();
    const maxScale = this.maxScale || 1;
    const scaleProgressBar = document.querySelector(".scale-progress-bar");
    if (scaleProgressBar) {
      const percentValue = Math.max(0, Math.min(100, (currentScaleValue / maxScale) * 100));
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

  getCurrentScaleValue() {
    if (this.scaleList?.[this.currentTreeIndex] !== undefined) {
        const scaleItem = this.scaleList[this.currentTreeIndex];
        return typeof scaleItem === 'object' ? scaleItem.value : scaleItem;
    }
    return 0;
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
