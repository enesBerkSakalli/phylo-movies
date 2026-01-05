const { expect } = require('chai');
const { RadialTreeLayout } = require('../src/js/treeVisualisation/layout/RadialTreeLayout.js');

describe('RadialTreeLayout - indexLeafNodes', () => {
  let layout;

  beforeEach(() => {
    // Create a minimal layout instance with an empty root
    // We'll test indexLeafNodes directly on various tree structures
    const minimalRoot = { name: 'root' };
    layout = new RadialTreeLayout(minimalRoot);
  });

  describe('Single leaf tree', () => {
    it('should assign index 0 to a single leaf node', () => {
      const singleLeaf = { name: 'A' };

      const count = layout.indexLeafNodes(singleLeaf);

      expect(singleLeaf.index).to.equal(0);
      expect(count).to.equal(1);
    });
  });

  describe('Simple binary tree', () => {
    it('should index leaves left-to-right in children order', () => {
      const tree = {
        name: 'root',
        children: [
          { name: 'A' },
          { name: 'B' }
        ]
      };

      const count = layout.indexLeafNodes(tree);

      expect(tree.children[0].index).to.equal(0); // A
      expect(tree.children[1].index).to.equal(1); // B
      expect(count).to.equal(2);
    });

    it('should not assign index to internal nodes', () => {
      const tree = {
        name: 'root',
        children: [
          { name: 'A' },
          { name: 'B' }
        ]
      };

      layout.indexLeafNodes(tree);

      expect(tree.index).to.be.undefined;
    });
  });

  describe('Deeper tree structures', () => {
    it('should preserve left-to-right ordering in 3-level tree', () => {
      //       root
      //      /    \
      //    int1   int2
      //    / \    / \
      //   A   B  C   D
      const tree = {
        name: 'root',
        children: [
          {
            name: 'int1',
            children: [
              { name: 'A' },
              { name: 'B' }
            ]
          },
          {
            name: 'int2',
            children: [
              { name: 'C' },
              { name: 'D' }
            ]
          }
        ]
      };

      const count = layout.indexLeafNodes(tree);

      expect(tree.children[0].children[0].index).to.equal(0); // A
      expect(tree.children[0].children[1].index).to.equal(1); // B
      expect(tree.children[1].children[0].index).to.equal(2); // C
      expect(tree.children[1].children[1].index).to.equal(3); // D
      expect(count).to.equal(4);
    });

    it('should handle unbalanced trees correctly', () => {
      //       root
      //      /    \
      //     A     int1
      //           / \
      //          B   C
      const tree = {
        name: 'root',
        children: [
          { name: 'A' },
          {
            name: 'int1',
            children: [
              { name: 'B' },
              { name: 'C' }
            ]
          }
        ]
      };

      const count = layout.indexLeafNodes(tree);

      expect(tree.children[0].index).to.equal(0);             // A
      expect(tree.children[1].children[0].index).to.equal(1); // B
      expect(tree.children[1].children[1].index).to.equal(2); // C
      expect(count).to.equal(3);
    });

    it('should handle deeply nested single-child chains', () => {
      //  root -> int1 -> int2 -> A
      const tree = {
        name: 'root',
        children: [
          {
            name: 'int1',
            children: [
              {
                name: 'int2',
                children: [
                  { name: 'A' }
                ]
              }
            ]
          }
        ]
      };

      const count = layout.indexLeafNodes(tree);

      expect(tree.children[0].children[0].children[0].index).to.equal(0); // A
      expect(count).to.equal(1);
    });
  });

  describe('Many children (polytomy)', () => {
    it('should correctly index nodes with many children', () => {
      const tree = {
        name: 'root',
        children: [
          { name: 'A' },
          { name: 'B' },
          { name: 'C' },
          { name: 'D' },
          { name: 'E' }
        ]
      };

      const count = layout.indexLeafNodes(tree);

      expect(tree.children[0].index).to.equal(0); // A
      expect(tree.children[1].index).to.equal(1); // B
      expect(tree.children[2].index).to.equal(2); // C
      expect(tree.children[3].index).to.equal(3); // D
      expect(tree.children[4].index).to.equal(4); // E
      expect(count).to.equal(5);
    });
  });

  describe('Custom starting index', () => {
    it('should respect custom starting index', () => {
      const tree = {
        name: 'root',
        children: [
          { name: 'A' },
          { name: 'B' }
        ]
      };

      const count = layout.indexLeafNodes(tree, 5);

      expect(tree.children[0].index).to.equal(5); // A
      expect(tree.children[1].index).to.equal(6); // B
      expect(count).to.equal(7);
    });
  });

  describe('Order preservation (critical for animation stability)', () => {
    it('should maintain consistent ordering when called multiple times', () => {
      const tree = {
        name: 'root',
        children: [
          { name: 'A' },
          { name: 'B' },
          { name: 'C' }
        ]
      };

      // First call
      layout.indexLeafNodes(tree);
      const firstA = tree.children[0].index;
      const firstB = tree.children[1].index;
      const firstC = tree.children[2].index;

      // Reset and call again
      delete tree.children[0].index;
      delete tree.children[1].index;
      delete tree.children[2].index;
      layout.indexLeafNodes(tree);

      expect(tree.children[0].index).to.equal(firstA);
      expect(tree.children[1].index).to.equal(firstB);
      expect(tree.children[2].index).to.equal(firstC);
    });

    it('should index leaves in depth-first order (pre-order traversal)', () => {
      //         root
      //        / | \
      //       A int1 B
      //          |
      //          C
      const tree = {
        name: 'root',
        children: [
          { name: 'A' },
          {
            name: 'int1',
            children: [
              { name: 'C' }
            ]
          },
          { name: 'B' }
        ]
      };

      layout.indexLeafNodes(tree);

      // Depth-first: A (0), then descend into int1 -> C (1), then B (2)
      expect(tree.children[0].index).to.equal(0);             // A
      expect(tree.children[1].children[0].index).to.equal(1); // C
      expect(tree.children[2].index).to.equal(2);             // B
    });
  });

  describe('Edge cases', () => {
    it('should handle empty children array', () => {
      const tree = {
        name: 'root',
        children: []
      };

      const count = layout.indexLeafNodes(tree);

      // No leaves, so count should be 0
      expect(count).to.equal(0);
    });

    it('should handle node with undefined children (treated as leaf)', () => {
      const tree = { name: 'leaf' };

      const count = layout.indexLeafNodes(tree);

      expect(tree.index).to.equal(0);
      expect(count).to.equal(1);
    });

    it('should handle mixed undefined and defined children correctly', () => {
      const tree = {
        name: 'root',
        children: [
          { name: 'A' },
          { name: 'int1', children: [{ name: 'B' }] }
        ]
      };

      const count = layout.indexLeafNodes(tree);

      expect(tree.children[0].index).to.equal(0);             // A (no children property)
      expect(tree.children[1].children[0].index).to.equal(1); // B
      expect(count).to.equal(2);
    });
  });
});
