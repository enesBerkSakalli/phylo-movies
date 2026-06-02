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

const tree = {
  name: 'all',
  length: 0,
  split_indices: [0, 1, 2],
  depth: 0,
  children: [
    {
      name: 'internal',
      length: 0.5,
      split_indices: [0, 1],
      depth: 1,
      children: [
        { name: 'A', length: 1, split_indices: [0], depth: 2, children: [] },
        { name: 'B', length: 2, split_indices: [1], depth: 2, children: [] },
      ],
    },
    { name: 'C', length: 3, split_indices: [2], depth: 1, children: [] },
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

  it('finds a subtree by exact split independent of index order', () => {
    const node = SubtreeExtractor.findNodeByExactSplit(tree, [1, 0]);

    expect(node).toBe(tree.children[0]);
    expect(SubtreeExtractor.findNodeByExactSplit(tree, [0, 2])).toBeNull();
  });

  it('creates compact topology snapshots with Newick and preserved child order', () => {
    const snapshot = SubtreeExtractor.createTopologySnapshot(tree, [0, 1]);

    expect(snapshot).toMatchObject({
      newick: '(A:1,B:2)internal:0.5;',
      leafCount: 2,
      nodeCount: 3,
      splitIndices: [0, 1],
    });
    expect(snapshot.root.children.map((child) => child.name)).toEqual(['A', 'B']);
  });
});
