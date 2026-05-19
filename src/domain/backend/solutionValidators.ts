import type { AttachmentEdges, SprMoveEvent, SprPathSegment, TreePairSolution } from './phyloMovieTypes';
import { isCanonicalBackendSplitKey } from '../tree/splits.js';
import {
  assertExactRecordKeys,
  assertFiniteNumber,
  assertRecord,
  requiredArray,
  requiredNumberArray,
  requiredRecord,
  validateRangeTuple,
} from './schemaValidation';

function assertCanonicalBackendSplitKey(key: string, fieldName: string): void {
  if (!isCanonicalBackendSplitKey(key)) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName} key "${key}" must be a canonical backend split key`);
  }
}

function validateAffectedSubtreesBySplit(
  value: unknown,
  fieldName: string
): Record<string, number[][][]> {
  const subtreesBySplit = requiredRecord(value, fieldName);
  const validated: Record<string, number[][][]> = {};

  for (const [pivotKey, subtreeSets] of Object.entries(subtreesBySplit)) {
    assertCanonicalBackendSplitKey(pivotKey, fieldName);
    const sets = requiredArray(subtreeSets, `${fieldName}.${pivotKey}`);
    validated[pivotKey] = sets.map((set, setIndex) => {
      const subtrees = requiredArray(set, `${fieldName}.${pivotKey}[${setIndex}]`);
      return subtrees.map((subtree, subtreeIndex) => (
        requiredNumberArray(subtree, `${fieldName}.${pivotKey}[${setIndex}][${subtreeIndex}]`)
      ));
    });
  }

  return validated;
}

function validateAttachmentEdgesBySplit(
  value: unknown,
  fieldName: string
): Record<string, Record<string, AttachmentEdges>> {
  const attachmentsBySplit = requiredRecord(value, fieldName);
  const validated: Record<string, Record<string, AttachmentEdges>> = {};

  for (const [pivotKey, movedSubtrees] of Object.entries(attachmentsBySplit)) {
    assertCanonicalBackendSplitKey(pivotKey, fieldName);
    const subtreeEntries = requiredRecord(movedSubtrees, `${fieldName}.${pivotKey}`);
    validated[pivotKey] = {};

    for (const [moverKey, attachment] of Object.entries(subtreeEntries)) {
      assertCanonicalBackendSplitKey(moverKey, `${fieldName}.${pivotKey}`);
      const attachmentEdges = requiredRecord(attachment, `${fieldName}.${pivotKey}.${moverKey}`);
      assertExactRecordKeys(attachmentEdges, `${fieldName}.${pivotKey}.${moverKey}`, ['source', 'destination']);
      validated[pivotKey][moverKey] = {
        source: requiredNumberArray(attachmentEdges.source, `${fieldName}.${pivotKey}.${moverKey}.source`),
        destination: requiredNumberArray(attachmentEdges.destination, `${fieldName}.${pivotKey}.${moverKey}.destination`),
      };
    }
  }

  return validated;
}

function validateFiniteNumber(value: unknown, fieldName: string): number {
  assertFiniteNumber(value, fieldName);
  return value;
}

function validateSprPathSegment(value: unknown, fieldName: string): SprPathSegment {
  const segment = requiredRecord(value, fieldName);
  assertExactRecordKeys(segment, fieldName, ['split', 'branch_length']);
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
  assertExactRecordKeys(event, fieldName, [
    'pivot_edge',
    'driver_subtree',
    'highlight_group',
    'step_range',
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

export function validateTreePairSolutions(value: unknown): Record<string, TreePairSolution> {
  const pairSolutions = requiredRecord(value, 'tree_pair_solutions');
  const validated: Record<string, TreePairSolution> = {};

  for (const [pairKey, solution] of Object.entries(pairSolutions)) {
    assertRecord(solution, `tree_pair_solutions.${pairKey}`);
    const fieldName = `tree_pair_solutions.${pairKey}`;
    assertExactRecordKeys(solution, fieldName, [
      'affected_subtrees_by_split',
      'attachment_edges_by_split',
      'spr_move_events',
    ]);
    const validatedSolution: TreePairSolution = {
      affected_subtrees_by_split: validateAffectedSubtreesBySplit(
        solution.affected_subtrees_by_split,
        `${fieldName}.affected_subtrees_by_split`
      ),
      attachment_edges_by_split: validateAttachmentEdgesBySplit(
        solution.attachment_edges_by_split,
        `${fieldName}.attachment_edges_by_split`
      ),
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
