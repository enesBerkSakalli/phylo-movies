import { describe, it, expect } from 'vitest';
import createTidyTreeLayout from '../src/js/treeVisualisation/layout/TidyTreeLayout.js';
import { buildSubtreeConnectors } from '../src/js/treeVisualisation/deckgl/data/transforms/SubtreeConnectorBuilder.js';
import fs from 'fs';
import path from 'path';

// Load Data Dynamically
const responsePath = path.resolve(__dirname, '../response.json');
const realData = JSON.parse(fs.readFileSync(responsePath, 'utf-8'));

// Minimal mock
const mockColorManager = {
  isNodeActiveEdge: () => false,
  isNodeHistorySubtree: () => false,
  getOutputColor: () => [100, 100, 100],
  getTypeColor: () => [200, 200, 200]
};

describe('Real Data Integration (data/response.json)', () => {

    // We focus on pair_1_2 which contains a massive jump for [1..19]
    // Even though pair_1_2 is between Tree 1 and 2, the clade [1..19] exists in Tree 0 as well.
    const PAIR_KEY = 'pair_1_2';
    const sourceTree = realData.interpolated_trees[0]; // Tree 0
    // Use raw solutions directly (keys have spaces like "[1, 2, 3]")
    const rawJumpSolutions = realData.tree_pair_solutions[PAIR_KEY].jumping_subtree_solutions;

    it('successfully lays out the real Ostrich dataset (Tree 0)', () => {
        const { tree, max_radius } = createTidyTreeLayout(sourceTree, 'none', { width: 1000, height: 1000 });

        let nodeCount = 0;
        let maxDepth = 0;

        tree.each(node => {
            nodeCount++;
            if (node.depth > maxDepth) maxDepth = node.depth;
            // Layout Validity Checks
            expect(node.x).not.toBeNaN();
            expect(node.y).not.toBeNaN();
        });

        expect(nodeCount).toBeGreaterThan(20);
        expect(max_radius).toBeGreaterThan(0);
    });

    it('generates active bundles for the massive jumping connector [1..19]', () => {
        // 1. Generate Layouts
        const layoutOpt = { width: 1000, height: 1000 };
        const leftLayout = createTidyTreeLayout(sourceTree, 'none', layoutOpt);
        const rightLayout = createTidyTreeLayout(sourceTree, 'none', layoutOpt);

        // 2. Mock Position Maps
        const createPosMap = (root) => {
            const map = new Map();
            root.each(node => {
                // Use simple sorting for key generation in map
                // Note: The builder iterates the map values, so key equality is less critical
                // unless it does direct lookups (which it does for internal nodes).
                const indices = node.data.split_indices || [];
                const sorted = [...indices].sort((a,b) => a - b);
                const key = JSON.stringify(sorted);

                const info = {
                    position: [node.x, node.y, 0],
                    isLeaf: !node.children,
                    node: { originalNode: node },
                    name: node.data.name || ""
                };

                if (node.id) map.set(node.id, info);
                if (key) map.set(key, info);
                // Also add join-with-hyphens style if needed by internal lookups
                if (sorted.length > 0) map.set(sorted.join('-'), info);
            });
            return map;
        };

        const leftPositions = createPosMap(leftLayout.tree);
        const rightPositions = createPosMap(rightLayout.tree);

        // 3. Extract the real Moving Subtree: [1..19]
        // This corresponds to ranges 1 to 19 inclusive.
        const indices1to19 = Array.from({length: 19}, (_, i) => i + 1);

        // The builder expects pivotEdge to be the raw array of indices
        // It converts it internally to "[1, 2, 3...]" to verify against latticeSolutions
        const pivotEdge = indices1to19;

        // We also need to mark it as "currently moving" via subtreeTracking
        const subtreeTracking = [
            [ indices1to19 ] // Index 0: Array of subtrees
        ];

        const connectors = buildSubtreeConnectors({
            leftPositions,
            rightPositions,
            latticeSolutions: rawJumpSolutions,
            pivotEdge: pivotEdge,
            colorManager: mockColorManager,
            subtreeTracking: subtreeTracking,
            currentTreeIndex: 0,
            markedSubtreesEnabled: true,
            leftCenter: [-300, 0],
            rightCenter: [300, 0],
            leftRadius: leftLayout.max_radius,
            rightRadius: rightLayout.max_radius
        });

        // 4. Assertions
        // Filter for the active active connectors
        const activeConns = connectors.filter(c => c.isCurrentlyMoving);

        // With correct subtreeTracking, we expect active connections
        expect(activeConns.length).toBeGreaterThan(0);

        // 5. Geometry Check (Middle Point Embedding)
        const path = activeConns[0].path;
        const midPoint = path[Math.floor(path.length / 2)];

        // Verify Planar
        expect(midPoint[2]).toBe(0);

        // Verify Outward Push
        // Since we are moving [1..19] (a large clade) in the same tree (Tree 0 -> Tree 0),
        // the bundle point should be pushed away from the structure.
        const dx = midPoint[0] - (-300);
        const dy = midPoint[1] - 0;
        const dist = Math.sqrt(dx*dx + dy*dy);

        // Usually SubtreeConnectorBuilder pushes active bundles radius * 1.08 OR beyond        expect(dist).toBeGreaterThan(leftLayout.max_radius);
    });
});
