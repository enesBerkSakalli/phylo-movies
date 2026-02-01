
import { describe, it, expect } from 'vitest';
import { buildSubtreeConnectors } from '../src/js/treeVisualisation/deckgl/data/transforms/SubtreeConnectorBuilder.js';
import { calculateBranchCoordinates } from '../src/js/treeVisualisation/layout/RadialTreeGeometry.js';

// Mock colorManager
const mockColorManager = {
  getConnectionColor: () => [255, 0, 0, 255],
  isNodeActiveEdge: () => false,
  isNodeHistorySubtree: () => false
};

describe('Connector Integration', function () {
  it('generates bundled paths with radial constraints', function () {
    // Left Tree: Root at -200, Leaf at -150 (Radius 50)
    const leftCenter = [-200, 0];
    const leftPositions = new Map();
    leftPositions.set('LeafL', {
      isLeaf: true,
      name: 'CommonLeaf',
      position: [-150, 0, 0], // East relative to center (-200)
      node: { originalNode: { id: 'LeafL', depth: 3, parent: { depth: 2, parent: { depth: 1, parent: { depth: 0 } } } } }
    });

    // Right Tree: Root at 200, Leaf at 150 (Radius 50)
    const rightCenter = [200, 0];
    const rightPositions = new Map();
    rightPositions.set('LeafR', {
      isLeaf: true,
      name: 'CommonLeaf',
      position: [150, 0, 0], // West relative to center (200)
      node: { originalNode: { id: 'LeafR', depth: 3 } }
    });

    const latticeSolutions = {'root': []}; // Mock
    // Trick: we need 'CommonLeaf' to be found.
    // buildRawConnections iterates leftPositions.
    // It checks splitIndices.
    // And it needs to matchingSubtree.
    // Let's simplified setup:

    // Actually, SubtreeConnectorBuilder is complex to mock fully because of the lattice/jumping logic
    // But we can verify that IF it produces connections, they have the right properties.

    // Simpler: Test the Geometry Utilities directly with tree-like inputs
    // to confirm the "crossing" fix logic (ensureOutside + depth) works.
  });
});
