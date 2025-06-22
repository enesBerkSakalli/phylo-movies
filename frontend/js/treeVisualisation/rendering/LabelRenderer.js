import * as d3 from "d3";
import { LabelAnimator } from "./LabelAnimator.js";
import { anchorCalc } from "../treeSvgGenerator.js"; // Used for non-animated initial/final states
import { STYLE_MAP } from "./../TreeDrawer.js";
import { getNodeKey, getNodeSvgId } from "../utils/KeyGenerator.js";
/**
 * Enhanced LabelRenderer with improved animation capabilities,
 * delegating animation specifics to LabelAnimator.
 */
export class LabelRenderer {

  /**
   * Create a LabelRenderer instance
   * @param {d3.Selection} svgContainer - The D3 selection of the SVG container
   * @param {Object} colorManager - Object with methods for determining label colors
   * @param {Object} sizeConfig - Configuration object for font sizes and styling
   */
  constructor(svgContainer, colorManager, sizeConfig) {
    this.svgContainer = svgContainer;
    this.colorManager = colorManager;
    this.sizeConfig = { ...sizeConfig }; // Clone to prevent external modifications

    // Ensure defaultEasing is a function if provided as string in sizeConfig
    let defaultEasing = this.sizeConfig.defaultEasingFunction || d3.easeCubicInOut;
    if (typeof defaultEasing === 'string') {
        defaultEasing = this._getEasingFunction(defaultEasing, d3.easeCubicInOut);
    }

    this.animator = new LabelAnimator({
      defaultDuration: this.sizeConfig.defaultAnimationDuration || 800,
      defaultEasing: defaultEasing,
      staggerDelay: this.sizeConfig.defaultStaggerDelay || 30,
    });

    this.labelClass = "label";
    this.internalLabelClass = "internal-label";
  }

  /**
   * Renders and updates leaf label elements using D3's general update pattern
   * @param {Array} leafData - Array of D3 leaf nodes from tree.leaves()
   * @param {number} labelRadius - Radius for label positioning
   * @param {Object} options - Animation and rendering options
   * @returns {d3.Selection} The updated labels selection
   */
  renderLeafLabels(leafData, labelRadius, options = {}) {
    const animate = options.animate !== false;
    const duration = options.duration !== undefined ? options.duration : this.animator.config.defaultDuration;
    const easingInput = options.easing !== undefined ? options.easing : this.animator.config.defaultEasing;
    const easing = typeof easingInput === 'function' ? easingInput : this._getEasingFunction(easingInput, this.animator.config.defaultEasing);

    let stagger;
    if (typeof options.stagger === 'number') {
      stagger = options.stagger;
    } else if (options.stagger === false) {
      stagger = 0;
    } else {
      stagger = this.animator.config.staggerDelay;
    }

    const textLabels = this.svgContainer
      .selectAll(`.${this.labelClass}`)
      .data(leafData, getNodeKey)
            .style("font-size", this.sizeConfig.fontSize || "1.2em");

    textLabels
      .exit()
      .transition("exitLabels")
      .duration(duration / 2)
      .style("opacity", 0)
      .remove();

    const enteringLabels = textLabels
      .enter()
      .append("text")
      .attr("class", this.labelClass)
      .attr("id", (d) => getNodeSvgId(d, "label"))
      .attr("dy", ".31em")
      .style("font-size", this.sizeConfig.fontSize || "1.2em")
      .attr("font-weight", this.sizeConfig.fontWeight || "bold")
      .attr("font-family", this.sizeConfig.fontFamily || "Courier New")
      .text((d) => d.data.name)
      .style("opacity", 0);

    this._setInitialLabelPositions(enteringLabels, labelRadius);

    const allLabels = textLabels.merge(enteringLabels);

    // Ensure all labels get the correct color and stroke after merge
    allLabels
      .style("fill", (d) => this.colorManager.getNodeColor(d))
      .style("stroke", (d) => this.colorManager.getNodeColor(d));

    if (animate) {
      this.animator.animateLeafLabels(allLabels, labelRadius, {
        duration,
        easing,
        stagger,
        onComplete: options.onComplete,
      });
    } else {
      this._setFinalLabelPositions(allLabels, labelRadius);
      if (typeof options.onComplete === 'function') {
        Promise.resolve().then(options.onComplete); // Call async to mimic transition end
      }
    }
    return allLabels;
  }

