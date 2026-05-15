import { buildBundledBezierPath } from '../../builders/geometry/connectors/ConnectorGeometryBuilder.js';
import { flattenSplitSets, getBackendSplitMapValue } from '../../../utils/splitMatching.js';
import {
  normalizeConnectorSubtreeTrackingToSets,
  toConnectorSubtreeSetList
} from './ConnectorSplitNormalization.js';
import { buildRawConnectorConnections } from './ConnectorRawConnections.js';
import {
  pushOutward,
  getAngle,
  chooseBundlePoint
} from './ComparisonGeometryUtils.js';
import { groupPassiveConnectorConnections } from './ConnectorPassiveGroups.js';

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

  const solutionForPivot = getBackendSplitMapValue(latticeSolutions, pivotEdge);
  const flattenedSubtrees = flattenSplitSets(solutionForPivot || []);
  if (flattenedSubtrees.length === 0) {
    return [];
  }

  const jumpingSubtreeSets = toConnectorSubtreeSetList(flattenedSubtrees);
  const currentSubtreeSets = normalizeConnectorSubtreeTrackingToSets(subtreeTracking?.[currentTreeIndex]);
  const rawConnections = buildRawConnectorConnections({
    leftPositions,
    rightPositions,
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

  for (const group of groupPassiveConnectorConnections(connections, leftInfoById, rightInfoById)) {
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

function buildInfoById(positionMap) {
  const map = new Map();
  if (!positionMap || typeof positionMap.values !== 'function') return map;
  for (const info of positionMap.values()) {
    const id = info && info.id;
    if (id) map.set(id, info);
  }
  return map;
}
