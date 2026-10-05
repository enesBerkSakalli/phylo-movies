import { describe, it, expect, vi } from 'vitest';
import { buildSubtreeConnectors } from '../../../../src/treeVisualisation/deckgl/data/transforms/SubtreeConnectorBuilder.js';
import { buildConnectorPathConnections } from '../../../../src/treeVisualisation/deckgl/data/transforms/ConnectorPathBuilder.js';
import { toSubtreeKey } from '../../../../src/domain/tree/splits.js';

const makeLeaf = (index, name, position, parentId = null) => ({
  id: `leaf-${index}`,
  parentId,
  split_indices: [index],
  isLeaf: true,
  name,
  position,
});

const makeClade = (id, splitIndices, position) => ({
  id,
  parentId: null,
  split_indices: splitIndices,
  isLeaf: false,
  depth: 1,
  position,
});

const makePositionMap = (offsetX = 0) => {
  const map = new Map();
  // Leaves share a lowest common ancestor only when their parents are in the map.
  map.set('clade-10-11', makeClade('clade-10-11', [10, 11], [offsetX - 30, 0, 0]));
  map.set('clade-12-13', makeClade('clade-12-13', [12, 13], [offsetX + 30, 0, 0]));
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
  getNodeBaseColor: () => '#10b981',
  ...overrides,
});

const buildOptions = (overrides = {}) => {
  const leftPositions = makePositionMap(0);
  const rightPositions = makePositionMap(160);

  return {
    leftPositions,
    rightPositions,
    affectedSubtrees: [
      [10, 11],
      [12, 13],
    ],
    colorManager: makeColorManager(),
    subtreeHighlightTracking: [[[10, 11]]],
    frameIndex: 0,
    subtreeHighlightsEnabled: true,
    linkConnectionOpacity: 0.6,
    leftCenter: [0, 0],
    rightCenter: [160, 0],
    leftRadius: 50,
    rightRadius: 50,
    ...overrides,
  };
};

