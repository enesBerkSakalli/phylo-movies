import { describe, it, expect, vi } from 'vitest';
import { buildSubtreeConnectors } from '../src/treeVisualisation/deckgl/data/transforms/SubtreeConnectorBuilder.js';

const makeLeaf = (index, name, position, parentId = null) => ({
  id: `leaf-${index}`,
  parentId,
  split_indices: [index],
  isLeaf: true,
  name,
  position,
});

const makePositionMap = (offsetX = 0) => {
  const map = new Map();
  map.set('10', makeLeaf(10, 'A', [offsetX - 30, -20, 0], 'clade-10-11'));
  map.set('11', makeLeaf(11, 'B', [offsetX - 30, 20, 0], 'clade-10-11'));
  map.set('12', makeLeaf(12, 'C', [offsetX + 30, -20, 0], 'clade-12-13'));
  map.set('13', makeLeaf(13, 'D', [offsetX + 30, 20, 0], 'clade-12-13'));
  return map;
};

const makeColorManager = (overrides = {}) => ({
  isNodePivotEdge: () => false,
  isNodeHistorySubtree: () => false,
  isMonophyleticColoringEnabled: () => false,
  getNodeColor: () => '#10b981',
  ...overrides,
});

const buildOptions = (overrides = {}) => {
  const leftPositions = makePositionMap(0);
  const rightPositions = makePositionMap(160);

  return {
    leftPositions,
    rightPositions,
    latticeSolutions: { '[99]': [[[10, 11], [12, 13]]] },
    pivotEdge: [99],
    colorManager: makeColorManager(),
    subtreeTracking: [[[10, 11]]],
    currentTreeIndex: 0,
    markedSubtreesEnabled: true,
    linkConnectionOpacity: 0.6,
    leftCenter: [0, 0],
    rightCenter: [160, 0],
    leftRadius: 50,
    rightRadius: 50,
    ...overrides,
  };
};

describe('SubtreeConnectorBuilder', function () {
  it('builds connectors when positions are Maps', function () {
    const connectors = buildSubtreeConnectors(buildOptions({
      latticeSolutions: { '[99]': [[10]] },
      subtreeTracking: [[[10]]],
    }));

    expect(Array.isArray(connectors)).toBe(true);
    expect(connectors).toHaveLength(1);

    const firstConn = connectors[0];
    expect(firstConn.path).toBeDefined();
    expect(firstConn.path).toBeInstanceOf(Float32Array);
    expect(firstConn.path.length % 3).toBe(0);
    expect(firstConn.color).toHaveLength(4);
  });

  it('returns no connectors when the active pivot edge is absent', function () {
    const connectors = buildSubtreeConnectors(buildOptions({
      pivotEdge: [],
    }));

    expect(connectors).toEqual([]);
  });

  it('returns no connectors when the active pivot edge has no lattice solution', function () {
    const connectors = buildSubtreeConnectors(buildOptions({
      latticeSolutions: { '[88]': [[10, 11]] },
      pivotEdge: [99],
    }));

    expect(connectors).toEqual([]);
  });

  it('resolves lattice solutions by pivot split identity instead of exact key text', function () {
    const connectors = buildSubtreeConnectors(buildOptions({
      latticeSolutions: { '[11,10]': [[10]] },
      pivotEdge: [10, 11],
      subtreeTracking: [[[10]]],
    }));

    expect(connectors).toHaveLength(1);
    expect(connectors[0].sourceInfo.name).toBe('A');
    expect(connectors[0].isCurrentlyMoving).toBe(true);
  });

  it('builds all lattice connectors while only the current moved subtree is active', function () {
    const connectors = buildSubtreeConnectors(buildOptions({
      latticeSolutions: { '[99]': [[[10, 11], [12, 13]]] },
      subtreeTracking: [[[10, 11]]],
    }));

    const active = connectors.filter((connector) => connector.isCurrentlyMoving);
    const passive = connectors.filter((connector) => !connector.isCurrentlyMoving);

    expect(connectors.map((connector) => connector.sourceInfo.name).sort()).toEqual(['A', 'B', 'C', 'D']);
    expect(active.map((connector) => connector.sourceInfo.name).sort()).toEqual(['A', 'B']);
    expect(passive.map((connector) => connector.sourceInfo.name).sort()).toEqual(['C', 'D']);
    expect(active.every((connector) => connector.id.includes('-active-'))).toBe(true);
    expect(active.every((connector) => connector.width === 3.0)).toBe(true);
    expect(passive.every((connector) => !connector.id.includes('-active-'))).toBe(true);
    expect(passive.every((connector) => connector.width === 1.5)).toBe(true);
  });

  it('uses link opacity for passive lattice connectors', function () {
    const connectors = buildSubtreeConnectors(buildOptions({
      latticeSolutions: { '[99]': [[10]] },
      subtreeTracking: [[]],
      linkConnectionOpacity: 0.25,
    }));

    expect(connectors).toHaveLength(1);
    expect(connectors[0].isCurrentlyMoving).toBe(false);
    expect(connectors[0].width).toBe(1.5);
    expect(connectors[0].color[3]).toBe(Math.round(0.25 * 255));
  });

  it('keeps moving connectors active when marked subtree coloring is disabled', function () {
    const getNodeColor = vi.fn(() => '#ff0000');

    const connectors = buildSubtreeConnectors(buildOptions({
      latticeSolutions: { '[99]': [[10]] },
      subtreeTracking: [[[10]]],
      colorManager: makeColorManager({ getNodeColor }),
      markedSubtreesEnabled: false,
    }));

    expect(connectors).toHaveLength(1);
    expect(connectors[0].isCurrentlyMoving).toBe(true);
    expect(connectors[0].width).toBe(3.0);
    expect(connectors[0].color[3]).toBe(255);
    expect(getNodeColor).not.toHaveBeenCalled();
  });
});
