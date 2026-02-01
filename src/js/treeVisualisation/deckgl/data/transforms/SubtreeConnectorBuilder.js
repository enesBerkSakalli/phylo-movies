import { buildBundledBezierPath } from '../../builders/geometry/connectors/ConnectorGeometryBuilder.js';
import { flattenSubtreeEntries } from '../../../utils/splitMatching.js';
import { computeConnectionColor } from './ComparisonColorUtils.js';
import {
  pushOutward,
  getAngle,
  getBundleAncestor,
  chooseBundlePoint
} from './ComparisonGeometryUtils.js';
import { findLowestCommonAncestor } from '../../builders/geometry/connectors/CommonAncestorBuilder.js';

/**
 * SubtreeConnectorBuilder
 * Prepares connector data for jumping subtrees between two trees.
 */
export function buildSubtreeConnectors(options) {
  var leftPositions = options.leftPositions;
  var rightPositions = options.rightPositions;
  var latticeSolutions = options.latticeSolutions;
  var activeChangeEdge = options.activeChangeEdge;
  var colorManager = options.colorManager;
  var subtreeTracking = options.subtreeTracking;
  var currentTreeIndex = options.currentTreeIndex;
  var markedSubtreesEnabled = options.markedSubtreesEnabled === undefined ? true : options.markedSubtreesEnabled;
  var linkConnectionOpacity = options.linkConnectionOpacity === undefined ? 0.6 : options.linkConnectionOpacity;
  var leftCenter = options.leftCenter || [0, 0];
  var rightCenter = options.rightCenter || [0, 0];
  var leftRadius = options.leftRadius;
  var rightRadius = options.rightRadius;

  var edgeKey = "[" + activeChangeEdge.join(", ") + "]";
  var flattenedSubtrees = flattenSubtreeEntries(latticeSolutions[edgeKey] || []);
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
    rightPositions: rightPositions,
    leftCenter: leftCenter,
    rightCenter: rightCenter,
    leftRadius: leftRadius,
    rightRadius: rightRadius,
    isActive: false,
    bundlingStrength: 0.85,
    width: 1.5
  });

  var activePaths = buildBundledConnectorPaths({
    connections: activeConnections,
    rightPositions: rightPositions,
    leftCenter: leftCenter,
    rightCenter: rightCenter,
    leftRadius: leftRadius,
    rightRadius: rightRadius,
    isActive: true,
    bundlingStrength: 0.5,
    width: 3.0,
    outwardPushFactor: 1.08
  });

  return passivePaths.concat(activePaths);
}

// ---------- helpers ----------

// ========== Node Resolution ==========

/**
 * Resolve the original node reference from a node that may have been wrapped.
 * @param {Object} node - Node object that may have an originalNode property
 * @returns {Object|null} The originalNode if it exists, otherwise the node itself, or null
 */
function resolveOriginalNode(node) {
  if (!node) return null;
  return node.originalNode || node;
}

/**
 * Get the appropriate node for color determination.
 * For leaves that are part of a larger marked subtree, finds the internal node representing the full subtree.
 * @param {Object} leftInfo - Position map entry for the leaf
 * @param {Array} splitIndices - Split indices for the current leaf
 * @param {Array<Set>} jumpingSubtreeSets - Array of jumping subtree sets
 * @param {Map} leftPositions - Position map for left tree
 * @returns {Object} Node to use for color determination
 */
