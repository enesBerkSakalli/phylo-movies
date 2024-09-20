/**
 * Debounce function to limit the rate at which a function can fire.
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The time to wait in milliseconds.
 * @returns {Function} - The debounced function.
 */
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Generates and displays a modal window containing the chart.
 * @param {Array} data - The data to visualize.
 * @param {Gui} guiInstance - The instance of the Gui class.
 * @param {Object} config - Configuration object for the chart.
 */
export function generateChartModal(data, guiInstance, config) {
  // Step 1: Create the modal window
  const winbox = createModalWindow(config.title, () => {
    console.log("WinBox window closed");
  });

  // Step 2: Set up event listeners
  setupEventListeners(winbox, guiInstance);

  // Step 3: Render the chart after the modal is ready
  setTimeout(() => {
    renderChart(guiInstance, data, config);

    // Step 4: Set the onresize handler to update the chart dynamically
    // Debounce the resize handler to improve performance during rapid resizing
    winbox.onresize = debounce(
      () => updateModalChart(guiInstance, data, config),
      200
    );
  }, 0);
}

/**
 * Creates a WinBox modal window with the Save button positioned below the plot.
 * @param {string} title - The title of the modal window.
 * @param {Function} onCloseCallback - Callback function when the window is closed.
 * @returns {WinBox} - The created WinBox instance.
 */
function createModalWindow(title, onCloseCallback) {
  const winbox = new WinBox({
    title: title,
    width: "75%",
    height: "50%",
    top: 10,
    right: 10,
    bottom: 10,
    left: 10,
    html: `
      <div style="display: flex; flex-direction: column; height: 100%;">
        <!-- Chart Container -->
        <div id="modal-graph-chart" style="flex: 1; width: 100%; position: relative;"></div>
        <!-- Save Button -->
        <div style="padding-top: 10px; text-align: left;">
          <button id="save-chart-button" style="
            padding: 10px 20px;
            cursor: pointer;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            transition: background-color 0.3s, transform 0.2s;
          ">
            Save
          </button>
        </div>
      </div>
    `,
    onclose: onCloseCallback,
  });
  return winbox;
}

/**
 * Sets up event listeners for the modal window buttons.
 * @param {WinBox} winbox - The WinBox instance.
 * @param {Gui} guiInstance - The instance of the Gui class.
 */
function setupEventListeners(winbox, guiInstance) {
  // Save Chart Button
  winbox.body
    .querySelector("#save-chart-button")
    .addEventListener("click", () => {
      saveChart(guiInstance, "modal-graph-chart", "chart.svg")
        .then((message) => console.log(message))
        .catch((error) => console.error(error));
    });

  // Note: The Close button is managed by WinBox.js
}

/**
 * Renders the chart within the modal window.
 * @param {Gui} guiInstance - The instance of the Gui class.
 * @param {Array} data - The data to visualize.
 * @param {Object} config - Configuration object for the chart.
 */
function renderChart(guiInstance, data, config) {
  // Step 1: Define chart margins based on the container size
  const container = document.getElementById("modal-graph-chart");
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  // Dynamic margins based on container size (adjust ratios as needed)
  const margin = {
    top: containerHeight * 0.05, // 5% of container height
    right: containerWidth * 0.05, // 5% of container width
    bottom: containerHeight * 0.05, // 10% of container height
    left: containerWidth * 0.05, // 10% of container width
  };

  // Step 2: Calculate chart dimensions
  const width = containerWidth - margin.left - margin.right;
  const height = containerHeight - margin.top - margin.bottom;
  guiInstance.modalWidth = width;
  guiInstance.modalHeight = height;

  // Step 3: Define scales based on data
  const { xScale, yScale, actualTicks } = defineScales(
    data,
    width,
    height,
    config
  );
  guiInstance.modalXScale = xScale;
  guiInstance.modalYScale = yScale;
  guiInstance.actualTicks = actualTicks;

  // Step 4: Remove existing SVG and create a new one
  const svg = createSvg("modal-graph-chart", width, height, margin);
  guiInstance.modalSvg = svg;

  // Step 5: Draw axes
  drawAxes(svg, xScale, yScale, width, height, actualTicks, margin, config);

  // Step 6: Add gridlines
  addGridlines(svg, xScale, yScale, width, height, actualTicks);

  // Step 7: Draw line path
  drawLinePath(svg, data, xScale, yScale, config);

  // Step 8: Draw data points with interactivity
  const circles = drawDataPoints(
    svg,
    data,
    xScale,
    yScale,
    guiInstance,
    config
  );

  // Step 9: Add tooltips
  addTooltips(circles, config);

  // Step 10: Add the "ship" vertical line indicating the current position
  setModalShip(guiInstance.currentPosition, guiInstance, config);
}

