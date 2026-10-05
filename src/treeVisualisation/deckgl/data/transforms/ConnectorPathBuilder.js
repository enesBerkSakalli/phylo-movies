import { buildBundledBezierPath } from '../../builders/geometry/connectors/ConnectorGeometryBuilder.js';
import { getBundleAncestor, pushOutward, chooseBundlePoint } from './ComparisonGeometryUtils.js';

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

const indexById = (positions) =>
  new Map(
    Array.from(positions.values())
      .filter((info) => info.id)
      .map((info) => [info.id, info])
  );

export function buildConnectorPathConnections(params) {
  const {
    activeConnections,
    passiveConnections,
    leftCenter,
    rightCenter,
    leftRadius,
    rightRadius,
    leftPositions,
    rightPositions,
  } = params;
  const leftInfoById = indexById(leftPositions);
  const rightInfoById = indexById(rightPositions);

  const passivePaths = buildBundledConnectorPaths({
    connectionGroups: groupPassiveConnections(passiveConnections, leftInfoById, rightInfoById),
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

    const activeGroups = groupActiveConnectorConnections(connections);
    activeGroups.forEach((group, groupIndex) => {
      let srcBundlePoint = chooseBundlePoint(
        group.connections,
        leftCenter,
        leftRadius,
        true,
        leftInfoById
      );
      let dstBundlePoint = chooseBundlePoint(
        group.connections,
        rightCenter,
        rightRadius,
        false,
        rightInfoById
      );

      if (outwardPushFactor) {
        srcBundlePoint = pushOutward(srcBundlePoint, leftCenter, outwardPushFactor);
        dstBundlePoint = pushOutward(dstBundlePoint, rightCenter, outwardPushFactor);
      }

      group.connections.forEach((connection, index) => {
        const path = buildPathForConnection(
          connection,
          srcBundlePoint,
          dstBundlePoint,
          leftCenter,
          rightCenter,
          bundlingStrength
        );

        if (path.length) {
          results.push({
            ...connection,
            id: `${connection.id}-active-${groupIndex}-${index}`,
            path,
            width,
          });
        }
      });
    });
    return results;
  }

  for (const group of connectionGroups) {
    const groupBundlePoint = chooseBundlePoint(
      group.connections,
      leftCenter,
      leftRadius,
      true,
      leftInfoById
    );
    const groupDstBundlePoint = chooseBundlePoint(
      group.connections,
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
        results.push({ ...connection, id: `${connection.id}-${index}`, path, width });
      }
    });
  }

  return results;
}

function groupPassiveConnections(connections, leftInfoById, rightInfoById) {
  const groups = new Map();

  connections.forEach((connection) => {
    const groupKey = `${getBundleAncestor(connection.sourceInfo, leftInfoById).id}|${
      getBundleAncestor(connection.targetInfo, rightInfoById).id
    }`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, { connections: [] });
    }
    groups.get(groupKey).connections.push(connection);
  });

  return Array.from(groups.values());
}

function groupActiveConnectorConnections(connections) {
  const groups = new Map();

  connections.forEach((connection, index) => {
    const groupKey = connection.bundleGroupKey || `active-${index}`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, { key: groupKey, connections: [] });
    }
    groups.get(groupKey).connections.push(connection);
  });

  return Array.from(groups.values());
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
