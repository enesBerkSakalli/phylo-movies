import * as d3 from "d3";
import { buildSvgLinkExtension } from "../treeSvgGenerator.js";
import { getExtensionKey, getExtensionSvgId } from "../utils/KeyGenerator.js";

/**
 * ExtensionRenderer - Specialized renderer for tree link extensions
 *
 * Handles rendering and updating of SVG path elements that represent
 * the dashed extension lines from tree branches to leaf labels.
 * Follows the Container/Presentational component pattern by focusing
 * solely on extension rendering concerns.
 */
export class ExtensionRenderer {

  /**
   * Create an ExtensionRenderer instance
   * @param {d3.Selection} svgContainer - The D3 selection of the SVG container
   * @param {Object} colorManager - Object with methods for determining extension colors
   * @param {Object} sizeConfig - Configuration object for stroke width and styling
   */
  constructor(svgContainer, colorManager, sizeConfig) {
    this.svgContainer = svgContainer;
    this.colorManager = colorManager;
    this.sizeConfig = sizeConfig;

    // CSS class for extension elements
    this.extensionClass = "link-extension";
  }

  /**
   * Renders and updates link extension elements using D3's general update pattern
   * @param {Array} leafData - Array of D3 leaf nodes from tree.leaves()
   * @param {number} extensionEndRadius - End radius for extension positioning
   * @param {Function} interpolationFunction - Function for D3 attrTween animations
   * @param {number} duration - Animation duration in milliseconds
   * @param {string} easing - D3 easing function name (default: "easePolyInOut")
   * @returns {d3.Selection} The updated extensions selection
   */
  renderExtensions(leafData, extensionEndRadius, interpolationFunction, duration = 1000, easing = "easePolyInOut") {
    // JOIN: Bind data to existing elements
    const linkExtensions = this.svgContainer
      .selectAll(`.${this.extensionClass}`)
      .data(leafData, getExtensionKey);

    // EXIT: Remove elements not in new data
    this._handleExit(linkExtensions);

    // ENTER: Create new elements
    this._handleEnter(linkExtensions, extensionEndRadius);

    // UPDATE: Update existing elements with animation
    this._handleUpdate(linkExtensions, extensionEndRadius, interpolationFunction, duration, easing);

    return linkExtensions;
  }

  /**
   * Handles the EXIT selection - removes old extensions
   * @param {d3.Selection} linkExtensions - The extensions selection
   * @private
   */
  _handleExit(linkExtensions) {
    linkExtensions.exit().remove();
  }

  /**
   * Handles the ENTER selection - creates new extension elements
   * @param {d3.Selection} linkExtensions - The extensions selection
   * @param {number} extensionEndRadius - End radius for extension positioning
   * @private
   */
  _handleEnter(linkExtensions, extensionEndRadius) {
    linkExtensions
      .enter()
      .append("path")
      .attr("class", this.extensionClass)
      .attr("id", (d) => getExtensionSvgId(d))
      .attr("stroke-width", this.sizeConfig.strokeWidth)
      .attr("stroke-dasharray", this.sizeConfig.dashArray || "5,5")
      .attr("fill", "none")
      .attr("d", (d) => buildSvgLinkExtension(d, extensionEndRadius))
      .style("stroke", (d) => this.colorManager.getNodeColor(d))
      .style("stroke-opacity", this.sizeConfig.extensionOpacity || 0.7);
  }

  /**
   * Handles the UPDATE selection - animates existing extensions to new positions
   * @param {d3.Selection} linkExtensions - The extensions selection
   * @param {number} extensionEndRadius - End radius for extension positioning
   * @param {Function} interpolationFunction - D3 attrTween interpolation function
   * @param {number} duration - Animation duration
   * @param {string} easing - D3 easing function name
   * @private
   */
  _handleUpdate(linkExtensions, extensionEndRadius, interpolationFunction, duration, easing) {
    const easingFunction = this._getEasingFunction(easing);

    linkExtensions
      .attr("stroke-width", this.sizeConfig.strokeWidth)
      .style("stroke", (d) => this.colorManager.getNodeColor(d))
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
   * Clears all extension elements from the container
   */
  clear() {
    this.svgContainer.selectAll(`.${this.extensionClass}`).remove();
  }

  /**
   * Gets the current extensions selection (useful for external operations)
   * @returns {d3.Selection} Current extensions selection
   */
  getExtensionsSelection() {
    return this.svgContainer.selectAll(`.${this.extensionClass}`);
  }

  /**
   * Updates extension colors based on current marked components
   * @param {Set} markedComponents - Set of marked components for highlighting
   */
  updateExtensionColors(markedComponents) {
    if (this.colorManager.updateMarkedComponents) {
      this.colorManager.updateMarkedComponents(markedComponents);
    }

    // Update colors for all extensions
    this.svgContainer.selectAll(`.${this.extensionClass}`)
      .style("stroke", (d) => this.colorManager.getNodeColor(d));
  }

  /**
   * Updates extension styling properties
   * @param {Object} styleConfig - Style configuration object
   * @param {string} styleConfig.strokeWidth - Stroke width for extensions
   * @param {string} styleConfig.dashArray - Dash pattern (e.g., "5,5")
   * @param {number} styleConfig.opacity - Opacity for extensions
   */
  updateExtensionStyling(styleConfig) {
    const extensions = this.svgContainer.selectAll(`.${this.extensionClass}`);

    if (styleConfig.strokeWidth) {
      extensions.attr("stroke-width", styleConfig.strokeWidth);
    }

    if (styleConfig.dashArray) {
      extensions.attr("stroke-dasharray", styleConfig.dashArray);
    }

    if (styleConfig.opacity !== undefined) {
      extensions.style("stroke-opacity", styleConfig.opacity);
    }
  }

  /**
   * Shows or hides extensions based on visibility settings
   * @param {boolean} visible - Whether extensions should be visible
   */
  setVisibility(visible = true) {
    this.svgContainer.selectAll(`.${this.extensionClass}`)
      .style("display", visible ? "block" : "none");
  }

  /**
   * Gets statistics about current extensions
   * @returns {Object} Statistics object with count and other metrics
   */
  getStatistics() {
    const extensions = this.svgContainer.selectAll(`.${this.extensionClass}`);
    return {
      count: extensions.size(),
      visible: extensions.filter(function() {
        return d3.select(this).style("display") !== "none";
      }).size()
    };
  }
}
