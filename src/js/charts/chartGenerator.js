import * as d3 from "d3";
import { ChartIndicator } from "./ChartIndicator.js";
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
  let containerWidth = container.clientWidth || 600;
  const containerHeight = container.clientHeight || 300;

  // Check if in movie player bar for more compact margins
  const isInMoviePlayerBar = container.closest('.movie-player-bar') !== null;
  
  // Fix for movie player bar: account for removed padding
  if (isInMoviePlayerBar) {
    // The CSS removes 8px padding on each side, so container width includes this
    // No need to subtract navigation width since CSS no longer extends into nav area
    containerWidth = Math.max(200, containerWidth);
  }


  const margin = isInMoviePlayerBar ? {
    // Minimal margins for tight layout alongside timeline - fill available space
    top: 4,
    right: 4,
    bottom: 20, // minimal room for x-axis labels
    left: 30 // minimal room for Y-axis labels
  } : {
    top: Math.max(20, containerHeight * 0.06),
    right: Math.max(30, containerWidth * 0.06),
    bottom: Math.max(60, containerHeight * 0.15),
    left: Math.max(100, containerWidth * 0.2)
  };

  console.log('[chartGenerator] Using margins:', margin);

  const finalDimensions = {
    containerWidth,
    containerHeight,
    width: Math.max(100, containerWidth - margin.left - margin.right),
    height: Math.max(40, containerHeight - margin.top - margin.bottom),
    margin
  };

  console.log('[chartGenerator] Final dimensions:', finalDimensions);

  return finalDimensions;
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

  // Light clamp: aim for ~80px per tick, but cap to 12 to avoid crowding on giant widths
  const desiredTicks = Math.floor(width / 80);
  const maxXTicks = Math.min(Math.max(desiredTicks, 3), 12);
  const domainSpan = Math.max(1, (xExtent[1] - xExtent[0]));
  const tickStep = Math.ceil(domainSpan / maxXTicks);
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
    .style("font-size", isInMoviePlayerBar ? "var(--md-sys-typescale-label-small-size, 9px)" : "var(--md-sys-typescale-label-medium-size, 12px)")
    .style("fill", "var(--md-sys-color-on-surface-variant, rgba(255,255,255,0.8))")
    .style("font-family", "var(--md-sys-typescale-label-medium-font, Heebo, sans-serif)")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end")
    .attr("dx", "-0.4em")
    .attr("dy", "0.7em");

  // Y Axis
  svg.append("g")
    .attr("class", "y axis")
    .call(d3.axisLeft(yScale).ticks(isInMoviePlayerBar ? 3 : 5))
    .selectAll("text")
    .style("font-size", isInMoviePlayerBar ? "var(--md-sys-typescale-label-small-size, 9px)" : "var(--md-sys-typescale-label-medium-size, 12px)")
    .style("fill", "var(--md-sys-color-on-surface-variant, rgba(255,255,255,0.8))")
    .style("font-family", "var(--md-sys-typescale-label-medium-font, Heebo, sans-serif)");

  // Style axis lines
  svg.selectAll(".axis path, .axis line")
    .style("stroke", "var(--md-sys-color-outline-variant, rgba(255,255,255,0.3))");

  // X Gridlines
  svg.append("g")
    .attr("class", "grid x-grid")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale).tickValues(actualTicks).tickSize(-height).tickFormat(""))
    .selectAll(".tick line")
    .style("stroke", "var(--md-sys-color-outline, rgba(255,255,255,0.1))")
    .style("stroke-dasharray", "var(--md-sys-spacing-xsmall, 3), var(--md-sys-spacing-xsmall, 3)");

  // Y Gridlines
  svg.append("g")
    .attr("class", "grid y-grid")
    .call(d3.axisLeft(yScale).ticks(5).tickSize(-width).tickFormat(""))
    .selectAll(".tick line")
    .style("stroke", "var(--md-sys-color-outline, rgba(255,255,255,0.1))")
    .style("stroke-dasharray", "var(--md-sys-spacing-xsmall, 3), var(--md-sys-spacing-xsmall, 3)");

  svg.selectAll(".grid path").style("display", "none");

  // Labels
  svg.append("text")
    .attr("class", "x-label")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .text(config.xLabel)
    .style("font-size", "var(--md-sys-typescale-title-small-size, 14px)")
    .style("fill", "var(--md-sys-color-on-surface, rgba(255,255,255,0.9))")
    .style("font-family", "var(--md-sys-typescale-title-small-font, Heebo, sans-serif)");

  svg.append("text")
    .attr("class", "y-label")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 15)
    .text(config.yLabel)
    .style("font-size", "var(--md-sys-typescale-title-small-size, 14px)")
    .style("fill", "var(--md-sys-color-on-surface, rgba(255,255,255,0.9))")
    .style("font-family", "var(--md-sys-typescale-title-small-font, Heebo, sans-serif)");

  return xAxisGroup;
}

