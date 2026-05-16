import { getEligibleConnectorSplitIndices } from './ConnectorSplitEligibility.js';

export function getConnectorLeafPairCandidate(params) {
  const {
    key,
    leftInfo,
    rightLeavesByName,
    jumpingSubtreeSets,
  } = params;

  if (!hasConnectorLeafPosition(leftInfo)) return null;

  const splitIndices = getEligibleConnectorSplitIndices(key, jumpingSubtreeSets);
  if (!splitIndices) return null;

  const rightMatch = rightLeavesByName.get(leftInfo.name);
  if (!rightMatch || !hasConnectorLeafPosition(rightMatch.info)) return null;

  return {
    leftKey: key,
    rightKey: rightMatch.key,
    leftInfo,
    rightInfo: rightMatch.info,
    splitIndices,
    source: [leftInfo.position[0], leftInfo.position[1], 0],
    target: [rightMatch.info.position[0], rightMatch.info.position[1], 0],
  };
}

function hasConnectorLeafPosition(info) {
  return Boolean(info.isLeaf && info.name && info.position && info.position.length >= 2);
}
