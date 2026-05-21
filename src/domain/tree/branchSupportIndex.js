function normalizeIndices(indices) {
  return Array.from(new Set(Array.isArray(indices) ? indices : []))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
}

export const BRANCH_ANNOTATION_NONE = 'none';

function compareIndexLists(left, right) {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return left.length - right.length;
}

export function canonicalSupportSplitKey(splitIndices, allTaxaIndices) {
  const split = normalizeIndices(splitIndices);
  if (split.length === 0) return '';

  const allTaxa = normalizeIndices(allTaxaIndices);
  if (allTaxa.length === 0 || split.length === allTaxa.length) {
    return split.join(',');
  }

  const splitSet = new Set(split);
  const complement = allTaxa.filter((index) => !splitSet.has(index));
  if (complement.length === 0) return split.join(',');
  if (split.length < complement.length) return split.join(',');
  if (complement.length < split.length) return complement.join(',');
  return compareIndexLists(split, complement) <= 0
    ? split.join(',')
    : complement.join(',');
}

function getAnnotationFields(node) {
  const fields = node?.annotations?.fields;
  return fields && typeof fields === 'object' ? fields : {};
}

function formatCompactSupportNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const rounded = Math.round(numeric * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatScalarAnnotationValue(value) {
  if (value === null || value === undefined) return '';
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    const rounded = Math.round(numeric * 10000) / 10000;
    return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/0+$/, '').replace(/\.$/, '');
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const formatted = value.map(formatScalarAnnotationValue).filter(Boolean);
    return formatted.length > 0 ? formatted.join('/') : '';
  }
  return '';
}

function formatAnnotationFieldValue(field) {
  if (!field || typeof field !== 'object') return '';
  if (field.role === 'branch_support') {
    return formatCompactSupportNumber(field.value) ?? formatScalarAnnotationValue(field.value);
  }
  return formatScalarAnnotationValue(field.value);
}

