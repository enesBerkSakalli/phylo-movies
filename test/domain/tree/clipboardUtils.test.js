import { afterEach, describe, expect, it, vi } from 'vitest';
import { getClipboardOverlay } from '../../../src/treeVisualisation/utils/ClipboardUtils.js';
import { useAppStore } from '../../../src/state/phyloStore/store.js';

describe('ClipboardUtils', () => {
  const initialState = useAppStore.getState();

  afterEach(() => {
    useAppStore.setState(initialState, true);
  });

  it('returns offset fit data so the viewport can include the pinned tree overlay', () => {
    const pinnedTree = { id: 'pinned-tree' };
    const hydratedTree = { id: 'hydrated-pinned-tree' };
    const ensureTreeHydrated = vi.fn(() => hydratedTree);
    const sourcePath = new Float32Array([10, 10, 0, 20, 10, 0]);
    const layerData = {
      nodes: [{ id: 'pinned-node', position: [10, 10, 0], renderPosition: [10, 10, 0] }],
      links: [
        {
          id: 'pinned-link',
          sourcePosition: [10, 10, 0],
          targetPosition: [20, 10, 0],
          path: sourcePath,
        },
      ],
      labels: [],
      extensions: [],
    };

    useAppStore.setState({
      clipboardTreeIndex: 0,
      treeList: [pinnedTree],
      ensureTreeHydrated,
      timelineFrames: [{ frame_type: 'input_tree', frame_index: 0 }],
      clipboardOffsetX: 0,
      clipboardOffsetY: 0,
    });

    const controller = {
      calculateLayout: vi.fn((tree) => ({ tree, layoutTree: {}, width: 100, height: 100 })),
      _getConsistentRadii: () => ({ extensionRadius: 10, labelRadius: 20 }),
      dataConverter: {
        convertTreeToLayerData: vi.fn(() => layerData),
      },
      layerManager: {
        createClipboardLayers: vi.fn(() => [{ id: 'clipboard-tree-layer' }]),
      },
      _lastLayerData: {
        nodes: [{ id: 'main-node', position: [0, 0, 0], radius: 2 }],
        labels: [],
      },
    };

    const overlay = getClipboardOverlay(controller);

    expect(ensureTreeHydrated).toHaveBeenCalledWith(0);
    expect(controller.calculateLayout).toHaveBeenCalledWith(hydratedTree, { treeIndex: 0 });
    expect(overlay.fitKey).toBe('pinned:0');
    expect(overlay.fitData.nodes[0].position).toEqual([0, -54, 0]);
    expect(overlay.fitData.labels[0]).toMatchObject({
      text: 'Input tree 1',
      position: [0, -106, 0],
      treeSide: 'clipboard',
    });
    expect(Array.from(overlay.fitData.links[0].path)).toEqual([0, -54, 0, 10, -54, 0]);
    expect(layerData.nodes[0].position).toEqual([10, 10, 0]);
    expect(Array.from(sourcePath)).toEqual([10, 10, 0, 20, 10, 0]);
  });
});
