import { describe, expect, it } from 'vitest';
import { calculateReadableLabelRadii } from '../../../../src/treeVisualisation/layout/labelRingRadii.js';

describe('label ring radii', () => {
  const options = {
    baseRadius: 200,
    labelOffsets: { DEFAULT: 20, EXTENSION: 5 },
    labelCount: 1871,
    fontSize: '1.8em',
    angleSpanRadians: Math.PI * 2,
  };

  it('sizes the ring so dense labels fit when labels are visible', () => {
    const radii = calculateReadableLabelRadii({ ...options, labelsVisible: true });

    expect(radii.labelRadius).toBeGreaterThan(1000);
    expect(radii.extensionRadius).toBeCloseTo(radii.labelRadius - 20);
    expect(calculateReadableLabelRadii(options)).toEqual(radii);
  });

  it('keeps the compact ring around the tree when labels are hidden', () => {
    expect(calculateReadableLabelRadii({ ...options, labelsVisible: false })).toEqual({
      extensionRadius: 205,
      labelRadius: 225,
    });
  });

  it('keeps the compact ring for a decluttered tree, which hides what collides', () => {
    const radii = calculateReadableLabelRadii({ ...options, decluttered: true });

    expect(radii).toEqual({ extensionRadius: 205, labelRadius: 225 });
    // The same labels in a movie, where every name is drawn, still widen the ring.
    expect(calculateReadableLabelRadii(options).labelRadius).toBeGreaterThan(1000);
  });
});
