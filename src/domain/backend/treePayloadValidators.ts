import type { MsaData, PhyloMovieData, TreeMetadata, TreeNode } from './phyloMovieTypes';
import {
  assertExactRecordKeys,
  assertFiniteNumber,
  assertRecord,
  requiredArray,
  requiredNumberArray,
  requiredRecord,
  validateInteger,
  validateIndex,
  validateNullableInteger,
  validateParallelLength,
  validateRangeTuple,
} from './schemaValidation';

function validateTreeNode(value: unknown, fieldName: string): TreeNode {
  assertRecord(value, fieldName);
  assertExactRecordKeys(value, fieldName, ['name', 'length', 'split_indices', 'children']);

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

function validateTreeMetadata(value: unknown, index: number): TreeMetadata {
  const metadata = requiredRecord(value, `tree_metadata[${index}]`);
  assertExactRecordKeys(metadata, `tree_metadata[${index}]`, [
    'tree_pair_key',
    'step_in_pair',
    'source_tree_global_index',
    'frame_type',
    'state_semantics',
    'is_observed_input',
  ]);

  if (metadata.tree_pair_key !== null && typeof metadata.tree_pair_key !== 'string') {
    throw new Error(`Invalid phyloMovieData payload: tree_metadata[${index}].tree_pair_key must be a string or null`);
  }

  const stepInPair = validateNullableInteger(metadata.step_in_pair, `tree_metadata[${index}].step_in_pair`);
  const sourceTreeGlobalIndex = validateNullableInteger(
    metadata.source_tree_global_index,
    `tree_metadata[${index}].source_tree_global_index`
  );
  const frameType = validateTreeFrameType(metadata.frame_type, index);
  const stateSemantics = validateTreeStateSemantics(metadata.state_semantics, index);
  const isObservedInput = validateBoolean(
    metadata.is_observed_input,
    `tree_metadata[${index}].is_observed_input`
  );

  return {
    tree_pair_key: metadata.tree_pair_key,
    step_in_pair: stepInPair,
    source_tree_global_index: sourceTreeGlobalIndex,
    frame_type: frameType,
    state_semantics: stateSemantics,
    is_observed_input: isObservedInput,
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
  assertExactRecordKeys(value, 'msa', ['sequences', 'window_size', 'step_size']);

  const sequences = value.sequences;
  let validatedSequences: Record<string, string> | null = null;
  if (sequences === undefined) {
    throw new Error('Invalid phyloMovieData payload: msa.sequences must be an object or null');
  }
  if (sequences !== null) {
    assertRecord(sequences, 'msa.sequences');
    validatedSequences = {};
    for (const [name, sequence] of Object.entries(sequences)) {
      if (typeof sequence !== 'string') {
        throw new Error(`Invalid phyloMovieData payload: msa.sequences.${name} must be a string`);
      }
      validatedSequences[name] = sequence;
    }
  }

  const windowSize = validateInteger(value.window_size, 'msa.window_size');
  if (windowSize <= 0) {
    throw new Error('Invalid phyloMovieData payload: msa.window_size must be positive');
  }

  const stepSize = validateInteger(value.step_size, 'msa.step_size');
  if (stepSize <= 0) {
    throw new Error('Invalid phyloMovieData payload: msa.step_size must be positive');
  }

  return {
    sequences: validatedSequences,
    window_size: windowSize,
    step_size: stepSize,
  };
}

export function validatePairInterpolationRanges(value: unknown, treeCount: number): Array<[number, number]> {
  const ranges = requiredArray(value, 'pair_interpolation_ranges');
  if (treeCount > 0 && ranges.length === 0) {
    throw new Error('Invalid phyloMovieData payload: pair_interpolation_ranges must not be empty');
  }
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
  assertExactRecordKeys(value, 'distances', [
    'robinson_foulds',
    'weighted_robinson_foulds',
    'semantics',
  ]);

  const validated: PhyloMovieData['distances'] = {
    robinson_foulds: requiredNumberArray(value.robinson_foulds, 'distances.robinson_foulds'),
    weighted_robinson_foulds: requiredNumberArray(
      value.weighted_robinson_foulds,
      'distances.weighted_robinson_foulds'
    ),
  };

  const semantics = validateDistanceSemantics(value.semantics);
  if (semantics !== undefined) {
    validated.semantics = semantics;
  }

  return validated;
}

function validateTreeFrameType(value: unknown, index: number): TreeMetadata['frame_type'] {
  if (value !== 'input_tree' && value !== 'interpolation_frame') {
    throw new Error(
      `Invalid phyloMovieData payload: tree_metadata[${index}].frame_type must be input_tree or interpolation_frame`
    );
  }
  return value;
}

function validateTreeStateSemantics(value: unknown, index: number): TreeMetadata['state_semantics'] {
  if (value !== 'processed_input_tree' && value !== 'algorithmic_intermediate') {
    throw new Error(
      `Invalid phyloMovieData payload: tree_metadata[${index}].state_semantics must be processed_input_tree or algorithmic_intermediate`
    );
  }
  return value;
}

function validateBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName} must be a boolean`);
  }
  return value;
}

function validateOptionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName} must be a boolean`);
  }
  return value;
}

function validateOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName} must be a string`);
  }
  return value;
}

function validateDistanceSemantics(value: unknown): PhyloMovieData['distances']['semantics'] {
  if (value === undefined) return undefined;
  assertRecord(value, 'distances.semantics');
  assertExactRecordKeys(value, 'distances.semantics', [
    'robinson_foulds',
    'weighted_robinson_foulds',
  ]);

  const semantics: NonNullable<PhyloMovieData['distances']['semantics']> = {};

  if (value.robinson_foulds !== undefined) {
    assertRecord(value.robinson_foulds, 'distances.semantics.robinson_foulds');
    assertExactRecordKeys(value.robinson_foulds, 'distances.semantics.robinson_foulds', [
      'topology',
      'normalization',
      'scope',
    ]);
    semantics.robinson_foulds = {};

    const topology = validateOptionalString(
      value.robinson_foulds.topology,
      'distances.semantics.robinson_foulds.topology'
    );
    const normalization = validateOptionalString(
      value.robinson_foulds.normalization,
      'distances.semantics.robinson_foulds.normalization'
    );
    const scope = validateOptionalString(
      value.robinson_foulds.scope,
      'distances.semantics.robinson_foulds.scope'
    );

    if (topology !== undefined) semantics.robinson_foulds.topology = topology;
    if (normalization !== undefined) semantics.robinson_foulds.normalization = normalization;
    if (scope !== undefined) semantics.robinson_foulds.scope = scope;
  }

  if (value.weighted_robinson_foulds !== undefined) {
    assertRecord(
      value.weighted_robinson_foulds,
      'distances.semantics.weighted_robinson_foulds'
    );
    assertExactRecordKeys(value.weighted_robinson_foulds, 'distances.semantics.weighted_robinson_foulds', [
      'topology',
      'includes_branch_lengths',
      'includes_terminal_and_root_splits',
      'scope',
    ]);
    semantics.weighted_robinson_foulds = {};

    const topology = validateOptionalString(
      value.weighted_robinson_foulds.topology,
      'distances.semantics.weighted_robinson_foulds.topology'
    );
    const includesBranchLengths = validateOptionalBoolean(
      value.weighted_robinson_foulds.includes_branch_lengths,
      'distances.semantics.weighted_robinson_foulds.includes_branch_lengths'
    );
    const includesTerminalAndRootSplits = validateOptionalBoolean(
      value.weighted_robinson_foulds.includes_terminal_and_root_splits,
      'distances.semantics.weighted_robinson_foulds.includes_terminal_and_root_splits'
    );
    const scope = validateOptionalString(
      value.weighted_robinson_foulds.scope,
      'distances.semantics.weighted_robinson_foulds.scope'
    );

    if (topology !== undefined) semantics.weighted_robinson_foulds.topology = topology;
    if (includesBranchLengths !== undefined) {
      semantics.weighted_robinson_foulds.includes_branch_lengths = includesBranchLengths;
    }
    if (includesTerminalAndRootSplits !== undefined) {
      semantics.weighted_robinson_foulds.includes_terminal_and_root_splits = includesTerminalAndRootSplits;
    }
    if (scope !== undefined) semantics.weighted_robinson_foulds.scope = scope;
  }

  return semantics;
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

export function validateSubtreeHighlightTracking(value: unknown, treeCount: number): Array<number[][] | null> {
  const fieldName = 'subtree_highlight_tracking';
  const tracking = requiredArray(value, fieldName);
  validateParallelLength(tracking, fieldName, treeCount);
  for (const [index, entry] of tracking.entries()) {
    if (entry === null) continue;
    const groups = requiredArray(entry, `${fieldName}[${index}]`);
    for (const [groupIndex, group] of groups.entries()) {
      requiredNumberArray(group, `${fieldName}[${index}][${groupIndex}]`);
    }
  }
  return tracking as Array<number[][] | null>;
}
