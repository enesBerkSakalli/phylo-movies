// Consider importing specific D3 modules for potentially smaller bundle sizes
// e.g., import { select } from 'd3-selection'; import { interpolateNumber } from 'd3-interpolate'; etc.
import * as d3 from "d3";
import { shortestAngle } from "../../utils/MathUtils.js"; // Ensure this path is correct

/**
 * LabelAnimator - Handles smooth animations for tree labels.
 * Provides a declarative and configurable approach to label animations.
 */
export class LabelAnimator {
  constructor(config = {}) {
    this.config = {
      defaultDuration: 1000,
      defaultEasing: d3.easeCubicInOut, // Default to a D3 easing function
      staggerDelay: 50, // Delay between animating each label
      ...config,
    };
  }

  /**
   * Animate leaf labels with improved interpolation and staggered timing.
   * @param {d3.Selection} selection - The D3 selection of labels to animate.
   * @param {number} labelRadius - Target radius for label positioning.
   * @param {Object} options - Animation options.
   * @param {number} [options.duration=this.config.defaultDuration] - Animation duration.
   * @param {Function} [options.easing=this.config.defaultEasing] - D3 easing function.
   * @param {number} [options.stagger=this.config.staggerDelay] - Delay between animating each label.
   * @param {Function} [options.onComplete=null] - Callback on transition end.
   */
  animateLeafLabels(selection, labelRadius, options = {}) {
    const {
      duration = this.config.defaultDuration,
      easing = this.config.defaultEasing,
      stagger = this.config.staggerDelay,
      onComplete = null,
    } = options;

    const animatorInstance = this;

    selection
      .transition("animateLeafLabels")
      .duration(duration)
      .ease(easing)
      .delay((d, i) => i * stagger)
      .style("opacity", 1) // Ensure labels become visible
      .attrTween("transform", function (d_node_data) {
        return animatorInstance._createTransformInterpolatorForElement(
          this,
          d_node_data,
          labelRadius
        );
      })
      .attr("text-anchor", (d_node_data) => animatorInstance._calculateTextAnchor(d_node_data))
      .on("end.animateLeafLabels", function() { // Namespaced event
        if (typeof onComplete === 'function') {
          onComplete.call(this); // Call onComplete in the context of the element
        }
      });
  }

  /**
   * Animate internal labels with simpler translate positioning.
   * @param {d3.Selection} selection - The D3 selection of internal labels.
   * @param {Object} options - Animation options.
   */
  animateInternalLabels(selection, options = {}) {
    const {
      duration = this.config.defaultDuration,
      easing = this.config.defaultEasing,
      stagger = this.config.staggerDelay,
      onComplete = null,
    } = options;

    selection
      .transition("animateInternalLabels")
      .duration(duration)
      .ease(easing)
      .delay((d, i) => i * stagger)
      .style("opacity", 1) // Ensure labels become visible
      .attr("transform", (d) => `translate(${d.y}, ${d.x})`)
      .on("end.animateInternalLabels", function() { // Namespaced event
        if (typeof onComplete === 'function') {
          onComplete.call(this);
        }
      });
  }

  _createTransformInterpolatorForElement(domElement, d_node_data, targetRadius) {
    const currentTransformString = d3.select(domElement).attr("transform");

    // For new elements, their transform might not be set yet by _setInitialLabelPositions
    // if they are entering directly into an animation.
    // Default to target values if parsing fails or if it's a new element without prior setup.
    const targetTransform = this._calculateTargetTransform(d_node_data, targetRadius);
    const current = this._parseTransform(currentTransformString) || {
      rotation: targetTransform.rotation,
      translation: targetRadius, // Could also default to targetTransform.translation
      flipRotation: targetTransform.flipRotation,
    };

    const rotationInterpolator = this._createRotationInterpolator(
      current.rotation,
      targetTransform.rotation
    );
    const translationInterpolator = d3.interpolateNumber(
      current.translation,
      targetTransform.translation
    );
    const flipRotationInterpolator = this._createRotationInterpolator(
      current.flipRotation,
      targetTransform.flipRotation
    );

    return (t) => {
      const rotation = rotationInterpolator(t);
      const translation = translationInterpolator(t);
      const flipRotation = flipRotationInterpolator(t);
      return `rotate(${rotation}) translate(${translation}, 0) rotate(${flipRotation})`;
    };
  }

  _parseTransform(transformString) {
    if (!transformString) return null;
    const regex = /rotate\(([^)]+)\)\s*translate\(([^,]+),[^)]+\)\s*rotate\(([^)]+)\)/;
    const match = transformString.match(regex);
    if (!match) return null;
    return {
      rotation: parseFloat(match[1]) || 0,
      translation: parseFloat(match[2]) || 0,
      flipRotation: parseFloat(match[3]) || 0,
    };
  }

  _calculateTargetTransform(d_node_data, radius) {
    const angleDegrees = (d_node_data.angle * 180) / Math.PI;
    const flipRotation = (angleDegrees < 270 && angleDegrees > 90) ? 180 : 0;
    return {
      rotation: angleDegrees,
      translation: radius,
      flipRotation: flipRotation,
    };
  }

  _createRotationInterpolator(startAngleDegrees, endAngleDegrees) {
    const startRadians = (startAngleDegrees * Math.PI) / 180;
    const endRadians = (endAngleDegrees * Math.PI) / 180;
    const angleDiffRadians = shortestAngle(startRadians, endRadians);
    const angleDiffDegrees = (angleDiffRadians * 180) / Math.PI;
    return (t) => startAngleDegrees + angleDiffDegrees * t;
  }

  _calculateTextAnchor(d_node_data) {
    const angleDegrees = (d_node_data.angle * 180) / Math.PI;
    return (angleDegrees < 270 && angleDegrees > 90) ? "end" : "start";
  }

  createSequence(animationSteps) {
    return animationSteps.reduce((promiseChain, step) => {
      return promiseChain.then(() => {
        return new Promise((resolve) => {
          const { selection, type, options = {} } = step;
          const stepOnComplete = options.onComplete;
          const animationOptions = {
            ...options,
            onComplete: () => {
              if (typeof stepOnComplete === 'function') {
                stepOnComplete();
              }
              resolve();
            },
          };

          if (type === 'leafLabels' && selection && options.radius !== undefined) {
            this.animateLeafLabels(selection, options.radius, animationOptions);
          } else if (type === 'internalLabels' && selection) {
            this.animateInternalLabels(selection, animationOptions);
          } else {
            resolve(); // Resolve if type is unknown or prerequisites missing
          }
        });
      });
    }, Promise.resolve());
  }
}
