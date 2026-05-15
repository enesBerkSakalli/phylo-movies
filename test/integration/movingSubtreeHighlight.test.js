import { describe, expect, it } from 'vitest';
import { getMovingSubtreeAtIndex } from '../../src/state/phyloStore/internal/changeTracking.helpers.js';
import { TreeColorManager } from '../../src/treeVisualisation/systems/TreeColorManager.js';

describe('moving subtree highlighting', () => {
  it('does not merge simultaneous moved subtrees into a larger highlighted clade', () => {
    const state = {
      subtreeTracking: [
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
