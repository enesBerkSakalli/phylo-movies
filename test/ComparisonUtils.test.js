import { describe, expect, it } from 'vitest';
import { applyOffset, buildPositionMap } from '../src/treeVisualisation/comparison/ComparisonUtils.js';

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

  it('offsets flat link and extension paths', () => {
    const layerData = {
      nodes: [],
      links: [{
        sourcePosition: [0, 0, 0],
        targetPosition: [10, 0, 0],
        path: new Float32Array([0, 0, 0, 10, 0, 0])
      }],
      extensions: [{
        sourcePosition: [1, 1, 0],
        targetPosition: [2, 2, 0],
        path: new Float32Array([1, 1, 0, 2, 2, 0])
      }],
      labels: []
    };

    applyOffset(layerData, 5, 6);

    expect(Array.from(layerData.links[0].path)).toEqual([5, 6, 0, 15, 6, 0]);
    expect(Array.from(layerData.extensions[0].path)).toEqual([6, 7, 0, 7, 8, 0]);
  });

  it('builds normalized position entries without raw node references', () => {
    const nodes = [{
      id: 'n0',
      parentId: null,
      position: [1, 2, 0],
      split_indices: [0],
      isLeaf: true,
      name: 'A',
      depth: 1
    }];
    const labels = [{
      position: [3, 4, 0],
      split_indices: [0],
      name: 'A'
    }];

    const entry = buildPositionMap(nodes, labels).get('0');

    expect(entry).toMatchObject({
      id: 'n0',
      parentId: null,
      position: [3, 4, 0],
      split_indices: [0],
      isLeaf: true,
      name: 'A',
      depth: 1
    });
    expect(entry).not.toHaveProperty('node');
  });
});
