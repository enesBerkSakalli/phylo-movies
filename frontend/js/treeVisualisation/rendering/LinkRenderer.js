import * as d3 from "d3";
import { buildSvgString } from "../treeSvgGenerator.js";
import { getLinkKey, getLinkSvgId } from "../utils/KeyGenerator.js";

/**
 * LinkRenderer - Specialized renderer for tree branch paths (links)
 *
 * Handles rendering and updating of SVG path elements that represent
 * the branches/links in phylogenetic trees. Follows the Container/Presentational
 * component pattern by focusing solely on rendering concerns.
 */
export class LinkRenderer {

  /**
   * Create a LinkRenderer instance
   * @param {d3.Selection} svgContainer - The D3 selection of the SVG container
   * @param {Object} colorManager - Object with methods for determining branch colors
   * @param {Object} sizeConfig - Configuration object for stroke width and other sizing
   */
  constructor(svgContainer, colorManager, sizeConfig) {
    this.svgContainer = svgContainer;
    this.colorManager = colorManager;
    this.sizeConfig = sizeConfig;

    // CSS class for link elements
    this.linkClass = "links";
  }


  /**
   * Renders and updates link elements using D3's general update pattern
   * Uses robust, canonical link ID logic for both D3 key and SVG id.
   * @param {Array} linksData - Array of D3 link objects from tree.links()
   * @param {Function|null} getLinkId - Optional function to generate unique IDs for links (ignored; always uses internal logic)
   * @param {Function} interpolationFunction - Function for D3 attrTween animations
   * @param {number} duration - Animation duration in milliseconds
   * @param {string} easing - D3 easing function name (default: "easePolyInOut")
   * @param {Array<Set|Array>} [highlightEdges=[]] - Array of split_indices (as arrays or sets) to highlight
   * @returns {d3.Selection} The updated links selection
   */
  render(linksData, getLinkId, interpolationFunction, duration = 1000, easing = "easePolyInOut", highlightEdges = []) {
    // Always use centralized key function for consistency
    const keyFn = getLinkKey;
    this._highlightEdges = highlightEdges;
    const links = this.svgContainer
      .selectAll(`.${this.linkClass}`)
      .data(linksData, keyFn);

    // EXIT: Remove elements not in new data
    this._handleExit(links);

    // ENTER: Create new elements
    this._handleEnter(links, highlightEdges);

    // UPDATE: Update existing elements with animation
    this._handleUpdate(links, interpolationFunction, duration, easing, highlightEdges);

    return links;
  }

  /**
   * Checks if a link should be highlighted based on split_indices (exact match only).
   * @param {Object} link - The D3 link object
   * @param {Array<Set|Array>} highlightEdges - Array of split_indices to highlight
   * @returns {boolean}
   */
  _isHighlighted(link, highlightEdges) {
    if (!highlightEdges || highlightEdges.length === 0) return false;
    const linkIndices = Array.isArray(link.target.data.split_indices)
      ? link.target.data.split_indices.join(",")
      : String(link.target.data.split_indices);
    return highlightEdges.some(edgeSet => {
      if (Array.isArray(edgeSet)) {
        return edgeSet.join(",") === linkIndices;
      } else if (edgeSet instanceof Set) {
        return Array.from(edgeSet).join(",") === linkIndices;
      }
      return false;
    });
  }


  /**
   * Handles the EXIT selection - removes old links
   * @param {d3.Selection} links - The links selection
   * @private
   */
  _handleExit(links) {
    links.exit().remove();
  }

  /**
   * Handles the ENTER selection - creates new link elements
   * @param {d3.Selection} links - The links selection
   * @param {Array<Set|Array>} highlightEdges - Array of split_indices to highlight
   * @private
   */
  _handleEnter(links, highlightEdges) {
    // Always use robust internal key function for SVG id
    links
      .enter()
      .append("path")
      .attr("class", this.linkClass)
      .attr("stroke-width", d => this._isHighlighted(d, highlightEdges) ? (parseFloat(this.sizeConfig.strokeWidth) * 2.5) : this.sizeConfig.strokeWidth)
      .attr("fill", "none")
      .attr("id", (d) => getLinkSvgId(d))
      .attr("d", (d) => buildSvgString(d))
      .style("stroke", (d) => this._isHighlighted(d, highlightEdges) ? "#2196f3" : this.colorManager.getBranchColor(d))
      .style("stroke-opacity", 1)
      .attr("neededHighlightingTaxa", 0);
  }

  /**
   * Handles the UPDATE selection - animates existing links to new positions
   * @param {d3.Selection} links - The links selection
   * @param {Function} interpolationFunction - D3 attrTween interpolation function
   * @param {number} duration - Animation duration
   * @param {string} easing - D3 easing function name
   * @param {Array<Set|Array>} highlightEdges - Array of split_indices to highlight
   * @private
   */
  _handleUpdate(links, interpolationFunction, duration, easing, highlightEdges) {
    const easingFunction = this._getEasingFunction(easing);

    // Ensure SVG defs for gradient and glow are present (inject only once)
    if (!this._highlightDefsInjected) {
      const svg = this.svgContainer;
      if (svg.select('defs').empty()) {
        svg.append('defs');
      }
      svg.select('defs').html(`
        <linearGradient id="highlight-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#1976d2"/>
          <stop offset="100%" stop-color="#64b5f6"/>
        </linearGradient>
        <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      `);
      this._highlightDefsInjected = true;
    }

    links
      .attr("stroke-width", d => this._isHighlighted(d, highlightEdges) ? (parseFloat(this.sizeConfig.strokeWidth) * 1.7) : this.sizeConfig.strokeWidth)
      .style("stroke", d => this._isHighlighted(d, highlightEdges) ? "url(#highlight-gradient)" : this.colorManager.getBranchColor(d))
      .style("filter", d => this._isHighlighted(d, highlightEdges) ? "url(#glow)" : null)
      .transition()
      .ease(easingFunction)
      .duration(duration)
      .attrTween("d", interpolationFunction);
  }

  /**
   * Gets the D3 easing function from a string name
   * @param {string} easingName - Name of the easing function
   * @returns {Function} The D3 easing function
   * @private
   */
  _getEasingFunction(easingName) {
    const easingMap = {
      'easePolyInOut': d3.easePolyInOut,
      'easeSinInOut': d3.easeSinInOut,
      'easeLinear': d3.easeLinear,
      'easeQuadInOut': d3.easeQuadInOut,
      'easeCubicInOut': d3.easeCubicInOut
    };

    return easingMap[easingName] || d3.easePolyInOut;
  }

  /**
   * Updates the styling configuration
   * @param {Object} newConfig - New size configuration
   */
  updateSizeConfig(newConfig) {
    this.sizeConfig = { ...this.sizeConfig, ...newConfig };
  }

  /**
   * Updates the color manager
   * @param {Object} newColorManager - New color manager instance
   */
  updateColorManager(newColorManager) {
    this.colorManager = newColorManager;
  }

  /**
   * Clears all link elements from the container
   */
  clear() {
    this.svgContainer.selectAll(`.${this.linkClass}`).remove();
  }

  /**
   * Gets the current links selection (useful for external operations)
   * @returns {d3.Selection} Current links selection
   */
  getLinksSelection() {
    return this.svgContainer.selectAll(`.${this.linkClass}`);
  }
}
