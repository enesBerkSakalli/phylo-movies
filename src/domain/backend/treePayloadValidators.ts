import type {
  MsaData,
  PairMetricRow,
  PairMetrics,
  PhyloMovieData,
  SplitChangeTemporalEvent,
  SprMoveTemporalEvent,
  TemporalEvent,
  TimelineFrame,
  TimelinePair,
  TreeNode,
} from './phyloMovieTypes';
import {
  assertExactRecordKeys,
  assertFiniteNumber,
  assertRecord,
  requiredArray,
  requiredNumberArray,
  requiredRecord,
  validateIndex,
  validateInteger,
  validateNullableInteger,
  validateParallelLength,
  validateRangeTuple,
} from './schemaValidation';
import { validateHighlightGroup, validatePairSolution, validateSprPath } from './solutionValidators';

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
  };
}

export function validateTreeList(value: unknown): TreeNode[] {
  const trees = requiredArray(value, 'interpolated_trees');
  return trees.map((tree, index) => validateTreeNode(tree, `interpolated_trees[${index}]`));
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

function validateFrameType(value: unknown, fieldName: string): TimelineFrame['frame_type'] {
  if (value !== 'input_tree' && value !== 'interpolation_frame') {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName} must be input_tree or interpolation_frame`);
  }
  return value;
}

function validateFrameSemantics(value: unknown, fieldName: string): TimelineFrame['state_semantics'] {
  if (value !== 'processed_input_tree' && value !== 'algorithmic_intermediate') {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName} must be processed_input_tree or algorithmic_intermediate`);
  }
  return value;
}

function validateBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName} must be a boolean`);
  }
  return value;
}

function validateNullableString(value: unknown, fieldName: string): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName} must be a string or null`);
  }
  return value;
}

function validateFrame(value: unknown, index: number, treeCount: number): TimelineFrame {
  const fieldName = `frames[${index}]`;
  const frame = requiredRecord(value, fieldName);
  assertExactRecordKeys(frame, fieldName, [
    'frame_index',
    'frame_type',
    'state_semantics',
    'is_observed_input',
    'input_tree_index',
    'pair_id',
    'pair_ordinal',
    'local_step_index',
    'source_frame_index',
    'target_frame_index',
  ]);

  const frameIndex = validateIndex(frame.frame_index, `${fieldName}.frame_index`, treeCount);
  if (frameIndex !== index) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName}.frame_index must equal ${index}`);
  }

  return {
    frame_index: frameIndex,
    frame_type: validateFrameType(frame.frame_type, `${fieldName}.frame_type`),
    state_semantics: validateFrameSemantics(frame.state_semantics, `${fieldName}.state_semantics`),
    is_observed_input: validateBoolean(frame.is_observed_input, `${fieldName}.is_observed_input`),
    input_tree_index: validateNullableInteger(frame.input_tree_index, `${fieldName}.input_tree_index`),
    pair_id: validateNullableString(frame.pair_id, `${fieldName}.pair_id`),
    pair_ordinal: validateNullableInteger(frame.pair_ordinal, `${fieldName}.pair_ordinal`),
    local_step_index: validateNullableInteger(frame.local_step_index, `${fieldName}.local_step_index`),
    source_frame_index: validateNullableInteger(frame.source_frame_index, `${fieldName}.source_frame_index`),
    target_frame_index: validateNullableInteger(frame.target_frame_index, `${fieldName}.target_frame_index`),
  };
}

export function validateFrames(value: unknown, treeCount: number): TimelineFrame[] {
  const frames = requiredArray(value, 'frames');
  validateParallelLength(frames, 'frames', treeCount);
  return frames.map((frame, index) => validateFrame(frame, index, treeCount));
}

function validateGeneratedFrameRange(value: unknown, fieldName: string, treeCount: number): [number, number] | null {
  if (value === null) return null;
  const range = validateRangeTuple(value, fieldName);
  validateIndex(range[0], `${fieldName}[0]`, treeCount);
  validateIndex(range[1], `${fieldName}[1]`, treeCount);
  return range;
}

function validatePair(value: unknown, index: number, treeCount: number): TimelinePair {
  const fieldName = `pairs[${index}]`;
  const pair = requiredRecord(value, fieldName);
  assertExactRecordKeys(pair, fieldName, [
    'pair_id',
    'pair_ordinal',
    'source_input_tree_index',
    'target_input_tree_index',
    'source_frame_index',
    'target_frame_index',
    'generated_frame_range',
    'solution',
  ]);

  if (typeof pair.pair_id !== 'string' || pair.pair_id.length === 0) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName}.pair_id must be a non-empty string`);
  }

  return {
    pair_id: pair.pair_id,
    pair_ordinal: validateInteger(pair.pair_ordinal, `${fieldName}.pair_ordinal`),
    source_input_tree_index: validateInteger(pair.source_input_tree_index, `${fieldName}.source_input_tree_index`),
    target_input_tree_index: validateInteger(pair.target_input_tree_index, `${fieldName}.target_input_tree_index`),
    source_frame_index: validateIndex(pair.source_frame_index, `${fieldName}.source_frame_index`, treeCount),
    target_frame_index: validateIndex(pair.target_frame_index, `${fieldName}.target_frame_index`, treeCount),
    generated_frame_range: validateGeneratedFrameRange(pair.generated_frame_range, `${fieldName}.generated_frame_range`, treeCount),
    solution: validatePairSolution(pair.solution, `${fieldName}.solution`),
  };
}

