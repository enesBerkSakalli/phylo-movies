import { buildBundledBezierPath } from '../../builders/geometry/connectors/ConnectorGeometryBuilder.js';
import { flattenSplitSets, toSubtreeKey } from '../../../utils/splitMatching.js';
import { computeConnectionColor } from './ComparisonColorUtils.js';
import {
  pushOutward,
  getAngle,
  getBundleAncestor,
  chooseBundlePoint
} from './ComparisonGeometryUtils.js';

const DEFAULT_CENTER = [0, 0];
const CONNECTOR_PATH_SAMPLES = 24;
const PASSIVE_CONNECTOR_STYLE = Object.freeze({
  isActive: false,
  bundlingStrength: 0.85,
  width: 1.5,
});
const ACTIVE_CONNECTOR_STYLE = Object.freeze({
  isActive: true,
  bundlingStrength: 0.5,
  width: 3.0,
  outwardPushFactor: 1.08,
});
const ROOT_LEFT_GROUP_ID = 'rootL';
const ROOT_RIGHT_GROUP_ID = 'rootR';

/**
 * SubtreeConnectorBuilder
 * Prepares connector data for moving subtrees between two comparison trees.
 */
export function buildSubtreeConnectors(options) {
  const {
    leftPositions,
    rightPositions,
    latticeSolutions,
    pivotEdge,
    colorManager,
    subtreeTracking,
    currentTreeIndex,
    markedSubtreesEnabled = true,
    linkConnectionOpacity = 0.6,
    leftCenter = DEFAULT_CENTER,
    rightCenter = DEFAULT_CENTER,
    leftRadius,
    rightRadius,
  } = options;

  const solutionForPivot = resolveLatticeSolutionForPivot(latticeSolutions, pivotEdge);
  const flattenedSubtrees = flattenSplitSets(solutionForPivot || []);
  if (flattenedSubtrees.length === 0) {
    return [];
  }

  const jumpingSubtreeSets = toNormalizedSetList(flattenedSubtrees);
  const currentSubtreeSets = normalizeSubtreeTrackingToSets(subtreeTracking?.[currentTreeIndex]);
  const rawConnections = buildRawConnections({
    leftPositions,
    rightLeavesByName: indexRightLeaves(rightPositions),
    jumpingSubtreeSets,
    currentSubtreeSets,
    colorManager,
    markedSubtreesEnabled,
    linkConnectionOpacity,
  });
  if (!rawConnections.length) {
    return [];
  }

  const sortedConnections = sortConnectionsByAngle(rawConnections, leftCenter, rightCenter);
  const { activeConnections, passiveConnections } = splitActivePassive(sortedConnections);
  return buildConnectorPaths({
    activeConnections,
    passiveConnections,
    leftCenter,
    rightCenter,
    leftRadius,
    rightRadius,
    leftInfoById: buildInfoById(leftPositions),
    rightInfoById: buildInfoById(rightPositions),
  });
}

// ---------- lattice solution lookup ----------

function resolveLatticeSolutionForPivot(latticeSolutions, pivotEdge) {
  if (!latticeSolutions || !Array.isArray(pivotEdge) || pivotEdge.length === 0) {
    return null;
  }

  const directKey = formatLegacySplitKey(pivotEdge);
  if (Object.prototype.hasOwnProperty.call(latticeSolutions, directKey)) {
    return latticeSolutions[directKey];
  }

  const pivotIdentity = getNumericSplitIdentity(normalizeSplitArray(pivotEdge));
  if (!pivotIdentity || typeof latticeSolutions !== 'object') {
    return null;
  }

  for (const [candidateKey, solution] of Object.entries(latticeSolutions)) {
    const candidateIdentity = getNumericSplitIdentity(parseLegacySplitKey(candidateKey));
    if (candidateIdentity === pivotIdentity) {
      return solution;
    }
  }

  return null;
}

function formatLegacySplitKey(split) {
  return `[${split.join(', ')}]`;
}

function parseLegacySplitKey(splitKey) {
  if (typeof splitKey !== 'string') return null;

  try {
    const parsed = JSON.parse(splitKey);
    return Array.isArray(parsed) ? normalizeSplitArray(parsed) : null;
  } catch {
    return null;
  }
}

