import { describe, expect, it } from 'vitest';
import { TreeInterpolator } from '../src/treeVisualisation/deckgl/interpolation/TreeInterpolator.js';

describe('TreeInterpolator label radius smoothing', () => {
  it('places entering labels on the interpolated label radius', () => {
    const interpolator = new TreeInterpolator();
    const fromData = {
      max_radius: 100,
      nodes: [],
      links: [],
      labels: [],
      extensions: []
    };
    const toData = {
      max_radius: 200,
      nodes: [],
      links: [],
      labels: [{
        id: 'label:a',
        position: [222, 0, 0],
        polarPosition: 222,
        angle: 0,
        rotation: 0,
        text: 'A',
        textAnchor: 'start'
      }],
      extensions: [{
        id: 'extension:a',
        path: [[200, 0, 0], [222, 0, 0]],
        polarData: {
          source: { angle: 0, radius: 200 },
          target: { angle: 0, radius: 222 }
        }
      }]
    };

    const result = interpolator.interpolateTreeData(fromData, toData, 0.5);

    expect(result.max_radius).toBe(150);
    expect(result.labels).toHaveLength(1);
    expect(result.labels[0].polarPosition).toBe(172);
    expect(result.labels[0].position[0]).toBeCloseTo(172);
    expect(result.labels[0].position[1]).toBeCloseTo(0);
    expect(result.extensions).toHaveLength(1);
    expect(result.extensions[0].polarData.target.radius).toBe(172);
    expect(Array.from(result.extensions[0].path).slice(-3)).toEqual([172, 0, 0]);
  });
});
