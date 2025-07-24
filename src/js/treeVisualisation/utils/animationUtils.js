import * as d3 from "d3";

/**
 * Shared animation utilities for tree visualization renderers
 *
 * This module provides common animation-related functionality
 * to avoid code duplication across renderer classes.
 */

/**
 * Gets the D3 easing function from a string name
 * @param {string} easingName - Name of the easing function
 * @returns {Function} The D3 easing function
 */
export function getEasingFunction(easingName) {
  const easingMap = {
    // Existing functions
    'easePolyInOut': d3.easePolyInOut,
    'easeSinInOut': d3.easeSinInOut,
    'easeLinear': d3.easeLinear,
    'easeQuadInOut': d3.easeQuadInOut,
    'easeCubicInOut': d3.easeCubicInOut,

    // Better options for smoother animations
    'easeCircleInOut': d3.easeCircleInOut,     // Smooth, natural feeling
    'easeBackInOut': d3.easeBackInOut,         // Slight overshoot, pleasing
    'easeElasticOut': d3.easeElasticOut,       // Bouncy end (use sparingly)
    'easeBounceOut': d3.easeBounceOut,         // Bouncy (use sparingly)

    // Subtle variations
    'easeQuadOut': d3.easeQuadOut,             // Gentle deceleration
    'easeCubicOut': d3.easeCubicOut,           // More pronounced deceleration
    'easeSinOut': d3.easeSinOut,               // Very smooth deceleration

    // Additional easing functions for compatibility
    'easeSinIn': d3.easeSinIn,                 // Acceleration from zero velocity
    'easeInQuad': d3.easeQuadIn,               // Alias for easeQuadIn (acceleration)
    'easeQuadIn': d3.easeQuadIn,               // Acceleration from zero velocity
  };

  return easingMap[easingName] || d3.easeCubicInOut; // Changed default to more natural
}


/**
 * Easing function constants for consistent usage across renderers
 * Only includes functions that are actually used in the codebase
 */
export const EASING_FUNCTIONS = {
  SIN_IN_OUT: 'easeSinInOut',  // Used in TreeAnimationController
  SIN_IN: 'easeSinIn',         // Used in LinkRenderer
  POLY_IN_OUT: 'easePolyInOut' // Used in LabelRenderer, ExtensionRenderer, NodeRenderer
};