/**
 * Update line and area paths with new scales
 */
// updateChartPaths removed (no zoom)

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
    .attr("fill", "var(--md-sys-color-primary-container, rgba(67,144,225,0.1))")
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
    .attr("stroke", "var(--md-sys-color-primary, #4390e1)")
    .attr("stroke-width", 2.5)
    .attr("d", line)
    .style("filter", "var(--md-sys-elevation-level1, drop-shadow(0px 1px 3px rgba(0,0,0,0.3)))")
    .attr("clip-path", `url(#clip-${containerId})`);

  return { chartArea, chartLine };
}


/**
 * Creates or updates the position indicator using ChartIndicator
 * This is a centralized helper for consistent indicator updates
 */
export function updateIndicatorPosition(position, scales, config, data, containerId, onPositionChange = null) {
  console.log('chartGenerator: updateIndicatorPosition called with position:', position);
  const svg = d3.select(`#${containerId}`).select("svg").select("g");

  // Get or create indicator instance (store on SVG to avoid recreation)
  let indicator = svg.property('__indicator');
  if (!indicator) {
    console.log('chartGenerator: Creating new ChartIndicator instance');
    indicator = new ChartIndicator(svg, config, containerId);
    svg.property('__indicator', indicator);
  } else {
    console.log('chartGenerator: Using existing ChartIndicator instance');
  }

  console.log('chartGenerator: Calling indicator.updateIndicatorPosition');
  const result = indicator.updateIndicatorPosition(position, scales, data, onPositionChange);
  console.log('chartGenerator: indicator.updateIndicatorPosition completed');
  return result;
}



/**
 * Main chart rendering function
 */
function renderChart(data, config, containerId, onPositionChange = null) {
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

  // No zoom: initial scale copies are unnecessary

  // Draw initial chart elements
  // Draw chart first, then axes on top to avoid the plot overlapping the axes
  drawChart(svg, data, { xScale, yScale }, config, containerId);
  drawAxesAndGrid(svg, { xScale, yScale, actualTicks }, dimensions, config);

  // Zoom removed for performance and simplicity

  return {
    updatePositionChartIndex: (chartIndex) => {
      console.log('chartGenerator: updatePositionChartIndex called with:', chartIndex);
      const result = updateIndicatorPosition(chartIndex, { xScale, yScale }, config, data, containerId, onPositionChange);
      console.log('chartGenerator: updateIndicatorPosition completed');
      return result;
    },
    destroy: () => {
      const container = document.getElementById(containerId);
      if (container) {
        d3.select(container).select("svg").remove();
        d3.select(container).selectAll(".chart-tooltip").remove();
      }
    }
  };
}


// Export the main line chart rendering function
export function generateLineChart(containerId, data, config, onPositionChange = null) {
  return renderChart(data, config, containerId, onPositionChange);
}

// Export function to generate chart modal (placeholder for now)
export function generateChartModal(data, chartContext, config) {
  // This function would create a modal with the chart
  // For now, we'll create a simple modal container and render the chart
  const modalId = 'chart-modal-' + Date.now();
  const modalContainer = document.createElement('div');
  modalContainer.id = modalId;
  modalContainer.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 800px;
    height: 600px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 1000;
    padding: 20px;
    box-sizing: border-box;
  `;

  // Add close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = `
    position: absolute;
    top: 10px;
    right: 15px;
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
  `;
  closeBtn.onclick = () => modalContainer.remove();

  modalContainer.appendChild(closeBtn);

  // Add title
  const title = document.createElement('h3');
  title.textContent = config.title || 'Chart';
  title.style.marginTop = '0';
  modalContainer.appendChild(title);

  // Add chart container
  const chartContainer = document.createElement('div');
  chartContainer.id = modalId + '-chart';
  chartContainer.style.cssText = 'width: 100%; height: calc(100% - 60px);';
  modalContainer.appendChild(chartContainer);

  document.body.appendChild(modalContainer);

  // Render chart in the modal
  setTimeout(() => {
    generateLineChart(chartContainer.id, data, config, chartContext.goToPosition);
  }, 100);

  return modalContainer;
}
