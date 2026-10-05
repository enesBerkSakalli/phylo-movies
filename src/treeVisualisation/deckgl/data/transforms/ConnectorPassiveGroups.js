import { getBundleAncestor } from './ComparisonGeometryUtils.js';
import { buildConnectorInfoById } from './ConnectorInfoIndex.js';

export function groupPassiveConnectorConnections(passiveConnections, leftInfoById, rightInfoById) {
  const leftInfoMap = buildConnectorInfoById(leftInfoById);
  const rightInfoMap = buildConnectorInfoById(rightInfoById);
  const groups = new Map();

  passiveConnections.forEach((connection) => {
    const { sourceInfo, targetInfo } = connection;
    const groupKey = `${getBundleAncestor(sourceInfo, leftInfoMap, 2).id}|${
      getBundleAncestor(targetInfo, rightInfoMap, 2).id
    }`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, { connections: [] });
    }
    groups.get(groupKey).connections.push(connection);
  });

  return Array.from(groups.values());
}
