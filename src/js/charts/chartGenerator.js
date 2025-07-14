import * as d3 from "d3";

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
 * Calculates consistent dimensions and margins for the chart for any container
 * @param {string} containerId - The ID of the container element
 */
function calculateChartDimensionsForContainer(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    // Fallback to default dimensions if container is not found
    return {
      containerWidth: 600,
      containerHeight: 300,
      width: 500,
      height: 200,
      margin: { top: 20, right: 30, bottom: 60, left: 100 }
    };
  }
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  const margin = {
    top: Math.max(20, containerHeight * 0.06),
    right: Math.max(30, containerWidth * 0.06),
    bottom: Math.max(60, containerHeight * 0.15),
    left: Math.max(100, containerWidth * 0.2)
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

  const container = document.getElementById(containerId);
  const isInMoviePlayerBar = container && container.closest('.movie-player-bar') !== null;

  d3.select(`#${containerId}`).select("svg").remove();

  const svg = d3.select(`#${containerId}`)
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("font-family", "Heebo, sans-serif");

  // Define clip-path
  svg.append("defs").append("clipPath")
    .attr("id", `clip-${containerId}`)
    .append("rect")
    .attr("width", width)
    .attr("height", height);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  return g;
}

/**
 * Draws axes, gridlines, and labels in one function
 */
function drawAxesAndGrid(svg, scales, dimensions, config) {
  const { xScale, yScale, actualTicks } = scales;
  const { width, height, margin } = dimensions;

  // Check if this is for movie player bar for smaller fonts
  const container = svg.node().closest('.movie-player-bar');
  const isInMoviePlayerBar = container !== null;

  // X Axis
  const xAxisGroup = svg.append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale).tickValues(actualTicks))
    .selectAll("text")
    .style("font-size", isInMoviePlayerBar ? "9px" : "12px")
    .style("fill", "rgba(255, 255, 255, 0.8)")
    .style("font-family", "Heebo, sans-serif")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  // Y Axis
  svg.append("g")
    .attr("class", "y axis")
    .call(d3.axisLeft(yScale).ticks(isInMoviePlayerBar ? 3 : 5))
    .selectAll("text")
    .style("font-size", isInMoviePlayerBar ? "9px" : "12px")
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

  return xAxisGroup;
}

/**
 * Draws the line and area chart
 */
function drawChart(svg, data, scales, config, containerId) {
  const { xScale, yScale } = scales;

  // Area under the line
  const area = d3.area()
    .x((d, i) => xScale(config.xAccessor(d, i)))
    .y0(yScale(0))
    .y1((d) => yScale(config.yAccessor(d)))
    .curve(d3.curveMonotoneX);

  const chartArea = svg.append("path")
    .datum(data)
    .attr("class", "area")
    .attr("fill", "rgba(67, 144, 225, 0.1)")
    .attr("d", area)
    .attr("clip-path", `url(#clip-${containerId})`);

  // Line
  const line = d3.line()
    .x((d, i) => xScale(config.xAccessor(d, i)))
    .y((d) => yScale(config.yAccessor(d)))
    .curve(d3.curveMonotoneX);

  const chartLine = svg.append("path")
    .datum(data)
    .attr("class", "line")
    .attr("fill", "none")
    .attr("stroke", "#4390e1")
    .attr("stroke-width", 2.5)
    .attr("d", line)
    .style("filter", "drop-shadow(0px 1px 3px rgba(0,0,0,0.3))")
    .attr("clip-path", `url(#clip-${containerId})`);

  return { chartArea, chartLine };
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
  const pointsContainer = svg.append("g")
    .attr("class", "data-points")
    .attr("clip-path", `url(#clip-${containerId})`);

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
      // Call async function but don't await to avoid blocking chart updates
      Promise.resolve(guiInstance.goToPosition(validPosition)).catch(error => {
        console.error('[chartGenerator] Error in goToPosition callback:', error);
      });
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
        updateShipPosition(closestIndex, guiInstance, { xScale, yScale }, config, data, containerId);
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
function renderChart(guiInstance, data, config, containerId) {
  // Calculate dimensions based on the target container
  const dimensions = calculateChartDimensionsForContainer(containerId);

  // Remove any existing SVG or tooltip in the container
  d3.select(`#${containerId}`).select("svg").remove();
  d3.select(`#${containerId}`).selectAll(".chart-tooltip").remove();

  // Add loading indicator
  const container = document.getElementById(containerId);
  if (container) {
    container.classList.add('loading');
    setTimeout(() => container.classList.remove('loading'), 100); // Brief loading indication
  }

  const svg = createSVG(containerId, dimensions);

  // Create initial scales
  let { xScale, yScale, actualTicks } = createScales(data, dimensions.width, dimensions.height, config);

  // Store original scales for reset
  const initialXScale = xScale.copy();
  const initialYScale = yScale.copy();

  // Create chart state manager
  const chartStateManager = new ChartStateManager(containerId, 'line-chart');
  chartStateManager.setData(data, config);
  chartStateManager.setScales(xScale, yScale);

  // Draw initial chart elements
  let xAxisGroup = drawAxesAndGrid(svg, { xScale, yScale, actualTicks }, dimensions, config);
  let chartPath = drawChart(svg, data, { xScale, yScale }, config);
  let dataPoints = drawDataPoints(svg, data, { xScale, yScale }, guiInstance, config, containerId);

  // Zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([1, 10]) // Allow zooming in up to 10x
    .extent([[0, 0], [dimensions.width, dimensions.height]])
    .translateExtent([[0, 0], [dimensions.width, dimensions.height]])
    .on("zoom", zoomed);

  svg.call(zoom);

  function zoomed(event) {
    // Create new scales based on the zoom transform
    xScale = event.transform.rescaleX(initialXScale);
    yScale = event.transform.rescaleY(initialYScale);

    // Update axes
    xAxisGroup.call(d3.axisBottom(xScale).tickValues(actualTicks));
    svg.select(".y.axis").call(d3.axisLeft(yScale).ticks(5));

    // Update line and area paths
    const area = d3.area()
      .x((d, i) => xScale(config.xAccessor(d, i)))
      .y0(yScale(0))
      .y1((d) => yScale(config.yAccessor(d)))
      .curve(d3.curveMonotoneX);

    const line = d3.line()
      .x((d, i) => xScale(config.xAccessor(d, i)))
      .y((d) => yScale(config.yAccessor(d)))
      .curve(d3.curveMonotoneX);

    chartPath.attr("d", area);
    svg.select(".line").attr("d", line);

    // Update data points
    dataPoints.attr("cx", (d, i) => xScale(config.xAccessor(d, i)))
      .attr("cy", (d) => yScale(config.yAccessor(d)));

    // Update ship position if it exists
    if (guiInstance && typeof guiInstance.currentPosition === 'number') {
      updateShipPosition(guiInstance.currentPosition, guiInstance, { xScale, yScale }, config, data, containerId);
    }

    // Update scales in chartStateManager
    chartStateManager.setScales(xScale, yScale);
  }

  // Store scales on the SVG for later access by updateChartIndicator
  svg.property('__xScale', xScale);
  svg.property('__yScale', yScale);

  if (guiInstance && typeof guiInstance.currentPosition === 'number') {
    updateShipPosition(guiInstance.currentPosition, guiInstance, { xScale, yScale }, config, data, containerId);
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
      return;
    }
    const chartPosition = this.indexMappings.sequenceToChart(sequencePosition);
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

// Export the main line chart rendering function
export function generateLineChart(containerId, data, config, guiInstance) {
  return renderChart(guiInstance, data, config, containerId);
}
