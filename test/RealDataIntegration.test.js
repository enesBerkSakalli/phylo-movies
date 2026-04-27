import { describe, it, expect } from 'vitest';
import createTidyTreeLayout from '../src/treeVisualisation/layout/TidyTreeLayout.js';
import { buildSubtreeConnectors } from '../src/treeVisualisation/deckgl/data/transforms/SubtreeConnectorBuilder.js';
import { flattenSplitSets } from '../src/treeVisualisation/utils/splitMatching.js';
import fs from 'fs';
import path from 'path';

// Load Data Dynamically
const responsePath = path.resolve(__dirname, './data/ostrich_bug_response.json');
const realData = JSON.parse(fs.readFileSync(responsePath, 'utf-8'));

// Minimal mock
const mockColorManager = {
  isNodeActiveEdge: () => false,
  isNodeHistorySubtree: () => false,
  getOutputColor: () => [100, 100, 100],
  getTypeColor: () => [200, 200, 200]
};

describe('Real Data Integration (test/data/ostrich_bug_response.json)', () => {
    const pairEntry = Object.entries(realData.tree_pair_solutions || {}).find(([, solution]) => {
        const jumpingSolutions = solution?.jumping_subtree_solutions;
        if (!jumpingSolutions) return false;
        return Object.values(jumpingSolutions).some((solutionSets) => flattenSplitSets(solutionSets).length > 0);
    });

    if (!pairEntry) {
        throw new Error('No jumping_subtree_solutions found in test/data/ostrich_bug_response.json');
    }

    const [PAIR_KEY, pairSolution] = pairEntry;
    const sourceTree = realData.interpolated_trees[0]; // Tree 0
    const rawJumpSolutions = pairSolution.jumping_subtree_solutions;
    const firstJumpEntry = Object.entries(rawJumpSolutions).find(([, solutionSets]) => flattenSplitSets(solutionSets).length > 0);

    if (!firstJumpEntry) {
        throw new Error(`No usable jumping subtree entry found for ${PAIR_KEY}`);
    }

    const [edgeKey, solutionSets] = firstJumpEntry;
    const pivotEdge = edgeKey
        .replace(/[\[\]\s]/g, '')
        .split(',')
        .filter(Boolean)
        .map((value) => Number(value));
    const movingSubtree = flattenSplitSets(solutionSets)[0];

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

        // We also need to mark it as "currently moving" via subtreeTracking
        const subtreeTracking = [
            [ movingSubtree ]
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
        // Since we are moving [1..19] (a large subtree) in the same tree (Tree 0 -> Tree 0),
        // the bundle point should be pushed away from the structure.
        const dx = midPoint[0] - (-300);
        const dy = midPoint[1] - 0;
        const dist = Math.sqrt(dx*dx + dy*dy);

        // Active bundling should still place the mid-path well away from the centerline origin.
        expect(dist).toBeGreaterThan(100);
    });
});
