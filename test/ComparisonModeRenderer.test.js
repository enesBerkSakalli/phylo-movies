import { afterEach, describe, expect, it, vi } from 'vitest';
import { ComparisonModeRenderer } from '../src/treeVisualisation/comparison/ComparisonModeRenderer.js';
import { useAppStore } from '../src/state/phyloStore/store.js';
import { VIEWPORT_FIT_OBSTRUCTION_SCOPES } from '../src/treeVisualisation/spatial/layout.js';
import { VIEWPORT_AUTO_FIT_CENTER_DRIFT_LIMIT_RATIO } from '../src/treeVisualisation/viewport/viewportFit.js';

describe('ComparisonModeRenderer', () => {
  const initialState = useAppStore.getState();

  afterEach(() => {
    useAppStore.setState(initialState, true);
  });

  it('passes connector Bezier paths into branch-focused fit', async () => {
    const leftExtension = {
      sourcePosition: [0, 0, 0],
      targetPosition: [0, 200, 0],
      path: [
        [0, 0, 0],
        [0, 200, 0],
      ],
    };
    const leftData = {
      nodes: [
        {
          id: 'node-0',
          position: [0, 0, 0],
          renderPosition: [0, 0, 0.1],
          split_indices: [0],
          isLeaf: true,
          name: 'A',
        },
      ],
      links: [],
      labels: [],
      extensions: [leftExtension],
    };
    const rightData = {
      nodes: [
        {
          id: 'node-0',
          position: [100, 0, 0],
          renderPosition: [100, 0, 0.1],
          split_indices: [0],
          isLeaf: true,
          name: 'A',
        },
      ],
      links: [],
      labels: [],
      extensions: [],
    };
    const connector = {
      path: [
        [0, 0, 0],
        [50, 400, 0],
        [100, 0, 0],
      ],
    };
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
        convertTreeToLayerData: (layout) => (layout.tree.side === 'left' ? leftData : rightData),
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
    expect(focusOnTree.mock.calls[0][2].includeLabelAnchorBounds).toBe(true);
    expect(focusOnTree.mock.calls[0][2].obstructionScope).toBe(
      VIEWPORT_FIT_OBSTRUCTION_SCOPES.CANVAS
    );
    expect(focusOnTree.mock.calls[0][2].maxFitAreaCenterDriftRatio).toBe(
      VIEWPORT_AUTO_FIT_CENTER_DRIFT_LIMIT_RATIO
    );
    expect(focusOnTree.mock.calls[0][2].links).toContain(connector);
    expect(focusOnTree.mock.calls[0][2].links).toContain(leftExtension);
    expect(renderer._buildConnectors.mock.calls[0][6]).toBe(0);
  });

  it('uses each tree layout radius for static comparison labels and extensions', async () => {
    const leftData = {
      nodes: [{ id: 'left-node', position: [0, 0, 0], renderPosition: [0, 0, 0.1] }],
      links: [],
      labels: [],
      extensions: [],
    };
    const rightData = {
      nodes: [{ id: 'right-node', position: [100, 0, 0], renderPosition: [100, 0, 0.1] }],
      links: [],
      labels: [],
      extensions: [],
    };
    const convertTreeToLayerData = vi.fn((layout) =>
      layout.side === 'left' ? leftData : rightData
    );

    useAppStore.setState({
      treeList: [{ side: 'left' }, { side: 'right' }],
      viewsConnected: false,
      leftTreeOffsetX: 0,
      leftTreeOffsetY: 0,
      rightTreeOffsetX: 0,
      rightTreeOffsetY: 0,
      labelsVisible: true,
    });

    const renderer = new ComparisonModeRenderer({
      calculateLayout: (tree) => ({ side: tree.side, width: 100, height: 100 }),
      _getConsistentRadii: (layout) =>
        layout.side === 'left'
          ? { extensionRadius: 11, labelRadius: 12 }
          : { extensionRadius: 101, labelRadius: 102 },
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
      _updateLayersEfficiently: vi.fn(),
    });

    await renderer.renderStatic(0, 1);

    expect(convertTreeToLayerData.mock.calls[0][1]).toMatchObject({
      extensionRadius: 11,
      labelRadius: 12,
      treeSide: 'left',
    });
    expect(convertTreeToLayerData.mock.calls[1][1]).toMatchObject({
      extensionRadius: 101,
      labelRadius: 102,
      treeSide: 'right',
    });
  });

  it('keeps comparison tree spacing stable when terminal labels are hidden', async () => {
    const makeLayerData = (side) => {
      if (side === 'left') {
        return {
          nodes: [
            { id: 'left-root', position: [0, 0, 0], renderPosition: [0, 0, 0.1] },
            { id: 'left-leaf', position: [10, 0, 0], renderPosition: [10, 0, 0.1] },
          ],
          links: [],
          labels: [
            {
              id: 'left-label',
              position: [30, 0, 0],
              text: 'left terminal label '.repeat(40),
            },
          ],
          extensions: [],
        };
      }

      return {
        nodes: [
          { id: 'right-root', position: [100, 0, 0], renderPosition: [100, 0, 0.1] },
          { id: 'right-leaf', position: [120, 0, 0], renderPosition: [120, 0, 0.1] },
        ],
        links: [],
        labels: [
          {
            id: 'right-label',
            position: [145, 0, 0],
            text: 'right terminal label '.repeat(40),
          },
        ],
        extensions: [],
      };
    };

    const renderRightRootX = async (labelsVisible) => {
      const updateLayers = vi.fn();

      useAppStore.setState({
        treeList: [{ side: 'left' }, { side: 'right' }],
        viewsConnected: false,
        leftTreeOffsetX: 0,
        leftTreeOffsetY: 0,
        rightTreeOffsetX: 0,
        rightTreeOffsetY: 0,
        labelsVisible,
      });

      const renderer = new ComparisonModeRenderer({
        calculateLayout: (tree) => ({ side: tree.side, width: 100, height: 100 }),
        _getConsistentRadii: () => ({ extensionRadius: 10, labelRadius: 20 }),
        dataConverter: {
          convertTreeToLayerData: (layout) => makeLayerData(layout.side),
        },
        deckContext: {
          getCanvasDimensions: () => ({ width: 800, height: 600 }),
        },
        viewportManager: {
          getRightTreeOffset: () => ({ x: 0, y: 0 }),
          focusOnTree: vi.fn(),
        },
        _updateLayersEfficiently: updateLayers,
      });

      await renderer.renderStatic(0, 1);
      const combinedData = updateLayers.mock.calls[0][0];
      return combinedData.nodes.find((node) => node.id === 'right-root').position[0];
    };

    const visibleRightRootX = await renderRightRootX(true);
    const hiddenRightRootX = await renderRightRootX(false);

    expect(hiddenRightRootX).toBe(visibleRightRootX);
  });

  it('uses the rendered animated tree index for comparison connectors', async () => {
    const leftData = {
      nodes: [
        {
          id: 'node-0',
          position: [0, 0, 0],
          renderPosition: [0, 0, 0.1],
          split_indices: [0],
          isLeaf: true,
          name: 'A',
        },
      ],
      links: [],
      labels: [],
      extensions: [],
    };
    const rightData = {
      nodes: [
        {
          id: 'node-0',
          position: [100, 0, 0],
          renderPosition: [100, 0, 0.1],
          split_indices: [0],
          isLeaf: true,
          name: 'A',
        },
      ],
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
      nodes: [
        {
          id: 'right-node',
          position: [100, 0, 0],
          renderPosition: [100, 0, 0.1],
          split_indices: [0],
          isLeaf: true,
          name: 'A',
        },
      ],
      links: [],
      labels: [],
      extensions: [],
    };
    const rightLayout = {
      layoutCacheKey: 'right-layout-cache-key',
      width: 100,
      height: 100,
    };
    const calculateLayout = vi.fn(() => rightLayout);
    const convertTreeToLayerData = vi.fn(() => rightData);

    useAppStore.setState({
      frameIndex: 0,
      viewsConnected: true,
      leftTreeOffsetX: 0,
      leftTreeOffsetY: 0,
      linkGeometryMode: 'radial-elbow',
      fontSize: '2.6em',
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
      nodes: [
        {
          id: `left-node-${x}`,
          position: [x, 0, 0],
          renderPosition: [x, 0, 0.1],
          split_indices: [0],
          isLeaf: true,
          name: 'A',
        },
      ],
      links: [],
      labels: [],
      extensions: [],
    });

    await renderer.renderAnimated(makeLeftData(0), { side: 'right' }, 1, { activeTreeIndex: 7 });
    await renderer.renderAnimated(makeLeftData(5), { side: 'right' }, 1, { activeTreeIndex: 7 });

    expect(calculateLayout).toHaveBeenCalledTimes(1);
    expect(convertTreeToLayerData).toHaveBeenCalledTimes(1);
    expect(renderer._buildConnectors.mock.calls[0][1]).toBe(
      renderer._buildConnectors.mock.calls[1][1]
    );
  });

  it('rebuilds static right-hand animated comparison data when the layout cache key changes', async () => {
    const rightData = {
      nodes: [
        {
          id: 'right-node',
          position: [100, 0, 0],
          renderPosition: [100, 0, 0.1],
          split_indices: [0],
          isLeaf: true,
          name: 'A',
        },
      ],
      links: [],
      labels: [],
      extensions: [],
    };
    const calculateLayout = vi.fn(() => ({
      layoutCacheKey: 'right-layout-cache-key',
      width: 100,
      height: 100,
    }));
    const convertTreeToLayerData = vi.fn(() => rightData);
    let layoutCacheKey = 'right-layout-cache-key-a';

    useAppStore.setState({
      frameIndex: 0,
      viewsConnected: true,
      leftTreeOffsetX: 0,
      leftTreeOffsetY: 0,
      linkGeometryMode: 'radial-elbow',
      fontSize: '2.6em',
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
      nodes: [
        {
          id: 'left-node',
          position: [0, 0, 0],
          renderPosition: [0, 0, 0.1],
          split_indices: [0],
          isLeaf: true,
          name: 'A',
        },
      ],
      links: [],
      labels: [],
      extensions: [],
    };

    await renderer.renderAnimated(leftData, { side: 'right' }, 1, { activeTreeIndex: 7 });
    layoutCacheKey = 'right-layout-cache-key-b';
    await renderer.renderAnimated(
      {
        nodes: [
          {
            id: 'left-node-2',
            position: [5, 0, 0],
            renderPosition: [5, 0, 0.1],
            split_indices: [0],
            isLeaf: true,
            name: 'A',
          },
        ],
        links: [],
        labels: [],
        extensions: [],
      },
      { side: 'right' },
      1,
      { activeTreeIndex: 7 }
    );

    expect(calculateLayout).toHaveBeenCalledTimes(2);
    expect(convertTreeToLayerData).toHaveBeenCalledTimes(2);
  });
});
