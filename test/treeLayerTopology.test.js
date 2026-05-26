// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createTreeLayerSet } from '../src/treeVisualisation/deckgl/layers/factory/LayerSetFactory.js';
import { DeckGLContext } from '../src/treeVisualisation/deckgl/context/DeckGLContext.js';

function makeLayerStyles(cached) {
  return {
    getCachedState: () => cached,
    getLinkOutlineColor: () => [0, 0, 0, 0],
    getLinkOutlineWidth: () => 1,
    getLinkOutlineDashArray: () => null,
    getLinkColor: () => [0, 0, 0, 255],
    getLinkWidth: () => 1,
    getLinkDashArray: () => null,
    getExtensionColor: () => [0, 0, 0, 255],
    getExtensionWidth: () => 1,
    getNodeRadius: () => 3,
    getNodeColor: () => [0, 0, 0, 255],
    getNodeBorderColor: () => [0, 0, 0, 255],
    getNodeLineWidth: () => 1,
    getLabelSize: () => 12,
    getLabelColor: () => [0, 0, 0, 255]
  };
}

function makeColorManager() {
  const isSplit = (datum, value) => Array.isArray(datum?.split_indices) && datum.split_indices[0] === value;
  return {
    highlightedSubtreeSets: [new Set([3])],
    hasPivotEdges: () => true,
    hasUpcomingChangeEdges: () => false,
    hasCompletedChangeEdges: () => false,
    isNodeHistorySubtree: (datum) => isSplit(datum, 2),
    isLinkHistorySubtree: (datum) => isSplit(datum, 2),
    isNodeInActiveMoverSubtree: (datum) => isSplit(datum, 3),
    isNodeInHighlightedSubtreeFast: (datum) => isSplit(datum, 3),
    isLinkInHighlightedSubtreeFast: (datum) => isSplit(datum, 3)
  };
}

describe('tree deck.gl layer topology', () => {
  it('orders semantic tree buckets from base through history to marked before labels', () => {
    const cached = {
      colorManager: makeColorManager(),
      highlightedSubtreeData: [new Set([3])],
      subtreeHighlightsEnabled: true
    };
    const layerStyles = makeLayerStyles(cached);
    const data = {
      connectors: [{ path: new Float32Array([0, 0, 0, 1, 1, 0]) }],
      links: [1, 2, 3].map((split) => ({ split_indices: [split], path: new Float32Array([0, 0, 0, split, split, 0]) })),
      extensions: [1, 2, 3].map((split) => ({ split_indices: [split], path: new Float32Array([0, 0, 0, split, split, 0]) })),
      nodes: [1, 2, 3].map((split) => ({ split_indices: [split], position: [split, split, 0], renderPosition: [split, split, 0] })),
      labels: [1, 2, 3].map((split) => ({ split_indices: [split], position: [split, split, 0], text: `n${split}` }))
    };

    const layers = createTreeLayerSet({
      data,
      state: { labelsVisible: true, leafNamesByIndex: [] },
      layerStyles,
      skipEmpty: true
    });

    expect(layers.map((layer) => layer.id)).toEqual([
      'phylo-connectors',
      'phylo-link-outlines-base',
      'phylo-link-outlines-history',
      'phylo-link-outlines-marked',
      'phylo-links-base',
      'phylo-links-history',
      'phylo-links-marked',
      'phylo-extensions-base',
      'phylo-extensions-history',
      'phylo-extensions-moving-marked',
      'phylo-nodes-base',
      'phylo-nodes-history',
      'phylo-nodes-marked',
      'phylo-labels-base',
      'phylo-labels-history',
      'phylo-labels-marked'
    ]);
  });

  it('keeps every visible taxon label in deck.gl label layers', () => {
    const labelCount = 160;
    const layerStyles = makeLayerStyles({ colorManager: null });
    const data = {
      connectors: [],
      links: [],
      extensions: [],
      nodes: [],
      labels: Array.from({ length: labelCount }, (_value, split) => ({
        split_indices: [split],
        position: [split, split, 0],
        text: `n${split}`
      }))
    };

    const layers = createTreeLayerSet({
      data,
      state: { labelsVisible: true, leafNamesByIndex: [] },
      layerStyles,
      skipEmpty: true
    });

    const labelLayers = layers.filter((layer) => layer.id.startsWith('phylo-labels-'));
    const renderedLabelCount = labelLayers.reduce((total, layer) => (
      total + layer.props.data.length
    ), 0);

    expect(renderedLabelCount).toBe(labelCount);
    for (const layer of labelLayers) {
      expect(layer.props.collisionEnabled).toBeUndefined();
      expect(layer.props.getCollisionPriority).toBeUndefined();
    }
  });

  it('routes clicks from semantic node layers through the node picking handler', () => {
    const context = new DeckGLContext(document.createElement('div'));
    const onNodeClick = vi.fn();
    const event = { stopPropagation: vi.fn(), preventDefault: vi.fn() };
    context.onNodeClick(onNodeClick);

    const handled = context._handleClick({
      layer: { id: 'phylo-nodes-marked' },
      object: { split_indices: [3] }
    }, event);

    expect(handled).toBe(true);
    expect(onNodeClick).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('adds support labels on internal branches when enabled', () => {
    const layerStyles = makeLayerStyles({ colorManager: makeColorManager() });
    const data = {
      connectors: [],
      links: [
        {
          id: 'link-internal',
          split_indices: [1, 2],
          sourcePosition: [0, 0, 0],
          targetPosition: [2, 0, 0],
          path: new Float32Array([0, 0, 0, 2, 0, 0]),
          isLeaf: false,
          annotations: {
            fields: {
              'support.bootstrap.value': {
                path: ['support', 'bootstrap', 'value'],
                label: 'Bootstrap',
                value: 95,
                value_type: 'integer',
                role: 'branch_support',
                unit: 'percent',
                analysis: { type: 'tree_inference', method: 'bootstrap' }
              }
            }
          }
        },
        {
          id: 'link-leaf',
          split_indices: [1],
          sourcePosition: [2, 0, 0],
          targetPosition: [3, 0, 0],
          path: new Float32Array([2, 0, 0, 3, 0, 0]),
          isLeaf: true,
          annotations: {
            fields: {
              'support.bootstrap.value': {
                path: ['support', 'bootstrap', 'value'],
                label: 'Bootstrap',
                value: 100,
                value_type: 'integer',
                role: 'branch_support',
                unit: 'percent',
                analysis: { type: 'tree_inference', method: 'bootstrap' }
              }
            }
          }
        }
      ],
      extensions: [],
      nodes: [],
      labels: []
    };

    const layers = createTreeLayerSet({
      data,
      state: {
        branchAnnotationLabelKey: 'support.bootstrap.value',
        labelsVisible: true,
        leafNamesByIndex: [],
        fontSize: '1.8em'
      },
      layerStyles,
      skipEmpty: true
    });

    const supportLayer = layers.find((layer) => layer.id === 'phylo-support-labels');

    expect(supportLayer).toBeTruthy();
    expect(supportLayer.props.data).toHaveLength(1);
    expect(supportLayer.props.getText(supportLayer.props.data[0])).toBe('95');
    expect(supportLayer.props.getPosition(supportLayer.props.data[0])).toEqual([1.64, 0, 0.18]);
    expect(supportLayer.props.getColor).toEqual([17, 24, 39, 235]);
    expect(supportLayer.props.outlineColor).toEqual([255, 255, 255, 225]);
  });
});
