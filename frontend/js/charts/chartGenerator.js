/**
 * Debounce function to limit the rate at which a function can fire.
 */
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Calculates consistent dimensions and margins for the chart
 */
function calculateChartDimensions() {
  const container = document.getElementById("modal-graph-chart");
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  const margin = {
    top: Math.max(20, containerHeight * 0.06),
    right: Math.max(30, containerWidth * 0.06),
    bottom: Math.max(60, containerHeight * 0.15),
    left: Math.max(60, containerWidth * 0.1)
  };

  return {
    containerWidth,
    containerHeight,
    width: containerWidth - margin.left - margin.right,
    height: containerHeight - margin.top - margin.bottom,
    margin
  };
}

/**
 * Creates scales and ticks for the chart
 */
function createScales(data, width, height, config) {
  const xValues = data.map((d, i) => config.xAccessor(d, i));
  const yValues = data.map((d) => config.yAccessor(d));

  const xExtent = d3.extent(xValues);
  const yMax = d3.max(yValues);

  const xScale = d3.scaleLinear().domain(xExtent).range([0, width]).nice();
  const yScale = d3.scaleLinear().domain([0, yMax * 1.1]).range([height, 0]).nice();

  const maxXTicks = Math.floor(width / 80); // Responsive tick count
  const tickStep = Math.ceil((xExtent[1] - xExtent[0]) / maxXTicks) || 1;
  const actualTicks = d3.range(xExtent[0], xExtent[1] + 1, tickStep);

  return { xScale, yScale, actualTicks };
}

/**
 * Creates and configures the SVG element
 */
function createSVG(containerId, dimensions) {
  const { width, height, margin } = dimensions;
  
  d3.select(`#${containerId}`).select("svg").remove();

  const svg = d3.select(`#${containerId}`)
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .style("font-family", "Heebo, sans-serif")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  return svg;
}

/**
 * Draws axes, gridlines, and labels in one function
 */
function drawAxesAndGrid(svg, scales, dimensions, config) {
  const { xScale, yScale, actualTicks } = scales;
  const { width, height, margin } = dimensions;

  // X Axis
  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale).tickValues(actualTicks))
    .selectAll("text")
    .style("font-size", "12px")
    .style("fill", "rgba(255, 255, 255, 0.8)")
    .style("font-family", "Heebo, sans-serif")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  // Y Axis
  svg.append("g")
    .attr("class", "y axis")
    .call(d3.axisLeft(yScale))
    .selectAll("text")
    .style("font-size", "12px")
    .style("fill", "rgba(255, 255, 255, 0.8)")
    .style("font-family", "Heebo, sans-serif");

  // Style axis lines
  svg.selectAll(".axis path, .axis line")
    .style("stroke", "rgba(255, 255, 255, 0.3)");

  // X Gridlines
  svg.append("g")
    .attr("class", "grid x-grid")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale).tickValues(actualTicks).tickSize(-height).tickFormat(""))
    .selectAll(".tick line")
    .style("stroke", "rgba(255, 255, 255, 0.1)")
    .style("stroke-dasharray", "3,3");

  // Y Gridlines
  svg.append("g")
    .attr("class", "grid y-grid")
    .call(d3.axisLeft(yScale).ticks(5).tickSize(-width).tickFormat(""))
    .selectAll(".tick line")
    .style("stroke", "rgba(255, 255, 255, 0.1)")
    .style("stroke-dasharray", "3,3");

  svg.selectAll(".grid path").style("display", "none");

  // Labels
  svg.append("text")
    .attr("class", "x-label")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .text(config.xLabel)
    .style("font-size", "14px")
    .style("fill", "rgba(255, 255, 255, 0.9)")
    .style("font-family", "Heebo, sans-serif");

  svg.append("text")
    .attr("class", "y-label")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 15)
    .text(config.yLabel)
    .style("font-size", "14px")
    .style("fill", "rgba(255, 255, 255, 0.9)")
    .style("font-family", "Heebo, sans-serif");
}

/**
 * Draws the line and area chart
 */
function drawChart(svg, data, scales, config) {
  const { xScale, yScale } = scales;

  // Area under the line
  const area = d3.area()
    .x((d, i) => xScale(config.xAccessor(d, i)))
    .y0(yScale(0))
    .y1((d) => yScale(config.yAccessor(d)))
    .curve(d3.curveMonotoneX);

  svg.append("path")
    .datum(data)
    .attr("class", "area")
    .attr("fill", "rgba(67, 144, 225, 0.1)")
    .attr("d", area);

  // Line
  const line = d3.line()
    .x((d, i) => xScale(config.xAccessor(d, i)))
    .y((d) => yScale(config.yAccessor(d)))
    .curve(d3.curveMonotoneX);

  svg.append("path")
    .datum(data)
    .attr("class", "line")
    .attr("fill", "none")
    .attr("stroke", "#4390e1")
    .attr("stroke-width", 2.5)
    .attr("d", line)
    .style("filter", "drop-shadow(0px 1px 3px rgba(0,0,0,0.3))");
}

