export function normalizeConnectorSplitValue(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const num = Number(value);
  if (!Number.isNaN(num)) {
    return num;
  }
  return String(value);
}

export function normalizeConnectorSplitArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  const result = [];
  for (const item of values) {
    const value = normalizeConnectorSplitValue(item);
    if (value !== null) {
      result.push(value);
    }
  }
  return result;
}

export function normalizeConnectorSubtreeTrackingToSets(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    if (value.length > 0 && Array.isArray(value[0])) {
      return value.map((subtree) => new Set(normalizeConnectorSplitArray(subtree)));
    }
    return [new Set(normalizeConnectorSplitArray(value))];
  }

  if (value instanceof Set) {
    return [value];
  }

  return [];
}

export function toConnectorSubtreeSetList(subtrees) {
  return subtrees.map((subtree) => new Set(normalizeConnectorSplitArray(subtree)));
}
