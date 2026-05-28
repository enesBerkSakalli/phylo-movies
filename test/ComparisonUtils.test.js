import { describe, expect, it } from 'vitest';
import * as ComparisonUtils from '../src/treeVisualisation/comparison/ComparisonUtils.js';
import { toSubtreeKey } from '../src/domain/tree/splits.js';

const { applyOffset, buildPositionMap, combineLayerData } = ComparisonUtils;

describe('ComparisonUtils', () => {
  it('offsets node render positions with canonical positions', () => {
    const layerData = {
      nodes: [
        {
          position: [1, 2, 0],
          renderPosition: [1, 2, 0.1],
        },
      ],
      links: [],
      extensions: [],
      labels: [],
    };

    applyOffset(layerData, 10, 20);

    expect(layerData.nodes[0].position).toEqual([11, 22, 0]);
    expect(layerData.nodes[0].renderPosition).toEqual([11, 22, 0.1]);
  });

  it('offsets flat link and extension paths', () => {
    const layerData = {
      nodes: [],
      links: [
        {
          sourcePosition: [0, 0, 0],
          targetPosition: [10, 0, 0],
          path: new Float32Array([0, 0, 0, 10, 0, 0]),
        },
      ],
      extensions: [
        {
          sourcePosition: [1, 1, 0],
          targetPosition: [2, 2, 0],
          path: new Float32Array([1, 1, 0, 2, 2, 0]),
        },
      ],
      labels: [],
    };

    applyOffset(layerData, 5, 6);

    expect(Array.from(layerData.links[0].path)).toEqual([5, 6, 0, 15, 6, 0]);
    expect(Array.from(layerData.extensions[0].path)).toEqual([6, 7, 0, 7, 8, 0]);
  });

  it('builds normalized position entries without raw node references', () => {
    const nodes = [
      {
        id: 'n0',
        parentId: null,
        position: [1, 2, 0],
        split_indices: [0],
        isLeaf: true,
        name: 'A',
        depth: 1,
      },
    ];
    const labels = [
      {
        position: [3, 4, 0],
        split_indices: [0],
        name: 'A',
      },
    ];

    const entry = buildPositionMap(nodes, labels).get(toSubtreeKey([0]));

    expect(entry).toMatchObject({
      id: 'n0',
      parentId: null,
      position: [3, 4, 0],
      split_indices: [0],
      isLeaf: true,
      name: 'A',
      depth: 1,
    });
    expect(entry).not.toHaveProperty('node');
  });

  it('calculates comparison frame geometry from one shared helper without mutating layer data', () => {
    expect(typeof ComparisonUtils.calculateComparisonFrameGeometry).toBe('function');

    const leftLayerData = {
      nodes: [{ position: [0, 0, 0] }, { position: [10, 0, 0] }],
      labels: [{ position: [30, 0, 0], name: 'left' }],
      extensions: [],
    };
    const rightLayerData = {
      nodes: [{ position: [100, 0, 0] }, { position: [120, 0, 0] }],
      labels: [{ position: [145, 0, 0], name: 'right' }],
      extensions: [],
    };

    const geometry = ComparisonUtils.calculateComparisonFrameGeometry({
      leftLayerData,
      rightLayerData,
      canvasWidth: 800,
      rightTreeOffset: { x: 7, y: -3 },
      leftTreeOffsetX: 5,
      leftTreeOffsetY: 11,
      fontSize: '3em',
    });
    const geometryWithLargeLabels = ComparisonUtils.calculateComparisonFrameGeometry({
      leftLayerData,
      rightLayerData,
      canvasWidth: 800,
      rightTreeOffset: { x: 7, y: -3 },
      leftTreeOffsetX: 5,
      leftTreeOffsetY: 11,
      fontSize: '8em',
    });

    expect(leftLayerData.nodes[0].position).toEqual([0, 0, 0]);
    expect(rightLayerData.nodes[0].position).toEqual([100, 0, 0]);
    expect(geometry.leftCenterBase).toEqual([5, 0]);
    expect(geometry.rightCenterBase).toEqual([110, 0]);
    expect(geometry.labelSizePx).toBeCloseTo(21.6);
    expect(geometryWithLargeLabels.rightOffset).toBe(geometry.rightOffset);
    expect(geometry.leftCenter).toEqual([10, 11]);
    expect(geometry.rightCenter).toEqual([geometry.rightOffset + 110, -3]);
    expect(geometry.leftRadius).toBeGreaterThan(0);
    expect(geometry.rightRadius).toBeGreaterThan(0);
    expect(geometry.leftSafeRadius).toBeGreaterThan(0);
    expect(geometry.rightSafeRadius).toBeGreaterThan(0);
  });

  it('combines normalized layer data arrays directly', () => {
    const leftData = {
      nodes: [{ id: 'left-node' }],
      links: [{ id: 'left-link' }],
      extensions: [{ id: 'left-extension' }],
      labels: [{ id: 'left-label' }],
    };
    const rightData = {
      nodes: [{ id: 'right-node' }],
      links: [{ id: 'right-link' }],
      extensions: [{ id: 'right-extension' }],
      labels: [{ id: 'right-label' }],
    };
    const connectors = [{ id: 'connector' }];

    expect(combineLayerData(leftData, rightData, connectors)).toEqual({
      nodes: [...leftData.nodes, ...rightData.nodes],
      links: [...leftData.links, ...rightData.links],
      extensions: [...leftData.extensions, ...rightData.extensions],
      labels: [...leftData.labels, ...rightData.labels],
      connectors,
    });
  });
});
