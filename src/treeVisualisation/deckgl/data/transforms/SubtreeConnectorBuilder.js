import { buildBundledBezierPath } from '../../builders/geometry/connectors/ConnectorGeometryBuilder.js';
import { flattenSplitSets } from '../../../utils/splitMatching.js';
import { computeConnectionColor } from './ComparisonColorUtils.js';
import {
  pushOutward,
  getAngle,
  getBundleAncestor,
  chooseBundlePoint
} from './ComparisonGeometryUtils.js';

/**
 * SubtreeConnectorBuilder
 * Prepares connector data for jumping subtrees between two trees.
 */
export function buildSubtreeConnectors(options) {
  var leftPositions = options.leftPositions;
  var rightPositions = options.rightPositions;
  var latticeSolutions = options.latticeSolutions;
  var pivotEdge = options.pivotEdge;
  var colorManager = options.colorManager;
  var subtreeTracking = options.subtreeTracking;
  var currentTreeIndex = options.currentTreeIndex;
  var markedSubtreesEnabled = options.markedSubtreesEnabled === undefined ? true : options.markedSubtreesEnabled;
  var linkConnectionOpacity = options.linkConnectionOpacity === undefined ? 0.6 : options.linkConnectionOpacity;
  var leftCenter = options.leftCenter || [0, 0];
  var rightCenter = options.rightCenter || [0, 0];
  var leftRadius = options.leftRadius;
  var rightRadius = options.rightRadius;
  var leftInfoById = buildInfoById(leftPositions);
  var rightInfoById = buildInfoById(rightPositions);

  var edgeKey = "[" + pivotEdge.join(", ") + "]";
  var flattenedSubtrees = flattenSplitSets(latticeSolutions[edgeKey] || []);
  if (flattenedSubtrees.length === 0) {
    return [];
  }

  var currentSubtreeSets = normalizeToSets(subtreeTracking[currentTreeIndex]);
  var jumpingSubtreeSets = flattenedSubtrees.map(function (st) {
    return new Set(normalizeSplitArray(st));
  });
  var rightLeavesByName = indexRightLeaves(rightPositions);

  var rawConnections = buildRawConnections({
    leftPositions: leftPositions,
    rightLeavesByName: rightLeavesByName,
    jumpingSubtreeSets: jumpingSubtreeSets,
    currentSubtreeSets: currentSubtreeSets,
    colorManager: colorManager,
    markedSubtreesEnabled: markedSubtreesEnabled,
    linkConnectionOpacity: linkConnectionOpacity
  });
  if (!rawConnections.length) {
    return [];
  }

  var sortedConnections = sortConnectionsByAngle(rawConnections, leftCenter, rightCenter);
  var split = splitActivePassive(sortedConnections);
  var activeConnections = split.activeConnections;
  var passiveConnections = split.passiveConnections;

  var passivePaths = buildBundledConnectorPaths({
    connections: passiveConnections,
    leftCenter: leftCenter,
    rightCenter: rightCenter,
    leftRadius: leftRadius,
    rightRadius: rightRadius,
    leftInfoById: leftInfoById,
    rightInfoById: rightInfoById,
    isActive: false,
    bundlingStrength: 0.85,
    width: 1.5
  });

  var activePaths = buildBundledConnectorPaths({
    connections: activeConnections,
    leftCenter: leftCenter,
    rightCenter: rightCenter,
    leftRadius: leftRadius,
    rightRadius: rightRadius,
    leftInfoById: leftInfoById,
    rightInfoById: rightInfoById,
    isActive: true,
    bundlingStrength: 0.5,
    width: 3.0,
    outwardPushFactor: 1.08
  });

  return passivePaths.concat(activePaths);
}

// ---------- helpers ----------

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
  // Find which jumping subtree this leaf belongs to
  var matchingSubtree = null;
  for (var i = 0; i < jumpingSubtreeSets.length; i++) {
    var subtreeSet = jumpingSubtreeSets[i];
    if (isSubsetOf(splitIndices, subtreeSet)) {
      matchingSubtree = subtreeSet;
      break;
    }
  }

  // If this leaf is part of a larger subtree, try to find the internal entry.
  if (matchingSubtree && splitIndices.length < matchingSubtree.size) {
    // Build the key for the internal entry representing the full subtree.
    // split_indices are always sorted ascending, so we must sort the subtree array
    var subtreeArray = Array.from(matchingSubtree).sort(function (a, b) { return a - b; });
    var internalKey = subtreeArray.join('-');

    if (leftPositions.has(internalKey)) {
      var internalInfo = leftPositions.get(internalKey);
      if (internalInfo) {
        return internalInfo;
      }
    }
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
  return array.every(function (element) {
    return set.has(element);
  });
}

// ========== Connection Object Creation ==========

/**
 * Create a standardized connection object.
 * @param {Object} params - Connection parameters
 * @returns {Object} Connection object with all properties
 */
