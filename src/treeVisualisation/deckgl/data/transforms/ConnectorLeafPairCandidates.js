import { getSplitIndices, isSubset } from '../../../../domain/tree/splits.js';

export function getConnectorLeafPairCandidate(params) {
  const {
    key,
    leftInfo,
    rightLeavesByName,
    jumpingSubtreeSets,
  } = params;

  if (!hasConnectorLeafPosition(leftInfo)) return null;

  const splitIndices = resolveCandidateSplitIndices(leftInfo, jumpingSubtreeSets);
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

function resolveCandidateSplitIndices(info, subtreeSets) {
  const splitIndices = getSplitIndices(info);
  if (!Array.isArray(splitIndices) || splitIndices.length === 0) return null;

  for (const subtreeSet of subtreeSets) {
    if (isSubset(splitIndices, subtreeSet)) return splitIndices;
  }
  return null;
}