export function validatePairs(value: unknown, treeCount: number): TimelinePair[] {
  const pairs = requiredArray(value, 'pairs');
  return pairs.map((pair, index) => validatePair(pair, index, treeCount));
}

function validateTemporalEventBase(
  event: Record<string, unknown>,
  fieldName: string,
  treeCount: number
) {
  if (typeof event.event_id !== 'string' || event.event_id.length === 0) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName}.event_id must be a non-empty string`);
  }
  if (typeof event.pair_id !== 'string' || event.pair_id.length === 0) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName}.pair_id must be a non-empty string`);
  }
  const frameRange = validateRangeTuple(event.frame_range, `${fieldName}.frame_range`);
  validateIndex(frameRange[0], `${fieldName}.frame_range[0]`, treeCount);
  validateIndex(frameRange[1], `${fieldName}.frame_range[1]`, treeCount);

  return {
    event_id: event.event_id,
    pair_id: event.pair_id,
    pair_ordinal: validateInteger(event.pair_ordinal, `${fieldName}.pair_ordinal`),
    local_step_range: validateRangeTuple(event.local_step_range, `${fieldName}.local_step_range`),
    frame_range: frameRange,
  };
}

function validateSplitChangeTemporalEvent(
  value: unknown,
  index: number,
  treeCount: number
): SplitChangeTemporalEvent {
  const fieldName = `temporal_events[${index}]`;
  const event = requiredRecord(value, fieldName);
  assertExactRecordKeys(event, fieldName, [
    'event_id',
    'event_type',
    'pair_id',
    'pair_ordinal',
    'local_step_range',
    'frame_range',
    'split',
  ]);

  return {
    ...validateTemporalEventBase(event, fieldName, treeCount),
    event_type: 'split_change',
    split: requiredNumberArray(event.split, `${fieldName}.split`),
  };
}

function validateSprMoveTemporalEvent(
  value: unknown,
  index: number,
  treeCount: number
): SprMoveTemporalEvent {
  const fieldName = `temporal_events[${index}]`;
  const event = requiredRecord(value, fieldName);
  assertExactRecordKeys(event, fieldName, [
    'event_id',
    'event_type',
    'pair_id',
    'pair_ordinal',
    'local_step_range',
    'frame_range',
    'pivot_edge',
    'driver_subtree',
    'highlight_group',
    'collapse_path',
    'expand_path',
    'collapse_hops',
    'expand_hops',
    'total_hops',
    'collapse_branch_length',
    'expand_branch_length',
    'total_branch_length',
  ]);

  return {
    ...validateTemporalEventBase(event, fieldName, treeCount),
    event_type: 'spr_move',
    pivot_edge: requiredNumberArray(event.pivot_edge, `${fieldName}.pivot_edge`),
    driver_subtree: requiredNumberArray(event.driver_subtree, `${fieldName}.driver_subtree`),
    highlight_group: validateHighlightGroup(event.highlight_group, `${fieldName}.highlight_group`),
    collapse_path: validateSprPath(event.collapse_path, `${fieldName}.collapse_path`),
    expand_path: validateSprPath(event.expand_path, `${fieldName}.expand_path`),
    collapse_hops: validateFiniteNumber(event.collapse_hops, `${fieldName}.collapse_hops`),
    expand_hops: validateFiniteNumber(event.expand_hops, `${fieldName}.expand_hops`),
    total_hops: validateFiniteNumber(event.total_hops, `${fieldName}.total_hops`),
    collapse_branch_length: validateFiniteNumber(event.collapse_branch_length, `${fieldName}.collapse_branch_length`),
    expand_branch_length: validateFiniteNumber(event.expand_branch_length, `${fieldName}.expand_branch_length`),
    total_branch_length: validateFiniteNumber(event.total_branch_length, `${fieldName}.total_branch_length`),
  };
}

function validateFiniteNumber(value: unknown, fieldName: string): number {
  assertFiniteNumber(value, fieldName);
  return value;
}

