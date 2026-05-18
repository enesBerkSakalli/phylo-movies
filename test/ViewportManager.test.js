import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  calculateFocusViewport,
  VIEWPORT_BRANCH_FIT_PADDING,
  VIEWPORT_HIGH_DENSITY_NODE_THRESHOLD,
  VIEWPORT_HIGH_DENSITY_PADDING,
  VIEWPORT_LABEL_FIT_PADDING,
  VIEWPORT_LOW_DENSITY_NODE_THRESHOLD,
  VIEWPORT_LOW_DENSITY_PADDING,
  VIEWPORT_MEDIUM_DENSITY_NODE_THRESHOLD,
  VIEWPORT_MEDIUM_DENSITY_PADDING,
  ViewportManager
} from '../src/treeVisualisation/viewport/ViewportManager.js';
import {
  calculateBranchBounds,
  calculateMaxPositionRadius,
  calculatePositionCenter,
  calculateSafeVisualRadius,
  calculateTreeVisualRadius,
  calculateVisualBounds
} from '../src/treeVisualisation/utils/TreeBoundsUtils.js';

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
      deckContext: {
        container: null,
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
      deckContext: {
        container: null,
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

  it('keeps density padding on the normalized node array contract', () => {
    const source = readFileSync(
      new URL('../src/treeVisualisation/viewport/ViewportManager.js', import.meta.url),
      'utf8'
    );

    expect(source).not.toMatch(/Array\.isArray\(nodes\)/);
  });

  it('pins viewport fit padding constants', () => {
    expect(VIEWPORT_LABEL_FIT_PADDING).toBe(1.25);
    expect(VIEWPORT_BRANCH_FIT_PADDING).toBe(1.12);
    expect(VIEWPORT_HIGH_DENSITY_NODE_THRESHOLD).toBe(400);
    expect(VIEWPORT_MEDIUM_DENSITY_NODE_THRESHOLD).toBe(200);
    expect(VIEWPORT_LOW_DENSITY_NODE_THRESHOLD).toBe(100);
    expect(VIEWPORT_HIGH_DENSITY_PADDING).toBe(0.15);
    expect(VIEWPORT_MEDIUM_DENSITY_PADDING).toBe(0.1);
    expect(VIEWPORT_LOW_DENSITY_PADDING).toBe(0.05);
  });
});

describe('TreeBoundsUtils normalized data contract', () => {
  it('keeps empty normalized arrays as zero bounds', () => {
    expect(calculateVisualBounds([], [])).toEqual({ minX: 0, maxX: 0, minY: 0, maxY: 0 });
    expect(calculateBranchBounds([], [])).toEqual({ minX: 0, maxX: 0, minY: 0, maxY: 0 });
    expect(calculatePositionCenter([])).toEqual([0, 0]);
    expect(calculateMaxPositionRadius([])).toBe(0);
  });

  it('calculates branch bounds from normalized nodes and links', () => {
    expect(calculateBranchBounds(
      [
        { position: [10, 20, 0] },
        { position: [-5, 8, 0] }
      ],
      [
        {
          sourcePosition: [1, 2, 0],
          targetPosition: [30, -10, 0]
        }
      ]
    )).toEqual({
      minX: -5,
      maxX: 30,
      minY: -10,
      maxY: 20
    });
  });

  it('calculates centers and radii from normalized positions', () => {
    const items = [
      { position: [0, 0, 0] },
      { position: [10, 20, 0] }
    ];

    expect(calculatePositionCenter(items)).toEqual([5, 10]);
    expect(calculateMaxPositionRadius(items, [0, 0])).toBeCloseTo(Math.hypot(10, 20));
  });

  it('keeps the existing tree visual radius label heuristic unchanged', () => {
    const layerData = {
      nodes: [{ position: [3, 4, 0] }],
      labels: [{ position: [0, 10, 0], text: 'abcd' }],
      extensions: [{ sourcePosition: [0, 12, 0], targetPosition: [0, 20, 0] }]
    };

    expect(calculateTreeVisualRadius(layerData, [0, 0], 10)).toBe(44);
    expect(calculateSafeVisualRadius(layerData.nodes, layerData.labels, [0, 0], 12)).toBe(28);
  });
});
