import { describe, expect, it } from 'vitest';
import {
  getMovingSubtreeAtIndex,
  toSubtreeSets,
} from '../../src/state/phyloStore/internal/changeTracking.helpers.js';
import { colorToRgb } from '../../src/services/ui/colorUtils.js';
import { SYSTEM_TREE_COLORS } from '../../src/constants/TreeColors.js';
import { TreeColorManager } from '../../src/treeVisualisation/systems/TreeColorManager.js';
import { getLinkColor } from '../../src/treeVisualisation/deckgl/layers/styles/links/inner/linkInnerStyles.js';

describe('moving subtree highlighting', () => {
  it('stores highlighted subtrees under the current ColorManager contract name', () => {
    const colorManager = new TreeColorManager();
    const oldMarkedSubtreeField = ['sharedMarked', 'JumpingSubtrees'].join('');

    expect(colorManager.highlightedSubtreeSets).toEqual([]);
    expect(Object.prototype.hasOwnProperty.call(colorManager, oldMarkedSubtreeField)).toBe(false);

    colorManager.updateHighlightedSubtrees([[1, 2]]);

    expect(colorManager.highlightedSubtreeSets).toHaveLength(1);
    expect([...colorManager.highlightedSubtreeSets[0]]).toEqual([1, 2]);
    expect(Object.prototype.hasOwnProperty.call(colorManager, oldMarkedSubtreeField)).toBe(false);
  });

  it('does not merge simultaneous moved subtrees into a larger highlighted clade', () => {
    const state = {
      subtreeHighlightTracking: [[[1], [2]]],
    };

    const movingSubtrees = getMovingSubtreeAtIndex(state, 0);
    const colorManager = new TreeColorManager();
    colorManager.updateActiveMoverSubtrees(movingSubtrees);

    expect(colorManager.isLinkInActiveMoverSubtree({ split_indices: [1] })).toBe(true);
    expect(colorManager.isLinkInActiveMoverSubtree({ split_indices: [2] })).toBe(true);
    expect(colorManager.isLinkInActiveMoverSubtree({ split_indices: [1, 2] })).toBe(false);
  });

  it('normalizes only explicit subtree groups for ColorManager input', () => {
    const existingSet = new Set([1, 2]);
    const sets = toSubtreeSets([existingSet, [3, 4], null, 'legacy']);

    expect(sets).toHaveLength(2);
    expect(sets[0]).toBe(existingSet);
    expect([...sets[1]]).toEqual([3, 4]);
  });

  it('keeps source and destination attachments as context, not primary link colors', () => {
    const colorManager = new TreeColorManager();
    colorManager.setMonophyleticColoring(false);
    colorManager.updateSourceEdgeLeaves([[1, 2]]);
    colorManager.updateDestinationEdgeLeaves([[3, 4]]);

    const sourceLink = { split_indices: [1, 2], opacity: 1 };
    const destinationLink = { split_indices: [3, 4], opacity: 1 };
    const helpers = { getBaseOpacity: () => 255 };
    const cached = {
      colorManager,
      dimmingEnabled: false,
      dimmingOpacity: 0.3,
      upcomingChangesEnabled: false,
      highlightedSubtreeData: [],
      subtreeDimmingEnabled: false,
      subtreeDimmingOpacity: 0.3,
    };

    expect(colorManager.isNodeSourceEdge(sourceLink)).toBe(true);
    expect(colorManager.isNodeDestinationEdge(destinationLink)).toBe(true);
    expect(Array.from(getLinkColor(sourceLink, cached, helpers))).toEqual([
      ...colorToRgb(SYSTEM_TREE_COLORS.defaultColor),
      255,
    ]);
    expect(Array.from(getLinkColor(destinationLink, cached, helpers))).toEqual([
      ...colorToRgb(SYSTEM_TREE_COLORS.defaultColor),
      255,
    ]);
  });
});
