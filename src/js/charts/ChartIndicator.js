import * as d3 from "d3";

/**
 * ChartIndicator - Manages the position indicator for charts
 * Extracted from chartGenerator.js to improve maintainability
 */
export class ChartIndicator {
  constructor(svg, config, containerId) {
    this.svg = svg;
    this.config = config;
    this.containerId = containerId;
    this.indicatorGroup = null;
  }

  /**
   * Validate and clamp position to data bounds
   * @param {number} position - Position to validate
   * @param {number} dataLength - Length of data array
   * @returns {number} Validated position
   */
  validatePosition(position, dataLength) {
    return Math.max(0, Math.min(dataLength - 1, position));
  }

  /**
   * Creates or updates the position indicator
   * @param {number} position - Current position index
   * @param {Object} scales - Chart scales {xScale, yScale}
   * @param {Array} data - Chart data
   * @param {Function} onPositionChange - Callback when position changes
   * @returns {d3.Selection} The indicator group selection
   */
  updateIndicatorPosition(position, scales, data, onPositionChange) {
    const { xScale, yScale } = scales;
    const [r0, r1] = yScale.range();
    const height = Math.abs(r1 - r0);
    const validPosition = this.validatePosition(position, data.length);

    let indicatorGroup = this.svg.select("#indicator-modal-group");
    let isNew = false;

    if (indicatorGroup.empty()) {
      isNew = true;
      indicatorGroup = this._createIndicatorGroup(height);
      this.indicatorGroup = indicatorGroup;
    }

    // Update positions and text using validated position
    this._updateIndicatorElements(indicatorGroup, validPosition, data, scales, height);


    // Add drag behavior if newly created OR if it doesn't have drag behavior yet
    if (isNew || !indicatorGroup.property('__hasDrag')) {
      this._addDragBehavior(indicatorGroup, data, scales, onPositionChange);
      indicatorGroup.property('__hasDrag', true);
    } else {
    }

    return indicatorGroup;
  }

  /**
   * Create the indicator group with all visual elements
   * @param {number} height - Chart height
   * @returns {d3.Selection} The indicator group selection
   * @private
   */
  _createIndicatorGroup(height) {
    const indicatorGroup = this.svg.append("g")
      .attr("id", "indicator-modal-group")
      .style("cursor", "grab");

    // Touch target
    indicatorGroup.append("rect")
      .attr("class", "indicator-touch-target")
      .attr("y", 0)
      .attr("width", 30)
      .attr("height", height)
      .attr("fill", "transparent");

    // Indicator line
    indicatorGroup.append("line")
      .attr("class", "indicator-line")
      .attr("y1", 0)
      .attr("y2", height)
      // Use Material tokens (fallbacks provided)
      .attr("stroke", "var(--md-sys-color-secondary, #FF4500)")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5");

    // Handle
    indicatorGroup.append("circle")
      .attr("class", "indicator-handle")
      .attr("cy", height / 2)
      .attr("r", 8)
      .attr("fill", "var(--md-sys-color-secondary, #FF4500)")
      .attr("stroke", "var(--md-sys-color-outline, #23242b)")
      .attr("stroke-width", 1.5);

    // Value text
    indicatorGroup.append("text")
      .attr("class", "handle-value")
      .attr("y", height / 2 - 15)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--md-sys-color-primary, blue)")
      .attr("font-weight", "900")
      .attr("font-size", "16px")
      .style("pointer-events", "none");

    // Position label
    indicatorGroup.append("text")
      .attr("class", "current-position-label")
      .attr("y", height + 17)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--md-sys-color-secondary, #FF4500)")
      .attr("font-weight", "bold")
      .attr("font-size", "13px")
      .style("pointer-events", "none");

    return indicatorGroup;
  }

  /**
   * Update indicator element positions and text
   * @param {d3.Selection} indicatorGroup - Indicator group selection
   * @param {number} validPosition - Validated position
   * @param {Array} data - Chart data
   * @param {Object} scales - Chart scales
   * @param {number} height - Chart height
   * @private
   */
  _updateIndicatorElements(indicatorGroup, validPosition, data, scales) {
    const { xScale } = scales;
    const xAcc = this.config.xAccessor;
    const yAcc = this.config.yAccessor;
    const indicatorX = xScale(xAcc(data[validPosition], validPosition));

    indicatorGroup.select(".indicator-touch-target").attr("x", indicatorX - 15);
    indicatorGroup.select(".indicator-line").attr("x1", indicatorX).attr("x2", indicatorX);
    indicatorGroup.select(".indicator-handle").attr("cx", indicatorX);
    indicatorGroup.select(".handle-value")
      .attr("x", indicatorX)
      .text(Number.parseFloat(yAcc(data[validPosition])).toFixed(3));
    indicatorGroup.select(".current-position-label")
      .attr("x", indicatorX)
      .text(`${validPosition + 1}`);
  }

  /**
   * Add drag behavior to the indicator group
   * @param {d3.Selection} indicatorGroup - Indicator group selection
   * @param {Array} data - Chart data
   * @param {Object} scales - Chart scales
   * @param {Function} onPositionChange - Callback when position changes
   * @private
   */
  _addDragBehavior(indicatorGroup, data, scales, onPositionChange) {
    const { xScale, yScale } = scales;

    const dragBehavior = d3.drag()
      .on("start", function(event) {
        d3.select(this).selectAll(".indicator-line").attr("stroke-width", 3);
        d3.select(this).selectAll(".indicator-handle").attr("r", 10);
        d3.select(this).style("cursor", "grabbing");
        d3.select(this).classed("dragging", true);
      })
      .on("drag", (event) => {
        const currentX = event.x;
        let closestIndex = 0;
        let minDistance = Infinity;

        
        data.forEach((d, i) => {
          const xAcc = this.config.xAccessor;
          const pointX = xScale(xAcc(d, i));
          const distance = Math.abs(currentX - pointX);
          if (distance < minDistance) {
            minDistance = distance;
            closestIndex = i;
          }
        });

        closestIndex = this.validatePosition(closestIndex, data.length);
        
        // Update the visual position of the indicator during drag
        const height = Math.abs(yScale.range()[1] - yScale.range()[0]);
        this._updateIndicatorElements(indicatorGroup, closestIndex, data, scales, height);
        
        onPositionChange(closestIndex);
      })
      .on("end", function() {
        d3.select(this).selectAll(".indicator-line").attr("stroke-width", 2);
        d3.select(this).selectAll(".indicator-handle").attr("r", 8);
        d3.select(this).style("cursor", "grab");
        d3.select(this).classed("dragging", false);
      });

    indicatorGroup.call(dragBehavior);
  }

  /**
   * Remove the indicator from the chart
   */
  removeIndicator() {
    this.svg.select("#indicator-modal-group").remove();
    this.indicatorGroup = null;
  }

  /**
   * Get the current indicator group selection
   * @returns {d3.Selection|null} The indicator group selection or null if not created
   */
  getIndicatorGroup() {
    return this.indicatorGroup;
  }

  /**
   * Check if the indicator exists
   * @returns {boolean} True if indicator exists
   */
  hasIndicator() {
    return !this.svg.select("#indicator-modal-group").empty();
  }

  /**
   * Clean up the indicator
   */
  destroy() {
    this.removeIndicator();
    this.svg = null;
    this.config = null;
    this.containerId = null;
    this.indicatorGroup = null;
  }
}
