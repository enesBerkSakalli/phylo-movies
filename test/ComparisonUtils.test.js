import { describe, expect, it } from 'vitest';
import { applyOffset } from '../src/treeVisualisation/comparison/ComparisonUtils.js';

describe('ComparisonUtils', () => {
  it('offsets node render positions with canonical positions', () => {
    const layerData = {
      nodes: [
        {
          position: [1, 2, 0],
          renderPosition: [1, 2, 0.1]
        }
      ],
      links: [],
      extensions: [],
      labels: []
    };

    applyOffset(layerData, 10, 20);

    expect(layerData.nodes[0].position).toEqual([11, 22, 0]);
    expect(layerData.nodes[0].renderPosition).toEqual([11, 22, 0.1]);
  });
});
