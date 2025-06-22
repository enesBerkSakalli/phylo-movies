// PARTIALLY DEPRECATED: This file contains mixed legacy and unified chart functions.
// - generateLineChart, updateChartIndicator, ChartCallbackManager, ChartStateManager: UNIFIED (keep)
// - generateChartModal, updateShipPosition, and modal-specific functions: LEGACY (consider refactoring)
//
// The unified functions provide consistent chart rendering across lineChartManager and windowChartManager.
// Legacy modal functions are still used by windowChartManager but should be migrated to the unified approach.
//
// FIXES:
// 1. Fixed ship group ID inconsistency: updateChartIndicator now looks for both "#ship-modal-group" and ".ship-indicator-group"
// 2. Fixed missing scale references: scales are now stored on SVG elements using svg.property()
// 3. Added ChartStateManager for unified chart state management
// 4. Added ChartCallbackManager for consistent callback handling
// 5. Enhanced error handling and position validation
// 6. Updated lineChartManager.js to use unified approach
// 7. Updated windowChartManager.js to use ChartCallbackManager

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
    .attr("preserveAspectRatio", "xMidYMid meet") // Responsive scaling
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
function drawDataPoints(svg, data, scales, guiInstance, config, containerId) {
  const { xScale, yScale } = scales;

  // Tooltip
  const tooltip = d3.select(`#${containerId}`)
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
      // Always update ship and GUI state
      updateShipPosition(index, guiInstance, scales, config, data, containerId);
    });

  return circles;
}

/**
 * Creates or updates the ship position indicator
 */
function updateShipPosition(position, guiInstance, scales, config, data, containerId) {
  const { xScale, yScale } = scales;
  const svg = d3.select(`#${containerId}`).select("svg").select("g");

  // Handle empty data or missing scales
  if (!data || data.length === 0 || !xScale || !yScale) {
    svg.select("#ship-modal-group").remove(); // Remove ship if no data
    return;
  }
  const height = yScale.range()[0];

  // Validate and clamp position to be within data bounds
  const validPosition = Math.max(0, Math.min(data.length - 1, position));

  let shipGroup = svg.select("#ship-modal-group");
  let isNew = false;

  if (shipGroup.empty()) {
    isNew = true;
    shipGroup = svg.append("g")
      .attr("id", "ship-modal-group")
      .style("cursor", "grab");

    // Touch target
    shipGroup.append("rect")
      .attr("class", "ship-touch-target")
      .attr("y", 0)
      .attr("width", 30) // Keep width constant
      .attr("height", height)
      .attr("fill", "transparent");

    // Ship line
    shipGroup.append("line")
      .attr("class", "ship-line")
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "#FF4500")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5");

    // Handle
    shipGroup.append("circle")
      .attr("class", "ship-handle")
      .attr("cy", height / 2)
      .attr("r", 8)
      .attr("fill", "#FF4500")
      .attr("stroke", "#23242b")
      .attr("stroke-width", 1.5);

    // Value text
    shipGroup.append("text")
      .attr("class", "handle-value")
      .attr("y", height / 2 - 15)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-weight", "bold")
      .attr("font-size", "12px")
      .style("pointer-events", "none");

    // Position label
    shipGroup.append("text")
      .attr("class", "current-position-label")
      .attr("y", height + 17)
      .attr("text-anchor", "middle")
      .attr("fill", "#FF4500")
      .attr("font-weight", "bold")
      .attr("font-size", "13px")
      .style("pointer-events", "none");
  }

  // Update positions and text using validated position
  const shipX = xScale(config.xAccessor(data[validPosition], validPosition));

  shipGroup.select(".ship-touch-target").attr("x", shipX - 15);
  shipGroup.select(".ship-line").attr("x1", shipX).attr("x2", shipX);
  shipGroup.select(".ship-handle").attr("cx", shipX);
  shipGroup.select(".handle-value")
    .attr("x", shipX)
    .text(config.yAccessor(data[validPosition]).toFixed(3));
  shipGroup.select(".current-position-label")
    .attr("x", shipX)
    .text(`${validPosition + 1}`); // Display validated 1-based index

  // Always highlight the correct data point
  svg.selectAll(".data-points circle").attr("fill", "#4390e1").attr("r", 4);
  svg.selectAll(".data-points circle")
    .filter((d, i) => i === validPosition)
    .attr("fill", "#FF4500").attr("r", 6);

  // Synchronize GUI state and tree/data
  if (guiInstance.currentPosition !== validPosition) {
    guiInstance.currentPosition = validPosition;
    if (typeof guiInstance.goToPosition === 'function') {
      guiInstance.goToPosition(validPosition);
    }
  }

  // Add drag behavior only if it's newly created
  if (isNew) {
    shipGroup.call(d3.drag()
      .on("start", function(event) {
        d3.select(this).selectAll(".ship-line").attr("stroke-width", 3);
        d3.select(this).selectAll(".ship-handle").attr("r", 10);
        d3.select(this).style("cursor", "grabbing");
        d3.select(this).classed("dragging", true);
      })
      .on("drag", function(event) {
        const currentX = event.x;
        let closestIndex = 0;
        let minDistance = Infinity;
        data.forEach((d, i) => {
          const pointX = xScale(config.xAccessor(d, i));
          const distance = Math.abs(currentX - pointX);
          if (distance < minDistance) {
            minDistance = distance;
            closestIndex = i;
          }
        });
        closestIndex = Math.max(0, Math.min(data.length - 1, closestIndex));
        // Always update ship and GUI state
        updateShipPosition(closestIndex, guiInstance, scales, config, data, containerId);
      })
      .on("end", function() {
        d3.select(this).selectAll(".ship-line").attr("stroke-width", 2);
        d3.select(this).selectAll(".ship-handle").attr("r", 8);
        d3.select(this).style("cursor", "grab");
        d3.select(this).classed("dragging", false);
      })
    );
  }
}

