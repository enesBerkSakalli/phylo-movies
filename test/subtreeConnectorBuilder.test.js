import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSubtreeConnectors } from '../src/treeVisualisation/deckgl/data/transforms/SubtreeConnectorBuilder.js';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const builderSourcePath = join(
  repoRoot,
  'src',
  'treeVisualisation',
  'deckgl',
  'data',
  'transforms',
  'SubtreeConnectorBuilder.js'
);
const rawConnectionsSourcePath = join(
  repoRoot,
  'src',
  'treeVisualisation',
  'deckgl',
  'data',
  'transforms',
  'ConnectorRawConnections.js'
);

async function importConnectorColorEntryResolver() {
  try {
    return await import('../src/treeVisualisation/deckgl/data/transforms/ConnectorColorEntryResolver.js');
  } catch {
    return null;
  }
}

async function importConnectorLeafIndex() {
  try {
    return await import('../src/treeVisualisation/deckgl/data/transforms/ConnectorLeafIndex.js');
  } catch {
    return null;
  }
}

async function importConnectorRawConnections() {
  try {
    return await import('../src/treeVisualisation/deckgl/data/transforms/ConnectorRawConnections.js');
  } catch {
    return null;
  }
}

async function importConnectorSplitNormalization() {
  try {
    return await import('../src/treeVisualisation/deckgl/data/transforms/ConnectorSplitNormalization.js');
  } catch {
    return null;
  }
}

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
  it('reuses the shared split subset helper instead of a local copy', function () {
    const rawSource = readFileSync(rawConnectionsSourcePath, 'utf8');

    expect(rawSource).toMatch(/import\s+\{[^}]*\bisSubset\b[^}]*\}\s+from\s+['"][^'"]*splitMatching\.js['"]/s);
    expect(rawSource).not.toMatch(/function\s+isSubsetOf\s*\(/);
  });

  it('normalizes connector split values through an isolated helper module', async function () {
    const normalization = await importConnectorSplitNormalization();

    expect(normalization).not.toBeNull();
    expect(normalization.normalizeConnectorSplitValue('10')).toBe(10);
    expect(normalization.normalizeConnectorSplitValue(11)).toBe(11);
    expect(normalization.normalizeConnectorSplitValue('taxon-a')).toBe('taxon-a');
    expect(normalization.normalizeConnectorSplitValue(null)).toBeNull();
    expect(normalization.normalizeConnectorSplitValue(undefined)).toBeNull();
    expect(normalization.normalizeConnectorSplitArray(['10', 11, null, 'taxon-a'])).toEqual([10, 11, 'taxon-a']);
    expect(normalization.normalizeConnectorSplitArray(new Set([10]))).toEqual([]);
  });

  it('normalizes connector subtree inputs through an isolated helper module', async function () {
    const normalization = await importConnectorSplitNormalization();

    expect(normalization).not.toBeNull();
    expect(normalization.normalizeConnectorSubtreeTrackingToSets(null)).toEqual([]);
    expect(normalization.normalizeConnectorSubtreeTrackingToSets([]).map((set) => Array.from(set))).toEqual([[]]);
    expect(normalization.normalizeConnectorSubtreeTrackingToSets(['10', 11]).map((set) => Array.from(set))).toEqual([[10, 11]]);
    expect(normalization.normalizeConnectorSubtreeTrackingToSets([['10', 11], [12, '13']]).map((set) => Array.from(set))).toEqual([[10, 11], [12, 13]]);

    const existingSet = new Set([10, 11]);
    expect(normalization.normalizeConnectorSubtreeTrackingToSets(existingSet)).toEqual([existingSet]);
    expect(normalization.toConnectorSubtreeSetList([['10', 11], [12, '13']]).map((set) => Array.from(set))).toEqual([[10, 11], [12, 13]]);
  });

  it('keeps connector split normalization outside the builder', function () {
    const source = readFileSync(builderSourcePath, 'utf8');

    expect(source).toMatch(/from\s+['"]\.\/ConnectorSplitNormalization\.js['"]/);
    expect(source).not.toMatch(/function\s+normalizeSubtreeTrackingToSets\s*\(/);
    expect(source).not.toMatch(/function\s+toNormalizedSetList\s*\(/);
    expect(source).not.toMatch(/function\s+normalizeSplitValue\s*\(/);
    expect(source).not.toMatch(/function\s+normalizeSplitArray\s*\(/);
  });

  it('resolves connector color entries through a dedicated helper', async function () {
    const resolver = await importConnectorColorEntryResolver();

    expect(resolver).not.toBeNull();

    const leafInfo = { id: 'leaf-10', split_indices: [10] };
    const subtreeInfo = { id: 'subtree-10-11', split_indices: [10, 11] };
    const leftPositions = new Map([['10-11', subtreeInfo]]);

    expect(
      resolver.resolveConnectorColorEntry(
        leafInfo,
        [10],
        [new Set([10, 11])],
        leftPositions
      )
    ).toBe(subtreeInfo);
  });

  it('keeps connector color entry resolution outside the builder', function () {
    const builderSource = readFileSync(builderSourcePath, 'utf8');
    const rawSource = readFileSync(rawConnectionsSourcePath, 'utf8');

    expect(rawSource).toMatch(/from\s+['"]\.\/ConnectorColorEntryResolver\.js['"]/);
    expect(builderSource).not.toMatch(/ConnectorColorEntryResolver\.js/);
    expect(builderSource).not.toMatch(/function\s+getColorEntry\s*\(/);
  });

  it('indexes connector leaves by name through a dedicated helper', async function () {
    const leafIndex = await importConnectorLeafIndex();

    expect(leafIndex).not.toBeNull();

    const leafA = { id: 'leaf-a', isLeaf: true, name: 'A' };
    const leafB = { id: 'leaf-b', isLeaf: true, name: 'B' };
    const internalA = { id: 'internal-a', isLeaf: false, name: 'A' };
    const namelessLeaf = { id: 'nameless', isLeaf: true };
    const positions = new Map([
      ['10', leafA],
      ['10-11', internalA],
      ['11', namelessLeaf],
      ['12', leafB],
      ['missing', null],
    ]);

    expect(Array.from(leafIndex.indexConnectorLeavesByName(positions).entries())).toEqual([
      ['A', { key: '10', info: leafA }],
      ['B', { key: '12', info: leafB }],
    ]);
  });

  it('keeps connector leaf indexing outside the builder', function () {
    const builderSource = readFileSync(builderSourcePath, 'utf8');
    const rawSource = readFileSync(rawConnectionsSourcePath, 'utf8');

    expect(rawSource).toMatch(/from\s+['"]\.\/ConnectorLeafIndex\.js['"]/);
    expect(builderSource).not.toMatch(/ConnectorLeafIndex\.js/);
    expect(builderSource).not.toMatch(/function\s+indexRightLeaves\s*\(/);
    expect(builderSource).not.toMatch(/iterator\.next\s*\(/);
  });

  it('builds raw connector connections through a dedicated helper', async function () {
    const rawConnections = await importConnectorRawConnections();

    expect(rawConnections).not.toBeNull();

    const connections = rawConnections.buildRawConnectorConnections({
      leftPositions: makePositionMap(0),
      rightPositions: makePositionMap(160),
      jumpingSubtreeSets: [new Set([10])],
      currentSubtreeSets: [new Set([10])],
      colorManager: makeColorManager(),
      markedSubtreesEnabled: true,
      linkConnectionOpacity: 0.6,
    });

    expect(connections).toHaveLength(1);
    expect(connections[0]).toMatchObject({
      id: 'connector-10-10',
      source: [-30, -20, 0],
      target: [130, -20, 0],
      isCurrentlyMoving: true,
      sourceInfo: { name: 'A' },
      targetInfo: { name: 'A' },
    });
    expect(connections[0].color).toHaveLength(4);
    expect(connections[0]).not.toHaveProperty('path');
    expect(connections[0]).not.toHaveProperty('width');

    const builderSource = readFileSync(builderSourcePath, 'utf8');
    expect(builderSource).toMatch(/from\s+['"]\.\/ConnectorRawConnections\.js['"]/);
    expect(builderSource).not.toMatch(/function\s+buildRawConnections\s*\(/);
  });

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

  it('canonicalizes pivot splits before backend lattice lookup', function () {
    const connectors = buildSubtreeConnectors(buildOptions({
      latticeSolutions: { '[10, 11]': [[10]] },
      pivotEdge: [11, 10],
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