/**
 * Defines the scales for the chart based on the data.
 * @param {Array} data - The data to visualize.
 * @param {number} width - The width of the chart.
 * @param {number} height - The height of the chart.
 * @param {Object} config - Configuration object for the chart.
 * @returns {Object} - An object containing xScale, yScale, and actualTicks.
 */
function defineScales(data, width, height, config) {
  const xValues = data.map((d, i) => config.xAccessor(d, i));
  const yValues = data.map((d) => config.yAccessor(d));

  const xExtent = d3.extent(xValues);
  const yMax = d3.max(yValues);

  const xScale = d3.scaleLinear().domain(xExtent).range([0, width]).nice();
  const yScale = d3
    .scaleLinear()
    .domain([0, yMax * 1.1])
    .range([height, 0])
    .nice();

  const maxXTicks = 10;
  const tickStep = Math.ceil((xExtent[1] - xExtent[0]) / maxXTicks) || 1;
  const actualTicks = d3.range(xExtent[0], xExtent[1] + 1, tickStep);

  return { xScale, yScale, actualTicks };
}

/**
 * Creates and appends an SVG element to the specified container.
 * @param {string} containerId - The ID of the container to append the SVG to.
 * @param {number} width - The width of the chart area.
 * @param {number} height - The height of the chart area.
 * @param {Object} margin - The margins around the chart.
 * @returns {Object} - The appended SVG group element.
 */
function createSvg(containerId, width, height, margin) {
  // Remove existing SVG if any
  d3.select(`#${containerId}`).select("svg").remove();

  // Append a new SVG with responsive settings
  const svg = d3
    .select(`#${containerId}`)
    .append("svg")
    .attr("width", "100%") // Make SVG responsive
    .attr("height", "100%") // Make SVG responsive
    //.attr("preserveAspectRatio", "xMidYMid meet")
    .attr(
      "viewBox",
      `0 0 ${width + margin.left + margin.right} ${
        height + margin.top + margin.bottom
      }`
    )
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  return svg;
}

/**
 * Draws the axes on the SVG.
 * @param {Object} svg - The SVG group element.
 * @param {Function} xScale - The X-axis scale.
 * @param {Function} yScale - The Y-axis scale.
 * @param {number} width - The width of the chart.
 * @param {number} height - The height of the chart.
 * @param {Array} actualTicks - The tick values for the X-axis.
 * @param {Object} margin - The margins around the chart.
 * @param {Object} config - Configuration object for the chart.
 */
function drawAxes(
  svg,
  xScale,
  yScale,
  width,
  height,
  actualTicks,
  margin,
  config
) {
  // X Axis
  svg
    .append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale).tickValues(actualTicks))
    .selectAll("text")
    .style("font-size", "12px")
    .style("fill", "#333")
    .style("font-family", "Arial, sans-serif")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  // Y Axis
  svg
    .append("g")
    .attr("class", "y axis")
    .call(d3.axisLeft(yScale))
    .selectAll("text")
    .style("font-size", "12px")
    .style("fill", "#333")
    .style("font-family", "Arial, sans-serif");

  // X Label
  svg
    .append("text")
    .attr("class", "x-label")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .text(config.xLabel)
    .style("font-size", "14px")
    .style("fill", "#333")
    .style("font-family", "Arial, sans-serif");

  // Y Label
  svg
    .append("text")
    .attr("class", "y-label")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 15)
    .text(config.yLabel)
    .style("font-size", "14px")
    .style("fill", "#333")
    .style("font-family", "Arial, sans-serif");
}

