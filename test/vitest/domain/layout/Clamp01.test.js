import { describe, expect, it } from 'vitest';
import { clamp01 } from '../../../../src/domain/math/mathUtils.js';

describe('clamp01', () => {
  it('clamps to the unit interval', () => {
    expect(clamp01(-5)).toBe(0);
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(1)).toBe(1);
    expect(clamp01(5)).toBe(1);
  });

  // The finite guard is the whole reason this exists alongside clamp(). Opacities, time factors
  // and progress ratios funnel through here, and a bare Math.max/Math.min lets NaN straight
  // through to shaders and easing curves.
  it('coerces non-finite input to 0', () => {
    expect(clamp01(NaN)).toBe(0);
    expect(clamp01(Infinity)).toBe(0);
    expect(clamp01(-Infinity)).toBe(0);
    expect(clamp01(undefined)).toBe(0);
    expect(clamp01(null)).toBe(0);
  });
});
