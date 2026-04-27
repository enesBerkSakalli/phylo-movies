import type {
  OriginalTimelineEntry,
  SplitChangeTimelineEntry,
  SplitEventTimelineEntry,
  TreePairSolution,
} from './phyloMovieTypes';
import {
  requiredArray,
  requiredNumberArray,
  requiredRecord,
  validateIndex,
  validateInteger,
  validateRangeTuple,
} from './schemaValidation';

function validateOriginalTimelineEntry(
  value: Record<string, unknown>,
  index: number,
  treeCount: number
): OriginalTimelineEntry {
  const fieldName = `split_change_timeline[${index}]`;
  const treeIndex = validateInteger(value.tree_index, `${fieldName}.tree_index`);
  if (treeIndex < 0) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName}.tree_index must be non-negative`);
  }

  const globalIndex = validateIndex(value.global_index, `${fieldName}.global_index`, treeCount);
  if (typeof value.name !== 'string') {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName}.name must be a string`);
  }

  return {
    type: 'original',
    tree_index: treeIndex,
    global_index: globalIndex,
    name: value.name,
  };
}

function validateSplitEventTimelineEntry(
  value: Record<string, unknown>,
  index: number,
  treeCount: number,
  treePairSolutions: Record<string, TreePairSolution>
): SplitEventTimelineEntry {
  const fieldName = `split_change_timeline[${index}]`;
  if (typeof value.pair_key !== 'string') {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName}.pair_key must be a string`);
  }
  if (!treePairSolutions[value.pair_key]) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName}.pair_key must reference tree_pair_solutions`);
  }

  const split = requiredNumberArray(value.split, `${fieldName}.split`);
  if (split.length === 0) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName}.split must not be empty`);
  }

  const stepRangeLocal = validateRangeTuple(value.step_range_local, `${fieldName}.step_range_local`);
  const stepRangeGlobal = validateRangeTuple(value.step_range_global, `${fieldName}.step_range_global`);
  validateIndex(stepRangeGlobal[0], `${fieldName}.step_range_global[0]`, treeCount);
  validateIndex(stepRangeGlobal[1], `${fieldName}.step_range_global[1]`, treeCount);

  const localSpan = stepRangeLocal[1] - stepRangeLocal[0];
  const globalSpan = stepRangeGlobal[1] - stepRangeGlobal[0];
  if (localSpan !== globalSpan) {
    throw new Error(
      `Invalid phyloMovieData payload: ${fieldName}.step_range_local and step_range_global must cover the same number of trees`
    );
  }

  return {
    type: 'split_event',
    pair_key: value.pair_key,
    split,
    step_range_local: stepRangeLocal,
    step_range_global: stepRangeGlobal,
  };
}

export function validateSplitChangeTimeline(
  value: unknown,
  treeCount: number,
  pairInterpolationRanges: Array<[number, number]>,
  treePairSolutions: Record<string, TreePairSolution>
): SplitChangeTimelineEntry[] {
  const entries = requiredArray(value, 'split_change_timeline');
  const validated: SplitChangeTimelineEntry[] = [];
  const anchorIndices = collectAnchorIndices(pairInterpolationRanges, treeCount);
  const expectedTransitionIndices = collectTransitionIndices(pairInterpolationRanges);
  const originalIndices = new Set<number>();
  const coveredTransitionIndices = new Map<number, string>();

  for (const [index, entry] of entries.entries()) {
    const fieldName = `split_change_timeline[${index}]`;
    const record = requiredRecord(entry, fieldName);

    if (record.type === 'original') {
      const original = validateOriginalTimelineEntry(record, index, treeCount);
      if (!anchorIndices.has(original.global_index)) {
        throw new Error(
          `Invalid phyloMovieData payload: ${fieldName}.global_index must reference an anchor tree`
        );
      }
      originalIndices.add(original.global_index);
      validated.push(original);
      continue;
    }

    if (record.type === 'split_event') {
      const splitEvent = validateSplitEventTimelineEntry(record, index, treeCount, treePairSolutions);
      for (let treeIndex = splitEvent.step_range_global[0]; treeIndex <= splitEvent.step_range_global[1]; treeIndex += 1) {
        if (!expectedTransitionIndices.has(treeIndex)) {
          throw new Error(
            `Invalid phyloMovieData payload: ${fieldName}.step_range_global includes anchor or out-of-range tree index ${treeIndex}`
          );
        }
        const previousField = coveredTransitionIndices.get(treeIndex);
        if (previousField) {
          throw new Error(
            `Invalid phyloMovieData payload: ${fieldName}.step_range_global overlaps tree index ${treeIndex} from ${previousField}`
          );
        }
        coveredTransitionIndices.set(treeIndex, fieldName);
      }
      validated.push(splitEvent);
      continue;
    }

    throw new Error(`Invalid phyloMovieData payload: ${fieldName}.type must be "original" or "split_event"`);
  }

  for (const anchorIndex of anchorIndices) {
    if (!originalIndices.has(anchorIndex)) {
      throw new Error(
        `Invalid phyloMovieData payload: split_change_timeline missing original entry for anchor tree index ${anchorIndex}`
      );
    }
  }

  for (const treeIndex of expectedTransitionIndices) {
    if (!coveredTransitionIndices.has(treeIndex)) {
      throw new Error(
        `Invalid phyloMovieData payload: split_change_timeline missing split event coverage for tree index ${treeIndex}`
      );
    }
  }

  return validated;
}

function collectAnchorIndices(pairInterpolationRanges: Array<[number, number]>, treeCount: number): Set<number> {
  const anchors = new Set<number>();

  for (const [start, end] of pairInterpolationRanges) {
    anchors.add(start);
    anchors.add(end);
  }

  if (anchors.size === 0 && treeCount > 0) {
    anchors.add(0);
  }

  return anchors;
}

function collectTransitionIndices(pairInterpolationRanges: Array<[number, number]>): Set<number> {
  const indices = new Set<number>();

  for (const [start, end] of pairInterpolationRanges) {
    for (let treeIndex = start + 1; treeIndex < end; treeIndex += 1) {
      indices.add(treeIndex);
    }
  }

  return indices;
}
