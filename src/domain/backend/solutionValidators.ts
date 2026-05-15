import type { SplitChangeEvent, SprMoveEvent, SprPathSegment, TreePairSolution } from './phyloMovieTypes';
import {
  assertFiniteNumber,
  assertRecord,
  requiredArray,
  requiredNumberArray,
  requiredRecord,
  validateRangeTuple,
} from './schemaValidation';

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

function validateSplitChangeEvent(value: unknown, fieldName: string): SplitChangeEvent {
  const event = requiredRecord(value, fieldName);
  const split = requiredNumberArray(event.split, `${fieldName}.split`);
  const stepRange = validateRangeTuple(event.step_range, `${fieldName}.step_range`);

  return {
    split,
    step_range: stepRange,
  };
}

export function validateSplitChangeEventList(value: unknown, fieldName: string): SplitChangeEvent[] {
  const events = requiredArray(value, fieldName);
  return events.map((event, index) => validateSplitChangeEvent(event, `${fieldName}[${index}]`));
}

function validateFiniteNumber(value: unknown, fieldName: string): number {
  assertFiniteNumber(value, fieldName);
  return value;
}

function validateSprPathSegment(value: unknown, fieldName: string): SprPathSegment {
  const segment = requiredRecord(value, fieldName);
  return {
    split: requiredNumberArray(segment.split, `${fieldName}.split`),
    branch_length: validateFiniteNumber(segment.branch_length, `${fieldName}.branch_length`),
  };
}

function validateSprPath(value: unknown, fieldName: string): SprPathSegment[] {
  const path = requiredArray(value, fieldName);
  return path.map((segment, index) => validateSprPathSegment(segment, `${fieldName}[${index}]`));
}

function validateHighlightGroup(value: unknown, fieldName: string): number[][] {
  const group = requiredArray(value, fieldName);
  return group.map((subtree, index) => requiredNumberArray(subtree, `${fieldName}[${index}]`));
}

function validateSprMoveEvent(value: unknown, fieldName: string): SprMoveEvent {
  const event = requiredRecord(value, fieldName);

  return {
    pivot_edge: requiredNumberArray(event.pivot_edge, `${fieldName}.pivot_edge`),
    driver_subtree: requiredNumberArray(event.driver_subtree, `${fieldName}.driver_subtree`),
    highlight_group: validateHighlightGroup(event.highlight_group, `${fieldName}.highlight_group`),
    step_range: validateRangeTuple(event.step_range, `${fieldName}.step_range`),
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

function validateSprMoveEventList(value: unknown, fieldName: string): SprMoveEvent[] {
  const events = requiredArray(value, fieldName);
  return events.map((event, index) => validateSprMoveEvent(event, `${fieldName}[${index}]`));
}

export function validateSplitChangeEventsByPair(value: unknown): Record<string, SplitChangeEvent[]> {
  const eventsByPair = requiredRecord(value, 'split_change_events');
  const validated: Record<string, SplitChangeEvent[]> = {};

  for (const [pairKey, events] of Object.entries(eventsByPair)) {
    validated[pairKey] = validateSplitChangeEventList(events, `split_change_events.${pairKey}`);
  }

  return validated;
}

export function validateTreePairSolutions(value: unknown): Record<string, TreePairSolution> {
  const pairSolutions = requiredRecord(value, 'tree_pair_solutions');
  const validated: Record<string, TreePairSolution> = {};

  for (const [pairKey, solution] of Object.entries(pairSolutions)) {
    assertRecord(solution, `tree_pair_solutions.${pairKey}`);
    const fieldName = `tree_pair_solutions.${pairKey}`;
    const validatedSolution: TreePairSolution = {
      jumping_subtree_solutions: validateJumpingSubtreeSolutions(
        solution.jumping_subtree_solutions,
        `${fieldName}.jumping_subtree_solutions`
      ),
      solution_to_source_map: requiredRecord(solution.solution_to_source_map, `${fieldName}.solution_to_source_map`),
      solution_to_destination_map: requiredRecord(
        solution.solution_to_destination_map,
        `${fieldName}.solution_to_destination_map`
      ),
      split_change_events: validateSplitChangeEventList(solution.split_change_events, `${fieldName}.split_change_events`),
    };

    if (solution.spr_move_events !== undefined) {
      validatedSolution.spr_move_events = validateSprMoveEventList(
        solution.spr_move_events,
        `${fieldName}.spr_move_events`
      );
    }

    validated[pairKey] = validatedSolution;
  }

  return validated;
}
