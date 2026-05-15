import { describe, expect, it, vi } from 'vitest';
import {
  calculateFocusViewport,
  ViewportManager
} from '../src/treeVisualisation/viewport/ViewportManager.js';
import { calculateBranchBounds } from '../src/treeVisualisation/utils/TreeBoundsUtils.js';

describe('ViewportManager', () => {
  it('calculates branch-focused viewport state without transition side effects', () => {
    const result = calculateFocusViewport({
      nodes: [
        { position: [0, 0, 0], radius: 2 },
        { position: [100, 0, 0], radius: 2 },
      ],
      labels: [],
      links: [
        {
          path: [
            [0, 0, 0],
            [50, 500, 0],
            [100, 0, 0],
          ],
        },
      ],
      padding: 1,
      canvasWidth: 1000,
      canvasHeight: 1000,
      safeArea: null,
      activeView: null,
      currentViewState: { target: [0, 0, 0], zoom: 0 },
    });

    expect(result).toEqual({
      target: [50, 250, 0],
      zoom: 1,
    });
  });

  it('fits branch structure by default instead of distant labels', () => {
    const transitionTo = vi.fn();
    const manager = new ViewportManager({
      webglContainer: null,
      deckContext: {
        getCanvasDimensions: () => ({ width: 1000, height: 1000 }),
        getActiveView: () => null,
        getViewState: () => ({ target: [0, 0, 0], zoom: 0 }),
        transitionTo,
      },
      layerManager: {
        layerStyles: {
          getLabelSize: () => 16,
        },
      },
    });

    manager.focusOnTree(
      [
        { position: [-100, -100, 0], radius: 2 },
        { position: [100, 100, 0], radius: 2 },
      ],
      [
        { position: [1200, 0, 0], text: 'A label that should not determine the default fit' },
      ],
      { duration: 0 }
    );

    expect(transitionTo).toHaveBeenCalledOnce();
    expect(transitionTo.mock.calls[0][0].zoom).toBeGreaterThan(1.5);
  });

  it('includes link path geometry in branch-focused fit bounds', () => {
    const transitionTo = vi.fn();
    const manager = new ViewportManager({
      webglContainer: null,
      deckContext: {
        getCanvasDimensions: () => ({ width: 1000, height: 1000 }),
        getActiveView: () => null,
        getViewState: () => ({ target: [0, 0, 0], zoom: 0 }),
        transitionTo,
      },
      layerManager: {
        layerStyles: {
          getLabelSize: () => 16,
        },
      },
    });

    manager.focusOnTree(
      [
        { position: [0, 0, 0], radius: 2 },
        { position: [100, 0, 0], radius: 2 },
      ],
      [],
      {
        duration: 0,
        links: [
          {
            path: [
              [0, 0, 0],
              [50, 500, 0],
              [100, 0, 0],
            ],
          },
        ],
      }
    );

    expect(transitionTo).toHaveBeenCalledOnce();
    expect(transitionTo.mock.calls[0][0].target[1]).toBeGreaterThan(200);
  });

  it('includes animated flat typed path geometry in branch bounds', () => {
    const bounds = calculateBranchBounds(
      [
        { position: [0, 0, 0] },
        { position: [10, 0, 0] },
      ],
      [
        {
          sourcePosition: [0, 0, 0],
          targetPosition: [10, 0, 0],
          path: new Float32Array([
            0, 0, 0,
            5, 100, 0,
            10, 0, 0,
          ]),
        },
      ]
    );

    expect(bounds.maxY).toBe(100);
  });
});
