// Animation constants
export const PULSE_DURATION_MS = 1500;
export const PULSE_MIN_OPACITY = 0.4;
export const PULSE_MAX_OPACITY = 1.0;

/**
 * Calculate pulse opacity from phase (0-1)
 * Uses sine wave for smooth breathing effect
 */
export function calculatePulseOpacity(phase, enabled = true) {
  if (!enabled) return 1.0;
  const range = PULSE_MAX_OPACITY - PULSE_MIN_OPACITY;
  const sineValue = Math.sin(phase * Math.PI * 2);
  return PULSE_MIN_OPACITY + (range * (0.5 + 0.5 * sineValue));
}
