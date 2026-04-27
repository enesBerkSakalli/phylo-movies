import * as d3 from 'd3';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeckGLTreeLayerDataFactory } from '../../src/treeVisualisation/deckgl/DeckGLTreeLayerDataFactory.js';
import { TreeNodeInteractionHandler } from '../../src/treeVisualisation/interaction/TreeNodeInteractionHandler.js';
import { useAppStore } from '../../src/state/phyloStore/store.js';

function makeLayoutTree() {
  const root = d3.hierarchy({
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

  return root;
}

describe('deck.gl layer render context', () => {
  afterEach(() => {
    useAppStore.getState().reset();
    vi.restoreAllMocks();
  });

  it('adds tree context and split keys to layer data without mutating backend nodes', () => {
    const factory = new DeckGLTreeLayerDataFactory();
    const tree = makeLayoutTree();

    const layerData = factory.convertTreeToLayerData(tree, {
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

    expect(tree.data.treeIndex).toBeUndefined();
    expect(tree.children[0].data.treeSide).toBeUndefined();
  });

  it('skips invalid layout coordinates instead of rendering them at the origin', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const factory = new DeckGLTreeLayerDataFactory();
    const tree = makeLayoutTree();
    tree.children[0].x = undefined;

    const layerData = factory.convertTreeToLayerData(tree, {
      extensionRadius: 40,
      labelRadius: 50,
    });

    expect(layerData.nodes.some((node) => node.isLeaf && node.split_indices?.[0] === 0)).toBe(false);
    expect(layerData.nodes.every((node) => node.position[0] !== 0 || node.position[1] !== 0 || node.split_indices?.length > 1)).toBe(true);
    expect(warn).toHaveBeenCalled();
  });

  it('resolves node clicks from the picked layer tree index', () => {
    const treeA = { id: 'tree-a' };
    const treeB = { id: 'tree-b' };
    const pickedNode = { data: { split_indices: [1] } };
    const showNodeContextMenu = vi.fn();

    useAppStore.setState({
      treeList: [treeA, treeB],
      treeMetadata: [
        { tree_pair_key: null, step_in_pair: null, source_tree_global_index: null },
        { tree_pair_key: 'pair_0_1', step_in_pair: 1, source_tree_global_index: 0 },
      ],
      fullTreeIndices: [0],
      currentTreeIndex: 0,
      showNodeContextMenu,
    });

    const handler = new TreeNodeInteractionHandler({ calculateLayout: vi.fn() });
    handler.handleNodeClick(
      { object: { treeIndex: 1, originalNode: pickedNode }, x: 10, y: 20 },
      { center: { x: 12, y: 34 } },
      null
    );

    expect(showNodeContextMenu).toHaveBeenCalledWith(pickedNode, treeB, 12, 34);
  });
});
