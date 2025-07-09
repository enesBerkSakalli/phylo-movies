import * as d3 from "d3";
import { orientText, getOrientTextInterpolator, anchorCalc } from "../treeSvgGenerator.js";
import { getNodeKey } from "../utils/KeyGenerator.js";
import { shortestAngle } from "../../utils/MathUtils.js";
/**
 * LabelRenderer - Specialized renderer for tree leaf labels
 * Follows the same pattern as LinkRenderer, NodeRenderer, and ExtensionRenderer
 */
export class LabelRenderer {

  /**
   * Create a LabelRenderer instance
   * @param {d3.Selection} svgContainer - The D3 selection of the SVG container
   * @param {Object} colorManager - Object with methods for determining label colors
   * @param {Object} sizeConfig - Configuration object for font size and styling
   */
  constructor(svgContainer, colorManager, sizeConfig) {
    this.svgContainer = svgContainer;
    this.colorManager = colorManager;
    this.sizeConfig = sizeConfig;
    this.labelClass = "label";
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
      'easeSinIn': d3.easeSinIn,
      'easeLinear': d3.easeLinear,
      'easeQuadInOut': d3.easeQuadInOut,
      'easeCubicInOut': d3.easeCubicInOut
    };

    return easingMap[easingName] || d3.easePolyInOut;
  }

  /**
   * Updates labels with Stage 2 timing coordination (Update only - no enter/exit needed)
   * Since labels always exist for every leaf, we only need to animate position updates
   * @param {Array} leafData - Array of leaf data
   * @param {number} labelRadius - Radius for positioning
   * @param {number} stageDuration - Stage 2 duration (should be totalDuration/3)
   * @param {string} easing - D3 easing function name for synchronization
   * @returns {Promise} Promise that resolves when Stage 2 animation completes
   */
  async renderUpdating(leafData, labelRadius, stageDuration = 333, easing = "easePolyInOut") {
    // Handle empty data case
    if (!leafData || leafData.length === 0) {
      return Promise.resolve();
    }

    // JOIN: Bind data to existing elements (labels should already exist) - use consistent key function
    const labels = this.svgContainer
      .selectAll(`.${this.labelClass}`)
      .data(leafData, getNodeKey);

    // ENTER: Create any missing labels (should be rare since leaves are constant)
    const enterLabels = labels.enter()
      .append("text")
      .attr("class", this.labelClass)
      .attr("transform", (d) => orientText(d, labelRadius))
      .attr("text-anchor", (d) => anchorCalc(d))
      .style("font-size", this.sizeConfig.fontSize || "1.2em")
      .style("fill", (d) => this.colorManager.getNodeColor(d))
      .text((d) => d.data.name);

    // EXIT: Remove any extra labels (should be rare since leaves are constant)
    labels.exit().remove();

    // UPDATE: Animate all labels (merged enter + existing) to new positions
    const allLabels = labels.merge(enterLabels);

    if (allLabels.empty()) {
      return Promise.resolve();
    }

    // Get easing function for synchronization
    const easingFunction = this._getEasingFunction(easing);

    // Stage 2 Animation: Move labels to new positions with synchronized timing
    return allLabels
      .transition("label-stage2-update")
      .ease(easingFunction)
      .duration(stageDuration) // Use stage duration for synchronization
      .attrTween("transform", getOrientTextInterpolator(labelRadius))
      .attr("text-anchor", (d) => anchorCalc(d))
      .style("font-size", this.sizeConfig.fontSize || "1.2em")
      .style("fill", (d) => this.colorManager.getNodeColor(d))
      .end()
      .catch(() => {});
  }



  /**
   * Renders labels instantly without animation (for scrubbing/interpolation)
   * @param {Array} leafData - Array of D3 leaf nodes from tree.leaves()
   * @param {number} labelRadius - Radius for label positioning
   * @returns {d3.Selection} The updated labels selection
   */
  renderLabelsInstant(leafData, labelRadius) {
    const labels = this.svgContainer
      .selectAll(`.${this.labelClass}`)
      .data(leafData, getNodeKey);

    // EXIT
    labels.exit().remove();

    // ENTER
    const enterSelection = labels.enter()
      .append("text")
      .attr("class", this.labelClass)
      .attr("id", (d) => `label-${getNodeKey(d)}`)
      .attr("dy", ".31em")
      .attr("font-family", "sans-serif")
      .attr("font-size", this.sizeConfig.fontSize)
      .text((d) => d.data.name.replace(/_/g, " "))
      .attr("transform", (d) => orientText(d, labelRadius)); // Initial position for new labels

    // MERGE and apply instant updates with transition
    enterSelection.merge(labels)
      .attrTween("transform", getOrientTextInterpolator(labelRadius))
      .attr("text-anchor", (d) => (d.angle > Math.PI ? "end" : "start"))
      .style("fill", (d) => this.colorManager.getNodeColor(d))
      .style("opacity", (d) => (d._opacity !== undefined ? d._opacity : 1));

    return labels;
  }

  /**
   * Handles instant updates for labels during scrubbing
   * @param {d3.Selection} labels - The labels selection
   * @param {number} labelRadius - Radius for label positioning
   * @private
   */
  _handleInstantUpdate(labels, labelRadius) {
    labels
      .attr("transform", (d) => orientText(d, labelRadius))
      .attr("text-anchor", anchorCalc)
      .style("font-size", this.sizeConfig.fontSize)
      .style("fill", (d) => this.colorManager.getNodeColor(d))
      .style("opacity", (d) => d._opacity !== undefined ? d._opacity : 1) // Handle fade effects
      .text((d) => d.data.name);
  }

  /**
   * Handles the EXIT selection - removes old labels
   * @param {d3.Selection} labels - The labels selection
   * @private
   */
  _handleExit(labels) {
    labels.exit().remove();
  }

  /**
   * Handles the ENTER selection - creates new label elements
   * @param {d3.Selection} labels - The labels selection
   * @param {number} labelRadius - Radius for label positioning
   * @private
   */
  _handleEnter(labels, labelRadius) {
    labels
      .enter()
      .append("text")
      .attr("class", this.labelClass)
      .attr("id", (d) => `label-${getNodeKey(d)}`)
      .attr("transform", (d) => orientText(d, labelRadius))
      .attr("text-anchor", anchorCalc)
      .style("font-size", this.sizeConfig.fontSize)
      .style("fill", (d) => this.colorManager.getNodeColor(d))
      .text((d) => d.data.name);
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
   * Renders labels with interpolation between two tree states for scrubbing
   * @param {Array} fromLeafData - Array of leaf nodes from the source tree (t=0)
   * @param {Array} toLeafData - Array of leaf nodes from the target tree (t=1)
   * @param {number} fromLabelRadius - Label radius for source tree
   * @param {number} toLabelRadius - Label radius for target tree
   * @param {number} timeFactor - Interpolation factor [0,1]
   * @returns {d3.Selection} The updated labels selection
   */
  renderLabelsInterpolated(fromLeafData, toLeafData, fromLabelRadius, toLabelRadius, timeFactor) {
    // Create map for quick lookup of 'from' nodes by key
    const fromMap = new Map(fromLeafData.map(d => [getNodeKey(d), d]));

    // Use standard D3 data binding with toLeafData and getNodeKey (like other renderers)
    const labels = this.svgContainer
      .selectAll("text")
      .data(toLeafData, getNodeKey);

    // EXIT: Remove labels that no longer exist
    labels.exit().remove();

    // ENTER: Add new labels
    const enterSelection = labels.enter()
      .append("text")
      .attr("id", (d) => `label-${getNodeKey(d)}`)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font-size", this.sizeConfig.fontSize)
      .style("font-family", "Arial, sans-serif")
      .style("fill", "black")
      .style("opacity", 0);

    // MERGE and UPDATE: Handle all labels
    const allLabels = enterSelection.merge(labels);

    // For scrubbing: set attributes directly for the current timeFactor (no transition)
    allLabels
      .text(d => d.data.name || "")
      .attr("transform", d => {
        // Calculate interpolated transform using proper angle interpolation
        const fromNode = fromMap.get(getNodeKey(d));
        if (fromNode) {
          // Interpolate angles using shortest path
          const fromAngle = fromNode.angle;
          const toAngle = d.angle;
          const adjustedAngleDiff = shortestAngle(fromAngle, toAngle);
          
          const interpolatedAngle = fromAngle + adjustedAngleDiff * timeFactor;
          
          // Interpolate radius
          const interpolatedRadius = fromLabelRadius + (toLabelRadius - fromLabelRadius) * timeFactor;
          
          // Create interpolated node data for orientText
          const interpolatedNode = {
            angle: interpolatedAngle
          };
          
          return orientText(interpolatedNode, interpolatedRadius);
        }
        return orientText(d, toLabelRadius);
      })
      .attr("text-anchor", d => {
        // Calculate interpolated text anchor
        const fromNode = fromMap.get(getNodeKey(d));
        if (fromNode) {
          const fromAngle = fromNode.angle;
          const toAngle = d.angle;
          const adjustedAngleDiff = shortestAngle(fromAngle, toAngle);
          
          const interpolatedAngle = fromAngle + adjustedAngleDiff * timeFactor;
          return interpolatedAngle > Math.PI ? "end" : "start";
        }
        return d.angle > Math.PI ? "end" : "start";
      })
      .style("opacity", d => {
        const fromNode = fromMap.get(getNodeKey(d));
        if (fromNode) {
          return 1; // Always visible if exists in both
        } else {
          return timeFactor; // Fade in if only in target
        }
      });

    return allLabels;
  }

  /**
   * Clears all label elements from the container
   */
  clear() {
    this.svgContainer.selectAll(`.${this.labelClass}`).remove();
  }
}