/**
 * Draws interactive data points with tooltips
 */
function drawDataPoints(svg, data, scales, guiInstance, config) {
  const { xScale, yScale } = scales;

  // Tooltip
  const tooltip = d3.select("#modal-graph-chart")
    .append("div")
    .attr("class", "chart-tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("background-color", "rgba(35, 36, 43, 0.9)")
    .style("border", "1px solid rgba(255, 255, 255, 0.2)")
    .style("border-radius", "5px")
    .style("padding", "10px 15px")
    .style("font-size", "13px")
    .style("font-family", "Heebo, sans-serif")
    .style("color", "white")
    .style("pointer-events", "none")
    .style("box-shadow", "0px 3px 10px rgba(0,0,0,0.3)")
    .style("z-index", "1000");

  // Data points
  const pointsContainer = svg.append("g").attr("class", "data-points");
  
  const circles = pointsContainer.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", (d, i) => xScale(config.xAccessor(d, i)))
    .attr("cy", (d) => yScale(config.yAccessor(d)))
    .attr("r", 4)
    .attr("fill", "#4390e1")
    .attr("stroke", "#23242b")
    .attr("stroke-width", 1.5)
    .style("cursor", "pointer")
    .attr("data-index", (d, i) => i)
    .on("mouseover", function (event, d) {
      const index = parseInt(d3.select(this).attr("data-index"), 10);
      d3.select(this).transition().duration(100).attr("r", 6).attr("fill", "#FF4500");
      
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip.html(config.tooltipFormatter(d, index))
        .style("left", `${event.pageX + 15}px`)
        .style("top", `${event.pageY - 28}px`);
    })
    .on("mousemove", function (event) {
      tooltip.style("left", `${event.pageX + 15}px`)
        .style("top", `${event.pageY - 28}px`);
    })
    .on("mouseout", function () {
      d3.select(this).transition().duration(100).attr("r", 4).attr("fill", "#4390e1");
      tooltip.transition().duration(300).style("opacity", 0);
    })
    .on("click", function (event, d) {
      const index = parseInt(d3.select(this).attr("data-index"), 10);
      
      pointsContainer.selectAll("circle").attr("fill", "#4390e1").attr("r", 4);
      d3.select(this).attr("fill", "#FF4500").attr("r", 6).attr("stroke-width", 2);

      guiInstance.currentPosition = index;
      guiInstance.goToPosition(index);
      updateShipPosition(index, guiInstance, scales, config, data);
    });

  return circles;
}

/**
 * Creates or updates the ship position indicator
 */
function updateShipPosition(position, guiInstance, scales, config, data) {
  const { xScale, yScale } = scales;
  const svg = d3.select("#modal-graph-chart").select("svg").select("g");
  
  d3.select("#ship-modal-group").remove();

  const shipX = xScale(config.xAccessor(data[position], position));
  const height = yScale.range()[0]; // Get height from yScale range

  const shipGroup = svg.append("g")
    .attr("id", "ship-modal-group")
    .style("cursor", "grab");

  // Touch target
  shipGroup.append("rect")
    .attr("class", "ship-touch-target")
    .attr("x", shipX - 15)
    .attr("y", 0)
    .attr("width", 30)
    .attr("height", height)
    .attr("fill", "transparent");

  // Ship line
  shipGroup.append("line")
    .attr("class", "ship-line")
    .attr("x1", shipX)
    .attr("y1", 0)
    .attr("x2", shipX)
    .attr("y2", height)
    .attr("stroke", "#FF4500")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "5,5");

  // Handle
  shipGroup.append("circle")
    .attr("class", "ship-handle")
    .attr("cx", shipX)
    .attr("cy", height / 2)
    .attr("r", 8)
    .attr("fill", "#FF4500")
    .attr("stroke", "#23242b")
    .attr("stroke-width", 1.5);

  // Value text
  shipGroup.append("text")
    .attr("class", "handle-value")
    .attr("x", shipX)
    .attr("y", height / 2 - 15)
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .attr("font-weight", "bold")
    .attr("font-size", "12px")
    .text(config.yAccessor(data[position]).toFixed(3))
    .style("pointer-events", "none");

  // Position label
  shipGroup.append("text")
    .attr("class", "current-position-label")
    .attr("x", shipX)
    .attr("y", height + 17)
    .attr("text-anchor", "middle")
    .attr("fill", "#FF4500")
    .attr("font-weight", "bold")
    .attr("font-size", "13px")
    .text(`${position + 1}`)
    .style("pointer-events", "none");

  // Add drag behavior
  shipGroup.call(d3.drag()
    .on("start", function() {
      d3.select(this).selectAll(".ship-line").attr("stroke-width", 3);
      d3.select(this).selectAll(".ship-handle").attr("r", 10);
      d3.select(this).style("cursor", "grabbing");
    })
    .on("drag", function(event) {
      let xPos = Math.max(0, Math.min(xScale.range()[1], event.x));
      
      // Find closest data point
      let closestIndex = 0;
      let minDistance = Infinity;
      
      data.forEach((d, i) => {
        const dataX = xScale(config.xAccessor(d, i));
        const distance = Math.abs(dataX - xPos);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = i;
        }
      });
      
      guiInstance.currentPosition = closestIndex;
      guiInstance.goToPosition(closestIndex);
      updateShipPosition(closestIndex, guiInstance, scales, config, data);
      
      // Update data point highlight
      svg.selectAll(".data-points circle").attr("fill", "#4390e1").attr("r", 4);
      svg.selectAll(".data-points circle")
        .filter((d, i) => i === closestIndex)
        .attr("fill", "#FF4500").attr("r", 6);
    })
    .on("end", function() {
      d3.select(this).selectAll(".ship-line").attr("stroke-width", 2);
      d3.select(this).selectAll(".ship-handle").attr("r", 8);
      d3.select(this).style("cursor", "grab");
    })
  );
}

