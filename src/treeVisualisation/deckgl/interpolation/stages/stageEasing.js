import { clamp01 } from '../../../../domain/math/mathUtils.js';
function easeInOut(t) {
  return t < 0.5 ? 4 * Math.pow(t, 3) : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function applyRenderProgressEasing(t) {
  const clampedT = clamp01(t);
  return easeInOut(clampedT);
}
