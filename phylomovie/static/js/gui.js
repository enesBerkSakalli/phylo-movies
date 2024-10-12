import calculateScales from "./calc.js";
import constructTree from "./TreeConstructor.js";
import drawTree from "./TreeDrawer.js";
import { generateDistanceChart } from "./distanceChart.js";

import {
  generateChartModal,
  saveChart as exportSaveChart,
} from "./chartGenerator.js";

export default class Gui {
  constructor(
    treeList,
    weightedRobinsonFouldsDistances,
    robinsonFouldsDistances,
    windowSize,
    windowStepSize,
    toBeHighlighted,
    leaveOrder,
    colorInternalBranches,
    fileName
  ) {
    this.treeList = treeList;
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
    this.toBeHighlighted = toBeHighlighted;
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
    this.factor = parseInt(document.getElementById("factor").value);

    this.playing = true;
  }

  initializeMovie() {
    this.resize();
    this.update();
  }

  getIntervalDuration() {
    let treeTimeList = [200, 200, 200, 500, 200];
    let type = this.index % 5;
    return (
      treeTimeList[type] * parseInt(document.getElementById("factor").value)
    );
  }

  play() {
    this.playing = true;
    d3.timeout(() => {
      this.keepPlaying();
    }, this.getIntervalDuration());
  }

  keepPlaying() {
    if (this.playing) {
      this.forward();
      d3.timeout(() => {
        this.keepPlaying();
      }, this.getIntervalDuration());
    }
  }

  update() {
    this.resize();
    this.updateLineChart();
    this.updateControls();
    this.updateScale();
    this.updateMain();
  }

  /**
   * This function is updating the Line Chart if the user want to see the RFE Distance Graph or the Scale list graph.
   * @return {void}
   */
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
          onClick: (position) => this.goToPosition(position),
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
    let width = document.getElementById("maxScale").offsetWidth;
    let currentScaleWidth =
      (width * this.scaleList[Math.floor(this.index / 5)].value) /
      this.maxScale;

    d3.select("#currentScale")
      .transition()
      .duration(1000)
      .style("width", currentScaleWidth + "px");
  }

  calculateWindow() {
    let midPosition = (Math.floor(this.index / 5) + 1) * this.windowStepSize;
    let leftWindow = Math.trunc(this.windowSize / 2);
    let rightWindow = Math.trunc((this.windowSize - 1) / 2);

    let startPosition = midPosition - leftWindow;
    let endPosition = midPosition + rightWindow;

    //if(startPosition < 1){
    //    startPosition = 1;
    //}

    startPosition = Math.max(1, startPosition);
    endPosition = Math.min(
      endPosition,
      this.treeList.length * this.windowStepSize
    );

    return {
      startPosition: startPosition,
      "mid-Position": midPosition,
      endPosition: endPosition,
    };
  }

  updateMain() {
    let drawDuration = this.getIntervalDuration();

    let tree = this.treeList[this.index];

    let d3tree = constructTree(tree, this.ignoreBranchLengths);

    let colorIndex =
      this.index % 5 === 0 && this.firstFull === 0
        ? Math.floor(this.index / 5) - 1
        : Math.floor(this.index / 5);

    //d3.select("#topology-change-detection-view").text(`Taxa Highlighted: ${this.toBeHighlighted[colorIndex]}`, ).style('font-size', '0.5em')

    drawTree(
      d3tree,
      this.toBeHighlighted[colorIndex],
      drawDuration,
      this.leaveOrder,
      this.fontSize,
      this.strokeWidth
    );
  }

  resize() {
    let applicationContainer = document.getElementById("applicationContainer");
    let width = applicationContainer.clientWidth;
    let height = applicationContainer.clientHeight;
    d3.select("#application").attr(
      "transform",
      "translate(" + width / 2 + "," + height / 2 + ")"
    );
  }

  start() {
    this.playing = true;
    this.keepPlaying();
  }

  stop() {
    this.playing = false;
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

  // ########## Charts ###########

  setShipPosition(fullTreeIndex) {
    let xAxis = document.getElementById("xAxis");

    let x =
      ((fullTreeIndex + 1) * xAxis.getBBox().width) /
      this.robinsonFouldsDistances.length;

    d3.select("#ship").attr("transform", `translate(${x},${0})`);
  }

  generateModalChart() {
    if (this.barOptionValue === "rfd") {
      console.log(this.robinsonFouldsDistances);
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

    if (this.scaleList && this.scaleList.length > 0) {
      // Get max scale value
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

    let window = this.calculateWindow();
    document.getElementById(
      "windowArea"
    ).innerHTML = `${window["startPosition"]} - ${window["endPosition"]}`;
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

  /**
   * Saves the specific chart SVG by utilizing the saveChart function from chartGenerator.js.
   */
  saveChart() {
    const button = document.getElementById("save-chart-button"); // Updated ID if necessary
    if (button) {
      button.disabled = true;
      button.innerText = "Saving...";
    }

    // Define the filename based on the current state
    const barOption = this.barOptionValue || "chart";
    const fileName = `${this.fileName || "chart"}-${barOption}.svg`;

    // Call the exported saveChart function
    exportSaveChart(this, "chart-graph-chart", fileName) // Ensure the container ID is correct
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

  /**
   * Saves the entire application SVG by utilizing the saveChart function from chartGenerator.js.
   */
  saveSVG() {
    const fileName = `${this.fileName || "chart"}-${
      Math.floor(this.index / 5) + 1
    }-${this.getTreeName()}.svg`;
    exportSaveChart(this, "applicationContainer", fileName)
      .then((message) => {
        console.log(message);
      })
      .catch((error) => {
        console.error("Failed to save application SVG:", error);
      });
  }

  /**
   * Retrieves the current tree name based on the index.
   * @returns {string} - The name of the current tree.
   */
  getTreeName() {
    const treeNameList = ["full", "inter", "cons", "cons", "inter"];
    const index = typeof this.index === "number" ? this.index : 0;
    return treeNameList[index % treeNameList.length] || "unknown";
  }
}
