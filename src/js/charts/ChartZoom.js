import * as d3 from "d3";

/**
 * ChartZoom - Manages zoom behavior for charts
 * Extracted from chartGenerator.js to improve maintainability
 */
export class ChartZoom {
  constructor(svg, dimensions, config) {
    this.svg = svg;
    this.dimensions = dimensions;
    this.config = config;
    this.zoom = null;
    this.onZoomCallback = null;
  }

  /**
   * Initialize zoom behavior on the SVG
   * @param {Object} initialScales - Initial scales {xScale, yScale}
   * @param {Function} onZoom - Callback function called during zoom events
   * @returns {d3.ZoomBehavior} The zoom behavior instance
   */
  initialize(initialScales, onZoom) {
    this.initialScales = {
      xScale: initialScales.xScale.copy(),
      yScale: initialScales.yScale.copy()
    };
    
    this.onZoomCallback = onZoom;

    // Create zoom behavior
    this.zoom = d3.zoom()
      .scaleExtent([1, 10]) // Allow zooming in up to 10x
      .extent([[0, 0], [this.dimensions.width, this.dimensions.height]])
      .translateExtent([[0, 0], [this.dimensions.width, this.dimensions.height]])
      .on("zoom", this._handleZoom.bind(this));

    // Apply zoom to SVG
    this.svg.call(this.zoom);

    return this.zoom;
  }

  /**
   * Handle zoom events
   * @param {Object} event - D3 zoom event
   * @private
   */
  _handleZoom(event) {
    // Create new scales based on the zoom transform
    const newXScale = event.transform.rescaleX(this.initialScales.xScale);
    const newYScale = event.transform.rescaleY(this.initialScales.yScale);

    // Call the provided zoom callback with new scales
    if (typeof this.onZoomCallback === 'function') {
      this.onZoomCallback({
        xScale: newXScale,
        yScale: newYScale,
        transform: event.transform
      });
    }
  }

  /**
   * Programmatically set zoom level
   * @param {number} scale - Zoom scale (1 = no zoom, 2 = 2x zoom, etc.)
   * @param {Array} center - Optional center point [x, y] for zoom
   */
  setZoom(scale, center) {
    if (!this.zoom) return;

    const transform = center 
      ? d3.zoomIdentity.translate(-center[0] * (scale - 1), -center[1] * (scale - 1)).scale(scale)
      : d3.zoomIdentity.scale(scale);

    this.svg.transition()
      .duration(300)
      .call(this.zoom.transform, transform);
  }

  /**
   * Reset zoom to original state
   */
  resetZoom() {
    if (!this.zoom) return;

    this.svg.transition()
      .duration(300)
      .call(this.zoom.transform, d3.zoomIdentity);
  }

  /**
   * Get current zoom transform
   * @returns {d3.ZoomTransform} Current zoom transform
   */
  getCurrentTransform() {
    return d3.zoomTransform(this.svg.node());
  }

  /**
   * Enable/disable zoom behavior
   * @param {boolean} enabled - Whether zoom should be enabled
   */
  setEnabled(enabled) {
    if (!this.zoom) return;

    if (enabled) {
      this.svg.call(this.zoom);
    } else {
      this.svg.on('.zoom', null);
    }
  }

  /**
   * Update zoom constraints (scale extent, translate extent)
   * @param {Object} options - Zoom constraint options
   * @param {Array} options.scaleExtent - [min, max] scale values
   * @param {Array} options.translateExtent - [[x0, y0], [x1, y1]] translate bounds
   */
  updateConstraints(options = {}) {
    if (!this.zoom) return;

    if (options.scaleExtent) {
      this.zoom.scaleExtent(options.scaleExtent);
    }

    if (options.translateExtent) {
      this.zoom.translateExtent(options.translateExtent);
    }
  }

  /**
   * Get zoom scale factor
   * @returns {number} Current zoom scale (1 = no zoom)
   */
  getScale() {
    const transform = this.getCurrentTransform();
    return transform ? transform.k : 1;
  }

  /**
   * Check if chart is currently zoomed
   * @returns {boolean} True if chart is zoomed (scale > 1)
   */
  isZoomed() {
    return this.getScale() > 1;
  }

  /**
   * Clean up zoom behavior
   */
  destroy() {
    if (this.zoom && this.svg) {
      this.svg.on('.zoom', null);
    }
    this.zoom = null;
    this.svg = null;
    this.dimensions = null;
    this.config = null;
    this.initialScales = null;
    this.onZoomCallback = null;
  }
}