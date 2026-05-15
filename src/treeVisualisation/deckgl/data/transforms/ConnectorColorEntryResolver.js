import { isSubset } from '../../../utils/splitMatching.js';

export function resolveConnectorColorEntry(leftInfo, splitIndices, jumpingSubtreeSets, leftPositions) {
  let matchingSubtree = null;
  for (const subtreeSet of jumpingSubtreeSets) {
    if (isSubset(splitIndices, subtreeSet)) {
      matchingSubtree = subtreeSet;
      break;
    }
  }

  if (matchingSubtree && splitIndices.length < matchingSubtree.size) {
    const subtreeArray = Array.from(matchingSubtree).sort((a, b) => a - b);
    const internalInfo = leftPositions.get(subtreeArray.join('-'));
    if (internalInfo) return internalInfo;
  }

  return leftInfo;
}
