import type { MsaData, PhyloMovieData, TreeMetadata, TreeNode } from './phyloMovieTypes';
import {
  assertFiniteNumber,
  assertRecord,
  requiredArray,
  requiredNumberArray,
  requiredRecord,
  validateIndex,
  validateNullableNumber,
  validateParallelLength,
  validateRangeTuple,
} from './schemaValidation';

export function validateTreeNode(value: unknown, fieldName: string): TreeNode {
  assertRecord(value, fieldName);

  if (typeof value.name !== 'string') {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName}.name must be a string`);
  }

  assertFiniteNumber(value.length, `${fieldName}.length`);

  const splitIndices = requiredNumberArray(value.split_indices, `${fieldName}.split_indices`);
  if (splitIndices.length === 0) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName}.split_indices must not be empty`);
  }

  const children = requiredArray(value.children, `${fieldName}.children`);
  const validatedChildren = children.map((child, index) =>
    validateTreeNode(child, `${fieldName}.children[${index}]`)
  );

  return {
    name: value.name,
    length: value.length,
    split_indices: splitIndices,
    children: validatedChildren,
  } as TreeNode;
}

export function validateTreeList(value: unknown): TreeNode[] {
  const trees = requiredArray(value, 'interpolated_trees');
  return trees.map((tree, index) => validateTreeNode(tree, `interpolated_trees[${index}]`));
}

export function validateTreeMetadata(value: unknown, index: number): TreeMetadata {
  const metadata = requiredRecord(value, `tree_metadata[${index}]`);

  if (metadata.tree_pair_key !== null && typeof metadata.tree_pair_key !== 'string') {
    throw new Error(`Invalid phyloMovieData payload: tree_metadata[${index}].tree_pair_key must be a string or null`);
  }

  const stepInPair = validateNullableNumber(metadata.step_in_pair, `tree_metadata[${index}].step_in_pair`);
  const sourceTreeGlobalIndex = validateNullableNumber(
    metadata.source_tree_global_index,
    `tree_metadata[${index}].source_tree_global_index`
  );

  return {
    tree_pair_key: metadata.tree_pair_key,
    step_in_pair: stepInPair,
    source_tree_global_index: sourceTreeGlobalIndex,
  };
}

export function validateTreeMetadataList(value: unknown, treeCount: number): TreeMetadata[] {
  const metadata = requiredArray(value, 'tree_metadata');
  if (metadata.length !== treeCount) {
    throw new Error(
      `Invalid phyloMovieData payload: tree_metadata length (${metadata.length}) must match interpolated_trees length (${treeCount})`
    );
  }
  return metadata.map((entry, index) => validateTreeMetadata(entry, index));
}

export function validateMsa(value: unknown): MsaData {
  assertRecord(value, 'msa');

  const sequences = value.sequences;
  if (sequences !== undefined && sequences !== null) {
    assertRecord(sequences, 'msa.sequences');
    for (const [name, sequence] of Object.entries(sequences)) {
      if (typeof sequence !== 'string') {
        throw new Error(`Invalid phyloMovieData payload: msa.sequences.${name} must be a string`);
      }
    }
  }

  return value as unknown as MsaData;
}

export function validatePairInterpolationRanges(value: unknown, treeCount: number): Array<[number, number]> {
  const ranges = requiredArray(value, 'pair_interpolation_ranges');
  const validated: Array<[number, number]> = [];

  for (const [index, range] of ranges.entries()) {
    if (!Array.isArray(range) || range.length !== 2) {
      throw new Error(`Invalid phyloMovieData payload: pair_interpolation_ranges[${index}] must be [number, number]`);
    }

    const [start, end] = validateRangeTuple(range, `pair_interpolation_ranges[${index}]`);
    validateIndex(start, `pair_interpolation_ranges[${index}][0]`, treeCount);
    validateIndex(end, `pair_interpolation_ranges[${index}][1]`, treeCount);
    validated.push([start, end]);
  }

  return validated;
}

export function validateDistances(value: unknown): PhyloMovieData['distances'] {
  assertRecord(value, 'distances');

  return {
    ...value,
    robinson_foulds: requiredNumberArray(value.robinson_foulds, 'distances.robinson_foulds'),
    weighted_robinson_foulds: requiredNumberArray(
      value.weighted_robinson_foulds,
      'distances.weighted_robinson_foulds'
    ),
  };
}

export function validateNullableNumberArrayTracking(
  value: unknown,
  fieldName: string,
  treeCount: number
): Array<number[] | null> {
  const tracking = requiredArray(value, fieldName);
  validateParallelLength(tracking, fieldName, treeCount);
  for (const [index, entry] of tracking.entries()) {
    if (entry === null) continue;
    requiredNumberArray(entry, `${fieldName}[${index}]`);
  }
  return tracking as Array<number[] | null>;
}

export function validateSubtreeTracking(value: unknown, treeCount: number): Array<number[][] | null> {
  const tracking = requiredArray(value, 'subtree_tracking');
  validateParallelLength(tracking, 'subtree_tracking', treeCount);
  for (const [index, entry] of tracking.entries()) {
    if (entry === null) continue;
    const groups = requiredArray(entry, `subtree_tracking[${index}]`);
    for (const [groupIndex, group] of groups.entries()) {
      requiredNumberArray(group, `subtree_tracking[${index}][${groupIndex}]`);
    }
  }
  return tracking as Array<number[][] | null>;
}