describe('SubtreeConnectorBuilder', function () {
  it('links only taxa of an affected subtree that exist as leaves in both trees', function () {
    const rightPositions = makePositionMap(160);
    rightPositions.delete('11'); // B is missing from the right tree
    rightPositions.set('internal-12', { ...makeLeaf(12, 'C', [0, 0, 0]), isLeaf: false });

    const connectors = buildSubtreeConnectors(
      buildOptions({
        rightPositions,
        affectedSubtrees: [[10, 11, 12]],
      })
    );

    // D is not in the affected subtree, B has no match, and an internal node never replaces C's leaf.
    expect(connectors.map((connector) => connector.sourceInfo.name).sort()).toEqual(['A', 'C']);
  });

  it('matches taxa across the trees by split indices, not by name or map key', function () {
    const rightPositions = makePositionMap(160);
    rightPositions.delete('10');
    rightPositions.set('renamed-key', makeLeaf(10, 'Z', [130, -20, 0]));

    const connectors = buildSubtreeConnectors(
      buildOptions({
        rightPositions,
        affectedSubtrees: [[10]],
        subtreeHighlightTracking: [[[10]]],
      })
    );

    expect(connectors).toHaveLength(1);
    expect(connectors[0]).toMatchObject({
      id: 'connector-10-renamed-key-active-0-0',
      source: [-30, -20, 0],
      target: [130, -20, 0],
      isCurrentlyMoving: true,
      sourceInfo: { name: 'A' },
      targetInfo: { name: 'Z' },
    });
  });

  it('colours taxa of a larger affected subtree like that subtree and bundles the moving ones', function () {
    const leftPositions = makePositionMap(0);
    const subtreeInfo = makeClade('subtree-10-12', [10, 11, 12], [-30, 0, 0]);
    leftPositions.set(toSubtreeKey([10, 11, 12]), subtreeInfo);
    const getNodeColor = vi.fn(() => '#10b981');
    const getNodeBaseColor = vi.fn((entry) => (entry === subtreeInfo ? '#ff0000' : '#00ff00'));

    const connectors = buildSubtreeConnectors(
      buildOptions({
        leftPositions,
        affectedSubtrees: [[10, 11, 12]],
        subtreeHighlightTracking: [[[10, 11]]],
        colorManager: makeColorManager({ getNodeColor, getNodeBaseColor }),
        highlightColorMode: 'taxa',
      })
    );

    const byName = Object.fromEntries(connectors.map((c) => [c.sourceInfo.name, c]));
    expect(byName.A.color).toEqual([255, 0, 0, 255]);
    expect(byName.B.color).toEqual([255, 0, 0, 255]);
    expect(byName.C.color).toEqual([255, 0, 0, Math.round(0.6 * 255)]);
    expect(byName.A.bundleGroupKey).toBe(toSubtreeKey([10, 11]));
    expect(byName.B.bundleGroupKey).toBe(toSubtreeKey([10, 11]));
    expect(getNodeBaseColor).toHaveBeenCalledWith(subtreeInfo);
    expect(getNodeColor).not.toHaveBeenCalled();
  });

  it('treats taxa on the pivot edge or in the subtree history as moving', function () {
    const isMoving = (colorManager) =>
      buildSubtreeConnectors(
        buildOptions({
          affectedSubtrees: [[10]],
          subtreeHighlightTracking: [[]],
          colorManager,
        })
      )[0].isCurrentlyMoving;

    expect(isMoving(makeColorManager({ isNodePivotEdge: (entry) => entry.name === 'A' }))).toBe(
      true
    );
    expect(
      isMoving(makeColorManager({ isNodeHistorySubtree: (entry) => entry.name === 'A' }))
    ).toBe(true);
    expect(isMoving(makeColorManager())).toBe(false);
    expect(isMoving(null)).toBe(false);
  });

  it('builds passive paths first, then active paths', function () {
    const leftPositions = makePositionMap(0);
    const rightPositions = makePositionMap(160);
    const activeConnection = {
      id: 'connector-10-10',
      source: [-30, -20, 0],
      target: [130, -20, 0],
      color: [16, 185, 129, 255],
      isCurrentlyMoving: true,
      sourceInfo: leftPositions.get('10'),
      targetInfo: rightPositions.get('10'),
    };
    const passiveConnection = {
      id: 'connector-12-12',
      source: [30, -20, 0],
      target: [190, -20, 0],
      color: [16, 185, 129, 153],
      isCurrentlyMoving: false,
      sourceInfo: leftPositions.get('12'),
      targetInfo: rightPositions.get('12'),
    };
    let paths;
    expect(() => {
      paths = buildConnectorPathConnections({
        activeConnections: [activeConnection],
        passiveConnections: [passiveConnection],
        leftCenter: [0, 0],
        rightCenter: [160, 0],
        leftRadius: 50,
        rightRadius: 50,
        leftPositions,
        rightPositions,
      });
    }).not.toThrow();

    expect(paths).toHaveLength(2);
    expect(paths[0]).toMatchObject({
      id: 'connector-12-12-0',
      width: 1.5,
      isCurrentlyMoving: false,
      sourceInfo: passiveConnection.sourceInfo,
      targetInfo: passiveConnection.targetInfo,
    });
    expect(paths[0].path).toBeInstanceOf(Float32Array);
    expect(paths[1]).toMatchObject({
      id: 'connector-10-10-active-0-0',
      width: 3.0,
      isCurrentlyMoving: true,
      sourceInfo: activeConnection.sourceInfo,
      targetInfo: activeConnection.targetInfo,
    });
    expect(paths[1].path).toBeInstanceOf(Float32Array);
  });

  it('keeps disjoint active connector groups in separate bundle lanes', function () {
    const leftPositions = makePositionMap(0);
    const rightPositions = makePositionMap(160);
    const upperConnection = {
      id: 'connector-10-10',
      source: [-30, -20, 0],
      target: [130, -20, 0],
      color: [16, 185, 129, 255],
      isCurrentlyMoving: true,
      bundleGroupKey: 'moving-upper',
      sourceInfo: leftPositions.get('10'),
      targetInfo: rightPositions.get('10'),
    };
    const lowerConnection = {
      id: 'connector-13-13',
      source: [30, 20, 0],
      target: [190, 20, 0],
      color: [16, 185, 129, 255],
      isCurrentlyMoving: true,
      bundleGroupKey: 'moving-lower',
      sourceInfo: leftPositions.get('13'),
      targetInfo: rightPositions.get('13'),
    };

    const paths = buildConnectorPathConnections({
      activeConnections: [upperConnection, lowerConnection],
      passiveConnections: [],
      leftCenter: [0, 0],
      rightCenter: [160, 0],
      leftRadius: 50,
      rightRadius: 50,
      leftPositions,
      rightPositions,
    });

    const activePaths = paths.filter((connector) => connector.isCurrentlyMoving);
    const activePathIds = activePaths.map((connector) => connector.id);
    const midpointY = (connector) => {
      const pointCount = connector.path.length / 3;
      const midpointOffset = Math.floor(pointCount / 2) * 3;
      return connector.path[midpointOffset + 1];
    };

    expect(activePaths).toHaveLength(2);
    expect(activePathIds).toEqual(['connector-10-10-active-0-0', 'connector-13-13-active-1-0']);
    expect(Math.sign(midpointY(activePaths[0]))).not.toBe(Math.sign(midpointY(activePaths[1])));
  });

  it('bundles passive connectors that share ancestors into one lane', function () {
    const entry = (id, parentId, depth, position) => ({ id, parentId, depth, position });
    const side = (x) => {
      const parent = entry(`parent-${x}`, null, 2, [x, 0, 0]);
      return {
        parent,
        a: entry(`a-${x}`, parent.id, 4, [x, -20, 0]),
        b: entry(`b-${x}`, parent.id, 4, [x, 20, 0]),
        solo: entry(`solo-${x}`, null, 1, [x, 60, 0]),
      };
    };
    const left = side(-30);
    const right = side(130);
    const positions = (infos) => new Map(Object.values(infos).map((info) => [info.id, info]));
    const link = (name) => ({
      id: `connector-${name}`,
      source: left[name].position,
      target: right[name].position,
      color: [0, 0, 0, 153],
      isCurrentlyMoving: false,
      sourceInfo: left[name],
      targetInfo: right[name],
    });

    const paths = buildConnectorPathConnections({
      activeConnections: [],
      passiveConnections: [link('a'), link('b'), link('solo')],
      leftCenter: [0, 0],
      rightCenter: [160, 0],
      leftRadius: 50,
      rightRadius: 50,
      leftPositions: positions(left),
      rightPositions: positions(right),
    });

    // The index restarts per group: a and b share parents, solo has its own lane.
    expect(paths.map((connector) => connector.id)).toEqual([
      'connector-a-0',
      'connector-b-1',
      'connector-solo-0',
    ]);
  });

  it('builds connectors when positions are Maps', function () {
    const connectors = buildSubtreeConnectors(
      buildOptions({
        affectedSubtrees: [[10]],
        subtreeHighlightTracking: [[[10]]],
      })
    );

    expect(Array.isArray(connectors)).toBe(true);
    expect(connectors).toHaveLength(1);

    const firstConn = connectors[0];
    expect(firstConn.path).toBeDefined();
    expect(firstConn.path).toBeInstanceOf(Float32Array);
    expect(firstConn.path.length % 3).toBe(0);
    expect(firstConn.color).toHaveLength(4);
  });

  it('returns no connectors when no subtree is affected', function () {
    expect(buildSubtreeConnectors(buildOptions({ affectedSubtrees: [] }))).toEqual([]);
  });

  it('builds all affected-subtree connectors while only the current moved subtree is active', function () {
    const connectors = buildSubtreeConnectors(
      buildOptions({
        subtreeHighlightTracking: [[[10, 11]]],
      })
    );

    const active = connectors.filter((connector) => connector.isCurrentlyMoving);
    const passive = connectors.filter((connector) => !connector.isCurrentlyMoving);

    expect(connectors.map((connector) => connector.sourceInfo.name).sort()).toEqual([
      'A',
      'B',
      'C',
      'D',
    ]);
    expect(active.map((connector) => connector.sourceInfo.name).sort()).toEqual(['A', 'B']);
    expect(passive.map((connector) => connector.sourceInfo.name).sort()).toEqual(['C', 'D']);
    expect(active.every((connector) => connector.id.includes('-active-'))).toBe(true);
    expect(active.every((connector) => connector.width === 3.0)).toBe(true);
    expect(passive.every((connector) => !connector.id.includes('-active-'))).toBe(true);
    expect(passive.every((connector) => connector.width === 1.5)).toBe(true);
  });

  it('uses link opacity for passive affected-subtree connectors', function () {
    const connectors = buildSubtreeConnectors(
      buildOptions({
        affectedSubtrees: [[10]],
        subtreeHighlightTracking: [[]],
        linkConnectionOpacity: 0.25,
      })
    );

    expect(connectors).toHaveLength(1);
    expect(connectors[0].isCurrentlyMoving).toBe(false);
    expect(connectors[0].width).toBe(1.5);
    expect(connectors[0].color[3]).toBe(Math.round(0.25 * 255));
  });

  it('uses the configured highlight color for moving connectors', function () {
    const connectors = buildSubtreeConnectors(
      buildOptions({
        affectedSubtrees: [[10]],
        subtreeHighlightTracking: [[[10]]],
        highlightColorMode: 'solid',
        subtreeHighlightColor: '#010203',
      })
    );

    expect(connectors).toHaveLength(1);
    expect(connectors[0].color).toEqual([1, 2, 3, 255]);
  });

  it('keeps moving connectors active when subtree highlight coloring is disabled', function () {
    const getNodeColor = vi.fn(() => '#ff0000');

    const connectors = buildSubtreeConnectors(
      buildOptions({
        affectedSubtrees: [[10]],
        subtreeHighlightTracking: [[[10]]],
        colorManager: makeColorManager({ getNodeColor }),
        subtreeHighlightsEnabled: false,
      })
    );

    expect(connectors).toHaveLength(1);
    expect(connectors[0].isCurrentlyMoving).toBe(true);
    expect(connectors[0].width).toBe(3.0);
    expect(connectors[0].color[3]).toBe(255);
    expect(getNodeColor).not.toHaveBeenCalled();
  });
});
