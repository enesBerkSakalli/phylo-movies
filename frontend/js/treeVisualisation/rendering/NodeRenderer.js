import * as d3 from "d3";
import { COLOR_MAP } from "../../treeColoring/ColorMap.js";
import { attr2TweenCircleX, attr2TweenCircleY } from "../treeSvgGenerator.js";
import { getNodeKey, getNodeSvgId } from "../utils/KeyGenerator.js";

/**
 * NodeRenderer - Specialized renderer for tree nodes (circles, internal nodes, etc.)
 *
 * Handles rendering and updating of SVG elements that represent
 * the nodes in phylogenetic trees. Follows the Container/Presentational
 * component pattern by focusing solely on node rendering concerns.
 */
export class NodeRenderer {

  /**
   * Create a NodeRenderer instance
   * @param {d3.Selection} svgContainer - The D3 selection of the SVG container
   * @param {Object} colorManager - Object with methods for determining node colors
   * @param {Object} sizeConfig - Configuration object for node sizes and styling
   */
  constructor(svgContainer, colorManager, sizeConfig) {
    this.svgContainer = svgContainer;
    this.colorManager = colorManager;
    this.sizeConfig = sizeConfig;

    // CSS classes for different node types
    this.leafClass = "leaf";
    this.internalNodeClass = "internal-node";
  }

  /**
   * Renders and updates leaf circle elements using D3's general update pattern
   * @param {Array} leafData - Array of D3 leaf nodes from tree.leaves()
   * @param {number} currentMaxRadius - Maximum radius for positioning
   * @param {number} duration - Animation duration in milliseconds
   * @param {string} easing - D3 easing function name (default: "easeSinInOut")
   * @param {Function} clickHandler - Optional click handler function
   * @returns {d3.Selection} The updated leaf circles selection
   */
  renderLeafCircles(leafData, currentMaxRadius, duration = 1000, easing = "easeSinInOut", clickHandler = null) {
    // JOIN: Bind data to existing elements
    const leafCircles = this.svgContainer
      .selectAll(`.${this.leafClass}`)
      .data(leafData, getNodeKey);

    // EXIT: Remove elements not in new data
    this._handleLeafExit(leafCircles);

    // ENTER: Create new elements
    this._handleLeafEnter(leafCircles, currentMaxRadius);

    // UPDATE: Update existing elements with animation
    this._handleLeafUpdate(leafCircles, currentMaxRadius, duration, easing);

    // Bind click handlers if provided
    if (clickHandler) {
      this._bindLeafClickHandlers(clickHandler);
    }

    return leafCircles;
  }

  /**
   * Renders internal node elements (for collapsed nodes, etc.)
   * @param {Array} internalNodeData - Array of D3 internal nodes
   * @param {number} duration - Animation duration in milliseconds
   * @param {string} easing - D3 easing function name
   * @returns {d3.Selection} The updated internal nodes selection
   */
  renderInternalNodes(internalNodeData, duration = 1000, easing = "easeSinInOut") {
    // JOIN: Bind data to existing elements
    const internalNodes = this.svgContainer
      .selectAll(`.${this.internalNodeClass}`)
      .data(internalNodeData, getNodeKey);

    // EXIT: Remove elements not in new data
    this._handleInternalNodeExit(internalNodes);

    // ENTER: Create new elements
    this._handleInternalNodeEnter(internalNodes);

    // UPDATE: Update existing elements with animation
    this._handleInternalNodeUpdate(internalNodes, duration, easing);

    return internalNodes;
  }

  /**
   * Handles the EXIT selection for leaf circles - removes old elements
   * @param {d3.Selection} leafCircles - The leaf circles selection
   * @private
   */
  _handleLeafExit(leafCircles) {
    leafCircles.exit().remove();
  }

  /**
   * Handles the ENTER selection for leaf circles - creates new elements
   * @param {d3.Selection} leafCircles - The leaf circles selection
   * @param {number} currentMaxRadius - Maximum radius for positioning
   * @private
   */
  _handleLeafEnter(leafCircles, currentMaxRadius) {
    leafCircles
      .enter()
      .append("circle")
      .attr("class", this.leafClass)
      .attr("id", (d) => getNodeSvgId(d, "circle"))
      .attr("cx", (d) => currentMaxRadius * Math.cos(d.angle))
      .attr("cy", (d) => currentMaxRadius * Math.sin(d.angle))
      .attr("r", this.sizeConfig.leafRadius || "0.4em")
      .attr("stroke-width", this.sizeConfig.leafStrokeWidth || "0.1em")
      .style("fill", (d) => this.colorManager.getNodeColor(d))
      .style("stroke", COLOR_MAP.colorMap.strokeColor);
  }

  /**
   * Handles the UPDATE selection for leaf circles - animates existing elements
   * @param {d3.Selection} leafCircles - The leaf circles selection
   * @param {number} currentMaxRadius - Maximum radius for positioning
   * @param {number} duration - Animation duration
   * @param {string} easing - D3 easing function name
   * @private
   */
  _handleLeafUpdate(leafCircles, currentMaxRadius, duration, easing) {
    const easingFunction = this._getEasingFunction(easing);

    leafCircles
      .style("fill", (d) => this.colorManager.getNodeColor(d))
      .transition()
      .ease(easingFunction)
      .duration(duration)
      .attrTween("cx", attr2TweenCircleX(currentMaxRadius))
      .attrTween("cy", attr2TweenCircleY(currentMaxRadius))
      .style("fill", (d) => this.colorManager.getNodeColor(d));
  }


