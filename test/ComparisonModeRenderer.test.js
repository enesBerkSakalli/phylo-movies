import { afterEach, describe, expect, it, vi } from 'vitest';
import { ComparisonModeRenderer } from '../src/treeVisualisation/comparison/ComparisonModeRenderer.js';
import { useAppStore } from '../src/state/phyloStore/store.js';

describe('ComparisonModeRenderer', () => {
  const initialState = useAppStore.getState();

  afterEach(() => {
    useAppStore.setState(initialState, true);
  });

  it('passes connector Bezier paths into branch-focused fit', async () => {
    const leftData = {
      nodes: [{ id: 'node-0', position: [0, 0, 0], renderPosition: [0, 0, 0.1], split_indices: [0], isLeaf: true, name: 'A' }],
      links: [],
      labels: [],
      extensions: [],
    };
    const rightData = {
      nodes: [{ id: 'node-0', position: [100, 0, 0], renderPosition: [100, 0, 0.1], split_indices: [0], isLeaf: true, name: 'A' }],
      links: [],
      labels: [],
      extensions: [],
    };
    const connector = { path: [[0, 0, 0], [50, 400, 0], [100, 0, 0]] };
    const focusOnTree = vi.fn();

    useAppStore.setState({
      treeList: [{ side: 'left' }, { side: 'right' }],
      viewsConnected: true,
      leftTreeOffsetX: 0,
      leftTreeOffsetY: 0,
      rightTreeOffsetX: 0,
      rightTreeOffsetY: 0,
    });

    const renderer = new ComparisonModeRenderer({
      calculateLayout: (tree) => ({ tree, width: 100, height: 100 }),
      _getConsistentRadii: () => ({ extensionRadius: 10, labelRadius: 20 }),
      dataConverter: {
        convertTreeToLayerData: (tree) => tree.side === 'left' ? leftData : rightData,
      },
      deckContext: {
        getCanvasDimensions: () => ({ width: 800, height: 600 }),
      },
      viewportManager: {
        getRightTreeOffset: () => ({ x: 0, y: 0 }),
        focusOnTree,
      },
      _updateLayersEfficiently: vi.fn(),
    });
    renderer._buildConnectors = vi.fn(() => [connector]);

    await renderer.renderStatic(0, 1);

    expect(focusOnTree).toHaveBeenCalledOnce();
    expect(focusOnTree.mock.calls[0][2].links).toContain(connector);
    expect(renderer._buildConnectors.mock.calls[0][6]).toBe(0);
  });

  it('uses the rendered animated tree index for comparison connectors', async () => {
    const leftData = {
      nodes: [{ id: 'node-0', position: [0, 0, 0], renderPosition: [0, 0, 0.1], split_indices: [0], isLeaf: true, name: 'A' }],
      links: [],
      labels: [],
      extensions: [],
    };
    const rightData = {
      nodes: [{ id: 'node-0', position: [100, 0, 0], renderPosition: [100, 0, 0.1], split_indices: [0], isLeaf: true, name: 'A' }],
      links: [],
      labels: [],
      extensions: [],
    };

    useAppStore.setState({
      frameIndex: 0,
      viewsConnected: true,
      leftTreeOffsetX: 0,
      leftTreeOffsetY: 0,
    });

    const renderer = new ComparisonModeRenderer({
      calculateLayout: () => ({ tree: 'right', width: 100, height: 100 }),
      _getConsistentRadii: () => ({ extensionRadius: 10, labelRadius: 20 }),
      dataConverter: {
        convertTreeToLayerData: () => rightData,
      },
      deckContext: {
        getCanvasDimensions: () => ({ width: 800, height: 600 }),
      },
      viewportManager: {
        getRightTreeOffset: () => ({ x: 0, y: 0 }),
        focusOnTree: vi.fn(),
      },
      _createLayoutCacheKey: () => 'right-layout-cache-key',
      _updateLayersEfficiently: vi.fn(),
    });
    renderer._buildConnectors = vi.fn(() => []);
    renderer._lastFittedIndices = { right: 1 };

    await renderer.renderAnimated(leftData, { side: 'right' }, 1, {
      activeTreeIndex: 7,
    });

    expect(renderer._buildConnectors.mock.calls[0][6]).toBe(7);
  });

  it('reuses static right-hand animated comparison data across frames', async () => {
    const rightData = {
      nodes: [{ id: 'right-node', position: [100, 0, 0], renderPosition: [100, 0, 0.1], split_indices: [0], isLeaf: true, name: 'A' }],
      links: [],
      labels: [],
      extensions: [],
    };
    const rightLayout = {
      layoutCacheKey: 'right-layout-cache-key',
      width: 100,
      height: 100
    };
    const calculateLayout = vi.fn(() => rightLayout);
    const convertTreeToLayerData = vi.fn(() => rightData);

    useAppStore.setState({
      frameIndex: 0,
      viewsConnected: true,
      leftTreeOffsetX: 0,
      leftTreeOffsetY: 0,
      linkGeometryMode: 'radial-elbow',
      fontSize: '2.6em'
    });

    const renderer = new ComparisonModeRenderer({
      calculateLayout,
      _getConsistentRadii: () => ({ extensionRadius: 10, labelRadius: 20 }),
      dataConverter: {
        convertTreeToLayerData,
      },
      deckContext: {
        getCanvasDimensions: () => ({ width: 800, height: 600 }),
      },
      viewportManager: {
        getRightTreeOffset: () => ({ x: 0, y: 0 }),
        focusOnTree: vi.fn(),
      },
      _createLayoutCacheKey: () => 'right-layout-cache-key',
      _updateLayersEfficiently: vi.fn(),
    });
    renderer._buildConnectors = vi.fn(() => []);
    renderer._lastFittedIndices = { right: 1 };

    const makeLeftData = (x) => ({
      nodes: [{ id: `left-node-${x}`, position: [x, 0, 0], renderPosition: [x, 0, 0.1], split_indices: [0], isLeaf: true, name: 'A' }],
      links: [],
      labels: [],
      extensions: [],
    });

    await renderer.renderAnimated(makeLeftData(0), { side: 'right' }, 1, { activeTreeIndex: 7 });
    await renderer.renderAnimated(makeLeftData(5), { side: 'right' }, 1, { activeTreeIndex: 7 });

    expect(calculateLayout).toHaveBeenCalledTimes(1);
    expect(convertTreeToLayerData).toHaveBeenCalledTimes(1);
    expect(renderer._buildConnectors.mock.calls[0][1]).toBe(renderer._buildConnectors.mock.calls[1][1]);
  });

  it('rebuilds static right-hand animated comparison data when the layout cache key changes', async () => {
    const rightData = {
      nodes: [{ id: 'right-node', position: [100, 0, 0], renderPosition: [100, 0, 0.1], split_indices: [0], isLeaf: true, name: 'A' }],
      links: [],
      labels: [],
      extensions: [],
    };
    const calculateLayout = vi.fn(() => ({
      layoutCacheKey: 'right-layout-cache-key',
      width: 100,
      height: 100
    }));
    const convertTreeToLayerData = vi.fn(() => rightData);
    let layoutCacheKey = 'right-layout-cache-key-a';

    useAppStore.setState({
      frameIndex: 0,
      viewsConnected: true,
      leftTreeOffsetX: 0,
      leftTreeOffsetY: 0,
      linkGeometryMode: 'radial-elbow',
      fontSize: '2.6em'
    });

    const renderer = new ComparisonModeRenderer({
      calculateLayout,
      _getConsistentRadii: () => ({ extensionRadius: 10, labelRadius: 20 }),
      dataConverter: {
        convertTreeToLayerData,
      },
      deckContext: {
        getCanvasDimensions: () => ({ width: 800, height: 600 }),
      },
      viewportManager: {
        getRightTreeOffset: () => ({ x: 0, y: 0 }),
        focusOnTree: vi.fn(),
      },
      _createLayoutCacheKey: () => layoutCacheKey,
      _updateLayersEfficiently: vi.fn(),
    });
    renderer._buildConnectors = vi.fn(() => []);
    renderer._lastFittedIndices = { right: 1 };

    const leftData = {
      nodes: [{ id: 'left-node', position: [0, 0, 0], renderPosition: [0, 0, 0.1], split_indices: [0], isLeaf: true, name: 'A' }],
      links: [],
      labels: [],
      extensions: [],
    };

    await renderer.renderAnimated(leftData, { side: 'right' }, 1, { activeTreeIndex: 7 });
    layoutCacheKey = 'right-layout-cache-key-b';
    await renderer.renderAnimated({
      nodes: [{ id: 'left-node-2', position: [5, 0, 0], renderPosition: [5, 0, 0.1], split_indices: [0], isLeaf: true, name: 'A' }],
      links: [],
      labels: [],
      extensions: [],
    }, { side: 'right' }, 1, { activeTreeIndex: 7 });

    expect(calculateLayout).toHaveBeenCalledTimes(2);
    expect(convertTreeToLayerData).toHaveBeenCalledTimes(2);
  });
});