/**
 * Adds gridlines to the SVG.
 * @param {Object} svg - The SVG group element.
 * @param {Function} xScale - The X-axis scale.
 * @param {Function} yScale - The Y-axis scale.
 * @param {number} width - The width of the chart.
 * @param {number} height - The height of the chart.
 * @param {Array} actualTicks - The tick values for the X-axis.
 */
function addGridlines(svg, xScale, yScale, width, height, actualTicks) {
  const makeXGridlines = () =>
    d3
      .axisBottom(xScale)
      .tickValues(actualTicks)
      .tickSize(-height)
      .tickFormat("");
  const makeYGridlines = () =>
    d3.axisLeft(yScale).ticks(5).tickSize(-width).tickFormat("");

  // X Gridlines
  svg
    .append("g")
    .attr("class", "grid x-grid")
    .attr("transform", `translate(0, ${height})`)
    .call(makeXGridlines())
    .selectAll(".tick line")
    .style("stroke", "#e0e0e0")
    .style("stroke-opacity", 0.7);

  // Y Gridlines
  svg
    .append("g")
    .attr("class", "grid y-grid")
    .call(makeYGridlines())
    .selectAll(".tick line")
    .style("stroke", "#e0e0e0")
    .style("stroke-opacity", 0.7);
}

/**
 * Draws the line path on the SVG.
 * @param {Object} svg - The SVG group element.
 * @param {Array} data - The data to visualize.
 * @param {Function} xScale - The X-axis scale.
 * @param {Function} yScale - The Y-axis scale.
 * @param {Object} config - Configuration object for the chart.
 */
function drawLinePath(svg, data, xScale, yScale, config) {
  const line = d3
    .line()
    .x((d, i) => xScale(config.xAccessor(d, i)))
    .y((d) => yScale(config.yAccessor(d)))
    .curve(d3.curveMonotoneX);

  svg
    .append("path")
    .datum(data)
    .attr("class", "line")
    .attr("fill", "none")
    .attr("stroke", "#4682B4")
    .attr("stroke-width", 2)
    .attr("d", line)
    .style("transition", "stroke 0.3s");
}

/**
 * Draws interactive data points (circles) on the SVG.
 * @param {Object} svg - The SVG group element.
 * @param {Array} data - The data to visualize.
 * @param {Function} xScale - The X-axis scale.
 * @param {Function} yScale - The Y-axis scale.
 * @param {Gui} guiInstance - The instance of the Gui class.
 * @param {Object} config - Configuration object for the chart.
 * @returns {Object} - The selection of circles.
 */
function drawDataPoints(svg, data, xScale, yScale, guiInstance, config) {
  const circles = svg
    .selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", (d, i) => xScale(config.xAccessor(d, i)))
    .attr("cy", (d) => yScale(config.yAccessor(d)))
    .attr("r", 4)
    .attr("fill", "#4682B4")
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .style("cursor", "pointer")
    .on("mouseover", function () {
      d3.select(this)
        .transition()
        .duration(100)
        .attr("r", 6)
        .attr("fill", "#FF6347");
    })
    .on("mouseout", function () {
      d3.select(this)
        .transition()
        .duration(100)
        .attr("r", 4)
        .attr("fill", "#4682B4");
    })
    .on("click", function (event, d, i) {
      let position;

      if (guiInstance.barOptionValue === "scale") {
        if (d && typeof d.index === "number") {
          position = d.index; // Adjust as necessary
          console.log(`Scale Click: index=${d.index}, position=${position}`);
        } else {
          console.warn(`Scale Click: d.index is undefined for d=`, d);
          position = undefined;
        }
      } else {
        position = config.xAccessor(d, i);
      }

      if (typeof position !== "undefined") {
        guiInstance.goToPosition(position);
        // Calculate ship position using xAccessor
        const shipPosition = config.xAccessor(d, i) - 1; // Adjust if necessary
        setModalShip(shipPosition, guiInstance, config);
      } else {
        console.warn("Cannot go to position because position is undefined.");
      }
    });

  return circles;
}

