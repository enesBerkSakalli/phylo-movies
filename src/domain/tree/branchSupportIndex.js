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
  return compareIndexLists(split, complement) <= 0 ? split.join(',') : complement.join(',');
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
    return Number.isInteger(rounded)
      ? String(rounded)
      : String(rounded).replace(/0+$/, '').replace(/\.$/, '');
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

function canonicalAnnotationLeafLabel(field, fallbackLabel) {
  const method = field?.analysis?.method;
  if (
    method === 'bootstrap_replicate_split_frequency' ||
    method === 'bootstrap_replicate_subtree_frequency'
  ) {
    return 'Bootstrap split-frequency support';
  }
  return fallbackLabel;
}

function optionLabelForField(field, key) {
  const path = Array.isArray(field?.path) && field.path.length > 0 ? field.path : key.split('.');
  const parentPath = path.slice(0, -1);
  const fallbackLeafLabel =
    typeof field?.label === 'string' && field.label.length > 0
      ? field.label
      : titleCase(path[path.length - 1] ?? key);
  const leafLabel = canonicalAnnotationLeafLabel(field, fallbackLeafLabel);
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
    'support.iqtree.sh_alrt',
    'support.bootstrap.value',
    'support.bootstrap_rogue.frequency',
  ];
  for (const preferredPath of preferredPaths) {
    const field = fields.find((candidate) => getFieldPathKey(candidate) === preferredPath);
    if (field) return field;
  }
  return fields[0] ?? null;
}

function buildBranchAnnotationValue(key, field, support = null) {
  if (!field || typeof field !== 'object') return null;
  const displayValue = formatAnnotationFieldValue(field);
  if (!displayValue) return null;
  return {
    key,
    label: optionLabelForField(field, key),
    value: field.value,
    displayValue,
    role: typeof field.role === 'string' ? field.role : 'annotation',
    support,
  };
}

function buildSupportSummary(node) {
  const fields = Object.values(getAnnotationFields(node)).filter(isBranchSupportField);
  if (fields.length === 0) return null;

  const primaryField = selectPrimarySupportField(fields);
  const primaryFieldKey =
    Object.entries(getAnnotationFields(node)).find(([, field]) => field === primaryField)?.[0] ??
    null;
  const summary = {
    fieldKey: primaryFieldKey,
    label: primaryFieldKey ? optionLabelForField(primaryField, primaryFieldKey) : 'Branch Support',
    kind: primaryField?.analysis?.method ?? primaryField?.path?.[1] ?? 'branch_support',
    primary: Number(primaryField.value),
    displayValue: formatAnnotationFieldValue(primaryField),
  };

  for (const field of fields) {
    summary[supportSummaryKey(field)] = Number(field.value);
  }

  return summary;
}

function branchSupportToAnnotationValue(support) {
  if (!support || !Number.isFinite(Number(support.primary))) return null;
  return {
    key: support.fieldKey ?? 'branch_support.primary',
    label: support.label ?? 'Branch Support',
    value: support.primary,
    displayValue:
      support.displayValue ??
      formatCompactSupportNumber(support.primary) ??
      String(support.primary),
    role: 'branch_support',
    support,
  };
}

function isStrictSuperset(candidate, split) {
  if (candidate.length <= split.length) return false;
  const candidateSet = new Set(candidate);
  return split.every((index) => candidateSet.has(index));
}

function getBranchValue(record, valueKey) {
  if (!record) return null;
  if (valueKey && valueKey !== BRANCH_ANNOTATION_NONE) {
    return buildBranchAnnotationValue(valueKey, record.fields[valueKey], record.support);
  }
  return branchSupportToAnnotationValue(record.support);
}

function numericBranchValue(branchValue) {
  const value = Number(branchValue?.value);
  if (Number.isFinite(value)) return value;
  const support = Number(branchValue?.support?.primary);
  return Number.isFinite(support) ? support : null;
}

function collectSupport(node, allTaxaIndices, supportBySplit, branchRecords) {
  if (!node || typeof node !== 'object') return;

  const splitIndices = normalizeIndices(node.split_indices);
  const fields = getAnnotationFields(node);
  const support = buildSupportSummary(node);
  if (splitIndices.length > 0) {
    branchRecords.push({
      splitIndices,
      fields,
      support,
    });
  }

  if (support && Number.isFinite(Number(support.primary))) {
    const key = canonicalSupportSplitKey(node.split_indices, allTaxaIndices);
    if (key && !supportBySplit.has(key)) {
      supportBySplit.set(key, support);
    }
  }

  const children = Array.isArray(node.children) ? node.children : [];
  children.forEach((child) => collectSupport(child, allTaxaIndices, supportBySplit, branchRecords));
}

