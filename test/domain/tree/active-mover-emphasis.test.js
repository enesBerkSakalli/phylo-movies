import { describe, expect, it } from 'vitest';
import { LayerStyles } from '../../../src/treeVisualisation/deckgl/layers/LayerStyles.js';
import { getExtensionWidth } from '../../../src/treeVisualisation/deckgl/layers/styles/extensionStyles.js';
import { getLabelSize } from '../../../src/treeVisualisation/deckgl/layers/styles/labels/labelStyles.js';
import { getLinkWidth } from '../../../src/treeVisualisation/deckgl/layers/styles/links/linkWidthStyles.js';
import { getLinkOutlineWidth } from '../../../src/treeVisualisation/deckgl/layers/styles/links/outline/linkOutlineStyles.js';
import { getNodeRadius } from '../../../src/treeVisualisation/deckgl/layers/styles/nodes/nodeRadiusStyles.js';

const helpers = {
  getBaseStrokeWidth: () => 2,
  nodeSize: 1,
};

function createActiveMoverColorManager(subtrees = [new Set([1])]) {
  return {
    activeMoverSubtrees: subtrees,
    isCompletedChangeEdge: () => false,
    isUpcomingChangeEdge: () => false,
    isPivotEdge: () => false,
    isNodeCompletedChangeEdge: () => false,
    isNodePivotEdge: () => false,
    isNodeSourceEdge: () => false,
    isNodeDestinationEdge: () => false,
    isLinkInActiveMoverSubtree: (link) =>
      subtrees.some((subtree) => link.split_indices?.every((index) => subtree.has(index))),
    isNodeInActiveMoverSubtree: (node) =>
      subtrees.some((subtree) => node.split_indices?.every((index) => subtree.has(index))),
    getNodeBaseColor: () => '#000000',
    getNodeColor: () => '#000000',
  };
}

function currentMoverCached() {
  return {
    colorManager: createActiveMoverColorManager([new Set([1])]),
    highlightedSubtreeData: [new Set([1])],
    subtreeHighlightsEnabled: true,
    subtreeHighlightScope: 'current',
    highlightColorMode: 'solid',
    densityScale: 1,
    taxaCount: 200,
    metricScale: 1,
  };
}

describe('active mover emphasis', () => {
  it('caches subtree highlight scope and taxa count for style helpers', () => {
    const layerStyles = new LayerStyles();
    const cached = layerStyles.getCachedState({
      leafNamesByIndex: new Array(200),
      subtreeHighlightScope: 'all',
      getColorManager: () => ({ highlightedSubtreeSets: [] }),
    });

    expect(cached.subtreeHighlightScope).toBe('all');
    expect(cached.taxaCount).toBe(200);

    layerStyles.destroy();
  });

  it('boosts tiny current mover outlines without boosting all-affected context', () => {
    const link = { split_indices: [1] };
    const current = currentMoverCached();
    const all = { ...current, subtreeHighlightScope: 'all' };

    const allScopeWidth = getLinkOutlineWidth(link, all, helpers);
    const currentScopeWidth = getLinkOutlineWidth(link, current, helpers);

    expect(allScopeWidth).toBeCloseTo(4.5);
    expect(currentScopeWidth).toBeGreaterThan(allScopeWidth);
  });

  it('adds only a modest inner-link width boost for tiny current movers', () => {
    const width = getLinkWidth({ split_indices: [1] }, currentMoverCached(), helpers);

    expect(width).toBeGreaterThan(2);
    expect(width).toBeLessThan(3);
  });

  it('boosts node radius for tiny current movers', () => {
    const node = { radius: 5, split_indices: [1] };
    const current = currentMoverCached();
    const all = { ...current, subtreeHighlightScope: 'all' };

    const allScopeRadius = getNodeRadius(node, 3, all, helpers);
    const currentScopeRadius = getNodeRadius(node, 3, current, helpers);

    expect(allScopeRadius).toBeCloseTo(8);
    expect(currentScopeRadius).toBeGreaterThan(allScopeRadius);
  });

  it('boosts extension width for tiny current movers', () => {
    const width = getExtensionWidth({ split_indices: [1] }, 2, currentMoverCached());

    expect(width).toBeGreaterThan(6);
  });

  it('modestly boosts label size for tiny current movers', () => {
    const size = getLabelSize({ split_indices: [1] }, '2em', currentMoverCached());

    expect(size).toBeGreaterThan(28.8);
    expect(size).toBeLessThan(34);
  });
});