/**
 * Adds tooltips to the data points.
 * @param {Object} circles - The selection of circles.
 * @param {Object} config - Configuration object for the chart.
 */
function addTooltips(circles, config) {
  const tooltip = d3
    .select("#modal-graph-chart")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("background-color", "#fff")
    .style("border", "1px solid #ccc")
    .style("border-radius", "5px")
    .style("padding", "8px")
    .style("font-size", "12px")
    .style("font-family", "Arial, sans-serif")
    .style("color", "#333")
    .style("pointer-events", "none")
    .style("box-shadow", "0px 0px 10px rgba(0,0,0,0.1)")
    .style("white-space", "nowrap");

  circles
    .on("mouseover", function (event, d) {
      // Use d3.select(this).datum() to get the index if needed
      const index = d3.select(this).datum().index || 0; // Adjust as necessary
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip
        .html(config.tooltipFormatter(d, index))
        .style("left", `${event.pageX + 15}px`)
        .style("top", `${event.pageY - 28}px`);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", `${event.pageX + 15}px`)
        .style("top", `${event.pageY - 28}px`);
    })
    .on("mouseout", function () {
      tooltip.transition().duration(500).style("opacity", 0);
    });
}

/**
 * Adds a vertical "ship" line to indicate the current position.
 * @param {number} position - The position to indicate.
 * @param {Gui} guiInstance - The instance of the Gui class.
 * @param {Object} config - Configuration object for the chart.
 */
function setModalShip(position, guiInstance, config) {
  // Remove existing ship line if any
  d3.select("#ship-modal").remove();

  // Access the SVG group containing the chart
  const svg = d3.select("#modal-graph-chart").select("svg").select("g");

  // Check if modalXScale is defined
  if (!guiInstance.modalXScale) {
    console.warn("modalXScale is not defined");
    return;
  }

  // Calculate the X position based on the stored xScale
  const shipX = guiInstance.modalXScale(position + 1); // position is 0-based

  // Check if shipX is a valid number
  if (isNaN(shipX)) {
    console.warn("shipX is NaN");
    return;
  }

  // Append the ship line
  svg
    .append("line")
    .attr("id", "ship-modal")
    .attr("x1", shipX)
    .attr("y1", 0)
    .attr("x2", shipX)
    .attr("y2", guiInstance.modalHeight)
    .attr("stroke", "red")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "5,5")
    .style("transition", "stroke 0.3s, stroke-width 0.3s");
}

/**
 * Updates the chart when the modal window is resized.
 * @param {Gui} guiInstance - The instance of the Gui class.
 * @param {Array} data - The data to visualize.
 * @param {Object} config - Configuration object for the chart.
 */
function updateModalChart(guiInstance, data, config) {
  // Recalculate dimensions based on the new size of the modal
  const container = document.getElementById("modal-graph-chart");
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  // Dynamic margins based on new container size (adjust ratios as needed)
  const margin = {
    top: containerHeight * 0.05, // 5% of container height
    right: containerWidth * 0.05, // 5% of container width
    bottom: containerHeight * 0.1, // 10% of container height
    left: containerWidth * 0.1, // 10% of container width
  };

  const width = containerWidth - margin.left - margin.right;
  const height = containerHeight - margin.top - margin.bottom;
  guiInstance.modalWidth = width;
  guiInstance.modalHeight = height;

  // Update scales' range
  guiInstance.modalXScale.range([0, width]);
  guiInstance.modalYScale.range([height, 0]);

  // Update SVG viewBox to accommodate new dimensions
  guiInstance.modalSvg.attr(
    "viewBox",
    `0 0 ${width + margin.left + margin.right} ${
      height + margin.top + margin.bottom
    }`
  );

  // Update axes
  guiInstance.modalSvg
    .select(".x.axis")
    .attr("transform", `translate(0, ${height})`)
    .call(
      d3.axisBottom(guiInstance.modalXScale).tickValues(guiInstance.actualTicks)
    )
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  guiInstance.modalSvg
    .select(".y.axis")
    .call(d3.axisLeft(guiInstance.modalYScale));

  // Update gridlines
  const makeXGridlines = () =>
    d3
      .axisBottom(guiInstance.modalXScale)
      .tickValues(guiInstance.actualTicks)
      .tickSize(-height)
      .tickFormat("");
  const makeYGridlines = () =>
    d3
      .axisLeft(guiInstance.modalYScale)
      .ticks(5)
      .tickSize(-width)
      .tickFormat("");

  guiInstance.modalSvg
    .select(".grid.x-grid")
    .attr("transform", `translate(0, ${height})`)
    .call(makeXGridlines());

  guiInstance.modalSvg.select(".grid.y-grid").call(makeYGridlines());

  // Update line path
  const line = d3
    .line()
    .x((d, i) => guiInstance.modalXScale(config.xAccessor(d, i)))
    .y((d) => guiInstance.modalYScale(config.yAccessor(d)))
    .curve(d3.curveMonotoneX);

  guiInstance.modalSvg.select(".line").attr("d", line(data));

  // Update circles positions
  guiInstance.modalSvg
    .selectAll("circle")
    .attr("cx", (d, i) => guiInstance.modalXScale(config.xAccessor(d, i)))
    .attr("cy", (d) => guiInstance.modalYScale(config.yAccessor(d)));

  // Update ship position
  setModalShip(guiInstance.currentPosition, guiInstance, config);
}

