import * as d3 from "d3";
import { generateChartModal } from "./charts/chartGenerator.js";
import { generateDistanceChart } from "./charts/distanceChart.js";
import * as scatterPlotModule from "./space/scatterPlot.js";
import TaxaColoring from "./taxaColoring.js";
import { createSideBySideComparisonModal } from "./treeComparision/treeComparision.js";
import calculateScales from "./treeVisualisation/calc.js";
import constructTree from "./treeVisualisation/TreeConstructor.js";
import drawTree, { TreeDrawer } from "./treeVisualisation/TreeDrawer.js";
import { exportSaveChart } from "./utils/svgExporter.js";
import { handleZoomResize, initializeZoom } from "./zoom/zoomUtils.js";
import { COLOR_MAP } from "./treeVisualisation/ColorMap.js";


// ===== GUI Class =====
export default class Gui {
  // ===== MSA Sync Toggle =====
  syncMSAEnabled = true;
  // ===== Constructor & Initialization =====x
  constructor(
    treeList,
    weightedRobinsonFouldsDistances,
    robinsonFouldsDistances,
    windowSize,
    windowStepSize,
    toBeHighlighted,
    leaveOrder,
    colorInternalBranches,
    fileName,
    factorValue = 1
  ) {
    this.treeList = treeList;
    // Store only the real (full) trees: every 5th tree
    this.realTreeList = Array.isArray(treeList)
      ? treeList.filter((_, i) => i % 5 === 0)
      : [];
    this.treeNameList = [
      "Full. ",
      "Intermediate ",
      "Consensus 1 ",
      "Consensus 2 ",
      "Intermedidate ",
    ];
    this.robinsonFouldsDistances = robinsonFouldsDistances;
    this.fileName = fileName;
    this.scaleList = calculateScales(treeList);
    this.windowSize = windowSize;
    this.windowStepSize = windowStepSize;
    this.windowStart = null;
    this.windowEnd = null;

    // Flatten toBeHighlighted entries to handle potential deep nesting
    this.toBeHighlighted = toBeHighlighted

    console.log(
      "[gui] toBeHighlighted:",
      this.toBeHighlighted,
      "leaveOrder:",
      leaveOrder
    );

    console.log(
      "[gui] Initializing GUI with treeList length:",
      this.treeList.length,
      "and toBeHighlighted length:",
      this.toBeHighlighted.length
    );
    this.leaveOrder = leaveOrder;
    this.firstFull = 0;
    this.fontSize = 1.8;
    this.strokeWidth = 3;
    this.weightedRobinsonFouldsDistances = weightedRobinsonFouldsDistances;

    document.getElementById("maxScaleText").innerText =
      " " +
      Math.max.apply(
        Math,
        this.scaleList.map(function (o) {
          return o.value;
        })
      );

    this.colorInternalBranches = colorInternalBranches;

    this.barOptionValue = "rfd";

    this.ignoreBranchLengths = false;

    this.maxScale = Math.max.apply(
      Math,
      this.scaleList.map((o) => o.value)
    );

    this.index = 0;

    // Use provided factor value or default to 1
    this.factor = factorValue;

    this.playing = false;

    // Simplified color map initialization
    const taxaColorMap = {};
    if (this.leaveOrder && Array.isArray(this.leaveOrder)) {
      this.leaveOrder.forEach((taxon) => {
          taxaColorMap[taxon] = COLOR_MAP.colorMap.defaultColor;
      });
    }

    // Defer zoom initialization
    requestAnimationFrame(() => {
      this.zoom = initializeZoom(this);
    });

    // Update COLORMAP.colorMap with the initial default colors
    if (Object.keys(taxaColorMap).length > 0) {
      COLOR_MAP.colorMap = { ...COLOR_MAP.colorMap, ...taxaColorMap };
    }
  }

  // ===== Movie Controls =====
  initializeMovie() {
    this.resize();
    this.update();
  }

