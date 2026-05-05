/**
 * Split index matching utilities.
 * Core functions for comparing tree elements based on split_indices arrays.
 */

export function getSplitIndices(element) {
  return getElementSplitIndices(element);
}

export function getElementSplitIndices(element) {
  return element?.split_indices || null;
}

export function getLinkSplitIndices(linkData) {
  return getElementSplitIndices(linkData);
}

export function toSplitSet(input, fallback = null) {
  if (input instanceof Set) return input;
  if (Array.isArray(input) && input.length > 0 && typeof input[0] === 'number') {
    return new Set(input);
  }
  return fallback;
}

export function splitsEqual(splitArray, splitSet) {
  if (!Array.isArray(splitArray) || !(splitSet instanceof Set)) return false;
  if (splitArray.length !== splitSet.size) return false;
  return splitArray.every(el => splitSet.has(el));
}

export function isSubset(smaller, larger) {
  if (!Array.isArray(smaller) || smaller.length === 0) return false;
  const largerSet = larger instanceof Set ? larger : new Set(larger);
  return smaller.length <= largerSet.size && smaller.every(x => largerSet.has(x));
}

export function isExactMatch(element, targetSet) {
  const splits = getSplitIndices(element);
  if (!splits || !targetSet) return false;
  return splitsEqual(splits, targetSet);
}

export function isSubsetOfAny(element, targetSets) {
  const splits = getSplitIndices(element);
  if (!splits || !targetSets?.length) return false;

  for (const target of targetSets) {
    if (isSubset(splits, target)) return true;
  }
  return false;
}

export function isLinkSubsetOfAny(linkData, targetSets) {
  const splits = getLinkSplitIndices(linkData);
  if (!splits || !targetSets?.length) return false;

  for (const target of targetSets) {
    if (isSubset(splits, target)) return true;
  }
  return false;
}

export function flattenSplitSets(entries) {
  if (!Array.isArray(entries)) return [];

  const flattened = [];
  const recurse = (items) => {
    if (!Array.isArray(items)) return;

    items.forEach(item => {
      if (item instanceof Set) {
        flattened.push(item);
      } else if (Array.isArray(item)) {
        if (item.length > 0 && typeof item[0] === 'number') {
          flattened.push(item);
        } else {
          recurse(item);
        }
      }
    });
  };

  recurse(entries);
  return flattened;
}

export function isLinkInSubtree(linkData, subtreeSets) {
  return isSubsetOfAny(linkData, subtreeSets);
}

export function isNodeInSubtree(nodeData, subtreeSets) {
  return isSubsetOfAny(nodeData, subtreeSets);
}

export function isNodeSubtreeRoot(nodeData, subtreeSets) {
  const splitIndices = getSplitIndices(nodeData);
  if (!splitIndices || !subtreeSets?.length) return false;

  for (const subtree of subtreeSets) {
    const subtreeSet = subtree instanceof Set ? subtree : new Set(subtree);
    if (splitIndices.length === subtreeSet.size && splitsEqual(splitIndices, subtreeSet)) {
      return true;
    }
  }
  return false;
}

export function toSubtreeKey(subtree) {
  let indices;
  if (subtree instanceof Set) {
    indices = subtree;
  } else if (Array.isArray(subtree)) {
    indices = subtree.flat(Infinity);
  } else {
    return String(subtree);
  }

  return getSplitHash(indices);
}

export function getSplitKey(elementOrSplits) {
  const indices = resolveSplitCollection(elementOrSplits);
  if (indices instanceof Set) {
    return indices.size > 0 ? toSubtreeKey(indices) : null;
  }
  if (Array.isArray(indices)) {
    return indices.length > 0 ? toSubtreeKey(indices) : null;
  }
  return null;
}

function resolveSplitCollection(elementOrSplits) {
  if (elementOrSplits instanceof Set || Array.isArray(elementOrSplits)) {
    return elementOrSplits;
  }
  return getElementSplitIndices(elementOrSplits);
}

export function getSplitHash(indices) {
  let hLow = 0;
  let hHigh = 0;

  for (const index of indices) {
    let v1 = index;
    v1 = ((v1 >> 16) ^ v1) * 0x45d9f3b;
    v1 = ((v1 >> 16) ^ v1) * 0x45d9f3b;
    v1 = (v1 >> 16) ^ v1;

    let v2 = index ^ 0xDEADBEEF;
    v2 = ((v2 >> 16) ^ v2) * 0x119de1f3;
    v2 = ((v2 >> 16) ^ v2) * 0x119de1f3;
    v2 = (v2 >> 16) ^ v2;

    hLow ^= v1;
    hHigh ^= v2;
  }

  const lowStr = (hLow >>> 0).toString(16).padStart(8, '0');
  const highStr = (hHigh >>> 0).toString(16).padStart(8, '0');

  return highStr + lowStr;
}

export function parseSubtreeTrackingEntry(entry) {
  if (!Array.isArray(entry) || entry.length === 0) return [];

  const subtrees = [];
  for (const item of entry) {
    const subtree = item instanceof Set ? Array.from(item) : item;
    if (!Array.isArray(subtree) || subtree.length === 0) return [];
    subtrees.push(subtree);
  }
  return subtrees;
}

export function collectUniqueEdges(tracking, start, end, excludeKey) {
  const map = new Map();
  for (let i = start; i < end; i++) {
    const edge = tracking[i];
    if (Array.isArray(edge) && edge.length > 0) {
      const key = toSubtreeKey(edge);
      if (key !== excludeKey && !map.has(key)) map.set(key, edge);
    }
  }
  return Array.from(map.values());
}

export function collectUniqueSubtrees(tracking, start, end, excludeKeys = new Set()) {
  const map = new Map();

  for (let i = start; i < end; i++) {
    const entry = tracking[i];
    if (!Array.isArray(entry) || entry.length === 0) continue;

    const subtrees = parseSubtreeTrackingEntry(entry);

    for (const subtree of subtrees) {
      const key = toSubtreeKey(subtree);
      if (!excludeKeys.has(key) && !map.has(key)) {
        map.set(key, subtree);
      }
    }
  }
  return Array.from(map.values());
}
