import { isSubset } from '../../../../domain/tree/splits.js';

export function isConnectorSplitInAnySubtree(splitIndices, subtreeSets) {
  for (const subtreeSet of subtreeSets) {
    if (isSubset(splitIndices, subtreeSet)) return true;
  }
  return false;
}
