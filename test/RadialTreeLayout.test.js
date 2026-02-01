import { expect, describe, it, beforeEach } from 'vitest';
import { RadialTreeLayout } from '../src/js/treeVisualisation/layout/RadialTreeLayout.js';

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

describe('RadialTreeLayout - Geometry & Calculations', () => {
  let layout;
  let mockRoot;

  beforeEach(() => {
    mockRoot = {
      id: 'root',
      length: 0,
      children: [
        {
          id: 'A',
          length: 10,
          children: []
        },
        {
          id: 'B',
          length: 20,
          children: []
        }
      ]
    };
    layout = new RadialTreeLayout(mockRoot);
    // Set standard dimensions for predictable testing
    layout.setDimension(1000, 1000);
    layout.setMargin(0);
  });

  describe('calcRadius', () => {
    it('should correctly accumulate branch lengths', () => {
      layout.calcRadius(layout.root, 0);

      // Root should be 0 (effective length)
      expect(layout.root.radius).to.equal(0);

      // Child A: 0 + 10 = 10
      expect(layout.root.children[0].radius).to.equal(10);

      // Child B: 0 + 20 = 20
      expect(layout.root.children[1].radius).to.equal(20);
    });

    it('should handle nested accumulation', () => {
      const deepTree = {
        length: 0,
        children: [{
          length: 5,
          children: [{
            length: 3
          }]
        }]
      };
      const l = new RadialTreeLayout(deepTree);
      l.calcRadius(l.root, 0);

      // Root -> 0
      expect(l.root.radius).to.equal(0);
      // Child 1 (5) -> 5
      expect(l.root.children[0].radius).to.equal(5);
      // Grandchild (3) -> 5 + 3 = 8
      expect(l.root.children[0].children[0].radius).to.equal(8);
    });
  });

  describe('generateCoordinates (Polar to Cartesian)', () => {
    it('should convert radius and angle to x, y correctly', () => {
      // Manually set properties to test pure math conversion
      const node = { radius: 100, angle: 0 }; // 0 radians = Right
      // We need to attach node so generateCoordinates can iterate if it expects a hierarchy,
      // but generateCoordinates takes a root and uses .each().
      // Let's use d3.hierarchy logic or the internal root.

      const root = {
        each: (cb) => cb(node)
      };

      layout.generateCoordinates(root);

      // At angle 0, x=r, y=0
      expect(node.x).to.be.closeTo(100, 0.0001);
      expect(node.y).to.be.closeTo(0, 0.0001);
    });

    it('should handle 90 degrees (Pi/2)', () => {
      const node = { radius: 100, angle: Math.PI / 2 };
      const root = { each: (cb) => cb(node) };
      layout.generateCoordinates(root);

      // At 90 deg, x=0, y=100
      expect(node.x).to.be.closeTo(0, 0.0001);
      expect(node.y).to.be.closeTo(100, 0.0001);
    });

    it('should apply scale before generating coordinates (if scaled manually)', () => {
      // Note: RadialTreeLayout.scaleRadius is usually called before generateCoordinates
      const node = { radius: 10 };
      const root = { each: (cb) => cb(node) };

      layout.scaleRadius(root, 2.0); // radius becomes 20
      node.angle = 0;
      layout.generateCoordinates(root);

      expect(node.x).to.be.closeTo(20, 0.0001);
    });
  });

  describe('constructRadialTreeWithUniformScaling', () => {
    it('should calculate scale based on minWindow / (2 * maxGlobalScale)', () => {
      // Window 1000x1000, maxGlobalScale=50
      // Scale = 1000 / 100 = 10
      const maxGlobalScale = 50;
      layout.constructRadialTreeWithUniformScaling(maxGlobalScale);

      expect(layout.scale).to.equal(10);

      // Check if radius was scaled
      // Child A (len 10) * 10 = 100
      expect(layout.root.children[0].radius).to.equal(100);
    });
  });
});
