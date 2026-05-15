import { getBundleAncestor } from './ComparisonGeometryUtils.js';

const ROOT_LEFT_GROUP_ID = 'rootL';
const ROOT_RIGHT_GROUP_ID = 'rootR';

export function groupPassiveConnectorConnections(passiveConnections, leftInfoById, rightInfoById) {
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

function getParentInfo(info, infoById) {
  const parentId = info && info.parentId;
  return parentId && infoById ? infoById.get(parentId) : null;
}
