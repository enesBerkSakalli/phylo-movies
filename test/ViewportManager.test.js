import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { ViewportManager } from '../src/treeVisualisation/viewport/ViewportManager.js';
import {
  calculateFocusViewport,
  selectFitAreaForBounds,
  VIEWPORT_FIT_MODES,
  VIEWPORT_BRANCH_FIT_PADDING,
  VIEWPORT_HIGH_DENSITY_NODE_THRESHOLD,
  VIEWPORT_HIGH_DENSITY_PADDING,
  VIEWPORT_LABEL_FIT_PADDING,
  VIEWPORT_LOW_DENSITY_NODE_THRESHOLD,
  VIEWPORT_LOW_DENSITY_PADDING,
  VIEWPORT_MEDIUM_DENSITY_NODE_THRESHOLD,
  VIEWPORT_MEDIUM_DENSITY_PADDING
} from '../src/treeVisualisation/viewport/viewportFit.js';
import {
  calculateBranchBounds,
  calculateLabelBounds,
  calculateMaxPositionRadius,
  calculateNodeBounds,
  calculatePositionCenter,
  calculateSafeVisualRadius,
  calculateTreeVisualRadius,
  mergeBounds
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
      fitAreas: null,
      activeView: null,
      currentViewState: { target: [0, 0, 0], zoom: 0 },
    });

    expect(result.target).toEqual([50, 250, 0]);
    expect(result.zoom).toBe(1);
    expect(result.fitArea).toEqual({ left: 0, top: 0, width: 1000, height: 1000 });
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

  it('manual label fit includes label bounds exactly once', () => {
    const result = calculateFocusViewport({
      nodes: [
        { position: [0, 0, 0] },
        { position: [10, 0, 0] },
      ],
      labels: [
        { position: [100, 0, 0], text: 'abcdefghij' },
      ],
      fitMode: VIEWPORT_FIT_MODES.LABELS,
      padding: 1,
      labelSizePx: 16,
      canvasWidth: 1000,
      canvasHeight: 1000,
      fitAreas: null,
      activeView: null,
      currentViewState: { target: [0, 0, 0], zoom: 0 },
    });

    expect(result.target).toEqual([98, 0, 0]);
    expect(result.zoom).toBeCloseTo(Math.log2(1000 / 196), 10);
  });

  it('fits into the best unobstructed viewport area when UI overlays cover the canvas', () => {
    const result = calculateFocusViewport({
      nodes: [
        { position: [-50, -50, 0] },
        { position: [50, 50, 0] },
      ],
      labels: [],
      fitAreas: [
        { left: 0, top: 0, width: 240, height: 600 },
        { left: 260, top: 120, width: 740, height: 680 },
      ],
      padding: 1,
      canvasWidth: 1000,
      canvasHeight: 800,
      activeView: {
        makeViewport: ({ viewState }) => ({
          unproject: ([x, y]) => {
            const scale = 2 ** viewState.zoom;
            return [
              viewState.target[0] + (x - 500) / scale,
              viewState.target[1] + (y - 400) / scale,
              0
            ];
          }
        })
      },
      currentViewState: { target: [0, 0, 0], zoom: 0 },
    });

    expect(result.fitArea).toEqual({ left: 260, top: 120, width: 740, height: 680 });
    expect(result.target[0]).toBeCloseTo(-19.1176470588, 10);
    expect(result.target[1]).toBeCloseTo(-8.8235294118, 10);
    expect(result.target[2]).toBe(0);
    expect(result.zoom).toBeCloseTo(Math.log2(6.8), 10);
  });

  it('chooses fit areas by maximum branch scale before raw area', () => {
    expect(selectFitAreaForBounds(
      { minX: -10, maxX: 10, minY: -100, maxY: 100 },
      [
        { left: 0, top: 0, width: 900, height: 120 },
        { left: 100, top: 150, width: 300, height: 500 },
      ],
      1,
      1000,
      800
    )).toEqual({ left: 100, top: 150, width: 300, height: 500 });
  });

  it('long labels at a stable global label radius do not shrink automatic branch fit', () => {
    const branchFit = calculateFocusViewport({
      nodes: [
        { position: [-12, 0, 0] },
        { position: [12, 0, 0] },
      ],
      labels: [
        {
          position: [600, 0, 0],
          text: 'Dataset maximum radius label with a very long taxon name',
        },
      ],
      fitMode: VIEWPORT_FIT_MODES.BRANCH,
      padding: 1,
      canvasWidth: 1200,
      canvasHeight: 800,
      fitAreas: null,
      activeView: null,
      currentViewState: { target: [0, 0, 0], zoom: 0 },
    });
    const labelFit = calculateFocusViewport({
      nodes: [
        { position: [-12, 0, 0] },
        { position: [12, 0, 0] },
      ],
      labels: [
        {
          position: [600, 0, 0],
          text: 'Dataset maximum radius label with a very long taxon name',
        },
      ],
      fitMode: VIEWPORT_FIT_MODES.LABELS,
      padding: 1,
      canvasWidth: 1200,
      canvasHeight: 800,
      fitAreas: null,
      activeView: null,
      currentViewState: { target: [0, 0, 0], zoom: 0 },
    });

    expect(branchFit.zoom).toBeGreaterThan(labelFit.zoom + 4);
    expect(branchFit.target).toEqual([0, 0, 0]);
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
      new URL('../src/treeVisualisation/viewport/viewportFit.js', import.meta.url),
      'utf8'
    );

    expect(source).not.toMatch(/Array\.isArray\(nodes\)/);
  });

  it('pins viewport fit padding constants', () => {
    expect(VIEWPORT_LABEL_FIT_PADDING).toBe(1.25);
    expect(VIEWPORT_FIT_MODES).toEqual({ BRANCH: 'branch', LABELS: 'labels' });
    expect(VIEWPORT_BRANCH_FIT_PADDING).toBe(1.12);
    expect(VIEWPORT_HIGH_DENSITY_NODE_THRESHOLD).toBe(400);
    expect(VIEWPORT_MEDIUM_DENSITY_NODE_THRESHOLD).toBe(200);
    expect(VIEWPORT_LOW_DENSITY_NODE_THRESHOLD).toBe(100);
    expect(VIEWPORT_HIGH_DENSITY_PADDING).toBe(0.15);
    expect(VIEWPORT_MEDIUM_DENSITY_PADDING).toBe(0.1);
    expect(VIEWPORT_LOW_DENSITY_PADDING).toBe(0.05);
  });

  it('does not keep legacy viewport fit vocabulary or duplicate label expansion helpers', () => {
    const sourceFiles = [
      '../src/treeVisualisation/systems/StaticRenderer.js',
      '../src/treeVisualisation/viewport/ViewportManager.js',
      '../src/treeVisualisation/viewport/viewportFit.js',
      '../src/treeVisualisation/utils/TreeBoundsUtils.js',
      '../src/treeVisualisation/spatial/bounds.js',
      '../src/treeVisualisation/spatial/projections.js',
    ];
    const bannedTerms = [
      'includeLabels',
      'calculateVisualBounds',
      'expandBoundsForLabels',
      'estimateLabelBoundsPadding',
      'safeArea',
      'SafeArea',
      'SAFE_AREA',
    ];

    const offenders = sourceFiles.flatMap((sourceFile) => {
      const source = readFileSync(new URL(sourceFile, import.meta.url), 'utf8');
      return bannedTerms
        .filter((term) => source.includes(term))
        .map((term) => `${sourceFile}: ${term}`);
    });

    expect(offenders).toEqual([]);
  });
});

