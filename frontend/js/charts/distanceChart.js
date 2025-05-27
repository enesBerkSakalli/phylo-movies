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
 * Generates a distance line chart with a draggable indicator line.
 * @param {Object} config - Configuration object for the chart.
 * @param {string} config.containerId - The ID of the container element where the chart will be appended.
 * @param {number[]} data - An array of numerical values representing the relative distances.
 * @param {Object} [options] - Optional parameters for the chart.
 * @param {string} [options.xLabel='Index'] - Label for the X-axis.
 * @param {string} [options.yLabel='Value'] - Label for the Y-axis.
 * @param {number} [options.yMax=1] - Maximum value for the Y-axis.
 * @param {number} [options.currentPosition] - Current position index to display the indicator line.
 * @param {function} [options.onClick] - Callback function when a tick label is clicked.
 * @param {function} [options.onDrag] - Callback function when the indicator line is dragged.
 * @returns {Object} - Chart instance with update method for resizing.
 */
export function generateDistanceChart(config, data, options = {}) {
  const { containerId } = config;

  const {
    xLabel = "Index",
    yLabel = "Value",
    yMax = 1,
    currentPosition,
    onClick,
    onDrag,
  } = options;

  // Remove any existing SVG element inside the container
  d3.select(`#${containerId} svg`).remove();

  const applicationContainer = document.getElementById(containerId);

  // Store initial dimensions and create chart state object
  const chartState = {
    containerId,
    data,
    options,
    svg: null,
    chartGroup: null,
    clipGroup: null,
    scales: {},
    elements: {},
    resizeObserver: null
  };

  // Function to get current dimensions
  function getCurrentDimensions() {
    const container = document.getElementById(containerId);
    return {
      width: container.clientWidth,
      height: container.clientHeight
    };
  }

  // Function to calculate margins based on container size
  function calculateMargins(containerWidth, containerHeight) {
    return {
      right: Math.max(25, containerWidth * 0.05),
      left: Math.max(40, containerWidth * 0.08),
      bottom: Math.max(60, containerHeight * 0.15),
      top: Math.max(20, containerHeight * 0.05),
    };
  }

  // Main chart rendering function
  function renderChart() {
    const { width: containerWidth, height: containerHeight } = getCurrentDimensions();
    const margin = calculateMargins(containerWidth, containerHeight);

    // Create responsive SVG
    chartState.svg = d3
      .select(`#${containerId}`)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("class", "distance-chart")
      .style("font-family", "Heebo, sans-serif");

    // Create chart group
    chartState.chartGroup = chartState.svg
      .append("g")
      .attr("id", "chart")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    // Store dimensions and scales in chart state
    chartState.width = width;
    chartState.height = height;
    chartState.margin = margin;

    // Create scales
    chartState.scales.x = d3.scaleLinear().domain([1, data.length]).range([0, width]);
    chartState.scales.y = d3.scaleLinear().domain([0, yMax]).range([height, 0]);

    // Render chart elements
    renderChartElements();
  }

  // Function to render chart elements
  function renderChartElements() {
    const { chartGroup, scales, width, height, margin } = chartState;
    const { x, y } = scales;

    // Add a background rectangle to capture click events more easily
    chartGroup
      .append("rect")
      .attr("class", "chart-background")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .style("cursor", "pointer");

    // Create a clipping path to contain the chart elements
    chartState.svg
      .append("defs")
      .append("clipPath")
      .attr("id", `clip-${containerId}`)
      .append("rect")
      .attr("width", width)
      .attr("height", height);

    // Create axes
    renderAxes();

    // Create chart elements with clipping
    chartState.clipGroup = chartGroup
      .append("g")
      .attr("clip-path", `url(#clip-${containerId})`)
      .attr("class", "chart-elements");

    renderDataElements();
    renderLabels();
    renderTooltip();
    renderPositionIndicator();

    // Apply styling
    applyStyles();
  }

  // Function to render axes
  function renderAxes() {
    const { chartGroup, scales, width, height } = chartState;
    const { x, y } = scales;

    // X axis
    const xAxis = d3
      .axisBottom(x)
      .ticks(Math.min(data.length, 10))
      .tickFormat(d3.format("d"));

    chartGroup
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .attr("id", "xAxis")
      .attr("class", "axis");

    // Y axis
    chartGroup.append("g").call(d3.axisLeft(y)).attr("class", "axis");
  }

  // Function to render data elements (area, line, dots)
  function renderDataElements() {
    const { clipGroup, scales } = chartState;
    const { x, y } = scales;

    // Add the area under the line
    clipGroup
      .append("path")
      .datum(data)
      .attr("class", "area")
      .attr("fill", "rgba(70, 130, 180, 0.1)")
      .attr(
        "d",
        d3
          .area()
          .x((d, i) => x(i + 1))
          .y0(chartState.height)
          .y1((d) => y(d))
      );

    // Add the line
    clipGroup
      .append("path")
      .datum(data)
      .attr("class", "line")
      .attr("fill", "none")
      .attr("stroke", "#4682B4")
      .attr("stroke-width", 2)
      .attr(
        "d",
        d3
          .line()
          .x((d, i) => x(i + 1))
          .y((d) => y(d))
      );

    // Add dots for data points
    clipGroup
      .selectAll(".dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", (d, i) => x(i + 1))
      .attr("cy", (d) => y(d))
      .attr("r", 3)
      .attr("fill", "#4682B4")
      .attr("stroke", "white")
      .attr("stroke-width", 1);
  }

  // Function to render labels
  function renderLabels() {
    const { chartGroup, width, height, margin } = chartState;

    // Add X axis label
    chartGroup
      .append("text")
      .attr("class", "x-label")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 10)
      .attr("fill", "white")
      .text(xLabel)
      .style("font-size", "0.8em");

    // Add Y axis label
    chartGroup
      .append("text")
      .attr("class", "y-label")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -margin.left + 15)
      .attr("fill", "white")
      .text(yLabel)
      .style("font-size", "0.8em");
  }

  // Function to apply styles
  function applyStyles() {
    chartState.svg.selectAll(".axis path, .axis line").attr("stroke", "rgba(255, 255, 255, 0.3)");
    chartState.svg.selectAll(".axis text").attr("fill", "rgba(255, 255, 255, 0.7)");
  }

  // Function to render tooltip
  function renderTooltip() {
    // Create a tooltip container
    const tooltip = d3
      .select(`#${containerId}`)
      .append("div")
      .attr("class", "chart-tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background-color", "#fff")
      .style("border", "1px solid #ccc")
      .style("border-radius", "5px")
      .style("padding", "8px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1000");

    // Add click event to the background
    chartState.chartGroup.select(".chart-background").on("click", function(event) {
      if (!onClick) return;
      
      const mouseX = d3.pointer(event)[0];
      const position = Math.round(chartState.scales.x.invert(mouseX)) - 1;
      const validPosition = Math.max(0, Math.min(data.length - 1, position));
      onClick(validPosition);
    });

    // Add tooltip interactivity to dots
    chartState.clipGroup.selectAll(".dot")
      .on("mouseover", function(event, d) {
        const i = data.indexOf(d);
        d3.select(this)
          .transition()
          .duration(100)
          .attr("r", 5)
          .attr("fill", "#FF4500");
          
        tooltip
          .transition()
          .duration(200)
          .style("opacity", 0.9);
          
        tooltip
          .html(`<div class="tooltip-title">Position ${i + 1}</div><div class="tooltip-value">Value: ${d.toFixed(4)}</div>`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", 3)
          .attr("fill", "#4682B4");
          
        tooltip
          .transition()
          .duration(500)
          .style("opacity", 0);
      })
      .on("click", function(event, d) {
        if (!onClick) return;
        const i = data.indexOf(d);
        onClick(i);
        event.stopPropagation();
      });
  }

  // Function to render position indicator
  function renderPositionIndicator() {
    if (typeof currentPosition === "number") {
      createPositionIndicator(chartState.chartGroup, data, chartState.scales.x, chartState.scales.y, chartState.height, currentPosition, onDrag);
    }
  }

  // Chart update function for resizing
  function updateChart() {
    // Remove existing SVG content but preserve the container
    d3.select(`#${containerId} svg`).remove();
    d3.select(`#${containerId} .chart-tooltip`).remove();
    
    // Re-render the chart
    renderChart();
  }

  // Set up resize observer for responsive behavior
  function setupResizeObserver() {
    if (window.ResizeObserver) {
      chartState.resizeObserver = new ResizeObserver(debounce(() => {
        updateChart();
      }, 250));
      
      chartState.resizeObserver.observe(document.getElementById(containerId));
    } else {
      // Fallback for browsers without ResizeObserver
      window.addEventListener('resize', debounce(() => {
        updateChart();
      }, 250));
    }
  }

  // Initialize the chart
  renderChart();
  setupResizeObserver();

  // Return chart instance with methods for external control
  return {
    update: updateChart,
    updatePosition: (newPosition) => {
      // Update position indicator without full redraw
      d3.select(`#${containerId} .drag-indicator`).remove();
      if (typeof newPosition === "number") {
        createPositionIndicator(chartState.chartGroup, data, chartState.scales.x, chartState.scales.y, chartState.height, newPosition, onDrag);
      }
    },
    destroy: () => {
      if (chartState.resizeObserver) {
        chartState.resizeObserver.disconnect();
      }
      d3.select(`#${containerId} svg`).remove();
      d3.select(`#${containerId} .chart-tooltip`).remove();
    },
    getState: () => chartState
  };
}

