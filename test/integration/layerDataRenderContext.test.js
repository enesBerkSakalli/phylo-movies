import { hierarchy } from 'd3-hierarchy';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeckGLTreeLayerDataFactory } from '../../src/treeVisualisation/deckgl/DeckGLTreeLayerDataFactory.js';
import { TreeNodeInteractionHandler } from '../../src/treeVisualisation/interaction/TreeNodeInteractionHandler.js';
import { useAppStore } from '../../src/state/phyloStore/store.js';
import { createLayoutResult } from '../../src/treeVisualisation/layout/LayoutResultAdapter.js';
import { assignLayoutNodeIds } from '../../src/treeVisualisation/layout/LayoutBaseUtils.js';

function makeLayoutTree() {
  const root = hierarchy({
    name: '',
    length: 0,
    split_indices: [0, 1],
    children: [
      { name: 'taxon-a', length: 1, split_indices: [0], children: [] },
      { name: 'taxon-b', length: 1, split_indices: [1], children: [] },
    ],
  });

  root.each((node, index) => {
    node.x = index * 10;
    node.y = index * 5;
    node.angle = index;
    node.rotatedAngle = index;
    node.radius = index * 10;
  });
  assignLayoutNodeIds(root);

  return createLayoutResult(root, {
    max_radius: 20,
    width: 100,
    height: 100,
    margin: 0,
    scale: 1,
  });
}

describe('deck.gl layer render context', () => {
  afterEach(() => {
    useAppStore.getState().reset();
    vi.restoreAllMocks();
  });

  it('adds tree context and split keys to layer data without mutating backend nodes', () => {
    const factory = new DeckGLTreeLayerDataFactory();
    const layout = makeLayoutTree();

    const layerData = factory.convertTreeToLayerData(layout, {
      extensionRadius: 40,
      labelRadius: 50,
      treeIndex: 7,
      treeSide: 'left',
      renderMode: 'comparison',
    });

    for (const element of [
      ...layerData.nodes,
      ...layerData.links,
      ...layerData.labels,
      ...layerData.extensions,
    ]) {
      expect(element.treeIndex).toBe(7);
      expect(element.treeSide).toBe('left');
      expect(element.renderMode).toBe('comparison');
      expect(element.splitKey).toEqual(expect.any(String));
    }

    expect(layout.layoutTree).not.toHaveProperty('treeIndex');
    expect(layout.layoutTree.children[0]).not.toHaveProperty('treeSide');
  });

  it('places extension targets on the extension radius and labels on the label radius', () => {
    const factory = new DeckGLTreeLayerDataFactory();
    const layout = makeLayoutTree();

    const layerData = factory.convertTreeToLayerData(layout, {
      extensionRadius: 40,
      labelRadius: 50,
    });

    expect(layerData.labels[0].polarPosition).toBe(50);
    expect(layerData.extensions[0].polarData.target.radius).toBe(40);
  });

  it('passes straight link geometry mode through layer data conversion', () => {
    const factory = new DeckGLTreeLayerDataFactory();
    const layout = makeLayoutTree();

    const layerData = factory.convertTreeToLayerData(layout, {
      linkGeometryMode: 'straight',
    });

    expect(layerData.links[0].path).toHaveLength(6);
  });

  it('skips invalid layout coordinates instead of rendering them at the origin', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const factory = new DeckGLTreeLayerDataFactory();
    const layout = makeLayoutTree();
    layout.nodes.find((node) => node.name === 'taxon-a').x = undefined;

    const layerData = factory.convertTreeToLayerData(layout, {
      extensionRadius: 40,
      labelRadius: 50,
    });

    expect(layerData.nodes.some((node) => node.isLeaf && node.split_indices?.[0] === 0)).toBe(
      false
    );
    expect(
      layerData.nodes.every(
        (node) => node.position[0] !== 0 || node.position[1] !== 0 || node.split_indices?.length > 1
      )
    ).toBe(true);
    expect(warn).toHaveBeenCalled();
  });

  it('resolves node clicks from normalized split identity and picked layer tree index', () => {
    const treeA = { id: 'tree-a' };
    const treeB = { id: 'tree-b' };
    const showNodeContextMenu = vi.fn();

    useAppStore.setState({
      treeList: [treeA, treeB],
      timelineFrames: [
        { frame_index: 0, frame_type: 'input_tree', pair_id: null },
        { frame_index: 1, frame_type: 'interpolation_frame', pair_id: 'pair_0_1' },
      ],
      frameIndex: 0,
      showNodeContextMenu,
    });

    const layout = makeLayoutTree();
    const handler = new TreeNodeInteractionHandler({
      calculateLayout: vi.fn(() => layout),
    });
    handler.handleNodeClick(
      {
        object: { treeIndex: 1, treeSide: 'right', split_indices: [1], position: [999, 999, 0] },
        x: 10,
        y: 20,
      },
      { center: { x: 12, y: 34 } },
      null
    );

    const contextNode = showNodeContextMenu.mock.calls[0][0];
    expect(contextNode).toEqual(
      expect.objectContaining({
        name: 'taxon-b',
        split_indices: [1],
        depth: 1,
        treeIndex: 1,
        treeSide: 'right',
        splitKey: expect.any(String),
      })
    );
    expect(contextNode).not.toHaveProperty('data');
    expect(contextNode).not.toHaveProperty('parent');
    expect(contextNode?.descendants).toBeUndefined();
    expect(showNodeContextMenu).toHaveBeenCalledWith(expect.any(Object), { x: 12, y: 34 });
  });

  it('does not fall back to coordinate matching when normalized split identity is missing', () => {
    const tree = { id: 'tree' };
    const showNodeContextMenu = vi.fn();

    useAppStore.setState({
      treeList: [tree],
      frameIndex: 0,
      showNodeContextMenu,
    });

    const layout = makeLayoutTree();
    const handler = new TreeNodeInteractionHandler({
      calculateLayout: vi.fn(() => layout),
    });

    handler.handleNodeClick(
      { object: { position: [10, 5, 0] }, x: 10, y: 20 },
      { center: { x: 12, y: 34 } },
      null
    );

    expect(showNodeContextMenu).toHaveBeenCalledWith(null, { x: 12, y: 34 });
  });
});