  // ===== Timing & Animation =====
  getIntervalDuration() {
    let treeTimeList = [200, 200, 200, 500, 200];
    let type = this.index % 5;

    // More robust factor handling
    let factor = 1;
    try {
      const factorInput = document.getElementById("factor");
      if (factorInput && factorInput.value) {
        const parsedFactor = parseInt(factorInput.value, 10);
        // Ensure factor is within reasonable bounds
        factor =
          !isNaN(parsedFactor) && parsedFactor > 0
            ? parsedFactor
            : this.factor || 1;
      } else {
        factor = this.factor || 1;
      }
    } catch (e) {
      console.warn("[gui] Error getting factor:", e);
      factor = this.factor || 1;
    }

    return treeTimeList[type] * factor;
  }

  play() {
    // Ensure play is only called once
    if (this.playing) return;

    this.playing = true;

    // Use window.requestAnimationFrame for smoother animation
    this.lastFrameTime = performance.now();
    this.frameRequest = window.requestAnimationFrame(
      this.animationLoop.bind(this)
    );
  }

  // ===== Modal Aliases =====
  openScatterplotModal(...args) {
    return this.showScatterPlotModal(...args);
  }

  // ===== Animation Loop =====
  animationLoop(timestamp) {
    if (!this.playing) return;

    const elapsed = timestamp - this.lastFrameTime;
    const interval = this.getIntervalDuration();

    if (elapsed >= interval) {
      // Time to advance frame
      this.forward();
      this.lastFrameTime = timestamp;
    }

    // Schedule next frame
    this.frameRequest = window.requestAnimationFrame(
      this.animationLoop.bind(this)
    );
  }

  stop() {
    if (!this.playing) return;

    this.playing = false;

    // Cancel any pending animation frame
    if (this.frameRequest) {
      window.cancelAnimationFrame(this.frameRequest);
      this.frameRequest = null;
    }
  }

  keepPlaying() {
    if (this.playing) {
      this.forward();
      d3.timeout(() => {
        this.keepPlaying();
      }, this.getIntervalDuration());
    }
  }

  // ===== Main Update Cycle =====
  update() {
    this.resize();
    this.updateLineChart();
    this.updateControls();
    this.updateScale();
    this.updateMain();

    // Sync MSA viewer if it's open and sync is enabled (internal check in syncMSAIfOpen)
    this.syncMSAIfOpen();
  }

  // ===== UI Event Handlers =====
  handleDrag(position) {
    // Update the index based on the dragged position
    this.index = position * 5; // Adjust if necessary based on your data structure

    // Update the application state
    this.update();
  }

  // ===== MSA Viewer Sync =====
  syncMSAIfOpen() {
    if (!this.syncMSAEnabled) {
      console.log("MSA sync skipped: Sync not enabled.");
      return;
    }

    let highlightedTaxa = [];
    if (this.marked && this.marked.size > 0) {
      highlightedTaxa = Array.from(this.marked);
    } else if (this.toBeHighlighted && this.toBeHighlighted[Math.floor(this.index / 5)]) {
      // Ensure toBeHighlighted is treated as a flat list if it's not already
      const currentHighlights = this.toBeHighlighted[Math.floor(this.index / 5)];
      if (Array.isArray(currentHighlights)) {
        currentHighlights.forEach(item => {
          if (Array.isArray(item)) { // Handles nested arrays if structure is [ [...], [...] ]
            item.forEach(taxon => highlightedTaxa.push(taxon));
          } else { // Handles flat list or mixed list [ item, [...], item ]
            highlightedTaxa.push(item);
          }
        });
      }
    }
    // Remove duplicates that might arise from toBeHighlighted logic
    highlightedTaxa = [...new Set(highlightedTaxa)];

    const treeIndex = Math.floor(this.index / 5);
    // Ensure windowStepSize is a positive number to avoid NaN or zero position if data is missing
    const stepSize = this.windowStepSize > 0 ? this.windowStepSize : 1;
    const currentPosition = (treeIndex + 1) * stepSize;

    let windowInfo = null;
    // Ensure windowStart and windowEnd are valid numbers before creating windowInfo
    if (typeof this.windowStart === 'number' && typeof this.windowEnd === 'number' &&
        !isNaN(this.windowStart) && !isNaN(this.windowEnd)) {
      windowInfo = {
        windowStart: this.windowStart,
        windowEnd: this.windowEnd,
      };
    }

    const eventDetail = { highlightedTaxa, position: currentPosition, windowInfo };

    console.log("Dispatching msa-sync-request with detail:", eventDetail);
    window.dispatchEvent(new CustomEvent('msa-sync-request', { detail: eventDetail }));
  }

