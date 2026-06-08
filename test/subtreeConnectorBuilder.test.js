import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSubtreeConnectors } from '../src/treeVisualisation/deckgl/data/transforms/SubtreeConnectorBuilder.js';
import { toSubtreeKey } from '../src/domain/tree/splits.js';

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
const splitEligibilitySourcePath = join(
  repoRoot,
  'src',
  'treeVisualisation',
  'deckgl',
  'data',
  'transforms',
  'ConnectorSplitEligibility.js'
);
const leafIndexSourcePath = join(
  repoRoot,
  'src',
  'treeVisualisation',
  'deckgl',
  'data',
  'transforms',
  'ConnectorLeafIndex.js'
);
const leafPairCandidatesSourcePath = join(
  repoRoot,
  'src',
  'treeVisualisation',
  'deckgl',
  'data',
  'transforms',
  'ConnectorLeafPairCandidates.js'
);
const movementStateSourcePath = join(
  repoRoot,
  'src',
  'treeVisualisation',
  'deckgl',
  'data',
  'transforms',
  'ConnectorMovementState.js'
);
const visualStateSourcePath = join(
  repoRoot,
  'src',
  'treeVisualisation',
  'deckgl',
  'data',
  'transforms',
  'ConnectorVisualState.js'
);
const rawConnectionFactorySourcePath = join(
  repoRoot,
  'src',
  'treeVisualisation',
  'deckgl',
  'data',
  'transforms',
  'ConnectorRawConnectionFactory.js'
);
const passiveGroupsSourcePath = join(
  repoRoot,
  'src',
  'treeVisualisation',
  'deckgl',
  'data',
  'transforms',
  'ConnectorPassiveGroups.js'
);
const connectionObjectsSourcePath = join(
  repoRoot,
  'src',
  'treeVisualisation',
  'deckgl',
  'data',
  'transforms',
  'ConnectorConnectionObjects.js'
);
const connectionOrderingSourcePath = join(
  repoRoot,
  'src',
  'treeVisualisation',
  'deckgl',
  'data',
  'transforms',
  'ConnectorConnectionOrdering.js'
);
const pathBuilderSourcePath = join(
  repoRoot,
  'src',
  'treeVisualisation',
  'deckgl',
  'data',
  'transforms',
  'ConnectorPathBuilder.js'
);
const infoIndexSourcePath = join(
  repoRoot,
  'src',
  'treeVisualisation',
  'deckgl',
  'data',
  'transforms',
  'ConnectorInfoIndex.js'
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

async function importConnectorSplitEligibility() {
  try {
    return await import('../src/treeVisualisation/deckgl/data/transforms/ConnectorSplitEligibility.js');
  } catch {
    return null;
  }
}

async function importConnectorLeafPairCandidates() {
  try {
    return await import('../src/treeVisualisation/deckgl/data/transforms/ConnectorLeafPairCandidates.js');
  } catch {
    return null;
  }
}

async function importConnectorMovementState() {
  try {
    return await import('../src/treeVisualisation/deckgl/data/transforms/ConnectorMovementState.js');
  } catch {
    return null;
  }
}

async function importConnectorVisualState() {
  try {
    return await import('../src/treeVisualisation/deckgl/data/transforms/ConnectorVisualState.js');
  } catch {
    return null;
  }
}

async function importConnectorRawConnectionFactory() {
  try {
    return await import('../src/treeVisualisation/deckgl/data/transforms/ConnectorRawConnectionFactory.js');
  } catch {
    return null;
  }
}

async function importConnectorPassiveGroups() {
  try {
    return await import('../src/treeVisualisation/deckgl/data/transforms/ConnectorPassiveGroups.js');
  } catch {
    return null;
  }
}

async function importConnectorInfoIndex() {
  try {
    return await import('../src/treeVisualisation/deckgl/data/transforms/ConnectorInfoIndex.js');
  } catch {
    return null;
  }
}

async function importConnectorConnectionObjects() {
  try {
    return await import('../src/treeVisualisation/deckgl/data/transforms/ConnectorConnectionObjects.js');
  } catch {
    return null;
  }
}

async function importConnectorConnectionOrdering() {
  try {
    return await import('../src/treeVisualisation/deckgl/data/transforms/ConnectorConnectionOrdering.js');
  } catch {
    return null;
  }
}

async function importConnectorPathBuilder() {
  try {
    return await import('../src/treeVisualisation/deckgl/data/transforms/ConnectorPathBuilder.js');
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
    affectedSubtreesBySplit: {
      '[99]': [
        [
          [10, 11],
          [12, 13],
        ],
      ],
    },
    pivotEdge: [99],
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
  it('delegates connector split subset checks instead of keeping a local copy', function () {
    const rawSource = readFileSync(rawConnectionsSourcePath, 'utf8');
    const leafPairCandidatesSource = readFileSync(leafPairCandidatesSourcePath, 'utf8');
    const movementStateSource = readFileSync(movementStateSourcePath, 'utf8');

    expect(rawSource).not.toMatch(/ConnectorSplitEligibility\.js/);
    expect(rawSource).not.toMatch(/getEligibleConnectorSplitIndices/);
    expect(rawSource).not.toMatch(/isConnectorSplitInAnySubtree/);
    expect(rawSource).not.toMatch(/function\s+isSubsetOf\s*\(/);
    expect(rawSource).not.toMatch(/function\s+isSplitSubsetOfAny\s*\(/);
    expect(leafPairCandidatesSource).not.toMatch(/ConnectorSplitEligibility\.js/);
    expect(movementStateSource).toMatch(/from\s+['"]\.\/ConnectorSplitEligibility\.js['"]/);
  });

  it('checks connector split arrays through a dedicated pure helper', async function () {
    const splitEligibility = await importConnectorSplitEligibility();

    expect(splitEligibility).not.toBeNull();
    expect(splitEligibility.isConnectorSplitInAnySubtree([10], [new Set([10, 11])])).toBe(true);
    expect(splitEligibility.isConnectorSplitInAnySubtree([12], [new Set([10, 11])])).toBe(false);

    const rawSource = readFileSync(rawConnectionsSourcePath, 'utf8');
    const leafPairCandidatesSource = readFileSync(leafPairCandidatesSourcePath, 'utf8');
    const movementStateSource = readFileSync(movementStateSourcePath, 'utf8');
    const splitEligibilitySource = readFileSync(splitEligibilitySourcePath, 'utf8');
    expect(rawSource).not.toMatch(/getEligibleConnectorSplitIndices/);
    expect(rawSource).not.toMatch(/isConnectorSplitInAnySubtree/);
    expect(rawSource).not.toMatch(/key\.split\('-'\)/);
    expect(leafPairCandidatesSource).not.toMatch(/getEligibleConnectorSplitIndices/);
    expect(movementStateSource).toMatch(/isConnectorSplitInAnySubtree/);
    expect(splitEligibilitySource).toMatch(/from\s+['"][^'"]*domain\/tree\/splits\.js['"]/);
    expect(splitEligibilitySource).not.toMatch(/key\.split/);
    expect(splitEligibilitySource).not.toMatch(/getConnectorSplitIndicesFromKey/);
    expect(splitEligibilitySource).not.toMatch(/getEligibleConnectorSplitIndices/);
    expect(splitEligibilitySource).not.toMatch(/subtreeSets\s*\|\|\s*\[\]/);
    expect(splitEligibilitySource).not.toMatch(/splitMatching\.js/);
  });

  it('normalizes connector split values through an isolated helper module', async function () {
    const normalization = await importConnectorSplitNormalization();

    expect(normalization).not.toBeNull();
    expect(normalization.normalizeConnectorSplitValue('10')).toBe(10);
    expect(normalization.normalizeConnectorSplitValue(11)).toBe(11);
    expect(normalization.normalizeConnectorSplitValue('taxon-a')).toBe('taxon-a');
    expect(normalization.normalizeConnectorSplitValue(null)).toBeNull();
    expect(normalization.normalizeConnectorSplitValue(undefined)).toBeNull();
    expect(normalization.normalizeConnectorSplitArray(['10', 11, null, 'taxon-a'])).toEqual([
      10,
      11,
      'taxon-a',
    ]);
    expect(normalization.normalizeConnectorSplitArray(new Set([10]))).toEqual([]);
  });

  it('normalizes connector subtree inputs through an isolated helper module', async function () {
    const normalization = await importConnectorSplitNormalization();

    expect(normalization).not.toBeNull();
    expect(normalization.normalizeConnectorSubtreeHighlightsToSets(null)).toEqual([]);
    expect(
      normalization.normalizeConnectorSubtreeHighlightsToSets([]).map((set) => Array.from(set))
    ).toEqual([[]]);
    expect(
      normalization
        .normalizeConnectorSubtreeHighlightsToSets(['10', 11])
        .map((set) => Array.from(set))
    ).toEqual([[10, 11]]);
    expect(
      normalization
        .normalizeConnectorSubtreeHighlightsToSets([
          ['10', 11],
          [12, '13'],
        ])
        .map((set) => Array.from(set))
    ).toEqual([
      [10, 11],
      [12, 13],
    ]);

    const existingSet = new Set([10, 11]);
    expect(normalization.normalizeConnectorSubtreeHighlightsToSets(existingSet)).toEqual([
      existingSet,
    ]);
    expect(
      normalization
        .toConnectorSubtreeSetList([
          ['10', 11],
          [12, '13'],
        ])
        .map((set) => Array.from(set))
    ).toEqual([
      [10, 11],
      [12, 13],
    ]);
  });

  it('keeps connector split normalization outside the builder', function () {
    const source = readFileSync(builderSourcePath, 'utf8');

    expect(source).toMatch(/from\s+['"]\.\/ConnectorSplitNormalization\.js['"]/);
    const oldInlineHelperName = ['normalizeSubtree', 'TrackingToSets'].join('');
    expect(source).not.toContain(`function ${oldInlineHelperName}(`);
    expect(source).not.toMatch(/function\s+toNormalizedSetList\s*\(/);
    expect(source).not.toMatch(/function\s+normalizeSplitValue\s*\(/);
    expect(source).not.toMatch(/function\s+normalizeSplitArray\s*\(/);
  });

  it('resolves connector color entries through a dedicated helper', async function () {
    const resolver = await importConnectorColorEntryResolver();

    expect(resolver).not.toBeNull();

    const leafInfo = { id: 'leaf-10', split_indices: [10] };
    const subtreeInfo = { id: 'subtree-10-11', split_indices: [10, 11] };
    const leftPositions = new Map([[toSubtreeKey([11, 10]), subtreeInfo]]);

    expect(
      resolver.resolveConnectorColorEntry(leafInfo, [10], [new Set([10, 11])], leftPositions)
    ).toBe(subtreeInfo);
  });

  it('keeps connector color entry resolution outside the builder', function () {
    const builderSource = readFileSync(builderSourcePath, 'utf8');
    const rawSource = readFileSync(rawConnectionsSourcePath, 'utf8');
    const visualStateSource = readFileSync(visualStateSourcePath, 'utf8');

    expect(rawSource).not.toMatch(/ConnectorColorEntryResolver\.js/);
    expect(visualStateSource).toMatch(/from\s+['"]\.\/ConnectorColorEntryResolver\.js['"]/);
    expect(builderSource).not.toMatch(/ConnectorColorEntryResolver\.js/);
    expect(builderSource).not.toMatch(/function\s+getColorEntry\s*\(/);
  });

  it('indexes connector leaves by split key through a dedicated helper', async function () {
    const leafIndex = await importConnectorLeafIndex();

    expect(leafIndex).not.toBeNull();

    const leafA = { id: 'leaf-a', isLeaf: true, name: 'A', split_indices: [10] };
    const leafB = { id: 'leaf-b', isLeaf: true, name: 'B', split_indices: [12] };
    const duplicateNameLeaf = {
      id: 'leaf-a-duplicate-name',
      isLeaf: true,
      name: 'A',
      split_indices: [11],
    };
    const internalA = { id: 'internal-a', isLeaf: false, name: 'A', split_indices: [10, 11] };
    const splitlessLeaf = { id: 'splitless', isLeaf: true, name: 'C' };
    const positions = new Map([
      [toSubtreeKey([10]), leafA],
      [toSubtreeKey([10, 11]), internalA],
      [toSubtreeKey([11]), duplicateNameLeaf],
      ['splitless', splitlessLeaf],
      [toSubtreeKey([12]), leafB],
    ]);

    expect(Array.from(leafIndex.indexConnectorLeavesBySplitKey(positions).entries())).toEqual([
      [toSubtreeKey([10]), { key: toSubtreeKey([10]), info: leafA }],
      [toSubtreeKey([11]), { key: toSubtreeKey([11]), info: duplicateNameLeaf }],
      [toSubtreeKey([12]), { key: toSubtreeKey([12]), info: leafB }],
    ]);

    const leafIndexSource = readFileSync(leafIndexSourcePath, 'utf8');
    expect(leafIndexSource).not.toMatch(/info\s*&&\s*info\.isLeaf/);
  });

  it('keeps connector leaf indexing outside the builder', function () {
    const builderSource = readFileSync(builderSourcePath, 'utf8');
    const rawSource = readFileSync(rawConnectionsSourcePath, 'utf8');

    expect(rawSource).toMatch(/from\s+['"]\.\/ConnectorLeafIndex\.js['"]/);
    expect(builderSource).not.toMatch(/ConnectorLeafIndex\.js/);
    expect(builderSource).not.toMatch(/function\s+indexRightLeaves\s*\(/);
    expect(builderSource).not.toMatch(/iterator\.next\s*\(/);
  });

  it('matches connector leaf pair candidates through a dedicated pure helper', async function () {
    const leafPairCandidates = await importConnectorLeafPairCandidates();

    expect(leafPairCandidates).not.toBeNull();

    const leftInfo = makeLeaf(10, 'A', [-30, -20, 0]);
    const rightInfo = makeLeaf(10, 'A', [130, -20, 0]);
    const rightLeavesBySplitKey = new Map([
      [toSubtreeKey([10]), { key: toSubtreeKey([10]), info: rightInfo }],
    ]);

    expect(
      leafPairCandidates.getConnectorLeafPairCandidate({
        key: toSubtreeKey([10]),
        leftInfo,
        rightLeavesBySplitKey,
        jumpingSubtreeSets: [new Set([10, 11])],
      })
    ).toEqual({
      leftKey: toSubtreeKey([10]),
      rightKey: toSubtreeKey([10]),
      leftInfo,
      rightInfo,
      splitIndices: [10],
      source: [-30, -20, 0],
      target: [130, -20, 0],
    });
    expect(
      leafPairCandidates.getConnectorLeafPairCandidate({
        key: toSubtreeKey([10]),
        leftInfo: { ...leftInfo, name: null },
        rightLeavesBySplitKey,
        jumpingSubtreeSets: [new Set([10, 11])],
      })
    ).toMatchObject({
      leftKey: toSubtreeKey([10]),
      rightKey: toSubtreeKey([10]),
      splitIndices: [10],
    });
    expect(
      leafPairCandidates.getConnectorLeafPairCandidate({
        key: 'raw-left-key',
        leftInfo,
        rightLeavesBySplitKey,
        jumpingSubtreeSets: [new Set([10, 11])],
      })
    ).toEqual({
      leftKey: 'raw-left-key',
      rightKey: toSubtreeKey([10]),
      leftInfo,
      rightInfo,
      splitIndices: [10],
      source: [-30, -20, 0],
      target: [130, -20, 0],
    });
    expect(
      leafPairCandidates.getConnectorLeafPairCandidate({
        key: toSubtreeKey([12]),
        leftInfo: makeLeaf(12, 'Missing', [30, -20, 0]),
        rightLeavesBySplitKey,
        jumpingSubtreeSets: [new Set([10, 11])],
      })
    ).toBeNull();
    expect(
      leafPairCandidates.getConnectorLeafPairCandidate({
        key: toSubtreeKey([11]),
        leftInfo: makeLeaf(11, 'A', [-30, -20, 0]),
        rightLeavesBySplitKey,
        jumpingSubtreeSets: [new Set([10, 11])],
      })
    ).toBeNull();

    const rawSource = readFileSync(rawConnectionsSourcePath, 'utf8');
    const leafPairCandidatesSource = readFileSync(leafPairCandidatesSourcePath, 'utf8');
    expect(rawSource).toMatch(/from\s+['"]\.\/ConnectorLeafPairCandidates\.js['"]/);
    expect(rawSource).not.toMatch(/rightLeavesByName/);
    expect(rawSource).not.toMatch(/rightMatch\.info\.position/);
    expect(leafPairCandidatesSource).not.toMatch(/ConnectorSplitEligibility\.js/);
    expect(leafPairCandidatesSource).not.toMatch(/getEligibleConnectorSplitIndices/);
    expect(leafPairCandidatesSource).not.toMatch(/info\?\.isLeaf/);
  });

  it('resolves connector movement state through a dedicated pure helper', async function () {
    const movementState = await importConnectorMovementState();

    expect(movementState).not.toBeNull();

    const colorEntry = { id: 'subtree-10' };
    const pivotManager = makeColorManager({
      isNodePivotEdge: (entry) => entry === colorEntry,
      isNodeHistorySubtree: () => false,
    });
    const historyManager = makeColorManager({
      isNodePivotEdge: () => false,
      isNodeHistorySubtree: (entry) => entry === colorEntry,
    });

    expect(
      movementState.resolveConnectorMovementState({
        splitIndices: [10],
        currentSubtreeSets: [new Set([10, 11])],
        colorEntry,
        colorManager: makeColorManager(),
      })
    ).toEqual({
      isCurrentSubtree: true,
      isPivotEdge: false,
      isHistorySubtree: false,
      isMoving: true,
    });
    expect(
      movementState.resolveConnectorMovementState({
        splitIndices: [12],
        currentSubtreeSets: [new Set([10, 11])],
        colorEntry,
        colorManager: pivotManager,
      })
    ).toEqual({
      isCurrentSubtree: false,
      isPivotEdge: true,
      isHistorySubtree: false,
      isMoving: true,
    });
    expect(
      movementState.resolveConnectorMovementState({
        splitIndices: [12],
        currentSubtreeSets: [new Set([10, 11])],
        colorEntry,
        colorManager: historyManager,
      })
    ).toEqual({
      isCurrentSubtree: false,
      isPivotEdge: false,
      isHistorySubtree: true,
      isMoving: true,
    });
    expect(
      movementState.resolveConnectorMovementState({
        splitIndices: [12],
        currentSubtreeSets: [new Set([10, 11])],
        colorEntry,
        colorManager: null,
      }).isMoving
    ).toBe(false);

    const rawSource = readFileSync(rawConnectionsSourcePath, 'utf8');
    const movementStateSource = readFileSync(movementStateSourcePath, 'utf8');
    const visualStateSource = readFileSync(visualStateSourcePath, 'utf8');
    expect(rawSource).not.toMatch(/ConnectorMovementState\.js/);
    expect(rawSource).not.toMatch(/isNodePivotEdge/);
    expect(rawSource).not.toMatch(/isNodeHistorySubtree/);
    expect(movementStateSource).toMatch(/from\s+['"]\.\/ConnectorSplitEligibility\.js['"]/);
    expect(movementStateSource).not.toMatch(/typeof\s+colorManager\.isNodePivotEdge/);
    expect(movementStateSource).not.toMatch(/typeof\s+colorManager\.isNodeHistorySubtree/);
    expect(visualStateSource).toMatch(/from\s+['"]\.\/ConnectorMovementState\.js['"]/);
  });

  it('resolves connector visual state through a dedicated helper', async function () {
    const visualState = await importConnectorVisualState();

    expect(visualState).not.toBeNull();

    const leafInfo = makeLeaf(10, 'A', [-30, -20, 0]);
    const subtreeInfo = { id: 'subtree-10-11', split_indices: [10, 11] };
    const leftPositions = new Map([[toSubtreeKey([10, 11]), subtreeInfo]]);
    const getNodeColor = vi.fn(() => '#10b981');
    const getNodeBaseColor = vi.fn(() => '#ff0000');

    expect(
      visualState.resolveConnectorVisualState({
        leftInfo: leafInfo,
        splitIndices: [10],
        jumpingSubtreeSets: [new Set([10, 11])],
        leftPositions,
        currentSubtreeSets: [new Set([10, 11])],
        colorManager: makeColorManager({ getNodeColor, getNodeBaseColor }),
        subtreeHighlightsEnabled: true,
        linkConnectionOpacity: 0.6,
        highlightColorMode: 'taxa',
      })
    ).toEqual({
      colorEntry: subtreeInfo,
      movementState: {
        isCurrentSubtree: true,
        isPivotEdge: false,
        isHistorySubtree: false,
        isMoving: true,
      },
      color: [255, 0, 0, 255],
      isMoving: true,
      bundleGroupKey: toSubtreeKey([10, 11]),
    });
    expect(getNodeBaseColor).toHaveBeenCalledWith(subtreeInfo);
    expect(getNodeColor).not.toHaveBeenCalled();

    const rawSource = readFileSync(rawConnectionsSourcePath, 'utf8');
    const visualStateSource = readFileSync(visualStateSourcePath, 'utf8');
    expect(rawSource).toMatch(/from\s+['"]\.\/ConnectorVisualState\.js['"]/);
    expect(rawSource).not.toMatch(/resolveConnectorColorEntry/);
    expect(rawSource).not.toMatch(/resolveConnectorMovementState/);
    expect(rawSource).not.toMatch(/computeConnectionColor/);
    expect(visualStateSource).toMatch(/from\s+['"]\.\/ConnectorColorEntryResolver\.js['"]/);
    expect(visualStateSource).toMatch(/from\s+['"]\.\/ConnectorMovementState\.js['"]/);
    expect(visualStateSource).toMatch(/from\s+['"]\.\/ComparisonColorUtils\.js['"]/);
  });

  it('creates raw connector connections from candidates through a dedicated helper', async function () {
    const rawConnectionFactory = await importConnectorRawConnectionFactory();

    expect(rawConnectionFactory).not.toBeNull();

    const leftInfo = makeLeaf(10, 'A', [-30, -20, 0]);
    const rightInfo = makeLeaf(10, 'A', [130, -20, 0]);
    const candidate = {
      leftKey: '10',
      rightKey: '10',
      leftInfo,
      rightInfo,
      source: [-30, -20, 0],
      target: [130, -20, 0],
    };
    const visualState = {
      color: [16, 185, 129, 255],
      isMoving: true,
    };

    expect(
      rawConnectionFactory.createRawConnectorConnectionFromCandidate(candidate, visualState)
    ).toEqual({
      id: 'connector-10-10',
      source: [-30, -20, 0],
      target: [130, -20, 0],
      color: [16, 185, 129, 255],
      isCurrentlyMoving: true,
      sourceInfo: leftInfo,
      targetInfo: rightInfo,
    });

    const rawSource = readFileSync(rawConnectionsSourcePath, 'utf8');
    const rawConnectionFactorySource = readFileSync(rawConnectionFactorySourcePath, 'utf8');
    expect(rawSource).toMatch(/from\s+['"]\.\/ConnectorRawConnectionFactory\.js['"]/);
    expect(rawSource).not.toMatch(/createConnectorConnection/);
    expect(rawConnectionFactorySource).toMatch(/from\s+['"]\.\/ConnectorConnectionObjects\.js['"]/);
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
      subtreeHighlightsEnabled: true,
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

  it('groups passive connector connections through a dedicated helper', async function () {
    const passiveGroups = await importConnectorPassiveGroups();

    expect(passiveGroups).not.toBeNull();

    const leftParent = { id: 'left-parent', depth: 2, position: [-20, 0, 0] };
    const rightParent = { id: 'right-parent', depth: 2, position: [180, 0, 0] };
    const leftLeafA = { id: 'left-a', parentId: 'left-parent', depth: 4 };
    const leftLeafB = { id: 'left-b', parentId: 'left-parent', depth: 4 };
    const rightLeafA = { id: 'right-a', parentId: 'right-parent', depth: 4 };
    const rightLeafB = { id: 'right-b', parentId: 'right-parent', depth: 4 };
    const standaloneLeft = { id: 'left-rootless' };
    const standaloneRight = { id: 'right-rootless' };
    const firstConnection = { sourceInfo: leftLeafA, targetInfo: rightLeafA };
    const secondConnection = { sourceInfo: leftLeafB, targetInfo: rightLeafB };
    const standaloneConnection = { sourceInfo: standaloneLeft, targetInfo: standaloneRight };
    const leftInfoById = new Map([
      [leftParent.id, leftParent],
      [leftLeafA.id, leftLeafA],
      [leftLeafB.id, leftLeafB],
    ]);
    const rightInfoById = new Map([
      [rightParent.id, rightParent],
      [rightLeafA.id, rightLeafA],
      [rightLeafB.id, rightLeafB],
    ]);

    const groups = passiveGroups.groupPassiveConnectorConnections(
      [firstConnection, secondConnection, standaloneConnection],
      leftInfoById,
      rightInfoById
    );

    expect(groups).toHaveLength(2);
    expect(groups[0].leftCenterEntry).toBe(leftParent);
    expect(groups[0].rightCenterEntry).toBe(rightParent);
    expect(groups[0].connections).toEqual([firstConnection, secondConnection]);
    expect(groups[1].leftCenterEntry).toBe(standaloneLeft);
    expect(groups[1].rightCenterEntry).toBe(standaloneRight);
    expect(groups[1].connections).toEqual([standaloneConnection]);

    const builderSource = readFileSync(builderSourcePath, 'utf8');
    const passiveGroupsSource = readFileSync(passiveGroupsSourcePath, 'utf8');
    expect(builderSource).toMatch(/from\s+['"]\.\/ConnectorPassiveGroups\.js['"]/);
    expect(builderSource).not.toMatch(/function\s+groupPassiveConnections\s*\(/);
    expect(builderSource).not.toMatch(/ROOT_LEFT_GROUP_ID/);
    expect(passiveGroupsSource).toMatch(/from\s+['"]\.\/ComparisonGeometryUtils\.js['"]/);
    expect(passiveGroupsSource).not.toMatch(/!sourceInfo\s*\|\|\s*!targetInfo/);
    expect(passiveGroupsSource).not.toMatch(/info\s*&&\s*info\.parentId/);
    expect(passiveGroupsSource).not.toMatch(/infoById\s*\?/);
  });

  it('indexes connector info by id through a dedicated helper', async function () {
    const infoIndex = await importConnectorInfoIndex();

    expect(infoIndex).not.toBeNull();

    const withId = { id: 'leaf-10', name: 'A' };
    const withoutId = { name: 'missing-id' };
    const indexed = infoIndex.buildConnectorInfoById(
      new Map([
        ['10', withId],
        ['missing', withoutId],
      ])
    );

    expect(indexed).toBeInstanceOf(Map);
    expect(indexed.get('leaf-10')).toBe(withId);
    expect(indexed.has('missing')).toBe(false);

    const pathBuilderSource = readFileSync(pathBuilderSourcePath, 'utf8');
    const passiveGroupsSource = readFileSync(passiveGroupsSourcePath, 'utf8');
    const infoIndexSource = readFileSync(infoIndexSourcePath, 'utf8');
    expect(pathBuilderSource).toMatch(/from\s+['"]\.\/ConnectorInfoIndex\.js['"]/);
    expect(passiveGroupsSource).toMatch(/from\s+['"]\.\/ConnectorInfoIndex\.js['"]/);
    expect(pathBuilderSource).not.toMatch(/function\s+buildInfoById\s*\(/);
    expect(passiveGroupsSource).not.toMatch(/function\s+toInfoByIdMap\s*\(/);
    expect(infoIndexSource).toMatch(/export\s+function\s+buildConnectorInfoById\s*\(/);
    expect(infoIndexSource).not.toMatch(/!infoSource/);
    expect(infoIndexSource).not.toMatch(/typeof\s+infoSource\.values/);
    expect(infoIndexSource).not.toMatch(/info\s*&&\s*info\.id/);
  });

  it('creates connector objects through a shared helper', async function () {
    const connectionObjects = await importConnectorConnectionObjects();

    expect(connectionObjects).not.toBeNull();

    const sourceInfo = { name: 'A' };
    const targetInfo = { name: 'A' };
    const rawConnection = connectionObjects.createConnectorConnection({
      id: 'connector-10-10',
      source: [-30, -20, 0],
      target: [130, -20, 0],
      color: [16, 185, 129, 255],
      isCurrentlyMoving: true,
      sourceInfo,
      targetInfo,
    });

    expect(rawConnection).toEqual({
      id: 'connector-10-10',
      source: [-30, -20, 0],
      target: [130, -20, 0],
      color: [16, 185, 129, 255],
      isCurrentlyMoving: true,
      sourceInfo,
      targetInfo,
    });
    expect(rawConnection).not.toHaveProperty('path');
    expect(rawConnection).not.toHaveProperty('width');

    const path = new Float32Array([0, 1, 0, 2, 3, 0]);
    const pathConnection = connectionObjects.createConnectorPathConnection(
      rawConnection,
      path,
      '-active-0-0',
      3
    );

    expect(pathConnection).toMatchObject({
      id: 'connector-10-10-active-0-0',
      source: rawConnection.source,
      target: rawConnection.target,
      color: rawConnection.color,
      isCurrentlyMoving: true,
      sourceInfo,
      targetInfo,
      path,
      width: 3,
    });

    const builderSource = readFileSync(builderSourcePath, 'utf8');
    const rawSource = readFileSync(rawConnectionsSourcePath, 'utf8');
    const rawConnectionFactorySource = readFileSync(rawConnectionFactorySourcePath, 'utf8');
    const connectionObjectsSource = readFileSync(connectionObjectsSourcePath, 'utf8');
    expect(builderSource).not.toMatch(/ConnectorConnectionObjects\.js/);
    expect(rawSource).not.toMatch(/ConnectorConnectionObjects\.js/);
    expect(rawConnectionFactorySource).toMatch(/from\s+['"]\.\/ConnectorConnectionObjects\.js['"]/);
    expect(builderSource).not.toMatch(/function\s+createConnectionObject\s*\(/);
    expect(builderSource).not.toMatch(/function\s+createPathObject\s*\(/);
    expect(connectionObjectsSource).toMatch(/export\s+function\s+createConnectorConnection\s*\(/);
  });

  it('orders and splits connector connections through a dedicated helper', async function () {
    const connectionOrdering = await importConnectorConnectionOrdering();

    expect(connectionOrdering).not.toBeNull();

    const activeLowTarget = {
      id: 'active-low-target',
      isCurrentlyMoving: true,
      sourceInfo: { angle: 2 },
      targetInfo: { angle: 1 },
    };
    const passiveLowestSource = {
      id: 'passive-lowest-source',
      isCurrentlyMoving: false,
      sourceInfo: { angle: 1 },
      targetInfo: { angle: 3 },
    };
    const passiveHighTarget = {
      id: 'passive-high-target',
      isCurrentlyMoving: false,
      sourceInfo: { angle: 2 },
      targetInfo: { angle: 4 },
    };
    const ordered = connectionOrdering.sortConnectorConnectionsByAngle(
      [passiveHighTarget, activeLowTarget, passiveLowestSource],
      [0, 0],
      [160, 0]
    );

    expect(ordered.map((connection) => connection.id)).toEqual([
      'passive-lowest-source',
      'active-low-target',
      'passive-high-target',
    ]);

    const split = connectionOrdering.splitActivePassiveConnectorConnections(ordered);
    expect(split.activeConnections).toEqual([activeLowTarget]);
    expect(split.passiveConnections).toEqual([passiveLowestSource, passiveHighTarget]);

    const builderSource = readFileSync(builderSourcePath, 'utf8');
    const orderingSource = readFileSync(connectionOrderingSourcePath, 'utf8');
    expect(builderSource).toMatch(/from\s+['"]\.\/ConnectorConnectionOrdering\.js['"]/);
    expect(builderSource).not.toMatch(/function\s+sortConnectionsByAngle\s*\(/);
    expect(builderSource).not.toMatch(/function\s+splitActivePassive\s*\(/);
    expect(builderSource).not.toMatch(/\bgetAngle\b/);
    expect(orderingSource).toMatch(/from\s+['"]\.\/ComparisonGeometryUtils\.js['"]/);
  });

  it('builds connector paths through a dedicated helper', async function () {
    const pathBuilder = await importConnectorPathBuilder();

    expect(pathBuilder).not.toBeNull();

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
    const passiveConnectionGroups = [
      {
        leftCenterEntry: passiveConnection.sourceInfo,
        rightCenterEntry: passiveConnection.targetInfo,
        connections: [passiveConnection],
      },
    ];

    let paths;
    expect(() => {
      paths = pathBuilder.buildConnectorPathConnections({
        activeConnections: [activeConnection],
        passiveConnectionGroups,
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

    const builderSource = readFileSync(builderSourcePath, 'utf8');
    const pathBuilderSource = readFileSync(pathBuilderSourcePath, 'utf8');
    expect(builderSource).toMatch(/from\s+['"]\.\/ConnectorPathBuilder\.js['"]/);
    expect(builderSource).not.toMatch(/buildBundledConnectorPaths/);
    expect(builderSource).not.toMatch(/buildPathForConnection/);
    expect(builderSource).not.toMatch(/CONNECTOR_PATH_SAMPLES/);
    expect(builderSource).not.toMatch(/PASSIVE_CONNECTOR_STYLE/);
    expect(builderSource).not.toMatch(/ACTIVE_CONNECTOR_STYLE/);
    expect(pathBuilderSource).toMatch(/from\s+['"][^'"]*ConnectorGeometryBuilder\.js['"]/);
    expect(pathBuilderSource).not.toMatch(/ConnectorPassiveGroups\.js/);
    expect(pathBuilderSource).not.toMatch(/groupPassiveConnectorConnections/);
    expect(pathBuilderSource).not.toMatch(/\bpassiveConnections\b/);
  });

  it('keeps disjoint active connector groups in separate bundle lanes', async function () {
    const pathBuilder = await importConnectorPathBuilder();

    expect(pathBuilder).not.toBeNull();

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

    const paths = pathBuilder.buildConnectorPathConnections({
      activeConnections: [upperConnection, lowerConnection],
      passiveConnectionGroups: [],
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

  it('builds connectors when positions are Maps', function () {
    const connectors = buildSubtreeConnectors(
      buildOptions({
        affectedSubtreesBySplit: { '[99]': [[10]] },
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

  it('returns no connectors when the active pivot edge is absent', function () {
    const connectors = buildSubtreeConnectors(
      buildOptions({
        pivotEdge: [],
      })
    );

    expect(connectors).toEqual([]);
  });

  it('returns no connectors when the active pivot edge has no affected-subtree entry', function () {
    const connectors = buildSubtreeConnectors(
      buildOptions({
        affectedSubtreesBySplit: { '[88]': [[10, 11]] },
        pivotEdge: [99],
      })
    );

    expect(connectors).toEqual([]);
  });

  it('canonicalizes pivot splits before affected-subtree lookup', function () {
    const connectors = buildSubtreeConnectors(
      buildOptions({
        affectedSubtreesBySplit: { '[10, 11]': [[10]] },
        pivotEdge: [11, 10],
        subtreeHighlightTracking: [[[10]]],
      })
    );

    expect(connectors).toHaveLength(1);
    expect(connectors[0].sourceInfo.name).toBe('A');
    expect(connectors[0].isCurrentlyMoving).toBe(true);
  });

  it('builds all affected-subtree connectors while only the current moved subtree is active', function () {
    const connectors = buildSubtreeConnectors(
      buildOptions({
        affectedSubtreesBySplit: {
          '[99]': [
            [
              [10, 11],
              [12, 13],
            ],
          ],
        },
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
        affectedSubtreesBySplit: { '[99]': [[10]] },
        subtreeHighlightTracking: [[]],
        linkConnectionOpacity: 0.25,
      })
    );

    expect(connectors).toHaveLength(1);
    expect(connectors[0].isCurrentlyMoving).toBe(false);
    expect(connectors[0].width).toBe(1.5);
    expect(connectors[0].color[3]).toBe(Math.round(0.25 * 255));
  });

  it('keeps moving connectors active when subtree highlight coloring is disabled', function () {
    const getNodeColor = vi.fn(() => '#ff0000');

    const connectors = buildSubtreeConnectors(
      buildOptions({
        affectedSubtreesBySplit: { '[99]': [[10]] },
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