function getNodeForColor(leftInfo, splitIndices, jumpingSubtreeSets, leftPositions) {
  // Find which jumping subtree this leaf belongs to
  var matchingSubtree = null;
  for (var i = 0; i < jumpingSubtreeSets.length; i++) {
    var subtreeSet = jumpingSubtreeSets[i];
    if (isSubsetOf(splitIndices, subtreeSet)) {
      matchingSubtree = subtreeSet;
      break;
    }
  }

  // If this leaf is part of a larger subtree, try to find the internal node
  if (matchingSubtree && splitIndices.length < matchingSubtree.size) {
    // Build the key for the internal node representing the full subtree
    // split_indices are always sorted ascending, so we must sort the subtree array
    var subtreeArray = Array.from(matchingSubtree).sort(function (a, b) { return a - b; });
    var internalKey = subtreeArray.join('-');

    // Look up the internal node in the position map
    if (leftPositions.has(internalKey)) {
      var internalInfo = leftPositions.get(internalKey);
      if (internalInfo && internalInfo.node) {
        return resolveOriginalNode(internalInfo.node);
      }
    }
  }

  // Fallback to the leaf node
  return resolveOriginalNode(leftInfo.node) || leftInfo;
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
    sourceNode: params.sourceNode,
    targetNode: params.targetNode,
    targetNodeKey: params.targetNodeKey
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
 * @param {Array} path - Computed Bezier path array
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
    sourceNode: connection.sourceNode,
    targetNode: connection.targetNode,
    targetNodeKey: connection.targetNodeKey,
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

    // Use getNodeForColor to get the correct node for color determination (bug fix)
    var nodeForColor = getNodeForColor(leftInfo, splitIndices, jumpingSubtreeSets, leftPositions);
    var isActiveEdge = colorManager && typeof colorManager.isNodeActiveEdge === 'function'
      && colorManager.isNodeActiveEdge(nodeForColor);
    var isHistorySubtree = colorManager && typeof colorManager.isNodeHistorySubtree === 'function'
      && colorManager.isNodeHistorySubtree(nodeForColor);
    var effectiveMoving = isCurrentlyMoving || isActiveEdge || isHistorySubtree;
    var color = computeConnectionColor(nodeForColor, effectiveMoving, colorManager, markedSubtreesEnabled, linkConnectionOpacity);

    // Use createConnectionObject helper
    connections.push(createConnectionObject({
      id: "connector-" + key + "-" + rightMatch.key,
      source: srcPos,
      target: dstPos,
      color: color,
      isCurrentlyMoving: effectiveMoving,
      sourceNode: nodeForColor,
      targetNode: rightMatch.info.node || rightMatch.info,
      targetNodeKey: rightMatch.key
    }));
  }

  return connections;
}

function sortConnectionsByAngle(connections, leftCenter, rightCenter) {
  return connections.slice().sort(function (a, b) {
    var aSrc = getAngle(a.sourceNode || a.source, leftCenter);
    var bSrc = getAngle(b.sourceNode || b.source, leftCenter);
    if (aSrc !== bSrc) {
      return aSrc - bSrc;
    }
    var aDst = getAngle(a.targetNode || a.target, rightCenter);
    var bDst = getAngle(b.targetNode || b.target, rightCenter);
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
  var rightPositions = params.rightPositions;
  var leftCenter = params.leftCenter;
  var rightCenter = params.rightCenter;
  var leftRadius = params.leftRadius;
  var rightRadius = params.rightRadius;
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
    var srcBundlePoint = chooseBundlePoint(connections, null, leftCenter, leftRadius, true);
    var dstBundlePoint = chooseBundlePoint(connections, null, rightCenter, rightRadius, false);

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
    var groups = groupPassiveConnections(connections, rightPositions);

    groups.forEach(function (group) {
      var groupBundlePoint = chooseBundlePoint(
        group.connections,
        group.leftCenterNode,
        leftCenter,
        leftRadius,
        true
      );
      var groupDstBundlePoint = chooseBundlePoint(
        group.connections,
        group.rightCenterNode,
        rightCenter,
        rightRadius,
        false
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

function groupPassiveConnections(passiveConnections, rightPositions) {
  var groups = new Map();

  passiveConnections.forEach(function (conn) {
    var sourceNode = resolveOriginalNode(conn.sourceNode);
    var leftBundleNode = getBundleAncestor(sourceNode, 2) || (sourceNode && sourceNode.parent);

    var targetKey = conn.targetNodeKey || conn.targetKey || null;
    var rightNode = null;
    if (targetKey && rightPositions && rightPositions.has(targetKey)) {
      var rightEntry = rightPositions.get(targetKey);
      rightNode = resolveOriginalNode(rightEntry.node) || rightEntry;
    } else if (conn.targetNode) {
      rightNode = resolveOriginalNode(conn.targetNode);
    } else {
      return;
    }
    var rightBundleNode = getBundleAncestor(rightNode, 2) || (rightNode && rightNode.parent);

    var leftKey = leftBundleNode ? leftBundleNode.id || leftBundleNode.name : 'rootL';
    var rightKey = rightBundleNode ? rightBundleNode.id || rightBundleNode.name : 'rootR';
    var groupKey = leftKey + "|" + rightKey;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        leftCenterNode: leftBundleNode,
        rightCenterNode: rightBundleNode,
        connections: []
      });
    }
    groups.get(groupKey).connections.push(conn);
  });

  return groups;
}
