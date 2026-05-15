import { afterEach, describe, expect, it, vi } from 'vitest';

describe('tree animation frame instrumentation', () => {
  afterEach(async () => {
    const instrumentation = await import('../../src/treeVisualisation/performance/frameInstrumentation.js');
    instrumentation.resetFramePerf();
    delete globalThis.PERF_DEBUG;
    delete globalThis.__PHYLO_FRAME_PERF__;
    vi.restoreAllMocks();
  });

  it('records interpolation, layer update, deck setLayers, and comparison timings when PERF_DEBUG is enabled', async () => {
    globalThis.PERF_DEBUG = true;

    const instrumentation = await import('../../src/treeVisualisation/performance/frameInstrumentation.js');
    const { TreeInterpolator } = await import('../../src/treeVisualisation/deckgl/interpolation/TreeInterpolator.js');
    const { LayerManager } = await import('../../src/treeVisualisation/deckgl/layers/LayerManager.js');
    const { DeckGLContext } = await import('../../src/treeVisualisation/deckgl/context/DeckGLContext.js');
    const { ComparisonModeRenderer } = await import('../../src/treeVisualisation/comparison/ComparisonModeRenderer.js');

    const treeInterpolator = new TreeInterpolator();
    const element = {
      id: 'n1',
      position: [0, 0, 0],
      polarData: {
        source: { angle: 0, radius: 1 },
        target: { angle: 0, radius: 1 }
      }
    };
    const data = {
      max_radius: 1,
      nodes: [element],
      links: [],
      labels: [],
      extensions: []
    };
    treeInterpolator.interpolateTreeData(data, data, 0.5, { stage: 'COLLAPSE' });

    const layerManager = Object.create(LayerManager.prototype);
    layerManager.createTreeLayers = vi.fn(() => []);
    layerManager.updateLayersWithData({ nodes: [], links: [], labels: [], extensions: [] });

    const context = Object.create(DeckGLContext.prototype);
    context._layerListeners = new Set();
    context.setProps = vi.fn();
    context.setLayers([]);

    const comparisonRenderer = Object.create(ComparisonModeRenderer.prototype);
    comparisonRenderer.controller = {
      calculateLayout: vi.fn(() => ({ width: 100, height: 100, nodes: [], links: [], leaves: [] })),
      _getConsistentRadii: vi.fn(() => ({ extensionRadius: 1, labelRadius: 2 })),
      dataConverter: {
        convertTreeToLayerData: vi.fn(() => ({
          nodes: [{ id: 'right-node', position: [0, 0, 0] }],
          links: [],
          extensions: [],
          labels: []
        }))
      },
      deckContext: {
        getCanvasDimensions: vi.fn(() => ({ width: 100, height: 100 }))
      },
      viewportManager: {
        getRightTreeOffset: vi.fn(() => ({ x: 0, y: 0 })),
        focusOnTree: vi.fn()
      },
      _updateLayersEfficiently: vi.fn()
    };
    comparisonRenderer._buildConnectors = vi.fn(() => []);
    comparisonRenderer._lastFittedIndices = { right: 0 };
    await comparisonRenderer.renderAnimated(
      { nodes: [{ id: 'left-node', position: [0, 0, 0] }], links: [], labels: [], extensions: [] },
      { id: 'right-tree' },
      0
    );

    const snapshot = instrumentation.getFramePerfSnapshot();

    expect(snapshot['treeInterpolator.interpolateTreeData'].count).toBe(1);
    expect(snapshot['layerManager.updateLayersWithData'].count).toBe(1);
    expect(snapshot['deckContext.setLayers'].count).toBe(1);
    expect(snapshot['comparisonMode.renderAnimated'].count).toBe(1);
    expect(globalThis.__PHYLO_FRAME_PERF__.getSnapshot()).toEqual(snapshot);
  });

  it('does not record timings unless PERF_DEBUG is enabled', async () => {
    const instrumentation = await import('../../src/treeVisualisation/performance/frameInstrumentation.js');
    const { LayerManager } = await import('../../src/treeVisualisation/deckgl/layers/LayerManager.js');

    const layerManager = Object.create(LayerManager.prototype);
    layerManager.createTreeLayers = vi.fn(() => []);
    layerManager.updateLayersWithData({ nodes: [], links: [], labels: [], extensions: [] });

    expect(instrumentation.getFramePerfSnapshot()).toEqual({});
  });
});