  _handleLeafUpdate_future(leafCircles, currentMaxRadius, duration, easing) {
    // Create a GSAP timeline for sequencing and control
    const timeline = gsap.timeline({ defaults: { ease: "power2.inOut" } });
    leafCircles.each((d, i, nodes) => {
      const node = nodes[i];
      const targetX = currentMaxRadius * Math.cos(d.angle);
      const targetY = currentMaxRadius * Math.sin(d.angle);
      const targetFill = this.colorManager.getNodeColor(d);
      // Add each node's animation to the timeline, staggered by 0.05s
      timeline.to(node, {
        attr: { cx: targetX, cy: targetY },
        fill: targetFill,
        duration: duration / 1000
      }, i * 0.05);
    });
    // Return the timeline for further control if needed
    return timeline;
  }


  /**
   * Handles the EXIT selection for internal nodes - removes old elements
   * @param {d3.Selection} internalNodes - The internal nodes selection
   * @private
   */
  _handleInternalNodeExit(internalNodes) {
    internalNodes.exit().remove();
  }

  /**
   * Handles the ENTER selection for internal nodes - creates new elements
   * @param {d3.Selection} internalNodes - The internal nodes selection
   * @private
   */
  _handleInternalNodeEnter(internalNodes) {
    internalNodes
      .enter()
      .append("circle")
      .attr("class", this.internalNodeClass)
      .attr("id", (d) => getNodeSvgId(d, "internal"))
      .attr("r", this.sizeConfig.internalNodeRadius || "0.2em")
      .attr("cx", (d) => d.y * Math.cos(d.angle || 0))
      .attr("cy", (d) => d.y * Math.sin(d.angle || 0))
      .style("fill", (d) => this.colorManager.getInternalNodeColor(d))
      .style("stroke", COLOR_MAP.colorMap.strokeColor)
      .attr("stroke-width", this.sizeConfig.internalNodeStrokeWidth || "0.05em");
  }

  /**
   * Handles the UPDATE selection for internal nodes - animates existing elements
   * @param {d3.Selection} internalNodes - The internal nodes selection
   * @param {number} duration - Animation duration
   * @param {string} easing - D3 easing function name
   * @private
   */
  _handleInternalNodeUpdate(internalNodes, duration, easing) {
    const easingFunction = this._getEasingFunction(easing);

    internalNodes
      .style("fill", (d) => this.colorManager.getInternalNodeColor(d))
      .transition()
      .ease(easingFunction)
      .duration(duration)
      .attr("cx", (d) => d.y * Math.cos(d.angle || 0))
      .attr("cy", (d) => d.y * Math.sin(d.angle || 0));
  }

  /**
   * Binds click event handlers to leaf circles
   * @param {Function} clickHandler - The click handler function
   * @private
   */
  _bindLeafClickHandlers(clickHandler) {
    this.svgContainer.selectAll(`.${this.leafClass}`)
      .on("click", clickHandler);
  }

  /**
   * Gets the D3 easing function from a string name
   * @param {string} easingName - Name of the easing function
   * @returns {Function} The D3 easing function
   * @private
   */
  _getEasingFunction(easingName) {
    const easingMap = {
      'easeSinInOut': d3.easeSinInOut,
      'easePolyInOut': d3.easePolyInOut,
      'easeLinear': d3.easeLinear,
      'easeQuadInOut': d3.easeQuadInOut,
      'easeCubicInOut': d3.easeCubicInOut
    };

    return easingMap[easingName] || d3.easeSinInOut;
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
   * Clears all node elements from the container
   */
  clear() {
    this.svgContainer.selectAll(`.${this.leafClass}`).remove();
    this.svgContainer.selectAll(`.${this.internalNodeClass}`).remove();
  }

  /**
   * Gets the current leaf circles selection (useful for external operations)
   * @returns {d3.Selection} Current leaf circles selection
   */
  getLeafCirclesSelection() {
    return this.svgContainer.selectAll(`.${this.leafClass}`);
  }

  /**
   * Gets the current internal nodes selection (useful for external operations)
   * @returns {d3.Selection} Current internal nodes selection
   */
  getInternalNodesSelection() {
    return this.svgContainer.selectAll(`.${this.internalNodeClass}`);
  }

  /**
   * Updates node colors based on current marked components
   * @param {Set} markedComponents - Set of marked components for highlighting
   */
  updateNodeColors(markedComponents) {
    if (this.colorManager.updateMarkedComponents) {
      this.colorManager.updateMarkedComponents(markedComponents);
    }

    // Update colors for all nodes
    this.svgContainer.selectAll(`.${this.leafClass}`)
      .style("fill", (d) => this.colorManager.getNodeColor(d));

    this.svgContainer.selectAll(`.${this.internalNodeClass}`)
      .style("fill", (d) => this.colorManager.getInternalNodeColor(d));
  }
}
