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
      nodes: [{ id: 'node-0', position: [0, 0, 0], split_indices: [0], isLeaf: true, name: 'A' }],
      links: [],
      labels: [],
      extensions: [],
    };
    const rightData = {
      nodes: [{ id: 'node-0', position: [100, 0, 0], split_indices: [0], isLeaf: true, name: 'A' }],
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
        getViewOffset: () => ({ x: 0, y: 0 }),
        focusOnTree,
        updateScreenPositions: vi.fn(),
      },
      _updateLayersEfficiently: vi.fn(),
    });
    renderer._buildConnectors = vi.fn(() => [connector]);

    await renderer.renderStatic(0, 1);

    expect(focusOnTree).toHaveBeenCalledOnce();
    expect(focusOnTree.mock.calls[0][2].links).toContain(connector);
  });
});