function titleCase(value) {
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function pathLabel(path = []) {
  return path.map(titleCase).filter(Boolean).join(' / ');
}

function optionLabelForField(field, key) {
  const path = Array.isArray(field?.path) && field.path.length > 0 ? field.path : key.split('.');
  const parentPath = path.slice(0, -1);
  const leafLabel = typeof field?.label === 'string' && field.label.length > 0
    ? field.label
    : titleCase(path[path.length - 1] ?? key);
  const prefix = pathLabel(parentPath);
  return prefix ? `${prefix} / ${leafLabel}` : leafLabel;
}

export function formatBranchAnnotationLabel(source, fieldKey = BRANCH_ANNOTATION_NONE) {
  if (!fieldKey || fieldKey === BRANCH_ANNOTATION_NONE) return '';
  return formatAnnotationFieldValue(getAnnotationFields(source)[fieldKey]);
}

function collectAnnotationOptionKeys(node, optionsByKey) {
  const fields = getAnnotationFields(node);
  for (const [key, field] of Object.entries(fields)) {
    if (!formatAnnotationFieldValue(field)) continue;
    if (!optionsByKey.has(key)) {
      optionsByKey.set(key, {
        value: key,
        label: optionLabelForField(field, key),
        path: Array.isArray(field?.path) ? field.path : key.split('.'),
        role: typeof field?.role === 'string' ? field.role : 'annotation',
      });
    }
  }

  const children = Array.isArray(node?.children) ? node.children : [];
  children.forEach((child) => collectAnnotationOptionKeys(child, optionsByKey));
}

function compareAnnotationOptions(left, right) {
  const leftPath = Array.isArray(left.path) ? left.path.join('.') : left.value;
  const rightPath = Array.isArray(right.path) ? right.path.join('.') : right.value;
  return leftPath.localeCompare(rightPath);
}

export function getAvailableBranchAnnotationOptions(trees = []) {
  const optionsByKey = new Map();
  const treeList = Array.isArray(trees) ? trees : [];
  treeList.forEach((tree) => collectAnnotationOptionKeys(tree, optionsByKey));

  return [
    { value: BRANCH_ANNOTATION_NONE, label: 'None', path: [], role: 'control' },
    ...Array.from(optionsByKey.values()).sort(compareAnnotationOptions),
  ];
}

function getFieldPathKey(field) {
  return Array.isArray(field?.path) ? field.path.join('.') : '';
}

function isBranchSupportField(field) {
  return field?.role === 'branch_support' && Number.isFinite(Number(field.value));
}

function supportSummaryKey(field) {
  const path = Array.isArray(field?.path) ? field.path : [];
  const leaf = path[path.length - 1] ?? 'value';
  if (leaf === 'value' && path.length >= 2) return path[path.length - 2];
  return leaf;
}

function selectPrimarySupportField(fields) {
  const preferredPaths = [
    'support.iqtree.ufboot',
    'support.bootstrap.value',
    'support.bootstrap_rogue.frequency',
  ];
  for (const preferredPath of preferredPaths) {
    const field = fields.find((candidate) => getFieldPathKey(candidate) === preferredPath);
    if (field) return field;
  }
  return fields[0] ?? null;
}

function buildSupportSummary(node) {
  const fields = Object.values(getAnnotationFields(node)).filter(isBranchSupportField);
  if (fields.length === 0) return null;

  const primaryField = selectPrimarySupportField(fields);
  const summary = {
    kind: primaryField?.analysis?.method ?? primaryField?.path?.[1] ?? 'branch_support',
    primary: Number(primaryField.value),
  };

  for (const field of fields) {
    summary[supportSummaryKey(field)] = Number(field.value);
  }

  return summary;
}

function collectSupport(node, allTaxaIndices, map) {
  if (!node || typeof node !== 'object') return;

  const support = buildSupportSummary(node);
  if (support && Number.isFinite(Number(support.primary))) {
    const key = canonicalSupportSplitKey(node.split_indices, allTaxaIndices);
    if (key && !map.has(key)) {
      map.set(key, support);
    }
  }

  const children = Array.isArray(node.children) ? node.children : [];
  children.forEach((child) => collectSupport(child, allTaxaIndices, map));
}

function getInputFrameRows(frames, treeCount) {
  if (Array.isArray(frames) && frames.length > 0) {
    return frames.filter((frame) => frame?.frame_type === 'input_tree' || frame?.is_observed_input === true);
  }

  return Array.from({ length: treeCount }, (_, index) => ({
    frame_index: index,
    input_tree_index: index,
  }));
}

export function buildBranchSupportIndex({ interpolatedTrees = [], frames = [] } = {}) {
  const supportByInputTree = new Map();
  const inputFrames = getInputFrameRows(frames, interpolatedTrees.length);

  inputFrames.forEach((frame, fallbackIndex) => {
    const frameIndex = Number.isInteger(frame.frame_index) ? frame.frame_index : fallbackIndex;
    const inputTreeIndex = Number.isInteger(frame.input_tree_index) ? frame.input_tree_index : fallbackIndex;
    const tree = interpolatedTrees[frameIndex];
    if (!tree) return;

    const allTaxaIndices = normalizeIndices(tree.split_indices);
    const supportBySplit = new Map();
    collectSupport(tree, allTaxaIndices, supportBySplit);
    supportByInputTree.set(inputTreeIndex, { allTaxaIndices, supportBySplit });
  });

  return {
    getSupport(inputTreeIndex, splitIndices) {
      const entry = supportByInputTree.get(inputTreeIndex);
      if (!entry) return null;
      const key = canonicalSupportSplitKey(splitIndices, entry.allTaxaIndices);
      return entry.supportBySplit.get(key) ?? null;
    },
  };
}

export function formatSupportValue(support) {
  const value = Number(support?.primary);
  return Number.isFinite(value) ? value.toFixed(1) : '-';
}

export function classifyMovementSupport(sourceSupport, destinationSupport, threshold = 70) {
  const source = Number(sourceSupport?.primary);
  const destination = Number(destinationSupport?.primary);
  if (!Number.isFinite(source) || !Number.isFinite(destination)) return 'support_missing';

  const sourceHigh = source >= threshold;
  const destinationHigh = destination >= threshold;
  if (sourceHigh && destinationHigh) return 'high_support_conflict';
  if (sourceHigh || destinationHigh) return 'mixed_support';
  return 'low_support';
}
