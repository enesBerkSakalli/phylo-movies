import { describe, expect, it } from 'vitest';
import { resolveTreeElementHighlight } from '../../src/treeVisualisation/deckgl/layers/styles/highlightResolver.js';
import * as linkUtils from '../../src/treeVisualisation/deckgl/layers/styles/links/linkUtils.js';
import * as nodeUtils from '../../src/treeVisualisation/deckgl/layers/styles/nodes/nodeUtils.js';

function makeCached(overrides = {}) {
  return {
    subtreeHighlightsEnabled: true,
    highlightedSubtreeData: [],
    upcomingChangesEnabled: false,
    colorManager: {
      isPivotEdge: () => false,
      isCompletedChangeEdge: () => false,
      isUpcomingChangeEdge: () => false,
      isLinkInHighlightedSubtreeFast: () => false,
      isNodePivotEdge: () => false,
      isNodeCompletedChangeEdge: () => false,
      isNodeUpcomingChangeEdge: () => false,
      isNodeInHighlightedSubtreeFast: () => false,
      isNodeSourceEdge: () => false,
      isNodeDestinationEdge: () => false,
      isLinkInActiveMoverSubtree: () => false,
      isNodeInActiveMoverSubtree: () => false,
      ...overrides.colorManager,
    },
    ...overrides,
  };
}

describe('resolveTreeElementHighlight', () => {
  it('keeps render highlight classification off legacy helper exports', () => {
    expect(linkUtils).not.toHaveProperty('shouldHighlightLink');
    expect(linkUtils).not.toHaveProperty('getHistoryOutlineStyle');
    expect(nodeUtils).not.toHaveProperty('shouldHighlightNode');
    expect(nodeUtils).not.toHaveProperty('isNodePivotEdge');
    expect(nodeUtils).not.toHaveProperty('isHistorySubtreeNode');
  });

  it('keeps attachment-only context out of default visual highlight roles', () => {
    const cached = makeCached({
      colorManager: {
        isNodeSourceEdge: () => true,
      },
    });

    const result = resolveTreeElementHighlight({ split_indices: [1] }, cached, 'node');

    expect(result.role).toBe('base');
    expect(result.context.sourceAttachment).toBe(true);
  });

  it('keeps attachment-only link context out of default visual highlight roles', () => {
    const cached = makeCached({
      colorManager: {
        isNodeDestinationEdge: () => true,
      },
    });

    const result = resolveTreeElementHighlight({ split_indices: [2] }, cached, 'link');

    expect(result.role).toBe('base');
    expect(result.context.destinationAttachment).toBe(true);
  });

  it('distinguishes the current active mover from broader subtree highlight context', () => {
    const genericSubtree = resolveTreeElementHighlight(
      { split_indices: [1] },
      makeCached({ highlightedSubtreeData: [new Set([1])] }),
      'link'
    );
    const activeMover = resolveTreeElementHighlight(
      { split_indices: [1] },
      makeCached({
        highlightedSubtreeData: [new Set([1])],
        colorManager: { isLinkInActiveMoverSubtree: () => true },
      }),
      'link'
    );

    expect(genericSubtree.role).toBe('subtreeHighlight');
    expect(activeMover.role).toBe('activeMover');
  });

  it('resolves default link precedence from lifecycle to active mover to pivot edge', () => {
    const activeMover = resolveTreeElementHighlight(
      { split_indices: [1] },
      makeCached({ colorManager: { isLinkInActiveMoverSubtree: () => true } }),
      'link'
    );
    const pivot = resolveTreeElementHighlight(
      { split_indices: [2] },
      makeCached({ colorManager: { isPivotEdge: () => true } }),
      'link'
    );
    const lifecycle = resolveTreeElementHighlight(
      { split_indices: [3], lifecycle: 'entering' },
      makeCached({
        highlightedSubtreeData: [new Set([3])],
        colorManager: { isPivotEdge: () => true },
      }),
      'link'
    );

    expect(activeMover.role).toBe('activeMover');
    expect(pivot.role).toBe('pivotEdge');
    expect(lifecycle.role).toBe('lifecycle');
    expect(lifecycle.lifecycleKind).toBe('expanding');
  });

  it('keeps pivot edge precedence over broader subtree context', () => {
    const result = resolveTreeElementHighlight(
      { split_indices: [2] },
      makeCached({
        highlightedSubtreeData: [new Set([2])],
        colorManager: { isPivotEdge: () => true },
      }),
      'link'
    );

    expect(result.role).toBe('pivotEdge');
  });
});
