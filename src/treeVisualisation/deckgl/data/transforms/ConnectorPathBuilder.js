import { buildBundledBezierPath } from '../../builders/geometry/connectors/ConnectorGeometryBuilder.js';
import { pushOutward, chooseBundlePoint } from './ComparisonGeometryUtils.js';
import { createConnectorPathConnection } from './ConnectorConnectionObjects.js';
import { buildConnectorInfoById } from './ConnectorInfoIndex.js';

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

export function buildConnectorPathConnections(params) {
  const {
    activeConnections,
    passiveConnectionGroups = [],
    leftCenter,
    rightCenter,
    leftRadius,
    rightRadius,
    leftPositions,
    rightPositions,
  } = params;
  const leftInfoById = buildConnectorInfoById(leftPositions);
  const rightInfoById = buildConnectorInfoById(rightPositions);

  const passivePaths = buildBundledConnectorPaths({
    connectionGroups: passiveConnectionGroups,
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

function buildBundledConnectorPaths(params) {
  const {
    connections = [],
    connectionGroups = [],
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

  const results = [];

  if (isActive) {
    if (!connections.length) {
      return [];
    }

    let srcBundlePoint = chooseBundlePoint(
      connections,
      null,
      leftCenter,
      leftRadius,
      true,
      leftInfoById
    );
    let dstBundlePoint = chooseBundlePoint(
      connections,
      null,
      rightCenter,
      rightRadius,
      false,
      rightInfoById
    );

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
        results.push(createConnectorPathConnection(connection, path, `-active-${index}`, width));
      }
    });
    return results;
  }

  for (const group of connectionGroups) {
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
        results.push(createConnectorPathConnection(connection, path, `-${index}`, width));
      }
    });
  }

  return results;
}

function buildPathForConnection(
  connection,
  srcBundlePoint,
  dstBundlePoint,
  leftCenter,
  rightCenter,
  bundlingStrength
) {
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