/**
 * Main chart rendering function
 */
function renderChart(guiInstance, data, config) {
  const dimensions = calculateChartDimensions();
  const scales = createScales(data, dimensions.width, dimensions.height, config);
  const svg = createSVG("modal-graph-chart", dimensions);

  // Store references in guiInstance
  guiInstance.modalWidth = dimensions.width;
  guiInstance.modalHeight = dimensions.height;
  guiInstance.modalXScale = scales.xScale;
  guiInstance.modalYScale = scales.yScale;
  guiInstance.actualTicks = scales.actualTicks;
  guiInstance.modalSvg = svg;

  drawAxesAndGrid(svg, scales, dimensions, config);
  drawChart(svg, data, scales, config);
  drawDataPoints(svg, data, scales, guiInstance, config);
  updateShipPosition(guiInstance.currentPosition, guiInstance, scales, config, data);
}

/**
 * Updates the chart when the modal window is resized
 */
function updateModalChart(guiInstance, data, config) {
  renderChart(guiInstance, data, config);
}

export function generateChartModal(data, guiInstance, config) {
  const winbox = createModalWindow(config.title, () => {
    console.log("WinBox window closed");
  });

  setupEventListeners(winbox, guiInstance);

  setTimeout(() => {
    renderChart(guiInstance, data, config);
    winbox.onresize = debounce(() => updateModalChart(guiInstance, data, config), 200);
  }, 0);
}

function createModalWindow(title, onCloseCallback) {
  // Step 1: Create the modal window
  const winbox = new WinBox({
    title: title,
    width: "75%",
    height: "60%",
    x: "center",
    y: "center",
    class: ["no-full"],
    background: "#373747",
    border: 2,
    html: `
      <div class="chart-modal-container">
        <!-- Chart Container -->
        <div id="modal-graph-chart" class="chart-modal-content"></div>
        <!-- Controls Container -->
        <div class="chart-modal-controls">
          <button id="save-chart-button" class="md-button primary">
            <i class="fa fa-download"></i>
            Save Chart
          </button>
        </div>
      </div>
    `,
    onclose: onCloseCallback,
  });
  
  // Add custom styles for the modal
  const style = document.createElement('style');
  style.textContent = `
    .chart-modal-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background-color: #23242b;
      color: #e3eaf2;
      padding: 20px;
    }
    .chart-modal-content {
      flex: 1;
      width: 100%;
      position: relative;
      background-color: #2c2c3a;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }
    .chart-modal-controls {
      padding-top: 15px;
      text-align: right;
    }
  `;
  document.head.appendChild(style);
  
  return winbox;
}

function setupEventListeners(winbox, guiInstance) {
  // Save Chart Button
  winbox.body
    .querySelector("#save-chart-button")
    .addEventListener("click", () => {
      const button = winbox.body.querySelector("#save-chart-button");
      
      // Disable button and show loading state
      button.disabled = true;
      const originalText = button.innerHTML;
      button.innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i> Saving...';
      
      saveChart(guiInstance, "modal-graph-chart", "chart.svg")
        .then((message) => {
          console.log(message);
          // Show success state briefly
          button.innerHTML = '<i class="fa fa-check"></i> Saved!';
          button.style.backgroundColor = "#43e1b0";
          
          // Reset button after delay
          setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
            button.style.backgroundColor = "";
          }, 1500);
        })
        .catch((error) => {
          console.error(error);
          // Show error state
          button.innerHTML = '<i class="fa fa-times"></i> Failed';
          button.style.backgroundColor = "#e14390";
          
          // Reset button after delay
          setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
            button.style.backgroundColor = "";
          }, 1500);
        });
    });
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