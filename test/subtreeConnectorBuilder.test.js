import { describe, it, expect } from 'vitest';
import { buildSubtreeConnectors } from '../src/js/treeVisualisation/deckgl/data/transforms/SubtreeConnectorBuilder.js';

// Mock colorManager
const mockColorManager = {
  getConnectionColor: () => [255, 0, 0, 255]
};

describe('SubtreeConnectorBuilder', function () {
  it('builds connectors when positions are Maps', function () {
    const leftPositions = new Map();
    leftPositions.set('0', {
      isLeaf: true,
      name: 'A',
      position: [0, 0, 0],
      node: { originalNode: { id: 'A' } }
    });

    const rightPositions = new Map();
    rightPositions.set('0', {
      isLeaf: true,
      name: 'A',
      position: [100, 0, 0],
      node: { originalNode: { id: 'A' } }
    });

    // Provide latticeSolutions where edge [0,0] maps to subtree [[0]]
    const latticeSolutions = { '[0, 0]': [[0]] };

    // NOTE: In the implementation, buildRawConnections checks:
    // jumpingSubtreeSets which comes from flattenedSubtrees derived from latticeSolutions
    // AND currentSubtreeSets from subtreeTracking.
    // It finds leaves in the jumping set and matches them.

    // For '0' to be matched, it must be in the jumping set (it is, [[0]])
    // And "indexRightLeaves" maps the name 'A' from rightPositions back to the leaf.

    const connectors = buildSubtreeConnectors({
      leftPositions,
      rightPositions,
      latticeSolutions,
      activeChangeEdge: [0, 0],
      colorManager: mockColorManager,
      subtreeTracking: [[0]],
      currentTreeIndex: 0,
      markedSubtreesEnabled: true,
      linkConnectionOpacity: 0.6,
      leftCenter: [0, 0],
      rightCenter: [100, 0],
      leftRadius: 20,
      rightRadius: 20
    });

    expect(Array.isArray(connectors)).toBe(true);
    // Depending on logic, it might produce 1 connection (passive or active)
    expect(connectors.length).toBeGreaterThan(0);

    // Check structure of result (DeckGL PathLayer data)
    // Should have 'path' and 'color'
    const firstConn = connectors[0];
    expect(firstConn.path).toBeDefined();
    expect(Array.isArray(firstConn.path)).toBe(true);
    expect(firstConn.color).toHaveLength(4);
  });
});
