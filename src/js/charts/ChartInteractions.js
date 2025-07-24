import * as d3 from "d3";

/**
 * ChartInteractions - Handles all user interactions for charts
 * Extracted from chartGenerator.js to improve maintainability
 */
export class ChartInteractions {
  constructor(svg, config, containerId) {
    this.svg = svg;
    this.config = config;
    this.containerId = containerId;
    this.tooltip = null;
  }

  /**
   * Create and configure tooltip for the chart
   * @private
   */
  _createTooltip() {
    if (this.tooltip) return this.tooltip;

    this.tooltip = d3.select(`#${this.containerId}`)
      .append("div")
      .attr("class", "chart-tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background-color", "var(--md-sys-color-surface-container-highest, rgba(35,36,43,0.9))")
      .style("border", "1px solid var(--md-sys-color-outline-variant, rgba(255,255,255,0.2))")
      .style("border-radius", "var(--md-sys-shape-corner-medium, 5px)")
      .style("padding", "var(--md-sys-spacing-2, 10px) var(--md-sys-spacing-3, 15px)")
      .style("font-size", "var(--md-sys-typescale-label-medium-size, 13px)")
      .style("font-family", "var(--md-sys-typescale-label-medium-font, Heebo, sans-serif)")
      .style("color", "var(--md-sys-color-on-surface, white)")
      .style("pointer-events", "none")
      .style("box-shadow", "var(--md-sys-elevation-level2, 0px 3px 10px rgba(0,0,0,0.3))")
      .style("z-index", "1000");

    return this.tooltip;
  }

  /**
   * Add tooltip interactions to data points
   * @param {d3.Selection} circles - D3 selection of circle elements
   * @param {Array} data - Chart data
   */
  addTooltips(circles, data) {
    const tooltip = this._createTooltip();

    circles
      .on("mouseover", (event, d) => {
        const index = parseInt(d3.select(event.currentTarget).attr("data-index"), 10);
        d3.select(event.currentTarget)
          .transition()
          .duration(100)
          .attr("r", 6)
          .attr("fill", "var(--md-sys-color-secondary, #FF4500)");

        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(this.config.tooltipFormatter(d, index))
          .style("left", `${event.pageX + 15}px`)
          .style("top", `${event.pageY - 28}px`);
      })
      .on("mousemove", (event) => {
        tooltip.style("left", `${event.pageX + 15}px`)
          .style("top", `${event.pageY - 28}px`);
      })
      .on("mouseout", (event) => {
        d3.select(event.currentTarget)
          .transition()
          .duration(100)
          .attr("r", 4)
          .attr("fill", "var(--md-sys-color-primary, #4390e1)");
        tooltip.transition().duration(300).style("opacity", 0);
      });

    return circles;
  }

  /**
   * Add click handlers to data points
   * @param {d3.Selection} circles - D3 selection of circle elements
   * @param {Function} onPositionChange - Callback when position changes
   */
  addClickHandlers(circles, onPositionChange) {
    circles.on("click", (event, d) => {
      const index = parseInt(d3.select(event.currentTarget).attr("data-index"), 10);
      if (typeof onPositionChange === 'function') {
        // Emit click event - let parent handle navigation logic
        onPositionChange(index);
      }
    });

    return circles;
  }

  /**
   * Create interactive data points with all interactions
   * @param {Array} data - Chart data
   * @param {Object} scales - Chart scales {xScale, yScale}
   * @param {Function} onPositionChange - Callback when position changes
   * @returns {d3.Selection} The circles selection
   */
  createInteractiveDataPoints(data, scales, onPositionChange) {
    const { xScale, yScale } = scales;

    // Data points container
    const pointsContainer = this.svg.append("g")
      .attr("class", "data-points")
      .attr("clip-path", `url(#clip-${this.containerId})`);

    // Create circles
    const circles = pointsContainer.selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", (d, i) => xScale(this.config.xAccessor(d, i)))
      .attr("cy", (d) => yScale(this.config.yAccessor(d)))
      .attr("r", 4)
      .attr("fill", "var(--md-sys-color-primary, #4390e1)")
      .attr("stroke", "var(--md-sys-color-outline, #23242b)")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .attr("data-index", (d, i) => i);

    // Add all interactions
    this.addTooltips(circles, data);
    this.addClickHandlers(circles, onPositionChange);

    return circles;
  }


  /**
   * Clean up interactions (remove tooltip)
   */
  destroy() {
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
  }
}