  /**
   * Renders and updates internal node labels (for collapsed nodes, etc.)
   * @param {Array} internalNodeData - Array of D3 internal nodes
   * @param {Object} options - Animation and rendering options
   * @returns {d3.Selection} The updated internal labels selection
   */
  renderInternalLabels(internalNodeData, options = {}) {
    const animate = options.animate !== false;
    const duration = options.duration !== undefined ? options.duration : this.animator.config.defaultDuration;
    const easingInput = options.easing !== undefined ? options.easing : this.animator.config.defaultEasing;
    const easing = typeof easingInput === 'function' ? easingInput : this._getEasingFunction(easingInput, this.animator.config.defaultEasing);

    let stagger;
    if (typeof options.stagger === 'number') {
      stagger = options.stagger;
    } else if (options.stagger === false) {
      stagger = 0;
    } else {
      stagger = this.animator.config.staggerDelay;
    }

    const internalLabels = this.svgContainer
      .selectAll(`.${this.internalLabelClass}`)
      .data(internalNodeData, getNodeKey);

    internalLabels
      .exit()
      .transition("exitInternalLabels")
      .duration(duration / 2)
      .style("opacity", 0)
      .remove();

    const enteringLabels = internalLabels
      .enter()
      .append("text")
      .attr("class", this.internalLabelClass)
      .attr("id", (d) => getNodeSvgId(d, "internal-label"))
      .attr("dy", ".31em")
      .style("font-size", STYLE_MAP.fontSize || "0.8em")
      .attr("font-weight", this.sizeConfig.internalFontWeight || "normal")
      .attr("font-family", this.sizeConfig.fontFamily || "Courier New")
      .text((d) => d.data.name || "")
      .style("opacity", 0);

    const allInternalLabels = internalLabels.merge(enteringLabels);

    if (animate) {
      this.animator.animateInternalLabels(allInternalLabels, {
        duration,
        easing,
        stagger,
        onComplete: options.onComplete,
      });
    } else {
      allInternalLabels
        .attr("transform", (d) => `translate(${d.y}, ${d.x})`)
        .style("opacity", 1);
      if (typeof options.onComplete === 'function') {
        Promise.resolve().then(options.onComplete);
      }
    }
    return allInternalLabels;
  }

  _setInitialLabelPositions(selection, labelRadius) {
    selection
      .attr("transform", (d) => {
        const angle = (d.angle * 180) / Math.PI;
        const flipRotation = (angle < 270 && angle > 90) ? 180 : 0;
        return `rotate(${angle}) translate(${labelRadius}, 0) rotate(${flipRotation})`;
      })
      .attr("text-anchor", (d) => anchorCalc(d));
  }

  _setFinalLabelPositions(selection, labelRadius) {
    selection
      .attr("transform", (d) => {
        const angle = (d.angle * 180) / Math.PI;
        const flipRotation = (angle < 270 && angle > 90) ? 180 : 0;
        return `rotate(${angle}) translate(${labelRadius}, 0) rotate(${flipRotation})`;
      })
      .attr("text-anchor", (d) => anchorCalc(d))
      .style("opacity", 1);
  }

  animateSequence(steps) {
    return this.animator.createSequence(steps);
  }

  async transitionToNewState(leafData, internalData, labelRadius, options = {}) {
    const fadeOutDuration = options.fadeOutDuration || 200;

    const renderAnimOptions = {
        animate: true,
        duration: options.duration, // Pass through if specified
        easing: options.easing,     // Pass through
        stagger: options.stagger,   // Pass through
    };

    const allCurrentLabels = this.svgContainer.selectAll(`.${this.labelClass}, .${this.internalLabelClass}`);
    if (!allCurrentLabels.empty()) {
      await new Promise(resolve => {
        allCurrentLabels.transition("fadeOutState")
          .duration(fadeOutDuration)
          .style("opacity", 0)
          .remove()
          .on("end.fadeOutState", resolve); // Namespaced event
      });
    }

    if (leafData && Array.isArray(leafData)) {
      await new Promise(resolve => {
        this.renderLeafLabels(leafData, labelRadius, { ...renderAnimOptions, onComplete: resolve });
      });
    } else {
      this.svgContainer.selectAll(`.${this.labelClass}`).remove();
    }

    if (internalData && Array.isArray(internalData)) {
      await new Promise(resolve => {
        this.renderInternalLabels(internalData, { ...renderAnimOptions, onComplete: resolve });
      });
    } else {
      this.svgContainer.selectAll(`.${this.internalLabelClass}`).remove();
    }
  }

