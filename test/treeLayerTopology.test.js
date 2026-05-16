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
    markedSubtreeSets: [new Set([3])],
    hasPivotEdges: () => true,
    hasUpcomingChangeEdges: () => false,
    hasCompletedChangeEdges: () => false,
    isNodeHistorySubtree: (datum) => isSplit(datum, 2),
    isLinkHistorySubtree: (datum) => isSplit(datum, 2),
    isNodeMovingSubtree: (datum) => isSplit(datum, 3),
    isNodeInMarkedSubtreeFast: (datum) => isSplit(datum, 3),
    isLinkInMarkedSubtreeFast: (datum) => isSplit(datum, 3)
  };
}

describe('tree deck.gl layer topology', () => {
  it('orders semantic tree buckets from base through history to marked before labels', () => {
    const cached = {
      colorManager: makeColorManager(),
      markedSubtreeData: [new Set([3])],
      markedSubtreesEnabled: true
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
});
