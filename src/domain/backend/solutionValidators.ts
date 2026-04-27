import type { SplitChangeEvent, TreePairSolution } from './phyloMovieTypes';
import {
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
    validated[pairKey] = {
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
  }

  return validated;
}