  enableMSASync() {
    this.syncMSAEnabled = true;
    // Optionally trigger a sync immediately
    this.syncMSAIfOpen();
  }

  disableMSASync() {
    this.syncMSAEnabled = false;
  }

  // Add method to update highlighted taxa (call this when taxa are selected/highlighted)
  setHighlightedTaxa(taxa) {
    this.marked = new Set(taxa);
    // Trigger MSA sync (internal check in syncMSAIfOpen)
    this.syncMSAIfOpen();
  }

  // Add method to get current window information
  getCurrentWindow() {
    const window = this.calculateWindow();
    this.windowStart = window.startPosition;
    this.windowEnd = window.endPosition;
    return window;
  }

  // Update the calculateWindow method to store results
  calculateWindow() {
    let midPosition = (Math.floor(this.index / 5) + 1) * this.windowStepSize;
    let leftWindow = Math.trunc(this.windowSize / 2);
    let rightWindow = Math.trunc((this.windowSize - 1) / 2);

    let startPosition = midPosition - leftWindow;
    let endPosition = midPosition + rightWindow;

    startPosition = Math.max(1, startPosition);
    endPosition = Math.min(
      endPosition,
      this.treeList.length * this.windowStepSize
    );

    // Store for MSA sync
    this.windowStart = startPosition;
    this.windowEnd = endPosition;

    return {
      startPosition: startPosition,
      "mid-Position": midPosition,
      endPosition: endPosition,
    };
  }

  // ===== Chart Methods =====
  updateLineChart() {
    d3.select("#lineChart svg").remove();

    if (this.robinsonFouldsDistances.length !== 1) {
      const chartConfigurations = {
        rfd: {
          data: this.robinsonFouldsDistances,
          xLabel: "Tree Index",
          yLabel: "Relative RFD",
          yMax: 1,
        },
        "w-rfd": {
          data: this.weightedRobinsonFouldsDistances,
          xLabel: "Tree Index",
          yLabel: "Weighted RFD",
          yMax: d3.max(this.weightedRobinsonFouldsDistances),
        },
        scale: {
          data: this.scaleList.map((s) => s.value),
          xLabel: "Tree Index",
          yLabel: "Scale",
          yMax: d3.max(this.scaleList, (s) => s.value),
        },
      };

      const config = chartConfigurations[this.barOptionValue];
      if (config) {
        generateDistanceChart({ containerId: "lineChart" }, config.data, {
          xLabel: config.xLabel,
          yLabel: config.yLabel,
          yMax: config.yMax,
          currentPosition: Math.floor(this.index / 5),
          onClick: (position) => this.goToPosition(position),
          onDrag: (position) => this.handleDrag(position),
        });
      } else {
        console.warn("Invalid barOptionValue:", this.barOptionValue);
      }

      this.setShipPosition(Math.floor(this.index / 5));
    } else {
      document.getElementById("lineChart").innerHTML = `
        <p>Relative Robinson-Foulds Distance ${
          this.robinsonFouldsDistances[0]
        }</p>
        <p>Scale ${this.scaleList[Math.floor(this.index / 5)].value}</p>
      `;
    }
  }

  updateScale() {
    // Check if the old elements exist
    const maxScaleElement = document.getElementById("maxScale");

    if (maxScaleElement) {
      // Old scale visualization code
      let width = maxScaleElement.offsetWidth;
      let currentScaleWidth =
        (width * this.scaleList[Math.floor(this.index / 5)].value) /
        this.maxScale;

      d3.select("#currentScale")
        .transition()
        .duration(1000)
        .style("width", currentScaleWidth + "px");
    } else {
      // For the modern scale visualization
      try {
        // Update the scale value texts
        const currentScaleValue =
          this.scaleList[Math.floor(this.index / 5)].value || 0;
        const currentScaleText = document.getElementById("currentScaleText");
        if (currentScaleText) {
          currentScaleText.innerText = " " + currentScaleValue.toFixed(3);
        }

        // Update the progress bar if it exists
        const scaleProgressBar = document.querySelector(".scale-progress-bar");
        if (scaleProgressBar) {
          const percentValue = (currentScaleValue / this.maxScale) * 100;
          scaleProgressBar.style.width = `${percentValue}%`;
        }
      } catch (err) {
        console.warn("Error updating scale visualization:", err);
      }
    }
  }

