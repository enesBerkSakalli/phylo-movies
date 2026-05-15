import { isSubset } from '../../../utils/splitMatching.js';
import { normalizeConnectorSplitValue } from './ConnectorSplitNormalization.js';

export function getConnectorSplitIndicesFromKey(key) {
  return key.split('-')
    .map((val) => normalizeConnectorSplitValue(val))
    .filter((value) => value !== null);
}

export function isConnectorSplitInAnySubtree(splitIndices, subtreeSets) {
  for (const subtreeSet of subtreeSets || []) {
    if (isSubset(splitIndices, subtreeSet)) return true;
  }
  return false;
}

export function getEligibleConnectorSplitIndices(key, subtreeSets) {
  const splitIndices = getConnectorSplitIndicesFromKey(key);
  if (!splitIndices.length) return null;
  if (!isConnectorSplitInAnySubtree(splitIndices, subtreeSets)) return null;
  return splitIndices;
}
