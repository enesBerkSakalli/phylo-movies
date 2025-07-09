import * as d3 from "d3";
import { updateChartIndicator } from "./chartGenerator.ts";

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
