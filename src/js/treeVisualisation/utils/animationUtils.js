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
  };

  return easingMap[easingName] || d3.easeCubicInOut; // Changed default to more natural
}

/**
 * Creates a promise from a D3 transition with proper error handling
 * @param {d3.Transition} transition - The D3 transition
 * @param {string} [name='animation'] - Name for debugging
 * @returns {Promise} Promise that resolves when transition completes
 */
export function transitionToPromise(transition, name = 'animation') {
  return transition.end().catch(error => {
    console.warn(`[animationUtils] ${name} transition interrupted:`, error);
    // Return resolved promise to prevent error propagation
    return Promise.resolve();
  });
}

/**
 * Standard animation duration stages for coordinated animations
 */
export const ANIMATION_STAGES = {
  ENTER: 1,
  UPDATE: 2, 
  EXIT: 3
};

/**
 * Calculates stage duration from total duration
 * @param {number} totalDuration - Total animation duration
 * @param {number} stages - Number of stages (default: 3)
 * @returns {number} Duration per stage
 */
export function getStageDuration(totalDuration, stages = 3) {
  return totalDuration / stages;
}