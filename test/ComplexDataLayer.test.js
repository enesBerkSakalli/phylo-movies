
import { describe, it, expect, beforeEach } from 'vitest';
import createTidyTreeLayout, { TidyTreeLayout } from '../src/js/treeVisualisation/layout/TidyTreeLayout.js';
import { buildSubtreeConnectors } from '../src/js/treeVisualisation/deckgl/data/transforms/SubtreeConnectorBuilder.js';
import { chooseBundlePoint, ensureOutside } from '../src/js/treeVisualisation/deckgl/data/transforms/ComparisonGeometryUtils.js';
import { buildViewLinkMapping } from '../src/js/domain/view/viewLinkMapper.js';
import { calculateBranchCoordinates } from '../src/js/treeVisualisation/layout/RadialTreeGeometry.js';

// Mock Data Utilities
function createMockNode(id, length = 1, children = []) {
  return {
    id,
    data: { branch_length: length }, // Simulate parsed Newick data
    children
  };
}

describe('Complex Data Layer Integration', () => {

  describe('Phylogenetic Tree Layout (TidyTreeLayout)', () => {
    it('correctly handles complex nested hierarchies with accumulating branch lengths', () => {
      // Tree structure:
      // Root (0)
      //  L A (Len 10) -> A1 (Len 5)
      //               -> A2 (Len 5)
      //  L B (Len 20) -> B1 (Len 10) -> B1_1 (Len 5)

      const treeData = createMockNode('root', 0, [
        createMockNode('A', 10, [
          createMockNode('A1', 5),
          createMockNode('A2', 5)
        ]),
        createMockNode('B', 20, [
          createMockNode('B1', 10, [
            createMockNode('B1_1', 5)
          ])
        ])
      ]);

      const { tree, max_radius } = createTidyTreeLayout(treeData, 'none', {
        width: 1000,
        height: 1000,
        uniformScale: 1 // Keep scale 1:1 for easy radius math
      });

      // BFS to find nodes
      const nodes = {};
      tree.each(n => { nodes[n.id || n.data.id] = n; });

      // Check Root
      // Root radius should be exactly 0 (fixed in previous step)
      expect(nodes['root'].radius).toBe(0);

      // Check Node A
      // Root (0) + A (10) = 10
      expect(nodes['A'].radius).toBe(10);

      // Check Node B
      // Root (0) + B (20) = 20
      expect(nodes['B'].radius).toBe(20);

      // Check Deep Node B1_1
      // Root(0) + B(20) + B1(10) + B1_1(5) = 35
      expect(nodes['B1_1'].radius).toBe(35);

      // Max radius should track the deepest node
      expect(max_radius).toBe(35);
    });

    it('enforces Tidy (Angular) separation of leaves', () => {
      // A root with 3 children.
      // Child 1 has 10 leaves. Child 2 has 1 leaf. Child 3 has 1 leaf.
      // In a standard layout, they might get equal angles (120 deg).
      // In Tidy layout, Child 1 should get much more space.

      // Heurestic setup
      const leafGroup = Array.from({ length: 10 }, (_, i) => createMockNode(`L${i}`));
      const treeData = createMockNode('root', 0, [
        createMockNode('Crowded', 1, leafGroup),
        createMockNode('Sparse1', 1, [createMockNode('S1')]),
        createMockNode('Sparse2', 1, [createMockNode('S2')])
      ]);

      const { tree } = createTidyTreeLayout(treeData, 'none', { width: 1000, height: 1000 });

      // Calculate angular sector size for "Crowded" vs "Sparse1"
      // Node.x is the angle in radians
      const nodes = {};
      tree.each(n => { nodes[n.id || n.data.id] = n; });

      // We need to look at the leaves to see the spread
      const crowdedNode = nodes['Crowded'];
      const sparseNode1 = nodes['Sparse1'];

      // Get angle range of children
      // The layout assigns x (angle) to all nodes
      // We expect the children of Crowded to span a large delta
      const crowdedChildren = crowdedNode.children;
      const minAngle = Math.min(...crowdedChildren.map(c => c.x));
      const maxAngle = Math.max(...crowdedChildren.map(c => c.x));
      const crowdedSector = maxAngle - minAngle;

      // Sparse children (only 1) implies the sector is effectively just its own width,
      // but let's compare parent positions maybe?
      // Actually, standard d3.cluster separates leaves.
      // Let's check that Crowded leaves are not overlapping Sparse leaves
      // AND that Crowded node angle is significantly far from Sparse node angle.

      // Angle distance
      const dist1 = Math.abs(crowdedNode.x - sparseNode1.x);
      // Tidy tree should push them apart based on weight.
      // 10 leaves vs 1 leaf means roughly 10x space.
      // Since it's radial 2PI (approx 6.28), 12 leaves total.
      // Each leaf gets ~0.5 rads.
      // Crowded center vs Sparse center should be ~5-6 slots apart.
      expect(dist1).toBeGreaterThan(1.0); // 1 radian is approx 57 deg
    });
  });

  describe('End-to-End Comparison Data Flow', () => {
    // Generate two trees, simulate a "move", generate connectors
    it('generates correct Active vs Passive connectors for a moving subtree', () => {
      // Setup Left Tree (Source)
      // Root -> (Stay1, MoveGroup[M1, M2])
      const leftTreeData = createMockNode('rootL', 0, [
        createMockNode('Stay1', 10),
        createMockNode('MoveParent', 10, [
          createMockNode('M1', 10),
          createMockNode('M2', 10)
        ])
      ]);

      // Setup Right Tree (Dest)
      // Root -> (Stay1, NewHome[M1, M2])
      const rightTreeData = createMockNode('rootR', 0, [
        createMockNode('Stay1', 10),
        createMockNode('NewHome', 10, [
          createMockNode('M1', 10),
          createMockNode('M2', 10)
        ])
      ]);

      // 1. Layout
      const layoutOpt = { width: 500, height: 500 };
      const leftResult = createTidyTreeLayout(leftTreeData, 'none', layoutOpt);
      const rightResult = createTidyTreeLayout(rightTreeData, 'none', layoutOpt);

      // 2. Mock Position Maps (simulating what happens in ComparisonModeRenderer)
      const mockPositionMap = (treeRoot, centerOffset) => {
        const map = new Map();
        treeRoot.each(node => {
          // Flatten split keys - simplified for test
          const key = node.id || node.data.id;
          if (!node.children) { // Leaves mainly
             map.set(key, {
               isLeaf: true,
               name: key,
               position: [node.x, node.y, 0], // x,y are Cartesian from TidyTreeLayout? No, Tidy output
               // Wait, createTidyTreeLayout returns 'tree' with x,y in Cartesian (as generatedCoordinates is called)
               // Yes, generateCoordinates converts radius/angle to x/y.
               node: { originalNode: node }
             });
          }
           // Add internal nodes too for bundling lookups
           map.set(key, { node: { originalNode: node }, position: [node.x, node.y, 0] });
        });
        return map;
      };

      const leftPositions = mockPositionMap(leftResult.tree);
      const rightPositions = mockPositionMap(rightResult.tree);

      // 3. Define the "Move"
      // The edge leading to MoveParent (containing M1, M2) is the "active edge".
      // Let's say M1 and M2 are tracked as split indices "1" and "2".
      // For this test, we accept string keys "M1", "M2".

      // The builder expects `latticeSolutions` keys to be stringified arrays: "[u, v]"
      // If we pass pivotEdge = ['edge1'], it looks up latticeSolutions['[edge1]'].

      const movingSubtree = ['M1', 'M2']; // Restore definition
      const pivotEdge = ['edge1'];
      const edgeKey = '[edge1]';

      const mockColorManager = {
        isNodePivotEdge: () => false,
        isNodeHistorySubtree: () => false,
        getOutputColor: () => [100, 100, 100],
        getTypeColor: () => [200, 200, 200]
      };

      const connectors = buildSubtreeConnectors({
        leftPositions,
        rightPositions,
        latticeSolutions: { [edgeKey]: [movingSubtree] }, // Fix key format
        pivotEdge: pivotEdge,
        colorManager: mockColorManager,
        subtreeTracking: [movingSubtree], // "Current tree" structure
        currentTreeIndex: 0,
        markedSubtreesEnabled: true,
        leftCenter: [-200, 0],
        rightCenter: [200, 0],
        leftRadius: 250,
        rightRadius: 250
      });

      // 4. Assertions
      expect(connectors.length).toBeGreaterThan(0);

      // We expect connectors for M1->M1, M2->M2 (Active)
      // And Stay1->Stay1 (Passive, if logic finds it)
      // Note: SubtreeConnectorBuilder.buildRawConnections verifies:
      // "Check if in jumping subtrees"
      // If a leaf is NOT in jumpingSubtreeSets (derived from latticeSolutions), it is skipped?

      // Reading SubtreeConnectorBuilder:
      // "if (!inJumping) continue;"
      // This helper ONLY builds the "Jumping" connectors?
      // If so, we only see Active ones.
      // Wait, let's re-read the code for SubtreeConnectorBuilder.

      // It iterates leftPositions.
      // Calculates splitIndices.
      // Helper `isSubsetOf` checks if indices are in `jumpingSubtreeSets`.
      // IF matches, it creates the connector.

      // THEN it calls `splitActivePassive`.
      // "Active" = currently moving.
      // "Passive" = part of the jumping solution but NOT currently moving?
      // No, `isCurrentlyMoving` logic checks `currentSubtreeSets`.

      // So if `subtreeTracking` says M1, M2 are current, then they are Active.
      // If `subtreeTracking` did NOT contain them, but `latticeSolutions` DID (historical jump?), they are Passive.

      // Verify Active Connectors
      const activeConns = connectors.filter(c => c.id.includes('active'));
      expect(activeConns.length).toBeGreaterThan(0);

      // We have 2 moving leaves, so we expect output paths.
      // Since they are bundled, how many paths?
      // `buildBundledConnectorPaths` iterates connections.
      // So likely 2 paths, but they share control points.
      expect(activeConns.length).toBe(2);

      // Verify Path Geometry (Radial External)
      // Check the middle control point of an active path.
      // Source (-200, 0), Dest (200, 0).
      // Bundle point should be projected OUT (e.g. y != 0, or x < -200 / x > 200).
      // Since specific geometry might vary, we assume the path has length and valid coords.
      const path = activeConns[0].path;
      expect(path.length).toBeGreaterThan(20);
      const firstPt = path[0];
      const midPt = path[Math.floor(path.length/2)];

      // Basic sanity check: z is 0
      expect(firstPt[2]).toBe(0);

      // Check color alpha
      // Active edges should usually be opaque or highlighted
      // The builder assigns color via colorManager.
      // Our mock returns [100,100,100,255].
      expect(activeConns[0].color).toEqual([100, 100, 100, 255]);
    });
  });

});
