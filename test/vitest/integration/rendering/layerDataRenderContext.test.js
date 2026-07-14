import { hierarchy } from 'd3-hierarchy';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeckGLTreeLayerDataFactory } from '../../../../src/treeVisualisation/deckgl/DeckGLTreeLayerDataFactory.js';
import { TreeNodeInteractionHandler } from '../../../../src/treeVisualisation/interaction/TreeNodeInteractionHandler.js';
import { useAppStore } from '../../../../src/state/phyloStore/store.js';
import { createLayoutResult } from '../../../../src/treeVisualisation/layout/LayoutResultAdapter.js';
import { assignLayoutNodeIds } from '../../../../src/treeVisualisation/layout/LayoutBaseUtils.js';
import { LAYOUT_PROJECTION_MODES } from '../../../../src/treeVisualisation/layout/hyperbolicProjection.js';

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

function makeWalrus3dLayoutTree() {
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
    const x = index * 10;
    const y = index * 5;
    const z = index * 8;
    const radius = Math.hypot(x, y, z);
    node.x = x;
    node.y = y;
    node.z = z;
    node.position = [x, y, z];
    node.angle = index;
    node.rotatedAngle = index;
    node.radius = radius;
    node.projectionMode = LAYOUT_PROJECTION_MODES.WALRUS_3D;
    node.h3Direction = radius > 0 ? [x / radius, y / radius, z / radius] : [0, 0, 1];
  });
  assignLayoutNodeIds(root);

  return createLayoutResult(root, {
    max_radius: 30,
    width: 100,
    height: 100,
    margin: 0,
    scale: 1,
    projectionMode: LAYOUT_PROJECTION_MODES.WALRUS_3D,
    is3dLayout: true,
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

  it('preserves Walrus 3D coordinates in nodes, links, labels, and extensions', () => {
    const factory = new DeckGLTreeLayerDataFactory();
    const layout = makeWalrus3dLayoutTree();

    const layerData = factory.convertTreeToLayerData(layout, {
      extensionRadius: 40,
      labelRadius: 50,
      linkGeometryMode: 'radial-elbow',
    });
    const renderedLeaf = layerData.nodes.find((node) => node.name === 'taxon-a');
    const renderedLink = layerData.links.find((link) => link.targetName === 'taxon-a');
    const renderedLabel = layerData.labels.find((label) => label.name === 'taxon-a');
    const renderedExtension = layerData.extensions.find(
      (extension) => extension.name === 'taxon-a'
    );

    expect(renderedLeaf.position[2]).toBeGreaterThan(0);
    expect(renderedLeaf.renderPosition[2]).toBeGreaterThan(renderedLeaf.position[2]);
    expect(renderedLink.targetPosition[2]).toBe(renderedLeaf.position[2]);
    expect(renderedLink.path[5]).toBe(renderedLeaf.position[2]);
    expect(renderedLabel.position[2]).toBeGreaterThan(renderedLeaf.position[2]);
    expect(renderedExtension.targetPosition[2]).toBeGreaterThan(renderedLeaf.position[2]);
  });

  it('skips invalid layout coordinates instead of rendering them at the origin', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const factory = new DeckGLTreeLayerDataFactory();
    const layout = makeLayoutTree();
    const invalidNode = layout.nodes.find((node) => node.name === 'taxon-a');
    invalidNode.x = undefined;
    invalidNode.position = [undefined, invalidNode.y, 0];

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
