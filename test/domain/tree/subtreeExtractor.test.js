import { describe, expect, it } from 'vitest';
import { SubtreeExtractor } from '../../../src/domain/tree/subtreeExtractor.js';

const subtree = {
  name: 'root',
  length: 0.1,
  split_indices: [0, 1],
  depth: 2,
  path: ['all', 'root'],
  children: [
    { name: 'A', length: 1, split_indices: [0], depth: 3, children: [] },
    { name: 'B', length: 2, split_indices: [1], depth: 3, children: [] },
  ],
};

describe('SubtreeExtractor normalized contract', () => {
  it('extracts stats and Newick from plain normalized tree nodes', () => {
    expect(SubtreeExtractor.nodeToNewick(subtree)).toBe('(A:1,B:2)root:0.1');
    expect(SubtreeExtractor.createBreadcrumb(subtree)).toBe('all > root');
    expect(SubtreeExtractor.getSubtreeStats(subtree)).toEqual({
      totalNodes: 3,
      leafCount: 2,
      internalNodes: 1,
      maxDepth: 3,
      rootName: 'root',
    });
  });

  it('rejects legacy D3 hierarchy nodes instead of supporting mixed contracts', () => {
    const d3LikeNode = {
      data: { name: 'legacy', split_indices: [0] },
      descendants: () => [],
      leaves: () => [],
    };

    expect(() => SubtreeExtractor.getSubtreeStats(d3LikeNode)).toThrow(
      /normalized plain tree node/
    );
  });
});