  _getEasingFunction(easingName, defaultEasing = d3.easeCubicInOut) {
    if (typeof easingName === 'function') {
        return easingName;
    }
    const easingMap = {
      'easeSinInOut': d3.easeSinInOut, 'easePolyInOut': d3.easePolyInOut,
      'easeLinear': d3.easeLinear, 'easeQuadInOut': d3.easeQuadInOut,
      'easeCubicInOut': d3.easeCubicInOut, 'easeElasticOut': d3.easeElasticOut,
      'easeBounceOut': d3.easeBounceOut,
    };
    return easingMap[easingName] || defaultEasing;
  }

  /**
   * Updates the styling configuration
   * @param {Object} newConfig - New size configuration
   */
  updateSizeConfig(newConfig) {
    this.sizeConfig = { ...this.sizeConfig, ...newConfig };

    let newDefaultEasing = newConfig.defaultEasingFunction || this.animator.config.defaultEasing;
    if (typeof newDefaultEasing === 'string') {
        newDefaultEasing = this._getEasingFunction(newDefaultEasing, this.animator.config.defaultEasing);
    }

    this.animator.config.defaultDuration = newConfig.defaultAnimationDuration || this.animator.config.defaultDuration;
    this.animator.config.defaultEasing = newDefaultEasing;
    this.animator.config.staggerDelay = newConfig.defaultStaggerDelay || this.animator.config.staggerDelay;
  }

  /**
   * Updates the color manager
   * @param {Object} newColorManager - New color manager instance
   */
  updateColorManager(newColorManager) {
    this.colorManager = newColorManager;
  }

  /**
   * Clears all label elements from the container
   */
  clear() {
    this.svgContainer.selectAll(`.${this.labelClass}, .${this.internalLabelClass}`).remove();
  }

  /**
   * Gets the current leaf labels selection (useful for external operations)
   * @returns {d3.Selection} Current leaf labels selection
   */
  getLeafLabelsSelection() {
    return this.svgContainer.selectAll(`.${this.labelClass}`);
  }

  /**
   * Gets the current internal labels selection (useful for external operations)
   * @returns {d3.Selection} Current internal labels selection
   */
  getInternalLabelsSelection() {
    return this.svgContainer.selectAll(`.${this.internalLabelClass}`);
  }

  /**
   * Updates label colors based on current marked components
   * @param {Set} markedComponents - Set of marked components for highlighting
   */
  updateLabelColors(markedComponents) {
    if (this.colorManager.updateMarkedComponents) {
      this.colorManager.updateMarkedComponents(markedComponents);
    }

    // Update colors for all labels
    this.svgContainer.selectAll(`.${this.labelClass}`)
      .style("fill", (d) => this.colorManager.getNodeColor(d));

    this.svgContainer.selectAll(`.${this.internalLabelClass}`)
      .style("fill", (d) => this.colorManager.getInternalNodeColor(d));
  }

  /**
   * Updates font sizes for all labels
   * @param {string} leafFontSize - Font size for leaf labels (e.g., "1.2em")
   * @param {string} internalFontSize - Font size for internal labels (e.g., "0.8em")
   */
  updateFontSizes(leafFontSize, internalFontSize) {
    console.log('[LabelRenderer] updateFontSizes:', leafFontSize, internalFontSize);
    this.svgContainer.selectAll(`.${this.labelClass}`)
      .style("font-size", leafFontSize);

    this.svgContainer.selectAll(`.${this.internalLabelClass}`)
      .style("font-size", internalFontSize);
  }

  /**
   * Shows or hides labels based on visibility settings
   * @param {boolean} showLeafLabels - Whether to show leaf labels
   * @param {boolean} showInternalLabels - Whether to show internal labels
   */
  setLabelVisibility(showLeafLabels = true, showInternalLabels = true) {
    this.svgContainer.selectAll(`.${this.labelClass}`)
      .style("display", showLeafLabels ? "block" : "none");

    this.svgContainer.selectAll(`.${this.internalLabelClass}`)
      .style("display", showInternalLabels ? "block" : "none");
  }
}
