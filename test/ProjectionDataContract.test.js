import { describe, expect, it } from 'vitest';
import { projectNodesToScreen } from '../src/treeVisualisation/spatial/projections.js';

describe('projectNodesToScreen', () => {
  it('uses normalized split indices and explicit leaf state from deck layer nodes', () => {
    const viewport = {
      project: ([x, y, z]) => [x + 1, y + 2, z],
    };
    const containerRect = { left: 10, top: 20 };

    const positions = projectNodesToScreen([
      {
        split_indices: [1, 2],
        position: [5, 7, 0],
        isLeaf: false,
      },
      {
        split_indices: [3],
        position: [9, 11, 0],
        isLeaf: true,
      },
    ], viewport, containerRect);

    expect(positions['1-2']).toMatchObject({
      x: 16,
      y: 29,
      isLeaf: false,
    });
    expect(positions['3']).toMatchObject({
      x: 20,
      y: 33,
      isLeaf: true,
    });
  });
});