  // ===== Tree Navigation & State =====
  updateMain() {
    let drawDuration = this.getIntervalDuration();

    let tree = this.treeList[this.index];

    let d3tree = constructTree(tree, this.ignoreBranchLengths);

    let colorIndex =
      this.index % 5 === 0 && this.firstFull === 0
        ? Math.floor(this.index / 5) - 1
        : Math.floor(this.index / 5);

    // Ensure animation starts after DOM is ready
    requestAnimationFrame(() => {
      drawTree(
        d3tree,
        this.toBeHighlighted[colorIndex],
        drawDuration,
        this.leaveOrder,
        this.fontSize,
        this.strokeWidth
      );
    });
  }

  resize() {
    // Use the zoom utility for proper resize handling
    handleZoomResize();
  }


  backward() {
    if (this.index % 5 === 0 && this.firstFull === 0) {
      this.firstFull = 1;
    } else {
      this.firstFull = 0;
      this.index = Math.max(this.index - 1, 0);
    }
    this.update();
  }

  forward() {
    if (this.index % 5 === 0 && this.firstFull === 0) {
      this.firstFull = 1;
    } else {
      this.firstFull = 0;
      this.index = Math.min(this.index + 1, this.treeList.length - 1);
    }
    this.update();
  }

  prevTree() {
    this.firstFull = 1;
    this.index = Math.max((Math.floor(this.index / 5) - 1) * 5, 0);
    this.update();
  }

  nextTree() {
    this.firstFull = 1;
    this.index = Math.min(
      (Math.floor(this.index / 5) + 1) * 5,
      this.treeList.length - 1
    );
    this.update();
  }

  // ===== Chart Positioning =====

  setShipPosition(fullTreeIndex) {
    let xAxis = document.getElementById("xAxis");

    let x =
      ((fullTreeIndex + 1) * xAxis.getBBox().width) /
      this.robinsonFouldsDistances.length;

    d3.select("#ship").attr("transform", `translate(${x},${0})`);
  }

  generateModalChart() {
    if (this.barOptionValue === "rfd") {
      const config = {
        title: "Relative Robinson-Foulds Distance",
        xAccessor: (d, i) => i,
        yAccessor: (d) => d,
        xLabel: "Tree Index",
        yLabel: "Relative RFD",
        tooltipFormatter: (d, i) => `
          <strong>Tree Index:</strong> ${i + 1}<br/>
          <strong>Relative RFD:</strong> ${d.toFixed(3)}
        `,
      };
      this.currentPosition = this.index;
      generateChartModal(this.robinsonFouldsDistances, this, config);
    } else if (this.barOptionValue === "w-rfd") {
      const config = {
        title: "Weighted Robinson-Foulds Distance",
        xAccessor: (d, i) => i + 1,
        yAccessor: (d) => d,
        xLabel: "Tree Index",
        yLabel: "Weighted RFD",
        tooltipFormatter: (d, i) => `
          <strong>Tree Index:</strong> ${i + 1}<br/>
          <strong>Weighted RFD:</strong> ${d.toFixed(3)}
        `,
      };
      this.currentPosition = this.index;
      generateChartModal(this.weightedRobinsonFouldsDistances, this, config);
    } else if (this.barOptionValue === "scale") {
      const config = {
        title: "Scale Changes Over Trees",
        xAccessor: (d) => d.index + 1, // Use 'index' property
        yAccessor: (d) => d.value, // Use 'value' property
        xLabel: "Tree Index",
        yLabel: "Scale",
        tooltipFormatter: (d) => `
          <strong>Tree Index:</strong> ${d.index + 1}<br/>
          <strong>Scale:</strong> ${d.value.toFixed(3)}
        `,
      };
      this.currentPosition = Math.floor(this.index / 5);
      generateChartModal(this.scaleList, this, config);
    }
  }

  // ===== UI Controls =====