/**
 * Update the chart indicator (ship position) without re-adding drag behavior
 * @param {string} containerId - The ID of the container
 * @param {number} position - The position to update to
 * @param {Object} config - The config object with xAccessor and yAccessor
 * @param {Array} data - The data array
 */
export function updateChartIndicator(containerId, position, config, data) {
  const svg = d3.select(`#${containerId}`).select("svg").select("g");

  // Try to get scales from stored references or compute them
  let xScale = svg.property('__xScale');
  let yScale = svg.property('__yScale');

  if (!xScale || !yScale) {
    console.warn(`[updateChartIndicator] Scales not found for container ${containerId}, cannot update indicator`);
    return;
  }

  // Use the same logic as updateShipPosition, but do not re-add drag
  const validPosition = Math.max(0, Math.min(data.length - 1, position));

  // Look for ship group with consistent ID
  let shipGroup = svg.select("#ship-modal-group");
  if (shipGroup.empty()) {
    // Fallback to class-based selector for backward compatibility
    shipGroup = svg.select(".ship-indicator-group");
  }

  if (shipGroup.empty()) {
    console.warn(`[updateChartIndicator] Ship group not found in container ${containerId}`);
    return;
  }

  const shipX = xScale(config.xAccessor(data[validPosition], validPosition));
  const height = yScale.range()[0];

  shipGroup.select(".ship-touch-target").attr("x", shipX - 15);
  shipGroup.select(".ship-line").attr("x1", shipX).attr("x2", shipX);
  shipGroup.select(".ship-handle").attr("cx", shipX);
  shipGroup.select(".handle-value")
    .attr("x", shipX)
    .text(config.yAccessor(data[validPosition]).toFixed(3));
  shipGroup.select(".current-position-label")
    .attr("x", shipX)
    .text(`${validPosition + 1}`);

  // Update data points highlighting
  svg.selectAll(".data-points circle").attr("fill", "#4390e1").attr("r", 4);
  svg.selectAll(".data-points circle")
    .filter((d, i) => i === validPosition)
    .attr("fill", "#FF4500").attr("r", 6);
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

  // Add background rectangle for click events
  svg.append("rect")
    .attr("class", "modal-chart-background")
    .attr("width", dimensions.width)
    .attr("height", dimensions.height)
    .attr("fill", "transparent")
    .style("cursor", "pointer")
    .on("click", function(event) {
      const mouseX = d3.pointer(event, this)[0];
      let rawIndex = scales.xScale.invert(mouseX);
      let closestIndex = Math.round(rawIndex);
      if (scales.xScale.domain()[0] === 1) {
        closestIndex = closestIndex - 1;
      }
      closestIndex = Math.max(0, Math.min(data.length - 1, closestIndex));
      // Always update ship and GUI state
      updateShipPosition(closestIndex, guiInstance, scales, config, data, "modal-graph-chart");
    });

  drawDataPoints(svg, data, scales, guiInstance, config, "modal-graph-chart"); // Draw points on top of background

  // Store scales on the SVG for later access by updateChartIndicator
  svg.property('__xScale', scales.xScale);
  svg.property('__yScale', scales.yScale);

  updateShipPosition(guiInstance.currentPosition, guiInstance, scales, config, data, "modal-graph-chart");
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
    class: ["no-full, chart-modal-container, chart-modal-controls"],
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
  document.head.appendChild(style);

  // Mark this as a chart window to avoid conflicts with MSA viewer
  setTimeout(() => {
    const winboxElement = winbox.dom;
    if (winboxElement) {
      winboxElement.setAttribute('data-chart', 'true');
    }
  }, 0);

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

/**
 * Renders a robust line chart to any container (not just modal)
 * @param {string} containerId - The DOM id of the container to render into
 * @param {Array} data - The chart data array
 * @param {Object} config - Chart config (xLabel, yLabel, yMax, xAccessor, yAccessor, tooltipFormatter, etc)
 * @param {Object} guiInstance - Optional, for state sync and callbacks
 */
export function generateLineChart(containerId, data, config, guiInstance) {
  // Calculate dimensions based on the target container
  function calculateChartDimensionsForContainer(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`Container ${containerId} not found, using defaults`);
      return { containerWidth: 800, containerHeight: 400, width: 740, height: 340, margin: { top: 20, right: 30, bottom: 60, left: 60 } };
    }

    // Use getBoundingClientRect for more accurate sizing
    const rect = container.getBoundingClientRect();
    const containerWidth = rect.width || container.clientWidth || 800;
    const containerHeight = rect.height || container.clientHeight || 400;

    // Ensure minimum dimensions for readability
    const adjustedWidth = Math.max(containerWidth, 300);
    const adjustedHeight = Math.max(containerHeight, 180);

    const margin = {
      top: Math.max(20, adjustedHeight * 0.06),
      right: Math.max(30, adjustedWidth * 0.06),
      bottom: Math.max(60, adjustedHeight * 0.15),
      left: Math.max(60, adjustedWidth * 0.1)
    };
    return {
      containerWidth: adjustedWidth,
      containerHeight: adjustedHeight,
      width: adjustedWidth - margin.left - margin.right,
      height: adjustedHeight - margin.top - margin.bottom,
      margin
    };
  }

  // Remove any existing SVG or tooltip in the container
  d3.select(`#${containerId}`).select("svg").remove();
  d3.select(`#${containerId}`).selectAll(".chart-tooltip").remove();

  // Add loading indicator
  const container = document.getElementById(containerId);
  if (container) {
    container.classList.add('loading');
    setTimeout(() => container.classList.remove('loading'), 100); // Brief loading indication
  }

  const dimensions = calculateChartDimensionsForContainer(containerId);
  const scales = createScales(data, dimensions.width, dimensions.height, config);
  const svg = createSVG(containerId, dimensions);

  // Create chart state manager
  const chartStateManager = new ChartStateManager(containerId, 'line-chart');
  chartStateManager.setData(data, config);
  chartStateManager.setScales(scales.xScale, scales.yScale);

  drawAxesAndGrid(svg, scales, dimensions, config);
  drawChart(svg, data, scales, config);
  drawDataPoints(svg, data, scales, guiInstance, config, containerId);

  // Store scales on the SVG for later access by updateChartIndicator
  svg.property('__xScale', scales.xScale);
  svg.property('__yScale', scales.yScale);

  if (guiInstance && typeof guiInstance.currentPosition === 'number') {
    updateShipPosition(guiInstance.currentPosition, guiInstance, scales, config, data, containerId);
  }

  return chartStateManager;


}

