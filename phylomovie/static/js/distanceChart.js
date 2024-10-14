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

  let width = applicationContainer.clientWidth;
  let height = applicationContainer.clientHeight;

  // Set the dimensions and margins of the graph
  let margin = {
    right: 25,
    left: 40,
    bottom: 60,
    top: 10,
  };

  // Append the SVG object to the container
  let svg = d3
    .select(`#${containerId}`)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // Create a group for the chart content
  let chartGroup = svg
    .append("g")
    .attr("id", "chart")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  width = width - margin.left - margin.right;
  height = height - margin.top - margin.bottom;

  // Adjust the X axis
  let x = d3.scaleLinear().domain([1, data.length]).range([0, width]);

  // Limit the number of ticks to a maximum of 10
  let xAxis = d3
    .axisBottom(x)
    .ticks(Math.min(data.length, 10))
    .tickFormat(d3.format("d")); // Format labels as integers

  chartGroup
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis)
    .attr("id", "xAxis");

  // Adjust the Y axis
  let y = d3.scaleLinear().domain([0, yMax]).range([height, 0]);

  chartGroup.append("g").call(d3.axisLeft(y));

  // Add the line
  chartGroup
    .append("path")
    .datum(data)
    .attr("class", "line") // Added class for styling
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5)
    .attr(
      "d",
      d3
        .line()
        .x((d, i) => x(i + 1)) // Use index as x-value
        .y((d) => y(d)) // Use data point as y-value
    );

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

  // Adjust styles
  svg.selectAll("path.line").attr("stroke", "steelblue");
  svg.selectAll("text").attr("fill", "white");
  svg.selectAll("line").attr("stroke", "white");

  // Add click event to x-axis labels if onClick callback is provided
  if (typeof onClick === "function") {
    chartGroup
      .selectAll("#xAxis .tick text")
      .style("cursor", "pointer")
      .on("click", (event) => {
        let position = parseInt(d3.select(event.target).text()) - 1;
        onClick(position);
      });
  }

  // Add draggable vertical line to indicate current position
  if (typeof currentPosition === "number") {
    const lineX = x(currentPosition + 1); // Adjust for index starting at 1

    // Create a group for the draggable line and label
    const dragGroup = chartGroup.append("g").attr("class", "drag-group");

    // Add vertical line
    const dragLine = dragGroup
      .append("line")
      .attr("class", "current-position-line")
      .attr("x1", lineX)
      .attr("x2", lineX)
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "red")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4 4") // Dashed line
      .style("cursor", "pointer");

    // Add drag behavior to the line
    if (typeof onDrag === "function") {
      const dragBehavior = d3
        .drag()
        .on("start", dragStarted)
        .on("drag", dragged)
        .on("end", dragEnded);

      dragLine.call(dragBehavior);
    }

    // Add label near the bottom of the line
    const lineLabel = dragGroup
      .append("text")
      .attr("class", "current-position-label")
      .attr("x", lineX)
      .attr("y", height + 20) // Adjusted position for the label
      .attr("text-anchor", "middle")
      .attr("fill", "red")
      .style("font-size", "0.8em")
      .text(`${currentPosition + 1}`)
      .style("pointer-events", "none"); // Disable events on label

    function dragStarted(event) {
      d3.select(this).raise().attr("stroke-width", 3);
    }

    function dragged(event) {
      let xPos = event.x;

      // Constrain xPos within chart bounds
      xPos = Math.max(0, Math.min(width, xPos));

      // Update line position
      dragLine.attr("x1", xPos).attr("x2", xPos);

      // Update label position
      lineLabel.attr("x", xPos);

      // Calculate new position index based on xPos
      let newPosition = Math.round(x.invert(xPos)) - 1; // Zero-based index
      newPosition = Math.max(0, Math.min(data.length - 1, newPosition));

      // Update label text
      lineLabel.text(`${newPosition + 1}`);

      // Call onDrag callback with new position
      onDrag(newPosition);
    }

    function dragEnded(event) {
      d3.select(this).attr("stroke-width", 2);
    }
  }
}