  updateControls() {
    document.getElementById("currentFullTree").innerHTML = (
      Math.floor(this.index / 5) + 1
    ).toString();

    document.getElementById("numberOfFullTrees").innerHTML = (
      Math.floor(this.treeList.length / 5) + 1
    ).toString();

    document.getElementById("currentTree").innerHTML = Math.max(
      1,
      this.index + 1
    );

    document.getElementById("numberOfTrees").innerHTML = this.treeList.length;

    if (this.treeNameList && this.treeNameList.length > 0) {
      document.getElementById("treeLabel").innerHTML =
        this.treeNameList[this.index % this.treeNameList.length];
    } else {
      document.getElementById("treeLabel").innerHTML = "N/A";
    }

    this.updateScaleTexts();

    let window = this.calculateWindow();
    document.getElementById(
      "windowArea"
    ).innerHTML = `${window["startPosition"]} - ${window["endPosition"]}`;
  }

  updateScaleTexts() {
    if (this.scaleList && this.scaleList.length > 0) {
      const maxScaleValue = Math.max(...this.scaleList.map((o) => o.value));
      document.getElementById("maxScaleText").innerText =
        " " + maxScaleValue.toFixed(3);

      const scaleIndex = Math.floor(this.index / 5);
      if (this.scaleList[scaleIndex] !== undefined) {
        const currentScaleValue = this.scaleList[scaleIndex].value;
        document.getElementById("currentScaleText").innerText =
          " " + currentScaleValue.toFixed(3);
      } else {
        document.getElementById("currentScaleText").innerText = " N/A";
      }
    } else {
      document.getElementById("maxScaleText").innerText = " N/A";
      document.getElementById("currentScaleText").innerText = " N/A";
    }
  }

  goToPosition(position) {
    // Validate position
    if (isNaN(position) || position < 0 || position >= this.treeList.length) {
      console.warn("Invalid position:", position);
      return;
    }
    this.index = position * 5;
    this.update();
  }

  // ===== Export & Save =====
  saveChart() {
    const button = document.getElementById("save-chart-button");
    if (button) {
      button.disabled = true;
      button.innerText = "Saving...";
    }

    // Define the filename based on the current state
    const barOption = this.barOptionValue || "chart";
    const fileName = `${this.fileName || "chart"}-${barOption}.svg`;

    // Call the exported saveChart function
    exportSaveChart(this, "lineChart", fileName)
      .then((message) => {
        console.log(message);
        if (button) {
          button.disabled = false;
          button.innerText = "Save";
        }
      })
      .catch((error) => {
        console.error("Failed to save chart SVG:", error);
        if (button) {
          button.disabled = false;
          button.innerText = "Save";
        }
      });
  }

  saveSVG() {
    const button = document.getElementById("save-svg-button");
    if (button) {
      button.disabled = true;
      button.innerText = "Saving...";
    }

    const fileName = `${this.fileName || "chart"}-${
      Math.floor(this.index / 5) + 1
    }-${this.getTreeName()}.svg`;

    exportSaveChart(this, "application-container", fileName)
      .then((message) => {
        console.log(message);
        if (button) {
          button.disabled = false;
          button.innerText = "Save SVG";
        }
      })
      .catch((error) => {
        console.error("Failed to save application SVG:", error);
        if (button) {
          button.disabled = false;
          button.innerText = "Save SVG";
        }
      });
  }

  getTreeName() {
    const treeNameList = ["full", "inter", "cons", "cons", "inter"];
    const index = typeof this.index === "number" ? this.index : 0;
    return treeNameList[index % treeNameList.length] || "unknown";
  }

