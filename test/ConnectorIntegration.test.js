
import { describe, it, expect } from 'vitest';
import { buildSubtreeConnectors } from '../src/treeVisualisation/deckgl/data/transforms/SubtreeConnectorBuilder.js';

// Mock colorManager
const mockColorManager = {
  getNodeColor: () => '#ff0000',
  getConnectionColor: () => [255, 0, 0, 255],
  isMonophyleticColoringEnabled: () => true,
  isNodeActiveEdge: () => false,
  isNodeHistorySubtree: () => false
};

describe('Connector Integration', function () {
  it('generates a flat bundled connector path', function () {
    const leftCenter = [-200, 0];
    const leftPositions = new Map();
    leftPositions.set('0', {
      id: 'left-0',
      parentId: null,
      split_indices: [0],
      isLeaf: true,
      name: 'CommonLeaf',
      depth: 1,
      position: [-150, 0, 0]
    });

    const rightCenter = [200, 0];
    const rightPositions = new Map();
    rightPositions.set('0', {
      id: 'right-0',
      parentId: null,
      split_indices: [0],
      isLeaf: true,
      name: 'CommonLeaf',
      depth: 1,
      position: [150, 0, 0]
    });

    const connectors = buildSubtreeConnectors({
      leftPositions,
      rightPositions,
      affectedSubtreesBySplit: { '[0, 0]': [[0]] },
      pivotEdge: [0, 0],
      colorManager: mockColorManager,
      subtreeHighlightTracking: [[0]],
      frameIndex: 0,
      markedSubtreesEnabled: true,
      linkConnectionOpacity: 0.6,
      leftCenter,
      rightCenter,
      leftRadius: 50,
      rightRadius: 50
    });

    expect(connectors.length).toBe(1);
    expect(connectors[0].path).toBeInstanceOf(Float32Array);
    expect(connectors[0].path.length % 3).toBe(0);
  });
});
