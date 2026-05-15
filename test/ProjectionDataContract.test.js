import { describe, expect, it } from 'vitest';
import {
  applySafeAreaToTarget,
  projectNodesToScreen
} from '../src/treeVisualisation/spatial/projections.js';

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

describe('applySafeAreaToTarget', () => {
  it('surfaces unexpected viewport unprojection failures', () => {
    const error = new Error('unproject failed');
    const view = {
      makeViewport: () => ({
        unproject: () => {
          throw error;
        }
      })
    };

    expect(() => applySafeAreaToTarget(
      view,
      [10, 20, 0],
      2,
      { top: 0, right: 0, bottom: 100, left: 0 },
      1000,
      800,
      1000,
      700,
      { target: [0, 0, 0], zoom: 0 }
    )).toThrow(error);
  });
});
