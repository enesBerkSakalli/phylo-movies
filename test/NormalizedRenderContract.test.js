import { hierarchy } from 'd3-hierarchy';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../src/state/phyloStore/store.js';
import {
  getBaseBranchColor,
  getBaseNodeColor,
} from '../src/treeVisualisation/systems/tree_color/monophyleticColoring.js';
import { getConnectorsLayerProps } from '../src/treeVisualisation/deckgl/layers/factory/connectors/ConnectorLayers.js';
import { getExtensionsLayerProps } from '../src/treeVisualisation/deckgl/layers/factory/extensions/ExtensionLayers.js';
import { NodeDataBuilder } from '../src/treeVisualisation/deckgl/builders/data/nodes/NodeDataBuilder.js';
import { LinkDataBuilder } from '../src/treeVisualisation/deckgl/builders/data/links/LinkDataBuilder.js';
import { LabelDataBuilder } from '../src/treeVisualisation/deckgl/builders/data/labels/LabelDataBuilder.js';
import { ExtensionDataBuilder } from '../src/treeVisualisation/deckgl/builders/data/extensions/ExtensionDataBuilder.js';
import { LAYER_CONFIGS } from '../src/treeVisualisation/deckgl/layers/config/layerConfigs.js';
import { createLayoutResult } from '../src/treeVisualisation/layout/LayoutResultAdapter.js';
import {
  assignLayoutNodeIds,
  calculateBranchLengthRadii,
} from '../src/treeVisualisation/layout/LayoutBaseUtils.js';
import { TidyTreeLayout } from '../src/treeVisualisation/layout/TidyTreeLayout.js';
import { RadialTreeLayout } from '../src/treeVisualisation/layout/RadialTreeLayout.js';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