describe('TreeBoundsUtils normalized data contract', () => {
  it('keeps empty normalized arrays as zero bounds', () => {
    expect(
      mergeBounds(calculateNodeBounds([]), calculateLabelBounds([]))
    ).toEqual({ minX: 0, maxX: 0, minY: 0, maxY: 0 });
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

  it('calculates label text bounds from the shared label size heuristic', () => {
    expect(calculateLabelBounds([], { labelSizePx: 10 })).toBeNull();
    expect(calculateLabelBounds(
      [{ position: [10, 20, 0], text: 'abc' }],
      { labelSizePx: 10 }
    )).toEqual({
      minX: 10,
      maxX: 28,
      minY: 14,
      maxY: 26,
    });
  });

  it('surfaces label bounds inputs outside the normalized contract', () => {
    const error = new Error('label size failed');

    expect(() => calculateLabelBounds(null)).toThrow();
    expect(() => calculateLabelBounds(
      [{ position: [0, 0, 0], text: 'abc' }],
      { getLabelSize: () => { throw error; } }
    )).toThrow(error);
  });

  it('caps individual label text width at the named maximum', () => {
    expect(calculateLabelBounds(
      [{ position: [0, 0, 0], text: 'x'.repeat(400) }],
      { labelSizePx: 10 }
    )).toEqual({
      minX: 0,
      maxX: 2000,
      minY: -6,
      maxY: 6,
    });
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