function getNumericSplitIdentity(split) {
  if (!Array.isArray(split) || split.length === 0 || !split.every(Number.isFinite)) {
    return null;
  }
  return toSubtreeKey(split);
}

// ---------- color entry resolution ----------

/**
 * Get the normalized entry used for color determination.
 * For leaves inside a larger marked subtree, use the internal entry representing the full subtree.
 * @param {Object} leftInfo - Position map entry for the leaf
 * @param {Array} splitIndices - Split indices for the current leaf
 * @param {Array<Set>} jumpingSubtreeSets - Array of jumping subtree sets
 * @param {Map} leftPositions - Position map for left tree
 * @returns {Object} Normalized entry to use for color determination
 */
function getColorEntry(leftInfo, splitIndices, jumpingSubtreeSets, leftPositions) {
  let matchingSubtree = null;
  for (const subtreeSet of jumpingSubtreeSets) {
    if (isSubsetOf(splitIndices, subtreeSet)) {
      matchingSubtree = subtreeSet;
      break;
    }
  }

  if (matchingSubtree && splitIndices.length < matchingSubtree.size) {
    const subtreeArray = Array.from(matchingSubtree).sort((a, b) => a - b);
    const internalInfo = leftPositions.get(subtreeArray.join('-'));
    if (internalInfo) return internalInfo;
  }

  return leftInfo;
}

// ========== Validation Helpers ==========

/**
 * Check if all elements of an array exist in a set (subset check).
 * @param {Array} array - Array of elements to check
 * @param {Set} set - Set to check against
 * @returns {boolean} True if all array elements exist in the set
 */
function isSubsetOf(array, set) {
  if (!Array.isArray(array) || !set || !(set instanceof Set)) {
    return false;
  }
  if (array.length > set.size) {
    return false;
  }
  return array.every((element) => set.has(element));
}

// ========== Connection Object Creation ==========

/**
 * Create a standardized connection object.
 * @param {Object} params - Connection parameters
 * @returns {Object} Connection object with all properties
 */
function createConnectionObject(params) {
  const connection = {
    id: params.id,
    source: params.source,
    target: params.target,
    color: params.color,
    isCurrentlyMoving: params.isCurrentlyMoving,
    sourceInfo: params.sourceInfo,
    targetInfo: params.targetInfo,
  };
  if (params.path !== undefined) {
    connection.path = params.path;
  }
  if (params.width !== undefined) {
    connection.width = params.width;
  }
  return connection;
}

/**
 * Create a path object from a connection and computed path.
 * @param {Object} connection - Base connection object
 * @param {Float32Array} path - Computed flat XYZ Bezier path
 * @param {string} idSuffix - String to append to ID
 * @param {number} width - Line width
 * @returns {Object} Path object with all properties
 */
function createPathObject(connection, path, idSuffix, width) {
  return createConnectionObject({
    id: connection.id + idSuffix,
    source: connection.source,
    target: connection.target,
    color: connection.color,
    isCurrentlyMoving: connection.isCurrentlyMoving,
    sourceInfo: connection.sourceInfo,
    targetInfo: connection.targetInfo,
    path,
    width,
  });
}

// ========== Normalization Helpers ==========

function normalizeSubtreeTrackingToSets(val) {
  if (!val) return [];

  if (Array.isArray(val)) {
    if (val.length > 0 && Array.isArray(val[0])) {
      return val.map((subtree) => new Set(normalizeSplitArray(subtree)));
    }
    return [new Set(normalizeSplitArray(val))];
  }

  if (val instanceof Set) {
    return [val];
  }

  return [];
}

function toNormalizedSetList(subtrees) {
  return subtrees.map((subtree) => new Set(normalizeSplitArray(subtree)));
}

function indexRightLeaves(rightPositions) {
  const map = new Map();
  const iterator = rightPositions.entries();
  let entry = iterator.next();
  while (!entry.done) {
    const key = entry.value[0];
    const info = entry.value[1];
    if (info && info.isLeaf && info.name) {
      map.set(info.name, { key, info });
    }
    entry = iterator.next();
  }
  return map;
}

function normalizeSplitValue(val) {
  const num = Number(val);
  if (!Number.isNaN(num)) {
    return num;
  }
  if (val === null || val === undefined) {
    return null;
  }
  return String(val);
}

