import { describe, expect, it } from 'vitest';
import { getMovingSubtreeAtIndex } from '../../src/state/phyloStore/internal/changeTracking.helpers.js';
import { TreeColorManager } from '../../src/treeVisualisation/systems/TreeColorManager.js';

describe('moving subtree highlighting', () => {
  it('stores marked subtrees under the current ColorManager contract name', () => {
    const colorManager = new TreeColorManager();
    const oldMarkedSubtreeField = ['sharedMarked', 'JumpingSubtrees'].join('');

    expect(colorManager.markedSubtreeSets).toEqual([]);
    expect(Object.prototype.hasOwnProperty.call(colorManager, oldMarkedSubtreeField)).toBe(false);

    colorManager.updateMarkedSubtrees([[1, 2]]);

    expect(colorManager.markedSubtreeSets).toHaveLength(1);
    expect([...colorManager.markedSubtreeSets[0]]).toEqual([1, 2]);
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
    colorManager.updateCurrentMovingSubtree(movingSubtrees);

    expect(colorManager.isLinkMovingSubtree({ split_indices: [1] })).toBe(true);
    expect(colorManager.isLinkMovingSubtree({ split_indices: [2] })).toBe(true);
    expect(colorManager.isLinkMovingSubtree({ split_indices: [1, 2] })).toBe(false);
  });
});
