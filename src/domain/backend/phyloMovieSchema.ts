export interface TreeNode {
  name: string;
  length: number;
  split_indices: number[];
  children: TreeNode[];
  values?: Record<string, unknown>;
}

export interface TreeMetadata {
  global_tree_index: number;
  tree_pair_key: string | null;
  step_in_pair: number | null;
  reference_pair_tree_index: number | null;
  target_pair_tree_index: number | null;
  source_tree_global_index: number;
  target_tree_global_index: number | null;
  is_full_tree?: boolean;
}

export interface TreePairSolution {
  jumping_subtree_solutions: Record<string, number[][][]>;
  mapping_one?: Record<string, unknown>;
  mapping_two?: Record<string, unknown>;
  solution_to_source_map?: Record<string, unknown>;
  solution_to_destination_map?: Record<string, unknown>;
  ancestor_of_changing_splits?: number[];
  split_change_events?: unknown[];
}

export interface MsaData {
  sequences: Record<string, string> | null;
  window_size?: number;
  step_size?: number;
}

export interface PhyloMovieData {
  interpolated_trees: TreeNode[];
  tree_metadata: TreeMetadata[];
  distances: {
    robinson_foulds: number[];
    weighted_robinson_foulds: number[];
    [key: string]: unknown;
  };
  tree_pair_solutions: Record<string, TreePairSolution>;
  pair_interpolation_ranges: Array<[number, number]>;
  pivot_edge_tracking: Array<number[] | null>;
  subtree_tracking: Array<number[][] | null>;
  msa: MsaData;
  sorted_leaves: string[];
  file_name: string;
  split_change_events?: unknown[];
  split_change_timeline?: unknown[];
  [key: string]: unknown;
}

const REQUIRED_ARRAY_FIELDS = [
  'interpolated_trees',
  'tree_metadata',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertRecord(value: unknown, fieldName: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName} must be an object`);
  }
}

function assertArray(value: unknown, fieldName: string): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName} must be an array`);
  }
}

function requiredArray(value: unknown, fieldName: string): unknown[] {
  assertArray(value, fieldName);
  return value;
}

function requiredNumberArray(value: unknown, fieldName: string): number[] {
  const array = requiredArray(value, fieldName);
  for (const [index, item] of array.entries()) {
    if (typeof item !== 'number') {
      throw new Error(`Invalid phyloMovieData payload: ${fieldName}[${index}] must be a number`);
    }
  }
  return array as number[];
}

function requiredStringArray(value: unknown, fieldName: string): string[] {
  const array = requiredArray(value, fieldName);
  for (const [index, item] of array.entries()) {
    if (typeof item !== 'string') {
      throw new Error(`Invalid phyloMovieData payload: ${fieldName}[${index}] must be a string`);
    }
  }
  return array as string[];
}

function requiredRecord(value: unknown, fieldName: string): Record<string, unknown> {
  assertRecord(value, fieldName);
  return value;
}

function validateMsa(value: unknown): MsaData {
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

function validatePairInterpolationRanges(value: unknown): Array<[number, number]> {
  const ranges = requiredArray(value, 'pair_interpolation_ranges');
  for (const [index, range] of ranges.entries()) {
    if (
      !Array.isArray(range) ||
      range.length !== 2 ||
      typeof range[0] !== 'number' ||
      typeof range[1] !== 'number'
    ) {
      throw new Error(`Invalid phyloMovieData payload: pair_interpolation_ranges[${index}] must be [number, number]`);
    }
  }
  return ranges as Array<[number, number]>;
}

function validateDistances(value: unknown): PhyloMovieData['distances'] {
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

function validateNullableNumberArrayTracking(
  value: unknown,
  fieldName: string
): Array<number[] | null> {
  const tracking = requiredArray(value, fieldName);
  for (const [index, entry] of tracking.entries()) {
    if (entry === null) continue;
    requiredNumberArray(entry, `${fieldName}[${index}]`);
  }
  return tracking as Array<number[] | null>;
}

function validateSubtreeTracking(value: unknown): Array<number[][] | null> {
  const tracking = requiredArray(value, 'subtree_tracking');
  for (const [index, entry] of tracking.entries()) {
    if (entry === null) continue;
    const groups = requiredArray(entry, `subtree_tracking[${index}]`);
    for (const [groupIndex, group] of groups.entries()) {
      requiredNumberArray(group, `subtree_tracking[${index}][${groupIndex}]`);
    }
  }
  return tracking as Array<number[][] | null>;
}

function validateJumpingSubtreeSolutions(
  value: unknown,
  fieldName: string
): Record<string, number[][][]> {
  const solutions = requiredRecord(value, fieldName);

  for (const [pivotKey, solutionSets] of Object.entries(solutions)) {
    const sets = requiredArray(solutionSets, `${fieldName}.${pivotKey}`);
    for (const [setIndex, set] of sets.entries()) {
      const subtrees = requiredArray(set, `${fieldName}.${pivotKey}[${setIndex}]`);
      for (const [subtreeIndex, subtree] of subtrees.entries()) {
        requiredNumberArray(subtree, `${fieldName}.${pivotKey}[${setIndex}][${subtreeIndex}]`);
      }
    }
  }

  return solutions as Record<string, number[][][]>;
}

function validateTreePairSolutions(value: unknown): Record<string, TreePairSolution> {
  const pairSolutions = requiredRecord(value, 'tree_pair_solutions');

  for (const [pairKey, solution] of Object.entries(pairSolutions)) {
    assertRecord(solution, `tree_pair_solutions.${pairKey}`);
    solution.jumping_subtree_solutions = validateJumpingSubtreeSolutions(
      solution.jumping_subtree_solutions,
      `tree_pair_solutions.${pairKey}.jumping_subtree_solutions`
    );
  }

  return pairSolutions as Record<string, TreePairSolution>;
}

export function validatePhyloMovieData(data: unknown): PhyloMovieData {
  assertRecord(data, 'phyloMovieData');

  for (const field of REQUIRED_ARRAY_FIELDS) {
    assertArray(data[field], field);
  }

  const distances = validateDistances(data.distances);
  const treePairSolutions = validateTreePairSolutions(data.tree_pair_solutions);
  const pairInterpolationRanges = validatePairInterpolationRanges(data.pair_interpolation_ranges);
  const pivotEdgeTracking = validateNullableNumberArrayTracking(data.pivot_edge_tracking, 'pivot_edge_tracking');
  const subtreeTracking = validateSubtreeTracking(data.subtree_tracking);
  const sortedLeaves = requiredStringArray(data.sorted_leaves, 'sorted_leaves');
  const msa = validateMsa(data.msa);

  if (typeof data.file_name !== 'string') {
    throw new Error('Invalid phyloMovieData payload: file_name must be a string');
  }

  return {
    ...data,
    distances,
    tree_pair_solutions: treePairSolutions,
    pair_interpolation_ranges: pairInterpolationRanges,
    pivot_edge_tracking: pivotEdgeTracking,
    subtree_tracking: subtreeTracking,
    sorted_leaves: sortedLeaves,
    msa,
    file_name: data.file_name,
  } as PhyloMovieData;
}