function getInputFrameRows(frames) {
  if (!Array.isArray(frames)) {
    throw new Error('buildBranchSupportIndex requires canonical timeline frames');
  }

  return frames.filter((frame, index) => {
    if (!frame || typeof frame !== 'object') {
      throw new Error(`buildBranchSupportIndex frames[${index}] must be a timeline frame row`);
    }
    return frame.frame_type === 'input_tree' || frame.is_observed_input === true;
  });
}

export function buildBranchSupportIndex({ interpolatedTrees, frames } = {}) {
  if (!Array.isArray(interpolatedTrees)) {
    throw new Error('buildBranchSupportIndex requires canonical interpolated_trees');
  }

  const supportByInputTree = new Map();
  const inputFrames = getInputFrameRows(frames);

  inputFrames.forEach((frame, index) => {
    if (!Number.isInteger(frame.frame_index)) {
      throw new Error(`buildBranchSupportIndex input frame ${index} must include frame_index`);
    }
    if (!Number.isInteger(frame.input_tree_index)) {
      throw new Error(`buildBranchSupportIndex input frame ${index} must include input_tree_index`);
    }

    const frameIndex = frame.frame_index;
    const inputTreeIndex = frame.input_tree_index;
    const tree = interpolatedTrees[frameIndex];
    if (!tree) {
      throw new Error(
        `buildBranchSupportIndex input frame ${index} references missing interpolated_trees[${frameIndex}]`
      );
    }

    const allTaxaIndices = normalizeIndices(tree.split_indices);
    const supportBySplit = new Map();
    const branchRecords = [];
    collectSupport(tree, allTaxaIndices, supportBySplit, branchRecords);
    branchRecords.sort((left, right) => left.splitIndices.length - right.splitIndices.length);
    const branchRecordBySplit = new Map();
    for (const record of branchRecords) {
      const key = canonicalSupportSplitKey(record.splitIndices, allTaxaIndices);
      if (key && !branchRecordBySplit.has(key)) {
        branchRecordBySplit.set(key, record);
      }
    }
    supportByInputTree.set(inputTreeIndex, {
      allTaxaIndices,
      supportBySplit,
      branchRecordBySplit,
      branchRecords,
    });
  });

  return {
    getSupport(inputTreeIndex, splitIndices) {
      const entry = supportByInputTree.get(inputTreeIndex);
      if (!entry) return null;
      const key = canonicalSupportSplitKey(splitIndices, entry.allTaxaIndices);
      return entry.supportBySplit.get(key) ?? null;
    },
    getBranchValue(inputTreeIndex, splitIndices, valueKey = BRANCH_ANNOTATION_NONE) {
      const entry = supportByInputTree.get(inputTreeIndex);
      if (!entry) return null;
      const key = canonicalSupportSplitKey(splitIndices, entry.allTaxaIndices);
      return getBranchValue(entry.branchRecordBySplit.get(key), valueKey);
    },
    getNearestParentBranchValue(inputTreeIndex, splitIndices, valueKey = BRANCH_ANNOTATION_NONE) {
      const entry = supportByInputTree.get(inputTreeIndex);
      if (!entry) return null;

      const split = normalizeIndices(splitIndices);
      if (split.length === 0) return null;

      for (const record of entry.branchRecords) {
        if (
          record.splitIndices.length >= entry.allTaxaIndices.length ||
          !isStrictSuperset(record.splitIndices, split)
        ) {
          continue;
        }
        const value = getBranchValue(record, valueKey);
        if (value) return value;
      }
      return null;
    },
    getNearestAncestorBranchValue(inputTreeIndex, splitIndices, valueKey = BRANCH_ANNOTATION_NONE) {
      return this.getNearestParentBranchValue(inputTreeIndex, splitIndices, valueKey);
    },
  };
}

export function formatSupportValue(support) {
  const value = Number(support?.primary);
  return Number.isFinite(value) ? value.toFixed(1) : '-';
}

export function classifyMovementBranchValues(
  sourceBranchValue,
  destinationBranchValue,
  threshold = 70
) {
  const source = numericBranchValue(sourceBranchValue);
  const destination = numericBranchValue(destinationBranchValue);
  if (!Number.isFinite(source) || !Number.isFinite(destination)) return 'value_missing';

  const sourceHigh = source >= threshold;
  const destinationHigh = destination >= threshold;
  if (sourceHigh && destinationHigh) return 'both_high_value';
  if (sourceHigh || destinationHigh) return 'mixed_value';
  return 'low_value';
}
