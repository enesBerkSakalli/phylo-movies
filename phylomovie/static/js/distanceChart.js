/**
 * Generates a distance line chart.
 * @param {Object} config - Configuration object for the chart.
 * @param {string} config.containerId - The ID of the container element where the chart will be appended.
 * @param {number[]} data - An array of numerical values representing the relative distances.
 * @param {Object} [options] - Optional parameters for the chart.
 * @param {string} [options.xLabel='Index'] - Label for the X-axis.
 * @param {string} [options.yLabel='Value'] - Label for the Y-axis.
 * @param {number} [options.yMax=1] - Maximum value for the Y-axis.
 * @param {function} [options.onClick] - Callback function when a tick label is clicked.
 */
export function generateDistanceChart(config, data, options = {}) {
  const { containerId } = config;

  const { xLabel = "Index", yLabel = "Value", yMax = 1, onClick } = options;

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
    .attr("height", height)
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

  svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis)
    .attr("id", "xAxis");

  // Adjust the Y axis
  let y = d3.scaleLinear().domain([0, yMax]).range([height, 0]);

  svg.append("g").call(d3.axisLeft(y));

  // Add the line
  svg
    .append("path")
    .datum(data)
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
  svg
    .append("text")
    .attr("class", "x-label")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .attr("fill", "white")
    .text(xLabel)
    .style("font-size", "0.8em");

  // Add Y axis label
  svg
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
  svg.selectAll("path").attr("stroke", "steelblue");
  svg.selectAll("text").attr("fill", "white");
  svg.selectAll("line").attr("stroke", "white");

  // Add click event to x-axis labels if onClick callback is provided
  if (typeof onClick === "function") {
    svg
      .selectAll("#xAxis .tick text")
      .style("cursor", "pointer")
      .on("click", (event) => {
        let position = parseInt(d3.select(event.target).text()) - 1;
        onClick(position);
      });
  }
}