export function validateTemporalEvents(value: unknown, treeCount: number): TemporalEvent[] {
  const events = requiredArray(value, 'temporal_events');
  return events.map((event, index) => {
    const record = requiredRecord(event, `temporal_events[${index}]`);
    if (record.event_type === 'split_change') {
      return validateSplitChangeTemporalEvent(record, index, treeCount);
    }
    if (record.event_type === 'spr_move') {
      return validateSprMoveTemporalEvent(record, index, treeCount);
    }
    throw new Error(`Invalid phyloMovieData payload: temporal_events[${index}].event_type must be split_change or spr_move`);
  });
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

function validatePairMetricSemantics(value: unknown): PairMetrics['semantics'] {
  assertRecord(value, 'pair_metrics.semantics');
  assertExactRecordKeys(value, 'pair_metrics.semantics', [
    'robinson_foulds',
    'weighted_robinson_foulds',
  ]);

  const semantics: PairMetrics['semantics'] = {};

  if (value.robinson_foulds !== undefined) {
    assertRecord(value.robinson_foulds, 'pair_metrics.semantics.robinson_foulds');
    assertExactRecordKeys(value.robinson_foulds, 'pair_metrics.semantics.robinson_foulds', [
      'topology',
      'normalization',
      'scope',
    ]);
    semantics.robinson_foulds = {};

    const topology = validateOptionalString(
      value.robinson_foulds.topology,
      'pair_metrics.semantics.robinson_foulds.topology'
    );
    const normalization = validateOptionalString(
      value.robinson_foulds.normalization,
      'pair_metrics.semantics.robinson_foulds.normalization'
    );
    const scope = validateOptionalString(
      value.robinson_foulds.scope,
      'pair_metrics.semantics.robinson_foulds.scope'
    );

    if (topology !== undefined) semantics.robinson_foulds.topology = topology;
    if (normalization !== undefined) semantics.robinson_foulds.normalization = normalization;
    if (scope !== undefined) semantics.robinson_foulds.scope = scope;
  }

  if (value.weighted_robinson_foulds !== undefined) {
    assertRecord(
      value.weighted_robinson_foulds,
      'pair_metrics.semantics.weighted_robinson_foulds'
    );
    assertExactRecordKeys(value.weighted_robinson_foulds, 'pair_metrics.semantics.weighted_robinson_foulds', [
      'topology',
      'includes_branch_lengths',
      'includes_terminal_and_root_splits',
      'scope',
    ]);
    semantics.weighted_robinson_foulds = {};

    const topology = validateOptionalString(
      value.weighted_robinson_foulds.topology,
      'pair_metrics.semantics.weighted_robinson_foulds.topology'
    );
    const includesBranchLengths = validateOptionalBoolean(
      value.weighted_robinson_foulds.includes_branch_lengths,
      'pair_metrics.semantics.weighted_robinson_foulds.includes_branch_lengths'
    );
    const includesTerminalAndRootSplits = validateOptionalBoolean(
      value.weighted_robinson_foulds.includes_terminal_and_root_splits,
      'pair_metrics.semantics.weighted_robinson_foulds.includes_terminal_and_root_splits'
    );
    const scope = validateOptionalString(
      value.weighted_robinson_foulds.scope,
      'pair_metrics.semantics.weighted_robinson_foulds.scope'
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

function validatePairMetricRow(value: unknown, index: number): PairMetricRow {
  const fieldName = `pair_metrics.rows[${index}]`;
  const row = requiredRecord(value, fieldName);
  assertExactRecordKeys(row, fieldName, [
    'pair_id',
    'pair_ordinal',
    'robinson_foulds',
    'weighted_robinson_foulds',
  ]);

  if (typeof row.pair_id !== 'string' || row.pair_id.length === 0) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName}.pair_id must be a non-empty string`);
  }

  return {
    pair_id: row.pair_id,
    pair_ordinal: validateInteger(row.pair_ordinal, `${fieldName}.pair_ordinal`),
    robinson_foulds: validateFiniteNumber(row.robinson_foulds, `${fieldName}.robinson_foulds`),
    weighted_robinson_foulds: validateFiniteNumber(row.weighted_robinson_foulds, `${fieldName}.weighted_robinson_foulds`),
  };
}

export function validatePairMetrics(value: unknown): PhyloMovieData['pair_metrics'] {
  assertRecord(value, 'pair_metrics');
  assertExactRecordKeys(value, 'pair_metrics', ['rows', 'semantics']);

  return {
    rows: requiredArray(value.rows, 'pair_metrics.rows')
      .map((row, index) => validatePairMetricRow(row, index)),
    semantics: validatePairMetricSemantics(value.semantics),
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
