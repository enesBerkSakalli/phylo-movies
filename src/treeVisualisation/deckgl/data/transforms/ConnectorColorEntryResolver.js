import { isSubset, toSubtreeKey } from '../../../../domain/tree/splits.js';

export function resolveConnectorColorEntry(
  leftInfo,
  splitIndices,
  jumpingSubtreeSets,
  leftPositions
) {
  let matchingSubtree = null;
  for (const subtreeSet of jumpingSubtreeSets) {
    if (isSubset(splitIndices, subtreeSet)) {
      matchingSubtree = subtreeSet;
      break;
    }
  }

  if (matchingSubtree && splitIndices.length < matchingSubtree.size) {
    const internalInfo = leftPositions.get(toSubtreeKey(matchingSubtree));
    if (internalInfo) return internalInfo;
  }

  return leftInfo;
}