function normalizeSplitArray(arr) {
  if (!Array.isArray(arr)) {
    return [];
  }
  const result = [];
  for (const item of arr) {
    const value = normalizeSplitValue(item);
    if (value !== null) {
      result.push(value);
    }
  }
  return result;
}

function buildRawConnections(params) {
  const {
    leftPositions,
    rightLeavesByName,
    jumpingSubtreeSets,
    currentSubtreeSets,
    colorManager,
    markedSubtreesEnabled,
    linkConnectionOpacity,
  } = params;
  const connections = [];

  for (const [key, leftInfo] of leftPositions.entries()) {
    if (!leftInfo.isLeaf || !leftInfo.name) continue;
    if (!leftInfo.position || leftInfo.position.length < 2) continue;

    const splitIndices = key.split('-')
      .map((val) => normalizeSplitValue(val))
      .filter((n) => n !== null);
    if (!splitIndices.length) continue;

    if (!isSubsetOfAny(splitIndices, jumpingSubtreeSets)) continue;

    const rightMatch = rightLeavesByName.get(leftInfo.name);
    if (!rightMatch) continue;
    if (!rightMatch.info.position || rightMatch.info.position.length < 2) continue;

    const isCurrentlyMoving = isSubsetOfAny(splitIndices, currentSubtreeSets);
    const source = [leftInfo.position[0], leftInfo.position[1], 0];
    const target = [rightMatch.info.position[0], rightMatch.info.position[1], 0];

    const colorEntry = getColorEntry(leftInfo, splitIndices, jumpingSubtreeSets, leftPositions);
    const isPivotEdge = colorManager && typeof colorManager.isNodePivotEdge === 'function'
      && colorManager.isNodePivotEdge(colorEntry);
    const isHistorySubtree = colorManager && typeof colorManager.isNodeHistorySubtree === 'function'
      && colorManager.isNodeHistorySubtree(colorEntry);
    const effectiveMoving = isCurrentlyMoving || isPivotEdge || isHistorySubtree;
    const color = computeConnectionColor(
      colorEntry,
      effectiveMoving,
      colorManager,
      markedSubtreesEnabled,
      linkConnectionOpacity
    );

    connections.push(createConnectionObject({
      id: `connector-${key}-${rightMatch.key}`,
      source,
      target,
      color,
      isCurrentlyMoving: effectiveMoving,
      sourceInfo: leftInfo,
      targetInfo: rightMatch.info,
    }));
  }

  return connections;
}

function isSubsetOfAny(splitIndices, subtreeSets) {
  for (const subtreeSet of subtreeSets || []) {
    if (isSubsetOf(splitIndices, subtreeSet)) return true;
  }
  return false;
}

function sortConnectionsByAngle(connections, leftCenter, rightCenter) {
  return connections.slice().sort((a, b) => {
    const aSrc = getAngle(a.sourceInfo, leftCenter);
    const bSrc = getAngle(b.sourceInfo, leftCenter);
    if (aSrc !== bSrc) {
      return aSrc - bSrc;
    }
    const aDst = getAngle(a.targetInfo, rightCenter);
    const bDst = getAngle(b.targetInfo, rightCenter);
    return aDst - bDst;
  });
}

function splitActivePassive(connections) {
  const activeConnections = [];
  const passiveConnections = [];
  connections.forEach((connection) => {
    if (connection.isCurrentlyMoving) {
      activeConnections.push(connection);
    } else {
      passiveConnections.push(connection);
    }
  });
  return { activeConnections, passiveConnections };
}

// ========== Bundle Building ==========

function buildConnectorPaths(params) {
  const {
    activeConnections,
    passiveConnections,
    leftCenter,
    rightCenter,
    leftRadius,
    rightRadius,
    leftInfoById,
    rightInfoById,
  } = params;

  const passivePaths = buildBundledConnectorPaths({
    connections: passiveConnections,
    leftCenter,
    rightCenter,
    leftRadius,
    rightRadius,
    leftInfoById,
    rightInfoById,
    ...PASSIVE_CONNECTOR_STYLE,
  });

  const activePaths = buildBundledConnectorPaths({
    connections: activeConnections,
    leftCenter,
    rightCenter,
    leftRadius,
    rightRadius,
    leftInfoById,
    rightInfoById,
    ...ACTIVE_CONNECTOR_STYLE,
  });

  return passivePaths.concat(activePaths);
}

