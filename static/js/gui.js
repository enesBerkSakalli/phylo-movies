import calculateScales from "./calc.js";
import constructTree from "./TreeConstructor.js";
import drawTree from "./TreeDrawer.js";

import * as d3 from "https://cdn.skypack.dev/d3@7";

export default class Gui {
  constructor(phyloMovieStateObject) {
    this.treeNameList = [
      "Full. ",
      "Intermediate ",
      "Consensus 1 ",
      "Consensus 2 ",
      "Intermediate ",
    ];
    this.state = phyloMovieStateObject;
    this.scaleList = calculateScales(phyloMovieStateObject.treeList);

    const scaleListValues = this.scaleList.map(o => o.value);
    const maxScale = Math.max(...scaleListValues);

    document.getElementById("maxScaleText").textContent = ` ${maxScale}`;

    this.barOptionValue = "rfd";
    this.ignoreBranchLengths = false;
    this.maxScale = maxScale;
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

    if (this.state.robinsonFouldsDistances.length !== 1) {
      if (this.barOptionValue === "rfd") {
        let x = this.state.robinsonFouldsDistances.map(
          (row) => row["robinson_foulds"]["relative"]
        );
        this.generateLeftWindowChart(x, 'RFD');
      }
      if (this.barOptionValue === "w-rfd") {
        this.generateLeftWindowChart(this.state.weightedRobinsonFouldsDistances, 'WRFD');
      }
      if (this.barOptionValue === "scale") {
        let x = this.scaleList.map((row) => row["value"]);
        this.generateLeftWindowChart(x, 'Scale');
      }
      this.setShipPosition(Math.floor(this.index / 5));
    } else {

      document.getElementById("lineChart").innerHTML =
        `
        <p>
          Relative Robinson-Foulds Distance ${this.state.robinsonFouldsDistances[0].robinson_foulds.relative}
        </p>
        <p>
          Scale ${this.scaleList[Math.floor(this.index / 5)].value}
        </p>
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

  updateControls() {
    const indexFloorDiv5 = Math.floor(this.index / 5);
    const treeListLengthDiv5 = Math.floor(this.state.treeList.length / 5);
    const currentTree = Math.max(1, this.index + 1);
    const numberOfTrees = this.state.treeList.length;
    const treeLabel = this.treeNameList[this.index % 5];
    const maxScale = Math.max(...this.scaleList.map(o => o.value));
    const currentScale = this.scaleList[indexFloorDiv5].value;
    const window = this.calculateSlidingWindowPositions();

    document.getElementById("currentFullTree").textContent = (indexFloorDiv5 + 1).toString();
    document.getElementById("numberOfFullTrees").textContent = (treeListLengthDiv5 + 1).toString();
    document.getElementById("currentTree").textContent = currentTree;
    document.getElementById("numberOfTrees").textContent = numberOfTrees;
    document.getElementById("treeLabel").textContent = treeLabel;
    document.getElementById("maxScaleText").textContent = " " + maxScale;
    document.getElementById("currentScaleText").textContent = " " + currentScale;
    document.getElementById("windowArea").textContent = `${window.startPosition} - ${window.endPosition}`;
  }


  /**
   * Calculates the positions for the sliding window.
   * The sliding window approach is commonly used in the field of phylogeny to analyze evolutionary trees.
   * It involves defining a window of a certain size that moves along the tree, allowing the examination of different sections of the tree at each step.
   * @return {Object} The sliding window positions.
   */
  calculateSlidingWindowPositions() {
    /**
     * The midPosition represents the central position of the sliding window.
     * It is calculated based on the current index and the window step size.
     */
    const midPosition = (Math.floor(this.index / 5) + 1) * this.windowStepSize;

    /**
     * The leftWindow represents the number of positions to the left of the midPosition.
     * It is calculated as half of the window size.
     */
    const leftWindow = Math.trunc(this.windowSize / 2);

    /**
     * The startPosition represents the starting position of the sliding window.
     * It is calculated by subtracting the leftWindow from the midPosition and ensuring it is not less than 1.
     */
    const startPosition = Math.max(1, midPosition - leftWindow);

    /**
     * The endPosition represents the ending position of the sliding window.
     * It is calculated by adding the remaining positions (windowSize - leftWindow - 1) to the midPosition,
     * ensuring it does not exceed the total number of positions in the tree.
     */
    const endPosition = Math.min(
      midPosition + (this.windowSize - leftWindow - 1),
      this.state.treeList.length * this.windowStepSize
    );

    return {
      startPosition,
      midPosition,
      endPosition,
    };
  }


  /**
   * Updates the main tree visualization.
   * @return {void}
   */
  updateMain() {
    const drawDuration = this.getIntervalDuration();
    const tree = this.state.treeList[this.index];
    const d3tree = constructTree(tree, this.ignoreBranchLengths, 'application-container');

    if (this.index === 0) {
      this.colorIndex = 0;
    } else if (this.index % 5 === 0 && this.firstFull === 0) {
      this.colorIndex = Math.floor(this.index / 5) - 1;
    } else {
      this.colorIndex = Math.floor(this.index / 5);
    }

    drawTree(
      d3tree,
      this.state.toBeHighlighted[this.colorIndex],
      drawDuration,
      this.state.sortedLeaves,
      this.fontSize,
      this.strokeWidth,
      "application",
      this.state.taxaColorMap
    );
  }


  goToPosition(position) {
    this.firstFull = 1;
    this.index = Math.min(Math.max(0, position * 5), this.state.treeList.length);
    this.update();
  }

  resize() {
    let applicationContainer = document.getElementById("application-container");
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
      this.index = Math.min(this.index + 1, this.state.treeList.length - 1);
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
      this.state.treeList.length - 1
    );
    this.update();
  }

  saveSVG() {
    let treeNameList = ["full", "inter", "cons", "cons", "inter"];

    let containerWidth = document.getElementById("application").getBBox().width;

    let containerHeight = document
      .getElementById("application")
      .getBBox().height;

    containerWidth += containerWidth * 0.05;
    containerHeight += containerHeight * 0.05;

    const svg = document
      .getElementById("application-container")
      .cloneNode(true); // clone your original svg

    svg.setAttribute("id", "imageExport");

    document.body.appendChild(svg); // append element to document

    const g = svg.querySelector("g"); // select the parent g

    g.setAttribute(
      "transform",
      `translate(${containerWidth / 2},${containerHeight / 2})`
    ); // clean transform

    svg.setAttribute("width", containerWidth); // set svg to be the g dimensions

    svg.setAttribute("height", containerHeight);

    const svgAsXML = new XMLSerializer().serializeToString(svg);

    const svgData = `data:image/svg+xml,${encodeURIComponent(svgAsXML)}`;

    const link = document.createElement("a");

    document.body.appendChild(link);

    link.setAttribute("href", svgData);

    link.setAttribute(
      "download",
      `${this.fileName}-${Math.floor(this.index / 5) + 1}-${treeNameList[this.index % 5]
      }.svg`
    );

    link.click();

    document.getElementById("imageExport").remove();
  }

  setShipPosition(fullTreeIndex) {
    let xAxis = document.getElementById("xAxis");

    let x =
      ((fullTreeIndex + 1) * xAxis.getBBox().width) /
      this.state.robinsonFouldsDistances.length;

    d3.select("#ship").attr("transform", `translate(${x},${0})`);
  }

  generateLeftWindowChart(data, yTitle) {
    let applicationContainer = document.getElementById("lineChart");

    let width = applicationContainer.clientWidth;
    let height = applicationContainer.clientHeight;

    // set the dimensions and margins of the graph
    let margin = {
      right: 25,
      left: 40,
      bottom: 60,
      top: 10,
    };

    // append the svg object to the body of the page
    let svg = d3
      .select("#lineChart")
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("back", "black")
      .append("g")
      .attr("id", "chart")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    width = width - margin.left - margin.right;
    height = height - margin.top - margin.bottom;

    // Read the data
    // Add X axis --> it is a date format
    let x = d3.scaleLinear().domain([1, data.length]).range([1, width]);

    svg
      .append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x))
      .attr("id", "xAxis");

    svg
      .append("g")
      .attr("id", "rd")
      .attr("transform", "translate(0," + (height - 5) + ")")
      .append("g")
      .attr("id", "ship")
      .attr("transform", "translate(1.5," + 0 + ")")
      .append("line")
      .attr("stroke", "red")
      .attr("stroke-width", "1.5%")
      .attr("y2", 12);

    svg
      .selectAll("text")
      .attr("transform", "translate(-12,18) rotate(-90)")
      .style("font-size", "1.2em")
      .on("click", (e) => {
        let position = parseInt(e.target.innerHTML) - 1;

        this.goToPosition(position);
      })
      .style("cursor", "pointer")
      .style("color", "white");

    let maxValue = Math.max(...data);

    // Add Y axis
    let y = d3.scaleLinear().domain([0, maxValue]).range([height, 0]);

    svg.append("g").call(d3.axisLeft(y));

    // Add the line
    svg
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("stroke-width", 1.5)
      .attr(
        "d",
        d3
          .line()
          .x(function (d, i) {
            return x(i + 1);
          })
          .y(function (d) {
            return y(d);
          })
      );

    svg
      .append("text")
      .attr("class", "x-label")
      .attr("text-anchor", "end")
      .attr("x", width / 2)
      .attr("y", height + 50)
      .attr("dy", ".35em")
      .attr("fill", "white")
      .text("Tree Index")
      .style("font-size", "0.8em");

    svg
      .append("text")
      .attr("class", "y-label")
      .attr("text-anchor", "end")
      .attr("x", -60)
      .attr("y", -35)
      .attr("dy", ".35em")
      .attr("transform", "rotate(-90)")
      .attr("fill", "white")
      .text(yTitle)
      .style("font-size", "0.8em");
  }

  setModalShip(index, value) {
    let xAxis = document.getElementById("xAxis-modal");

    let x = ((index + 1) * xAxis.getBBox().width) / value;

    d3.select("#ship-modal").attr("transform", `translate(${x},${0})`);
  }

  /**
   * Generates a modal chart based on the selected bar option value.
   * @return {void}
   */
  generateModalChart() {
    /**
     * Generate the chart modal HTML structure.
     */
    const chartModal = document.getElementById("chart-modal");
    chartModal.innerHTML = `
    <div class="uk-modal-dialog uk-modal-body">
        <canvas id="graph-chart"></canvas>
        <p class="uk-text-right">
            <button class="uk-button uk-button-default uk-modal-close" type="button">Cancel</button>
            <button id="save-chart-button" class="uk-button uk-button-primary" type="button">Save</button>
        </p>
    </div>
  `;

    let x, y, chartTitle;

    if (this.barOptionValue === "rfd") {
      x = this.state.robinsonFouldsDistances.map((row) => row.tree);
      y = this.state.robinsonFouldsDistances.map((row) => row["robinson_foulds"]["relative"]);
      chartTitle = "Relative Robinson Foulds Distance";
    } else if (this.barOptionValue === "w-rfd") {
      x = this.state.robinsonFouldsDistances.map((row) => row.tree);
      y = this.state.weightedRobinsonFouldsDistances;
      chartTitle = "Weighted Robinson Foulds Distance";
    } else if (this.barOptionValue === "scale") {
      x = this.state.robinsonFouldsDistances.map((row) => row.tree);
      y = this.scaleList.map((row) => row.value);
      chartTitle = "Scale of the longest edge";
    }

    this.generateChart(x, y, chartTitle);
  }


  /**
   * This function generates the RFE Line Graph.
   * @param {Array} x - The x-axis data.
   * @param {Array} y - The y-axis data.
   * @param {string} chartTitle - The title of the chart.
   * @returns {void}
   */
  generateChart(x, y, chartTitle) {
    const ctx = document.getElementById("graph-chart");
    const chartData = {
      labels: x,
      datasets: [
        {
          label: chartTitle,
          data: y,
        },
      ],
    };

    const saveChartButton = document.getElementById('save-chart-button');

    let chart = new Chart(ctx, {
      type: "line",
      data: chartData,
    });

    saveChartButton.addEventListener('click', () => {
      const dataUrl = chart.toBase64Image();
      const downloadLink = document.createElement('a');
      downloadLink.href = dataUrl;
      downloadLink.download = `${chartTitle}.png`;
      downloadLink.click();
    });
  }


}
