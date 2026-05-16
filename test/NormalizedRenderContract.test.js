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
import { toColorManagerNode } from '../src/treeVisualisation/deckgl/layers/styles/nodes/nodeUtils.js';
import { getExtensionsLayerProps } from '../src/treeVisualisation/deckgl/layers/factory/extensions/ExtensionLayers.js';
import { isLabelSource } from '../src/treeVisualisation/deckgl/layers/styles/labels/labelUtils.js';
import { NodeDataBuilder } from '../src/treeVisualisation/deckgl/builders/data/nodes/NodeDataBuilder.js';
import { LinkDataBuilder } from '../src/treeVisualisation/deckgl/builders/data/links/LinkDataBuilder.js';
import { LabelDataBuilder } from '../src/treeVisualisation/deckgl/builders/data/labels/LabelDataBuilder.js';
import { ExtensionDataBuilder } from '../src/treeVisualisation/deckgl/builders/data/extensions/ExtensionDataBuilder.js';
import { LAYER_CONFIGS } from '../src/treeVisualisation/deckgl/layers/config/layerConfigs.js';
import { createLayoutResult } from '../src/treeVisualisation/layout/LayoutResultAdapter.js';

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

  it('passes normalized node data through as the ColorManager input', () => {
    const normalized = {
      split_indices: [0, 1],
      isLeaf: false,
    };

    expect(toColorManagerNode(normalized)).toBe(normalized);
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

  it('passes normalized label data to highlight checks', () => {
    const label = {
      split_indices: [0],
      name: 'Taxon_A',
      isLeaf: true,
    };
    const cached = {
      colorManager: {
        isNodeMovingSubtree: vi.fn(() => false),
        isNodeSourceEdge: vi.fn((datum) => datum === label),
      },
    };

    expect(isLabelSource(cached, label)).toBe(true);
    expect(cached.colorManager.isNodeSourceEdge).toHaveBeenCalledWith(label);
  });

  it('configures tree path layers for flat open paths', () => {
    expect(LAYER_CONFIGS.linkOutlines.defaultProps._pathType).toBe('open');
    expect(LAYER_CONFIGS.links.defaultProps._pathType).toBe('open');
    expect(LAYER_CONFIGS.extensions.defaultProps._pathType).toBe('open');
    expect(LAYER_CONFIGS.connectors.defaultProps._pathType).toBe('open');
  });

  it('does not enable picking on comparison connector lines', () => {
    expect(LAYER_CONFIGS.connectors.defaultProps.pickable).toBe(false);
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

    const layout = createLayoutResult(root, { max_radius: 1, width: 100, height: 100, margin: 0, scale: 1 });
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
    });
    expect(links[0]).toMatchObject({
      split_indices: [0],
      name: 'Taxon_A',
      isLeaf: true,
    });
    expect(links[0].path).toBeInstanceOf(Float32Array);
    expect(links[0].path.length % 3).toBe(0);
    expect(labels[0]).toMatchObject({
      split_indices: [0],
      name: 'Taxon_A',
      isLeaf: true,
    });
    expect(extensions[0]).toMatchObject({
      split_indices: [0],
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
      expect(source).not.toMatch(/\b(name|text|targetName|angle|child_split_indices):\s*(node|leaf|link)\.[^,\n]*\|\|/);
      expect(source).not.toMatch(/const\s+angleRad\s*=\s*leaf\.angle\s*\|\|/);
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