/**
 * Exports the specified SVG container as an SVG file.
 * @param {Gui} guiInstance - The instance of the Gui class.
 * @param {string} containerId - The ID of the SVG container to export.
 * @param {string} filename - The desired filename for the exported SVG.
 * @returns {Promise<string>} - Resolves with a success message or rejects with an error.
 */
export function saveChart(guiInstance, containerId, filename) {
  return new Promise((resolve, reject) => {
    try {
      const container = document.getElementById(containerId);

      if (!container) {
        throw new Error(`Element with ID '${containerId}' not found.`);
      }

      // Determine if the container is an SVG or contains an SVG
      let svg;
      if (container.tagName.toLowerCase() === "svg") {
        svg = container;
      } else {
        svg = container.querySelector("svg");
        if (!svg) {
          throw new Error(
            `No SVG element found within container with ID '${containerId}'.`
          );
        }
      }

      // Clone the SVG node to prepare it for export
      const clonedSVG = svg.cloneNode(true);
      const uniqueId = `imageExport-${Date.now()}`;
      clonedSVG.setAttribute("id", uniqueId);

      // Append the cloned SVG to the document body to make it part of the DOM
      document.body.appendChild(clonedSVG);

      // Select the first <g> element within the cloned SVG
      const g = clonedSVG.querySelector("g");
      if (!g) {
        throw new Error("Cloned SVG does not contain a 'g' element.");
      }

      // Reset any existing transformations to ensure correct positioning
      g.setAttribute("transform", "translate(0,0)");

      // Calculate the bounding box of the original SVG to determine SVG dimensions
      const bbox = svg.getBBox();
      let containerWidth = bbox.width;
      let containerHeight = bbox.height;

      // Add a 5% margin to both width and height for better visualization
      containerWidth += containerWidth * 0.05;
      containerHeight += containerHeight * 0.05;

      // Set the cloned SVG's width and height based on the calculated dimensions
      clonedSVG.setAttribute("width", containerWidth);
      clonedSVG.setAttribute("height", containerHeight);

      // Serialize the cloned SVG to a string
      const serializer = new XMLSerializer();
      const svgAsXML = serializer.serializeToString(clonedSVG);

      // Create a data URL for the serialized SVG
      const svgData = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        svgAsXML
      )}`;

      // Create a temporary anchor element to facilitate the download
      const link = document.createElement("a");
      link.href = svgData;
      link.download = filename;

      // Append the link to the body and trigger a click to start the download
      document.body.appendChild(link);
      link.click();

      // Clean up by removing the temporary link and cloned SVG
      link.remove();
      clonedSVG.remove();

      resolve("Export successful.");
    } catch (error) {
      console.error("Export failed:", error);
      reject(error);
    }
  });
}