  // ===== Modal Management =====
  async openComparisonModal() {
    // Initialize comparison modals if not exists
    if (!this.comparisonModals) {
      this.comparisonModals = {};
    }

    // Get the current real tree index (every 5th tree in the list)
    const currentRealTreeIndex = Math.floor(this.index / 5) * 5;
    const nextRealTreeIndex = currentRealTreeIndex + 5;
    const windowIndex = Math.floor(this.index / 5);

    // Check if we have enough trees for comparison
    if (nextRealTreeIndex >= this.treeList.length) {
      // If no next tree, compare with previous tree if available
      const prevRealTreeIndex = currentRealTreeIndex - 5;
      const prevWindowIndex = windowIndex - 1;
      if (prevRealTreeIndex < 0) {
        alert(
          "Not enough trees to compare. Need at least 2 trees in the dataset."
        );
        return;
      }
      await createSideBySideComparisonModal({
        tree1Index: prevRealTreeIndex,
        tree2Index: currentRealTreeIndex,
        leaveOrder: this.leaveOrder,
        ignoreBranchLengths: this.ignoreBranchLengths,
        fontSize: this.fontSize,
        strokeWidth: this.strokeWidth,
        toBeHighlighted: this.toBeHighlighted[prevWindowIndex] || [],
        treeList: this.treeList,
        comparisonModals: this.comparisonModals,
      });
    } else {
      await createSideBySideComparisonModal({
        tree1Index: currentRealTreeIndex,
        tree2Index: nextRealTreeIndex,
        leaveOrder: this.leaveOrder,
        ignoreBranchLengths: this.ignoreBranchLengths,
        fontSize: this.fontSize,
        strokeWidth: this.strokeWidth,
        toBeHighlighted: this.toBeHighlighted[windowIndex] || [],
        treeList: this.treeList,
        comparisonModals: this.comparisonModals,
      });
    }
  }

  openTaxaColoringModal() {
    if (!this.leaveOrder || this.leaveOrder.length === 0) {
      alert("No taxa names available for coloring.");
      return;
    }

    const onCompleteCallback = (colorData) => {
      const newColorMap = {};
      if (colorData.mode === "taxa") {
        for (const [taxon, color] of colorData.taxaColorMap) {
          newColorMap[taxon] = color;
        }
      } else if (colorData.mode === "groups") {
        // Helper function to get group for a taxon
        const getGroupForTaxon = (taxon, separator) => {
          if (!taxon) return undefined;
          if (separator === "first-letter") {
            return taxon.charAt(0).toUpperCase();
          }
          const parts = taxon.split(separator);
          return parts[0];
        };

        this.leaveOrder.forEach((taxon) => {
          const group = getGroupForTaxon(taxon, colorData.separator);
          const groupColor = colorData.groupColorMap.get(group);
          if (groupColor) {
            newColorMap[taxon] = groupColor;
          } else {
            // Retain existing color or default if group/color not found
            newColorMap[taxon] =
              COLORMAP.colorMap[taxon] ||
              COLORMAP.colorMap.defaultColor ||
              "#000000";
          }
        });
      }

      // Merge with existing COLORMAP.colorMap, prioritizing new colors
      COLOR_MAP.colorMap = { ...COLOR_MAP.colorMap, ...newColorMap };
      this.updateMain(); // Redraw the tree
      console.log("Taxa colors updated:", COLOR_MAP.colorMap);
    };

    // Assuming groupNames are not explicitly managed in Gui, pass empty or derive if needed.
    // Pass the current COLOR_MAP.colorMap as originalColorMap.
    new TaxaColoring(
      this.leaveOrder,
      [], // groupNames - can be empty if TaxaColoring derives them or not strictly needed for its init
      { ...COLOR_MAP.colorMap }, // originalColorMap - pass a copy
      onCompleteCallback
    );
  }

  // ===== Modal Management: Scatter Plot =====
  showScatterPlotModal() {
    // All imports at the top of the file for clarity and maintainability.
    // This method is a thin wrapper that delegates to scatterPlot.js for all logic and UI.
    // It is kept for backward compatibility and to maintain the modal management pattern.
    // (import moved to top)
    scatterPlotModule.showScatterPlotModal({
      realTreeList: this.realTreeList,
      treeList: this.treeList,
      modals: this.modals,
      setModals: (modals) => {
        this.modals = modals;
      },
    });
  }

  // ===== Modal Management =====
  openMSAViewer() {
    // Trigger MSA viewer to open with dark theme
    window.dispatchEvent(new CustomEvent("open-msa-viewer", {
      detail: {
        source: 'gui',
        currentPosition: Math.floor(this.index / 5),
        windowInfo: this.getCurrentWindow(),
        theme: 'dark' // Ensure dark theme is applied
      }
    }));
  }
}