function createConnectionObject(params) {
  var obj = {
    id: params.id,
    source: params.source,
    target: params.target,
    color: params.color,
    isCurrentlyMoving: params.isCurrentlyMoving,
    sourceInfo: params.sourceInfo,
    targetInfo: params.targetInfo
  };
  if (params.path !== undefined) {
    obj.path = params.path;
  }
  if (params.width !== undefined) {
    obj.width = params.width;
  }
  return obj;
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
    path: path,
    width: width
  });
}

// ========== Normalization Helpers ==========

function normalizeToSets(val) {
  if (!val) return [];

  // If it's already an array of arrays (list of subtrees), convert each to a Set
  if (Array.isArray(val)) {
    // Check if this is a list of subtrees: [[12, 13, 14], [20, 21]]
    if (val.length > 0 && Array.isArray(val[0])) {
      return val.map(function (subtree) {
        return new Set(normalizeSplitArray(subtree));
      });
    }
    // Single subtree as array: [12, 13, 14]
    return [new Set(normalizeSplitArray(val))];
  }

  // Single Set
  if (val instanceof Set) {
    return [val];
  }

  return [];
}

function indexRightLeaves(rightPositions) {
  var map = new Map();
  var iterator = rightPositions.entries();
  var entry = iterator.next();
  while (!entry.done) {
    var key = entry.value[0];
    var info = entry.value[1];
    if (info && info.isLeaf && info.name) {
      map.set(info.name, { key: key, info: info });
    }
    entry = iterator.next();
  }
  return map;
}

