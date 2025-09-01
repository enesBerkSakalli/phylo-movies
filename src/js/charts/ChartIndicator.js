import * as d3 from "d3";

/**
 * ChartIndicator - Manages the ship position indicator for charts
 * Extracted from chartGenerator.js to improve maintainability
 */
export class ChartIndicator {
  constructor(svg, config, containerId) {
    this.svg = svg;
    this.config = config;
    this.containerId = containerId;
    this.shipGroup = null;
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
   * Creates or updates the ship position indicator
   * @param {number} position - Current position index
   * @param {Object} scales - Chart scales {xScale, yScale}
   * @param {Array} data - Chart data
   * @param {Function} onPositionChange - Callback when position changes
   * @returns {d3.Selection} The ship group selection
   */
  updateShipPosition(position, scales, data, onPositionChange) {
    const { xScale, yScale } = scales || {};

    // Handle empty data or missing scales
    if (!data || data.length === 0 || !xScale || !yScale) {
      this.svg.select("#ship-modal-group").remove();
      return null;
    }

    // Derive chart height robustly from scale range (accounts for inverted ranges)
    const [r0, r1] = yScale.range();
    const height = Math.abs(r1 - r0);
    const validPosition = this.validatePosition(position, data.length);

    let shipGroup = this.svg.select("#ship-modal-group");
    let isNew = false;

    if (shipGroup.empty()) {
      isNew = true;
      shipGroup = this._createShipGroup(height);
      this.shipGroup = shipGroup;
    }

    // Update positions and text using validated position
    this._updateShipElements(shipGroup, validPosition, data, scales, height);

    // Always highlight the correct data point
    this._highlightDataPoint(validPosition);

    // Add drag behavior only if it's newly created
    if (isNew && onPositionChange) {
      this._addDragBehavior(shipGroup, data, scales, onPositionChange);
    }

    return shipGroup;
  }

  /**
   * Create the ship group with all visual elements
   * @param {number} height - Chart height
   * @returns {d3.Selection} The ship group selection
   * @private
   */
  _createShipGroup(height) {
    const shipGroup = this.svg.append("g")
      .attr("id", "ship-modal-group")
      .style("cursor", "grab");

    // Touch target
    shipGroup.append("rect")
      .attr("class", "ship-touch-target")
      .attr("y", 0)
      .attr("width", 30)
      .attr("height", height)
      .attr("fill", "transparent");

    // Ship line
    shipGroup.append("line")
      .attr("class", "ship-line")
      .attr("y1", 0)
      .attr("y2", height)
      // Use Material tokens (fallbacks provided)
      .attr("stroke", "var(--pm-indicator, var(--md-sys-color-secondary, #FF4500))")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5");

    // Handle
    shipGroup.append("circle")
      .attr("class", "ship-handle")
      .attr("cy", height / 2)
      .attr("r", 8)
      .attr("fill", "var(--pm-indicator, var(--md-sys-color-secondary, #FF4500))")
      .attr("stroke", "var(--pm-indicator-stroke, var(--md-sys-color-outline, #23242b))")
      .attr("stroke-width", 1.5);

    // Value text
    shipGroup.append("text")
      .attr("class", "handle-value")
      .attr("y", height / 2 - 15)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--pm-indicator-contrast, var(--md-sys-color-on-secondary, #ffffff))")
      .attr("font-weight", "bold")
      .attr("font-size", "12px")
      .style("pointer-events", "none");

    // Position label
    shipGroup.append("text")
      .attr("class", "current-position-label")
      .attr("y", height + 17)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--pm-indicator, var(--md-sys-color-secondary, #FF4500))")
      .attr("font-weight", "bold")
      .attr("font-size", "13px")
      .style("pointer-events", "none");

    return shipGroup;
  }

  /**
   * Update ship element positions and text
   * @param {d3.Selection} shipGroup - Ship group selection
   * @param {number} validPosition - Validated position
   * @param {Array} data - Chart data
   * @param {Object} scales - Chart scales
   * @param {number} height - Chart height
   * @private
   */
  _updateShipElements(shipGroup, validPosition, data, scales, height) {
    const { xScale } = scales;
    // Accessors with safe fallbacks
    const xAcc = this.config?.xAccessor || ((d, i) => i);
    const yAcc = this.config?.yAccessor || ((d) => d);
    const shipX = xScale(xAcc(data[validPosition], validPosition));

    shipGroup.select(".ship-touch-target").attr("x", shipX - 15);
    shipGroup.select(".ship-line").attr("x1", shipX).attr("x2", shipX);
    shipGroup.select(".ship-handle").attr("cx", shipX);
    shipGroup.select(".handle-value")
      .attr("x", shipX)
      .text(Number.parseFloat(yAcc(data[validPosition])).toFixed(3));
    shipGroup.select(".current-position-label")
      .attr("x", shipX)
      .text(`${validPosition + 1}`);
  }

  /**
   * Highlight the data point at the current position
   * @param {number} validPosition - Validated position
   * @private
   */
  _highlightDataPoint(validPosition) {
    this.svg.selectAll(".data-points circle")
      .attr("fill", "var(--md-sys-color-primary, #4390e1)")
      .attr("r", 4);
    
    this.svg.selectAll(".data-points circle")
      .filter((d, i) => i === validPosition)
      .attr("fill", "var(--md-sys-color-secondary, #FF4500)")
      .attr("r", 6);
  }


  /**
   * Add drag behavior to the ship group
   * @param {d3.Selection} shipGroup - Ship group selection
   * @param {Array} data - Chart data
   * @param {Object} scales - Chart scales
   * @param {Function} onPositionChange - Callback when position changes
   * @private
   */
  _addDragBehavior(shipGroup, data, scales, onPositionChange) {
    const { xScale } = scales;

    const dragBehavior = d3.drag()
      .on("start", function(event) {
        d3.select(this).selectAll(".ship-line").attr("stroke-width", 3);
        d3.select(this).selectAll(".ship-handle").attr("r", 10);
        d3.select(this).style("cursor", "grabbing");
        d3.select(this).classed("dragging", true);
      })
      .on("drag", (event) => {
        const currentX = event.x;
        let closestIndex = 0;
        let minDistance = Infinity;

        data.forEach((d, i) => {
          const xAcc = this.config?.xAccessor || ((_, idx) => idx);
          const pointX = xScale(xAcc(d, i));
          const distance = Math.abs(currentX - pointX);
          if (distance < minDistance) {
            minDistance = distance;
            closestIndex = i;
          }
        });

        closestIndex = this.validatePosition(closestIndex, data.length);
        
        // Emit position change event - let parent handle navigation logic
        if (typeof onPositionChange === 'function') {
          onPositionChange(closestIndex);
        }
      })
      .on("end", function() {
        d3.select(this).selectAll(".ship-line").attr("stroke-width", 2);
        d3.select(this).selectAll(".ship-handle").attr("r", 8);
        d3.select(this).style("cursor", "grab");
        d3.select(this).classed("dragging", false);
      });

    shipGroup.call(dragBehavior);
  }

  /**
   * Remove the ship indicator from the chart
   */
  removeShip() {
    this.svg.select("#ship-modal-group").remove();
    this.shipGroup = null;
  }

  /**
   * Get the current ship group selection
   * @returns {d3.Selection|null} The ship group selection or null if not created
   */
  getShipGroup() {
    return this.shipGroup;
  }

  /**
   * Check if the ship indicator exists
   * @returns {boolean} True if ship indicator exists
   */
  hasShip() {
    return !this.svg.select("#ship-modal-group").empty();
  }

  /**
   * Clean up the indicator
   */
  destroy() {
    this.removeShip();
    this.svg = null;
    this.config = null;
    this.containerId = null;
    this.shipGroup = null;
  }
}
