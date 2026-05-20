import type { AttachmentEdges, PairSolution, SprPathSegment } from './phyloMovieTypes';
import { isCanonicalBackendSplitKey } from '../tree/splits.js';
import {
  assertExactRecordKeys,
  assertFiniteNumber,
  requiredArray,
  requiredNumberArray,
  requiredRecord,
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

export function validateSprPathSegment(value: unknown, fieldName: string): SprPathSegment {
  const segment = requiredRecord(value, fieldName);
  assertExactRecordKeys(segment, fieldName, ['split', 'branch_length']);
  return {
    split: requiredNumberArray(segment.split, `${fieldName}.split`),
    branch_length: validateFiniteNumber(segment.branch_length, `${fieldName}.branch_length`),
  };
}

export function validateSprPath(value: unknown, fieldName: string): SprPathSegment[] {
  const path = requiredArray(value, fieldName);
  return path.map((segment, index) => validateSprPathSegment(segment, `${fieldName}[${index}]`));
}

export function validateHighlightGroup(value: unknown, fieldName: string): number[][] {
  const group = requiredArray(value, fieldName);
  return group.map((subtree, index) => requiredNumberArray(subtree, `${fieldName}[${index}]`));
}

export function validatePairSolution(value: unknown, fieldName: string): PairSolution {
  const solution = requiredRecord(value, fieldName);
  assertExactRecordKeys(solution, fieldName, [
    'affected_subtrees_by_split',
    'attachment_edges_by_split',
  ]);

  return {
    affected_subtrees_by_split: validateAffectedSubtreesBySplit(
      solution.affected_subtrees_by_split,
      `${fieldName}.affected_subtrees_by_split`
    ),
    attachment_edges_by_split: validateAttachmentEdgesBySplit(
      solution.attachment_edges_by_split,
      `${fieldName}.attachment_edges_by_split`
    ),
  };
}