describe('normalized render contract', () => {
  let initialState;

  beforeEach(() => {
    initialState = useAppStore.getState();
    useAppStore.setState({
      leafNamesByIndex: ['Taxon_A', 'Taxon_B', 'Taxon_C'],
      taxaGrouping: {
        mode: 'taxa',
        taxaColorMap: {
          Taxon_A: '#ff0000',
          Taxon_B: '#ff0000',
          Taxon_C: '#00ff00',
        },
      },
    });
  });

  afterEach(() => {
    useAppStore.setState(initialState, true);
  });

  it('colors normalized branches and nodes without hierarchy wrapper references', () => {
    const leafBranch = {
      split_indices: [0],
      name: 'Taxon_A',
      isLeaf: true,
    };
    const monophyleticBranch = {
      split_indices: [0, 1],
      isLeaf: false,
    };
    const mixedBranch = {
      split_indices: [0, 2],
      isLeaf: false,
    };

    expect(getBaseBranchColor(leafBranch, true)).toBe('#ff0000');
    expect(getBaseBranchColor(monophyleticBranch, true)).toBe('#ff0000');
    expect(getBaseBranchColor(mixedBranch, true)).not.toBe('#ff0000');
    expect(getBaseNodeColor(monophyleticBranch, true)).toBe('#ff0000');
  });

  it('passes normalized extension data to style accessors', () => {
    const extension = {
      id: 'ext-a',
      split_indices: [0],
      name: 'Taxon_A',
      isLeaf: true,
      path: new Float32Array([0, 0, 0, 1, 1, 0]),
    };
    const seen = [];
    const layerStyles = {
      getCachedState: () => ({}),
      getExtensionColor: vi.fn((datum) => {
        seen.push(datum);
        return [255, 0, 0, 255];
      }),
      getExtensionWidth: vi.fn((datum) => {
        seen.push(datum);
        return 2;
      }),
    };

    const props = getExtensionsLayerProps([extension], {}, layerStyles);
    props.getColor(extension);
    props.getWidth(extension);

    expect(seen).toEqual([extension, extension]);
  });

  it('configures tree path layers for flat open paths', () => {
    expect(LAYER_CONFIGS.linkOutlines.defaultProps._pathType).toBe('open');
    expect(LAYER_CONFIGS.links.defaultProps._pathType).toBe('open');
    expect(LAYER_CONFIGS.extensions.defaultProps._pathType).toBe('open');
    expect(LAYER_CONFIGS.connectors.defaultProps._pathType).toBe('open');
  });

  it('uses deck.gl screen-space floors for small rendered tree elements', () => {
    expect(LAYER_CONFIGS.links.defaultProps).toMatchObject({
      widthUnits: 'common',
      widthMinPixels: 1,
    });
    expect(LAYER_CONFIGS.links.defaultProps).not.toHaveProperty('widthMaxPixels');
    expect(LAYER_CONFIGS.links.defaultProps).not.toHaveProperty('billboard');
    expect(LAYER_CONFIGS.nodes.defaultProps).toMatchObject({
      radiusUnits: 'common',
      radiusMinPixels: 0.5,
      billboard: true,
    });
    expect(LAYER_CONFIGS.nodes.defaultProps).not.toHaveProperty('radiusMaxPixels');
    expect(LAYER_CONFIGS.nodes.defaultProps).not.toHaveProperty('lineWidthMinPixels');
    expect(LAYER_CONFIGS.nodes.defaultProps).not.toHaveProperty('lineWidthMaxPixels');
  });

  it('does not enable picking on comparison connector lines', () => {
    expect(LAYER_CONFIGS.connectors.defaultProps.pickable).toBe(false);
  });

  it('preserves connector data alpha in comparison connector layers', () => {
    const activeConnector = {
      path: new Float32Array([0, 0, 0, 1, 1, 0]),
      color: [255, 0, 0, 255],
      isCurrentlyMoving: true,
    };
    const passiveConnector = {
      path: new Float32Array([0, 0, 0, 1, -1, 0]),
      color: [0, 0, 255, 64],
      isCurrentlyMoving: false,
    };

    const props = getConnectorsLayerProps([activeConnector, passiveConnector], {
      linkConnectionOpacity: 0.1,
    });

    expect(props.getColor(activeConnector)).toEqual([255, 0, 0, 255]);
    expect(props.getColor(passiveConnector)).toEqual([0, 0, 255, 64]);
  });

  it('prepares render ids explicitly on layout nodes', () => {
    const tree = {
      name: 'root',
      split_indices: [0, 1],
      children: [
        { name: 'Taxon_A', split_indices: [0], children: [] },
        { name: 'Taxon_B', split_indices: [1], children: [] },
      ],
    };

    const tidyLayout = new TidyTreeLayout(tree);
    const radialLayout = new RadialTreeLayout(tree);

    expect(tidyLayout.root.id).toEqual(expect.stringMatching(/^node-/));
    expect(tidyLayout.root.children[0].id).toEqual(expect.stringMatching(/^node-/));
    expect(radialLayout.root.id).toEqual(expect.stringMatching(/^node-/));
    expect(radialLayout.root.children[0].id).toEqual(expect.stringMatching(/^node-/));
  });

  it('uses prepared layout node ids for radius preservation', () => {
    const root = hierarchy({
      name: 'root',
      length: 0,
      split_indices: [0, 1],
      children: [{ name: 'Taxon_A', length: 4, split_indices: [0], children: [] }],
    });
    assignLayoutNodeIds(root);
    const child = root.children[0];
    const preparedChildId = child.id;
    const layout = { preserveRadius: false, previousNodeRadii: new Map() };

    calculateBranchLengthRadii(layout, root, 0);
    child.data.split_indices = [999];
    layout.preserveRadius = true;
    layout.previousNodeRadii.set(preparedChildId, 42);
    calculateBranchLengthRadii(layout, root, 0);

    expect(child.radius).toBe(42);
  });

  it('copies prepared layout node ids during normalization', () => {
    const root = hierarchy({
      name: 'root',
      split_indices: [0, 1],
      children: [{ name: 'Taxon_A', split_indices: [0], children: [] }],
    });
    root.each((node) => {
      node.x = node.depth;
      node.y = node.depth + 1;
      node.radius = node.depth;
      node.angle = node.depth;
    });
    assignLayoutNodeIds(root);
    root.children[0].id = 'node-prepared-leaf';

    const layout = createLayoutResult(root, {
      max_radius: 1,
      width: 100,
      height: 100,
      margin: 0,
      scale: 1,
    });

    expect(layout.nodes.find((node) => node.name === 'Taxon_A')).toMatchObject({
      id: 'node-prepared-leaf',
      parentId: root.id,
    });
    expect(layout.links[0].targetId).toBe('node-prepared-leaf');
  });

  it('publishes metric and visual branch lengths in normalized layout data', () => {
    const root = hierarchy({
      name: 'root',
      length: 0,
      split_indices: [0, 1],
      children: [
        {
          name: 'Taxon_A',
          length: 0.0001,
          metricBranchLength: 0.0001,
          visualBranchLength: 5,
          split_indices: [0],
          children: [],
        },
      ],
    });
    root.each((node) => {
      node.x = node.depth;
      node.y = node.depth + 1;
      node.radius = node.depth === 0 ? 0 : 5;
      node.angle = node.depth;
    });
    assignLayoutNodeIds(root);

    const layout = createLayoutResult(root, {
      max_radius: 5,
      width: 100,
      height: 100,
      margin: 0,
      scale: 1,
    });
    const leafNode = layout.nodes.find((node) => node.name === 'Taxon_A');

    expect(leafNode).toMatchObject({
      length: 0.0001,
      metricBranchLength: 0.0001,
      visualBranchLength: 5,
      polarPosition: 5,
    });
    expect(layout.links[0]).toMatchObject({
      metricBranchLength: 0.0001,
      visualBranchLength: 5,
    });
    expect(layout.links[0].target).toMatchObject({
      metricBranchLength: 0.0001,
      visualBranchLength: 5,
    });
  });

  it('builders emit normalized metadata without legacy hierarchy references', () => {
    const root = hierarchy({
      name: 'root',
      split_indices: [0, 1],
      children: [
        { name: 'Taxon_A', split_indices: [0], children: [] },
        { name: 'Taxon_B', split_indices: [1], children: [] },
      ],
    });
    root.each((node) => {
      node.x = node.depth;
      node.y = node.depth + 1;
      node.radius = node.depth;
      node.angle = node.depth;
    });
    assignLayoutNodeIds(root);

    const layout = createLayoutResult(root, {
      max_radius: 1,
      width: 100,
      height: 100,
      margin: 0,
      scale: 1,
    });
    expect(layout.links[0]).not.toHaveProperty('id');

    const nodes = new NodeDataBuilder().convertNodes(layout.nodes, {
      canvasWidth: layout.width,
      canvasHeight: layout.height,
    });
    const links = new LinkDataBuilder().convertLinks(layout.links);
    const labels = new LabelDataBuilder().convertLabels(layout.leaves, 10);
    const extensions = new ExtensionDataBuilder().convertExtensions(layout.leaves, 10);

    const rootNode = nodes.find((node) => node.name === 'root');
    expect(rootNode).toMatchObject({
      split_indices: [0, 1],
      isLeaf: false,
      child_split_indices: [[0], [1]],
    });
    expect(nodes.find((node) => node.name === 'Taxon_A')).toMatchObject({
      parentId: rootNode.id,
      splitKey: expect.any(String),
    });
    expect(links[0]).toMatchObject({
      split_indices: [0],
      splitKey: expect.any(String),
      name: 'Taxon_A',
      isLeaf: true,
    });
    expect(links[0].path).toBeInstanceOf(Float32Array);
    expect(links[0].path.length % 3).toBe(0);
    expect(labels[0]).toMatchObject({
      split_indices: [0],
      splitKey: expect.any(String),
      name: 'Taxon_A',
      isLeaf: true,
    });
    expect(extensions[0]).toMatchObject({
      split_indices: [0],
      splitKey: expect.any(String),
      name: 'Taxon_A',
      isLeaf: true,
    });
    expect(extensions[0].path).toBeInstanceOf(Float32Array);
    expect(extensions[0].path.length).toBe(6);

    expect(nodes.find((node) => node.name === 'root')).not.toHaveProperty('originalNode');
    expect(nodes.find((node) => node.name === 'root')).not.toHaveProperty('data');
    expect(links[0]).not.toHaveProperty('source');
    expect(links[0]).not.toHaveProperty('target');
    expect(labels[0]).not.toHaveProperty('leaf');
    expect(labels[0]).not.toHaveProperty('data');
    expect(extensions[0]).not.toHaveProperty('leaf');
  });

  it('publishes branch-length metadata in DeckGL node and link data', () => {
    const root = hierarchy({
      name: 'root',
      length: 0,
      metricBranchLength: 0,
      visualBranchLength: 0,
      split_indices: [0, 1],
      children: [
        {
          name: 'Taxon_A',
          length: 0.0001,
          metricBranchLength: 0.0001,
          visualBranchLength: 5,
          split_indices: [0],
          children: [],
        },
      ],
    });
    root.each((node) => {
      node.x = node.depth;
      node.y = node.depth + 1;
      node.radius = node.depth === 0 ? 0 : 5;
      node.angle = node.depth;
    });
    assignLayoutNodeIds(root);

    const layout = createLayoutResult(root, {
      max_radius: 5,
      width: 600,
      height: 600,
      margin: 0,
      scale: 1,
    });
    const nodes = new NodeDataBuilder().convertNodes(layout.nodes, {
      canvasWidth: layout.width,
      canvasHeight: layout.height,
    });
    const links = new LinkDataBuilder().convertLinks(layout.links);

    expect(nodes.find((node) => node.name === 'Taxon_A')).toMatchObject({
      length: 0.0001,
      metricBranchLength: 0.0001,
      visualBranchLength: 5,
    });
    expect(links[0]).toMatchObject({
      length: 0.0001,
      metricBranchLength: 0.0001,
      visualBranchLength: 5,
    });
  });

  it('sizes internal node dots smaller than leaf dots for dense tree readability', () => {
    const root = hierarchy({
      name: 'root',
      split_indices: [0, 1],
      children: [{ name: 'Taxon_A', split_indices: [0], children: [] }],
    });
    root.each((node) => {
      node.x = node.depth;
      node.y = node.depth + 1;
      node.radius = node.depth;
      node.angle = node.depth;
    });
    assignLayoutNodeIds(root);

    const layout = createLayoutResult(root, {
      max_radius: 1,
      width: 600,
      height: 600,
      margin: 0,
      scale: 1,
    });
    const nodes = new NodeDataBuilder().convertNodes(layout.nodes, {
      canvasWidth: layout.width,
      canvasHeight: layout.height,
    });

    const internalNode = nodes.find((node) => node.name === 'root');
    const leafNode = nodes.find((node) => node.name === 'Taxon_A');

    expect(internalNode.dotSize).toBeLessThan(leafNode.dotSize);
    expect(internalNode.dotSize).toBeGreaterThanOrEqual(1);
  });

  it('builders reuse normalized layout ids instead of recalculating render ids', () => {
    const root = hierarchy({
      name: 'root',
      split_indices: [0, 1],
      children: [{ name: 'Taxon_A', split_indices: [0], children: [] }],
    });
    root.each((node) => {
      node.x = node.depth;
      node.y = node.depth + 1;
      node.radius = node.depth;
      node.angle = node.depth;
    });
    assignLayoutNodeIds(root);

    const layout = createLayoutResult(root, {
      max_radius: 1,
      width: 100,
      height: 100,
      margin: 0,
      scale: 1,
    });
    const leafNode = layout.nodes.find((node) => node.name === 'Taxon_A');
    leafNode.id = 'node-upstream-leaf';
    layout.links[0].targetId = 'node-upstream-leaf';

    const nodes = new NodeDataBuilder().convertNodes(layout.nodes, {
      canvasWidth: layout.width,
      canvasHeight: layout.height,
    });
    const links = new LinkDataBuilder().convertLinks(layout.links);

    expect(nodes.find((node) => node.name === 'Taxon_A')).toMatchObject({
      id: 'node-upstream-leaf',
      dotSize: expect.any(Number),
    });
    expect(links[0].targetId).toBe('node-upstream-leaf');
  });

  it('keeps data builders on normalized layout arrays', () => {
    const sourcePaths = [
      'src/treeVisualisation/deckgl/builders/data/nodes/NodeDataBuilder.js',
      'src/treeVisualisation/deckgl/builders/data/links/LinkDataBuilder.js',
      'src/treeVisualisation/deckgl/builders/data/labels/LabelDataBuilder.js',
      'src/treeVisualisation/deckgl/builders/data/extensions/ExtensionDataBuilder.js',
      'src/treeVisualisation/deckgl/builders/geometry/nodes/NodeGeometryBuilder.js',
    ];

    for (const sourcePath of sourcePaths) {
      const source = readFileSync(join(repoRoot, sourcePath), 'utf8');
      expect(source).not.toMatch(/Array\.isArray\((nodes|links|leaves)\)/);
      expect(source).not.toMatch(/const\s+layoutNodes\s*=/);
      expect(source).not.toMatch(/\b(node|leaf|link)\?\./);
      expect(source).not.toMatch(/nodeDotSizes\?\./);
      expect(source).not.toMatch(/nodeDotSizes\.get\([^)]*\)\s*\|\|/);
      expect(source).not.toMatch(
        /\b(name|text|targetName|angle|child_split_indices):\s*(node|leaf|link)\.[^,\n]*\|\|/
      );
      expect(source).not.toMatch(/const\s+angleRad\s*=\s*leaf\.angle\s*\|\|/);
      expect(source).not.toMatch(/get(Node|Link|Label|Extension)Key/);
    }
  });

  it('uses normalized layout dimensions as the node sizing source', () => {
    const factorySource = readFileSync(
      join(repoRoot, 'src/treeVisualisation/deckgl/DeckGLTreeLayerDataFactory.js'),
      'utf8'
    );
    const nodeGeometrySource = readFileSync(
      join(repoRoot, 'src/treeVisualisation/deckgl/builders/geometry/nodes/NodeGeometryBuilder.js'),
      'utf8'
    );

    expect(factorySource).toMatch(/canvasWidth:\s*layout\.width/);
    expect(factorySource).toMatch(/canvasHeight:\s*layout\.height/);
    expect(factorySource).not.toMatch(/canvasWidth\s*=\s*null/);
    expect(factorySource).not.toMatch(/canvasHeight\s*=\s*null/);
    expect(nodeGeometrySource).not.toMatch(/Number\.isFinite\(canvasWidth\)/);
    expect(nodeGeometrySource).not.toMatch(/Number\.isFinite\(canvasHeight\)/);
  });
});
