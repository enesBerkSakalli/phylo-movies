import { describe, expect, it } from 'vitest';
import { getMovingSubtreeAtIndex } from '../../src/state/phyloStore/internal/changeTracking.helpers.js';
import { TreeColorManager } from '../../src/treeVisualisation/systems/TreeColorManager.js';

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
      subtreeHighlightTracking: [
        [[1], [2]],
      ],
    };

    const movingSubtrees = getMovingSubtreeAtIndex(state, 0);
    const colorManager = new TreeColorManager();
    colorManager.updateActiveMoverSubtrees(movingSubtrees);

    expect(colorManager.isLinkInActiveMoverSubtree({ split_indices: [1] })).toBe(true);
    expect(colorManager.isLinkInActiveMoverSubtree({ split_indices: [2] })).toBe(true);
    expect(colorManager.isLinkInActiveMoverSubtree({ split_indices: [1, 2] })).toBe(false);
  });
});