/**
 * Build bundled connector paths with separate style parameters for active and passive connections.
 * @param {Object} params - Configuration parameters
 * @returns {Array} Array of path objects
 */
function buildBundledConnectorPaths(params) {
  const {
    connections,
    leftCenter,
    rightCenter,
    leftRadius,
    rightRadius,
    leftInfoById,
    rightInfoById,
    isActive,
    bundlingStrength,
    width,
    outwardPushFactor,
  } = params;

  if (!connections.length) {
    return [];
  }

  const results = [];

  if (isActive) {
    let srcBundlePoint = chooseBundlePoint(connections, null, leftCenter, leftRadius, true, leftInfoById);
    let dstBundlePoint = chooseBundlePoint(connections, null, rightCenter, rightRadius, false, rightInfoById);

    if (outwardPushFactor) {
      srcBundlePoint = pushOutward(srcBundlePoint, leftCenter, outwardPushFactor);
      dstBundlePoint = pushOutward(dstBundlePoint, rightCenter, outwardPushFactor);
    }

    connections.forEach((connection, index) => {
      const path = buildPathForConnection(
        connection,
        srcBundlePoint,
        dstBundlePoint,
        leftCenter,
        rightCenter,
        bundlingStrength
      );

      if (path.length) {
        results.push(createPathObject(connection, path, `-active-${index}`, width));
      }
    });
    return results;
  }

  for (const group of groupPassiveConnections(connections, leftInfoById, rightInfoById)) {
    const groupBundlePoint = chooseBundlePoint(
      group.connections,
      group.leftCenterEntry,
      leftCenter,
      leftRadius,
      true,
      leftInfoById
    );
    const groupDstBundlePoint = chooseBundlePoint(
      group.connections,
      group.rightCenterEntry,
      rightCenter,
      rightRadius,
      false,
      rightInfoById
    );

    group.connections.forEach((connection, index) => {
      const path = buildPathForConnection(
        connection,
        groupBundlePoint,
        groupDstBundlePoint,
        leftCenter,
        rightCenter,
        bundlingStrength
      );

      if (path.length) {
        results.push(createPathObject(connection, path, `-${index}`, width));
      }
    });
  }

  return results;
}

function buildPathForConnection(connection, srcBundlePoint, dstBundlePoint, leftCenter, rightCenter, bundlingStrength) {
  return buildBundledBezierPath(
    connection.source,
    connection.target,
    srcBundlePoint,
    dstBundlePoint,
    CONNECTOR_PATH_SAMPLES,
    {
      bundlingStrength,
      sourceCenter: leftCenter,
      targetCenter: rightCenter,
    }
  );
}

function groupPassiveConnections(passiveConnections, leftInfoById, rightInfoById) {
  const groups = new Map();

  passiveConnections.forEach((connection) => {
    const { sourceInfo, targetInfo } = connection;
    if (!sourceInfo || !targetInfo) return;

    const leftBundleEntry = getBundleAncestor(sourceInfo, leftInfoById, 2) || getParentInfo(sourceInfo, leftInfoById);
    const rightBundleEntry = getBundleAncestor(targetInfo, rightInfoById, 2) || getParentInfo(targetInfo, rightInfoById);

    const leftKey = leftBundleEntry ? leftBundleEntry.id : ROOT_LEFT_GROUP_ID;
    const rightKey = rightBundleEntry ? rightBundleEntry.id : ROOT_RIGHT_GROUP_ID;
    const groupKey = `${leftKey}|${rightKey}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        leftCenterEntry: leftBundleEntry,
        rightCenterEntry: rightBundleEntry,
        connections: [],
      });
    }
    groups.get(groupKey).connections.push(connection);
  });

  return Array.from(groups.values());
}

function buildInfoById(positionMap) {
  const map = new Map();
  if (!positionMap || typeof positionMap.values !== 'function') return map;
  for (const info of positionMap.values()) {
    const id = info && info.id;
    if (id) map.set(id, info);
  }
  return map;
}

function getParentInfo(info, infoById) {
  const parentId = info && info.parentId;
  return parentId && infoById ? infoById.get(parentId) : null;
}
