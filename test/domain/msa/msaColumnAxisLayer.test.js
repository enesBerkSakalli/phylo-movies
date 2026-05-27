import { describe, expect, it } from 'vitest';
import { buildColumnAxis } from '../../../src/msaViewer/layers/columnAxisLayer.js';

describe('MSA column axis layer data', () => {
  it('keeps axis labels centered in world coordinates as zoom changes', () => {
    const [label] = buildColumnAxis(12, { zoom: -1 }, { c0: 9, c1: 9 }, 2, 0.5, 12);

    expect(label.position[1]).toBe(20);
  });
});