function normalizeSplitValue(val) {
  var num = Number(val);
  if (!isNaN(num)) {
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
  var result = [];
  for (var i = 0; i < arr.length; i += 1) {
    var v = normalizeSplitValue(arr[i]);
    if (v !== null) {
      result.push(v);
    }
  }
  return result;
}

function buildRawConnections(params) {
  var leftPositions = params.leftPositions;
  var rightLeavesByName = params.rightLeavesByName;
  var jumpingSubtreeSets = params.jumpingSubtreeSets;
  var currentSubtreeSets = params.currentSubtreeSets;
  var colorManager = params.colorManager;
  var markedSubtreesEnabled = params.markedSubtreesEnabled;
  var linkConnectionOpacity = params.linkConnectionOpacity;

  var connections = [];

  for (var entry of leftPositions.entries()) {
    var key = entry[0];
    var leftInfo = entry[1];

    if (!leftInfo.isLeaf || !leftInfo.name) continue;
    if (!leftInfo.position || leftInfo.position.length < 2) continue;

    var splitIndices = key.split('-')
      .map(function (val) { return normalizeSplitValue(val); })
      .filter(function (n) { return n !== null; });
    if (!splitIndices.length) continue;

    // Check if in jumping subtrees using isSubsetOf helper
    var inJumping = false;
    for (var i = 0; i < jumpingSubtreeSets.length; i += 1) {
      var subtreeSet = jumpingSubtreeSets[i];
      if (isSubsetOf(splitIndices, subtreeSet)) {
        inJumping = true;
        break;
      }
    }
    if (!inJumping) continue;

    var rightMatch = rightLeavesByName.get(leftInfo.name);
    if (!rightMatch) continue;
    if (!rightMatch.info.position || rightMatch.info.position.length < 2) continue;

    // Check if currently moving - check against ALL current subtrees
    var isCurrentlyMoving = false;
    if (currentSubtreeSets && currentSubtreeSets.length > 0) {
      for (var i = 0; i < currentSubtreeSets.length; i += 1) {
        if (isSubsetOf(splitIndices, currentSubtreeSets[i])) {
          isCurrentlyMoving = true;
          break;
        }
      }
    }

    var srcPos = [leftInfo.position[0], leftInfo.position[1], 0];
    var dstPos = [rightMatch.info.position[0], rightMatch.info.position[1], 0];

    var colorEntry = getColorEntry(leftInfo, splitIndices, jumpingSubtreeSets, leftPositions);
    var isPivotEdge = colorManager && typeof colorManager.isNodePivotEdge === 'function'
      && colorManager.isNodePivotEdge(colorEntry);
    var isHistorySubtree = colorManager && typeof colorManager.isNodeHistorySubtree === 'function'
      && colorManager.isNodeHistorySubtree(colorEntry);
    var effectiveMoving = isCurrentlyMoving || isPivotEdge || isHistorySubtree;
    var color = computeConnectionColor(colorEntry, effectiveMoving, colorManager, markedSubtreesEnabled, linkConnectionOpacity);

    // Use createConnectionObject helper
    connections.push(createConnectionObject({
      id: "connector-" + key + "-" + rightMatch.key,
      source: srcPos,
      target: dstPos,
      color: color,
      isCurrentlyMoving: effectiveMoving,
      sourceInfo: leftInfo,
      targetInfo: rightMatch.info
    }));
  }

  return connections;
}

function sortConnectionsByAngle(connections, leftCenter, rightCenter) {
  return connections.slice().sort(function (a, b) {
    var aSrc = getAngle(a.sourceInfo, leftCenter);
    var bSrc = getAngle(b.sourceInfo, leftCenter);
    if (aSrc !== bSrc) {
      return aSrc - bSrc;
    }
    var aDst = getAngle(a.targetInfo, rightCenter);
    var bDst = getAngle(b.targetInfo, rightCenter);
    return aDst - bDst;
  });
}

function splitActivePassive(connections) {
  var activeConnections = [];
  var passiveConnections = [];
  connections.forEach(function (conn) {
    if (conn.isCurrentlyMoving) {
      activeConnections.push(conn);
    } else {
      passiveConnections.push(conn);
    }
  });
  return { activeConnections: activeConnections, passiveConnections: passiveConnections };
}

// ========== Bundle Building ==========

/**
 * Build bundled connector paths for both active and passive connections.
 * Unified function that handles both modes with different styling parameters.
 * @param {Object} params - Configuration parameters
 * @returns {Array} Array of path objects
 */
function buildBundledConnectorPaths(params) {
  var connections = params.connections;
  var leftCenter = params.leftCenter;
  var rightCenter = params.rightCenter;
  var leftRadius = params.leftRadius;
  var rightRadius = params.rightRadius;
  var leftInfoById = params.leftInfoById;
  var rightInfoById = params.rightInfoById;
  var isActive = params.isActive;
  var bundlingStrength = params.bundlingStrength;
  var width = params.width;
  var outwardPushFactor = params.outwardPushFactor;

  if (!connections.length) {
    return [];
  }

  var results = [];

  if (isActive) {
    // Active connections: Calculate a SHARED bundle point for the entire group
    // This ensures visually coherent bundling instead of individual rays
    var srcBundlePoint = chooseBundlePoint(connections, null, leftCenter, leftRadius, true, leftInfoById);
    var dstBundlePoint = chooseBundlePoint(connections, null, rightCenter, rightRadius, false, rightInfoById);

    if (outwardPushFactor) {
      srcBundlePoint = pushOutward(srcBundlePoint, leftCenter, outwardPushFactor);
      dstBundlePoint = pushOutward(dstBundlePoint, rightCenter, outwardPushFactor);
    }

    connections.forEach(function (conn, idx) {
      // Use the shared bundle points for all paths in this active group
      var path = buildBundledBezierPath(
        conn.source,
        conn.target,
        srcBundlePoint,
        dstBundlePoint,
        24,
        {
          bundlingStrength: bundlingStrength,
          sourceCenter: leftCenter,
          targetCenter: rightCenter
        }
      );

      if (path.length) {
        results.push(createPathObject(conn, path, "-active-" + idx, width));
      }
    });
  } else {
    // Passive: group by bundle ancestors
    var groups = groupPassiveConnections(connections, leftInfoById, rightInfoById);

    groups.forEach(function (group) {
      var groupBundlePoint = chooseBundlePoint(
        group.connections,
        group.leftCenterEntry,
        leftCenter,
        leftRadius,
        true,
        leftInfoById
      );
      var groupDstBundlePoint = chooseBundlePoint(
        group.connections,
        group.rightCenterEntry,
        rightCenter,
        rightRadius,
        false,
        rightInfoById
      );

      group.connections.forEach(function (conn, idx) {
        var path = buildBundledBezierPath(
          conn.source,
          conn.target,
          groupBundlePoint,
          groupDstBundlePoint,
          24,
          {
            bundlingStrength: bundlingStrength,
            sourceCenter: leftCenter,
            targetCenter: rightCenter
          }
        );

        if (path.length) {
          results.push(createPathObject(conn, path, "-" + idx, width));
        }
      });
    });
  }

  return results;
}

function groupPassiveConnections(passiveConnections, leftInfoById, rightInfoById) {
  var groups = new Map();

  passiveConnections.forEach(function (conn) {
    var sourceInfo = conn.sourceInfo;
    var targetInfo = conn.targetInfo;
    if (!sourceInfo || !targetInfo) return;

    var leftBundleEntry = getBundleAncestor(sourceInfo, leftInfoById, 2) || getParentInfo(sourceInfo, leftInfoById);
    var rightBundleEntry = getBundleAncestor(targetInfo, rightInfoById, 2) || getParentInfo(targetInfo, rightInfoById);

    var leftKey = leftBundleEntry ? leftBundleEntry.id : 'rootL';
    var rightKey = rightBundleEntry ? rightBundleEntry.id : 'rootR';
    var groupKey = leftKey + "|" + rightKey;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        leftCenterEntry: leftBundleEntry,
        rightCenterEntry: rightBundleEntry,
        connections: []
      });
    }
    groups.get(groupKey).connections.push(conn);
  });

  return groups;
}

function buildInfoById(positionMap) {
  var map = new Map();
  if (!positionMap || typeof positionMap.values !== 'function') return map;
  for (var info of positionMap.values()) {
    var id = info && info.id;
    if (id) map.set(id, info);
  }
  return map;
}

function getParentInfo(info, infoById) {
  var parentId = info && info.parentId;
  return parentId && infoById ? infoById.get(parentId) : null;
}