/**
 * Unified callback interface for chart interactions
 */
export class ChartCallbackManager {
  constructor(callbacks = {}) {
    this.onPositionChange = callbacks.onPositionChange || (() => {});
    this.onDragStart = callbacks.onDragStart || (() => {});
    this.onDragEnd = callbacks.onDragEnd || (() => {});
    this.onPointClick = callbacks.onPointClick || (() => {});
  }

  // Map chart index to sequence index using provided mapping function
  mapToSequenceIndex(chartIndex, mappingFunction) {
    return mappingFunction ? mappingFunction(chartIndex) : chartIndex;
  }

  // Map sequence index to chart index using provided mapping function
  mapToChartIndex(sequenceIndex, mappingFunction) {
    return mappingFunction ? mappingFunction(sequenceIndex) : sequenceIndex;
  }
}

/**
 * Enhanced chart state manager for unified chart operations
 */
export class ChartStateManager {
  constructor(containerId, chartType) {
    this.containerId = containerId;
    this.chartType = chartType;
    this.scales = null;
    this.data = null;
    this.config = null;
    this.callbackManager = null;
    this.indexMappings = {
      chartToSequence: (idx) => idx,
      sequenceToChart: (idx) => idx
    };
  }

  setData(data, config) {
    this.data = data;
    this.config = config;
  }

  setScales(xScale, yScale) {
    this.scales = { xScale, yScale };
    // Store on SVG as well for backward compatibility
    const svg = d3.select(`#${this.containerId}`).select("svg").select("g");
    svg.property('__xScale', xScale);
    svg.property('__yScale', yScale);
  }

  setIndexMappings(chartToSequence, sequenceToChart) {
    this.indexMappings.chartToSequence = chartToSequence;
    this.indexMappings.sequenceToChart = sequenceToChart;
  }

  setCallbackManager(callbackManager) {
    this.callbackManager = callbackManager;
  }

  updatePosition(sequencePosition) {
    if (!this.data || !this.config || !this.scales) {
      console.warn(`[ChartStateManager] Cannot update position: missing data, config, or scales`);
      return;
    }

    const chartPosition = this.indexMappings.sequenceToChart(sequencePosition);

    // Validate position bounds
    const validChartPosition = Math.max(0, Math.min(this.data.length - 1, chartPosition));

    updateChartIndicator(this.containerId, validChartPosition, this.config, this.data);
  }

  destroy() {
    const container = document.getElementById(this.containerId);
    if (container) {
      d3.select(container).select("svg").remove();
      d3.select(container).selectAll(".chart-tooltip").remove();
    }
  }
}
