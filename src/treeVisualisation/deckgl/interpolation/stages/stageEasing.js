/**
 * StageEasing.js
 * Provides stage-specific easing functions for tree animations.
 */

import { ANIMATION_STAGES } from './animationStageDetector.js';

// Easing functions (cubic bezier approximations)

/**
 * Ease-out: fast start, slow end (decelerating)
 * Best for COLLAPSE - elements settle gracefully as they disappear
 */
function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Ease-in: slow start, fast end (accelerating)
 * Best for EXPAND - elements spring into existence
 */
function easeIn(t) {
  return Math.pow(t, 3);
}

/**
 * Ease-in-out: slow start, fast middle, slow end (S-curve)
 * Best for REORDER - smooth position transitions
 */
function easeInOut(t) {
  return t < 0.5
    ? 4 * Math.pow(t, 3)
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Applies stage-appropriate easing to a time factor.
 * @param {number} t - Linear time factor (0 to 1)
 * @param {string} stage - One of ANIMATION_STAGES values
 * @returns {number} Eased time factor (0 to 1)
 */
export function applyStageEasing(t, stage) {
  // Clamp t to [0, 1]
  const clampedT = Math.max(0, Math.min(1, t));

  switch (stage) {
    case ANIMATION_STAGES.COLLAPSE:
      return easeOut(clampedT);
    case ANIMATION_STAGES.EXPAND:
      return easeIn(clampedT);
    case ANIMATION_STAGES.REORDER:
      return easeInOut(clampedT);
    default:
      return clampedT;
  }
}

// Export individual easing functions for direct use if needed
export { easeIn, easeOut, easeInOut };
