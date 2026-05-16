import { getBundleAncestor } from './ComparisonGeometryUtils.js';
import { buildConnectorInfoById } from './ConnectorInfoIndex.js';

const ROOT_LEFT_GROUP_ID = 'rootL';
const ROOT_RIGHT_GROUP_ID = 'rootR';

export function groupPassiveConnectorConnections(passiveConnections, leftInfoById, rightInfoById) {
  const leftInfoMap = buildConnectorInfoById(leftInfoById);
  const rightInfoMap = buildConnectorInfoById(rightInfoById);
  const groups = new Map();

  passiveConnections.forEach((connection) => {
    const { sourceInfo, targetInfo } = connection;

    const leftBundleEntry = getBundleAncestor(sourceInfo, leftInfoMap, 2) || getParentInfo(sourceInfo, leftInfoMap);
    const rightBundleEntry = getBundleAncestor(targetInfo, rightInfoMap, 2) || getParentInfo(targetInfo, rightInfoMap);

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

function getParentInfo(info, infoById) {
  return info.parentId ? infoById.get(info.parentId) : null;
}