/**
 * Creates an enhanced position indicator (ship) with improved touch target
 */
function createPositionIndicator(chartGroup, data, x, y, height, currentPosition, onDrag) {
  // Create a group for the position indicator
  const dragGroup = chartGroup.append("g")
    .attr("class", "drag-indicator")
    .attr("cursor", "grab");
  
  // Calculate the initial position
  const lineX = x(currentPosition + 1);
  
  // Add a transparent touch target (wide rectangle) for better touch interaction
  const touchTarget = dragGroup.append("rect")
    .attr("class", "touch-target")
    .attr("x", lineX - 15) // Wider target for easier touch
    .attr("y", 0)
    .attr("width", 30)
    .attr("height", height)
    .attr("fill", "transparent")
    .style("cursor", "grab");
  
  // Add vertical line
  const dragLine = dragGroup.append("line")
    .attr("class", "current-position-line")
    .attr("x1", lineX)
    .attr("x2", lineX)
    .attr("y1", 0)
    .attr("y2", height)
    .attr("stroke", "#FF4500")
    .attr("stroke-width", 2);

  // Add a handle (circle) for more obvious draggability
  const dragHandle = dragGroup.append("circle")
    .attr("class", "drag-handle")
    .attr("cx", lineX)
    .attr("cy", height / 2)
    .attr("r", 8)
    .attr("fill", "#FF4500")
    .attr("stroke", "white")
    .attr("stroke-width", 1)
    .style("cursor", "grab");
    
  // Add a label at the top of the line
  const lineLabel = dragGroup.append("text")
    .attr("class", "current-position-label")
    .attr("x", lineX)
    .attr("y", -5)
    .attr("text-anchor", "middle")
    .attr("fill", "#FF4500")
    .attr("font-weight", "bold")
    .text(`${currentPosition + 1}`)
    .style("pointer-events", "none");
  
  // Define drag behavior
  const drag = d3.drag()
    .on("start", dragStarted)
    .on("drag", dragged)
    .on("end", dragEnded);
  
  // Apply drag behavior to all indicator elements
  dragGroup.call(drag);
  
  function dragStarted() {
    // Visual feedback when starting drag
    dragLine.attr("stroke-width", 3);
    dragHandle.attr("r", 10);
    d3.select(this).style("cursor", "grabbing");
  }
  
  function dragged(event) {
    // Calculate new position
    const xPos = Math.max(0, Math.min(event.x, x.range()[1]));
    
    // Update indicator positions
    dragLine.attr("x1", xPos).attr("x2", xPos);
    dragHandle.attr("cx", xPos);
    touchTarget.attr("x", xPos - 15);
    lineLabel.attr("x", xPos);
    
    // Calculate the new index position
    const newPos = Math.round(x.invert(xPos)) - 1;
    const validPosition = Math.max(0, Math.min(data.length - 1, newPos));
    
    // Update the label
    lineLabel.text(`${validPosition + 1}`);
    
    // Call the callback with the new position
    if (onDrag) {
      onDrag(validPosition);
    }
  }
  
  function dragEnded() {
    // Restore the visual appearance
    dragLine.attr("stroke-width", 2);
    dragHandle.attr("r", 8);
    d3.select(this).style("cursor", "grab");
  }
}