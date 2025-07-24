import * as d3 from "d3";

/**
 * Simplified chart state manager for chart operations
 */
export class ChartStateManager {
  constructor(containerId, chartType) {
    this.containerId = containerId;
    this.chartType = chartType;
    this.scales = null;
    this.data = null;
    this.config = null;
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
