/**
 * Tree node validation for both encodings the backend emits: expanded object
 * nodes and compact tuple nodes, each on a hydrating path that builds
 * TreeNodes and a transport path that checks without allocating. The
 * tree_name_definitions and split_definitions dictionaries live here because
 * node validation resolves name_ref and split_ref against them.
 */

import type { TreeNode } from './phyloMovieTypes';
import {
  assertExactRecordKeys,
  assertFiniteNumber,
  assertRecord,
  requiredArray,
  requiredNumberArray,
  validateInteger,
} from './schemaValidation';
import type { AnnotationDefinition } from './annotationValidators';
import {
  validateCompactAnnotationValues,
  validateNodeAnnotations,
  validateTransportNodeAnnotations,
} from './annotationValidators';

type TreePayloadDictionaries = {
  treeNameDefinitions: string[];
  splitDefinitions: number[][];
};

/**
 * Validates the name/length/split_indices fields shared by the expanded
 * TreeNode and payload-only TreeNode validators.
 */
function validateTreeNodeNameLengthAndSplits(
  value: Record<string, unknown>,
  fieldName: string,
  treeDictionaries: TreePayloadDictionaries
): { name: string; length: number; splitIndices: number[] } {
  const name = validateTreeNodeName(
    value.name,
    value.name_ref,
    fieldName,
    treeDictionaries.treeNameDefinitions
  );

  assertFiniteNumber(value.length, `${fieldName}.length`);
  const length = value.length;

  const splitIndices = validateTreeNodeSplitIndices(
    value.split_indices,
    value.split_ref,
    fieldName,
    treeDictionaries.splitDefinitions
  );
  if (splitIndices.length === 0) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName}.split_indices must not be empty`);
  }

  return { name, length, splitIndices };
}

function validateTreeNode(
  value: unknown,
  fieldName: string,
  annotationDefinitions: AnnotationDefinition[] = [],
  treeDictionaries: TreePayloadDictionaries = {
    treeNameDefinitions: [],
    splitDefinitions: [],
  }
): TreeNode {
  if (Array.isArray(value)) {
    return validateTupleTreeNode(value, fieldName, annotationDefinitions, treeDictionaries);
  }

  assertRecord(value, fieldName);
  assertExactRecordKeys(value, fieldName, [
    'name',
    'name_ref',
    'length',
    'split_indices',
    'split_ref',
    'annotations',
    'annotation_values',
    'children',
  ]);

  const { name, length, splitIndices } = validateTreeNodeNameLengthAndSplits(
    value,
    fieldName,
    treeDictionaries
  );

  if (value.annotations !== undefined && value.annotation_values !== undefined) {
    throw new Error(
      `Invalid phyloMovieData payload: ${fieldName} must not include both annotations and annotation_values`
    );
  }

  const children = requiredArray(value.children, `${fieldName}.children`);
  const validatedChildren = children.map((child, index) =>
    validateTreeNode(
      child,
      `${fieldName}.children[${index}]`,
      annotationDefinitions,
      treeDictionaries
    )
  );
  const annotations = validateNodeAnnotations(
    value.annotations,
    value.annotation_values,
    `${fieldName}.annotations`,
    `${fieldName}.annotation_values`,
    annotationDefinitions
  );

  return {
    name,
    length,
    split_indices: splitIndices,
    ...(annotations === undefined ? {} : { annotations }),
    children: validatedChildren,
  };
}

function validateTreePayloadNode(
  value: unknown,
  fieldName: string,
  annotationDefinitions: AnnotationDefinition[] = [],
  treeDictionaries: TreePayloadDictionaries = {
    treeNameDefinitions: [],
    splitDefinitions: [],
  }
): void {
  if (Array.isArray(value)) {
    validateTupleTreePayloadNode(value, fieldName, annotationDefinitions, treeDictionaries);
    return;
  }

  assertRecord(value, fieldName);
  assertExactRecordKeys(value, fieldName, [
    'name',
    'name_ref',
    'length',
    'split_indices',
    'split_ref',
    'annotations',
    'annotation_values',
    'children',
  ]);

  validateTreeNodeNameLengthAndSplits(value, fieldName, treeDictionaries);

  if (value.annotations !== undefined && value.annotation_values !== undefined) {
    throw new Error(
      `Invalid phyloMovieData payload: ${fieldName} must not include both annotations and annotation_values`
    );
  }

  const children = requiredArray(value.children, `${fieldName}.children`);
  children.forEach((child, index) =>
    validateTreePayloadNode(
      child,
      `${fieldName}.children[${index}]`,
      annotationDefinitions,
      treeDictionaries
    )
  );
  validateTransportNodeAnnotations(
    value.annotations,
    value.annotation_values,
    `${fieldName}.annotations`,
    `${fieldName}.annotation_values`,
    annotationDefinitions
  );
}

/**
 * Validates the [length, name_ref, split_ref] leading fields shared by the
 * expanded and payload-only tuple TreeNode validators.
 */
function validateTupleTreeNodeLengthNameAndSplits(
  value: unknown[],
  fieldName: string,
  treeDictionaries: TreePayloadDictionaries
): { name: string; length: number; splitIndices: number[] } {
  assertFiniteNumber(value[0], `${fieldName}[0]`);
  const length = value[0];
  const name = validateTreeNodeName(
    undefined,
    value[1],
    fieldName,
    treeDictionaries.treeNameDefinitions
  );
  const splitIndices = validateTreeNodeSplitIndices(
    undefined,
    value[2],
    fieldName,
    treeDictionaries.splitDefinitions
  );
  if (splitIndices.length === 0) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName}.split_indices must not be empty`);
  }
  return { name, length, splitIndices };
}

function validateTupleTreeNode(
  value: unknown[],
  fieldName: string,
  annotationDefinitions: AnnotationDefinition[],
  treeDictionaries: TreePayloadDictionaries
): TreeNode {
  if (value.length !== 5) {
    throw new Error(
      `Invalid phyloMovieData payload: ${fieldName} tuple node must be [length, name_ref, split_ref, annotation_values, children]`
    );
  }

  const { name, length, splitIndices } = validateTupleTreeNodeLengthNameAndSplits(
    value,
    fieldName,
    treeDictionaries
  );

  const children = requiredArray(value[4], `${fieldName}[4]`);
  const validatedChildren = children.map((child, index) =>
    validateTreeNode(
      child,
      `${fieldName}.children[${index}]`,
      annotationDefinitions,
      treeDictionaries
    )
  );
  assertTupleAnnotationSlot(value[3], fieldName);
  const annotations =
    value[3] === null
      ? undefined
      : validateNodeAnnotations(
          undefined,
          value[3],
          `${fieldName}.annotations`,
          `${fieldName}.annotation_values`,
          annotationDefinitions
        );

  return {
    name,
    length,
    split_indices: splitIndices,
    ...(annotations === undefined ? {} : { annotations }),
    children: validatedChildren,
  };
}

function validateTupleTreePayloadNode(
  value: unknown[],
  fieldName: string,
  annotationDefinitions: AnnotationDefinition[],
  treeDictionaries: TreePayloadDictionaries
): void {
  if (value.length !== 5) {
    throw new Error(
      `Invalid phyloMovieData payload: ${fieldName} tuple node must be [length, name_ref, split_ref, annotation_values, children]`
    );
  }

  validateTupleTreeNodeLengthNameAndSplits(value, fieldName, treeDictionaries);

  const children = requiredArray(value[4], `${fieldName}[4]`);
  children.forEach((child, index) =>
    validateTreePayloadNode(
      child,
      `${fieldName}.children[${index}]`,
      annotationDefinitions,
      treeDictionaries
    )
  );
  assertTupleAnnotationSlot(value[3], fieldName);
  if (value[3] !== null) {
    validateCompactAnnotationValues(
      value[3],
      `${fieldName}.annotation_values`,
      annotationDefinitions
    );
  }
}

/**
 * The annotation slot of a tuple node, which the backend writes as either None
 * or a list of pairs - never absent. Both tuple validators route through this so
 * they cannot disagree: they previously tested `=== null` and `!== null` and
 * then took different branches, so a slot holding undefined passed the
 * hydrating path and was rejected by the transport one.
 */
function assertTupleAnnotationSlot(value: unknown, fieldName: string): void {
  if (value === null || Array.isArray(value)) return;
  throw new Error(
    `Invalid phyloMovieData payload: ${fieldName}.annotation_values must be an array or null`
  );
}

function validateTreeNodeName(
  expandedName: unknown,
  compactNameRef: unknown,
  fieldName: string,
  treeNameDefinitions: string[]
): string {
  if (expandedName !== undefined && compactNameRef !== undefined) {
    throw new Error(
      `Invalid phyloMovieData payload: ${fieldName} must not include both name and name_ref`
    );
  }
  if (expandedName !== undefined) {
    if (typeof expandedName !== 'string') {
      throw new Error(`Invalid phyloMovieData payload: ${fieldName}.name must be a string`);
    }
    return expandedName;
  }
  if (compactNameRef !== undefined) {
    if (treeNameDefinitions.length === 0) {
      throw new Error(
        `Invalid phyloMovieData payload: ${fieldName}.name_ref requires tree_name_definitions`
      );
    }
    const index = validateInteger(compactNameRef, `${fieldName}.name_ref`);
    if (index < 0 || index >= treeNameDefinitions.length) {
      throw new Error(
        `Invalid phyloMovieData payload: ${fieldName}.name_ref must reference tree_name_definitions`
      );
    }
    return treeNameDefinitions[index];
  }
  throw new Error(`Invalid phyloMovieData payload: ${fieldName}.name must be a string`);
}

function validateTreeNodeSplitIndices(
  expandedSplitIndices: unknown,
  compactSplitRef: unknown,
  fieldName: string,
  splitDefinitions: number[][]
): number[] {
  if (expandedSplitIndices !== undefined && compactSplitRef !== undefined) {
    throw new Error(
      `Invalid phyloMovieData payload: ${fieldName} must not include both split_indices and split_ref`
    );
  }
  if (expandedSplitIndices !== undefined) {
    return requiredNumberArray(expandedSplitIndices, `${fieldName}.split_indices`);
  }
  if (compactSplitRef !== undefined) {
    if (splitDefinitions.length === 0) {
      throw new Error(
        `Invalid phyloMovieData payload: ${fieldName}.split_ref requires split_definitions`
      );
    }
    const index = validateInteger(compactSplitRef, `${fieldName}.split_ref`);
    if (index < 0 || index >= splitDefinitions.length) {
      throw new Error(
        `Invalid phyloMovieData payload: ${fieldName}.split_ref must reference split_definitions`
      );
    }
    return splitDefinitions[index];
  }
  throw new Error(`Invalid phyloMovieData payload: ${fieldName}.split_indices must be an array`);
}

export function validateTreeNameDefinitions(value: unknown): string[] {
  if (value === undefined) return [];
  const definitions = requiredArray(value, 'tree_name_definitions');
  return definitions.map((definition, index) => {
    if (typeof definition !== 'string') {
      throw new Error(
        `Invalid phyloMovieData payload: tree_name_definitions[${index}] must be a string`
      );
    }
    return definition;
  });
}

export function validateSplitDefinitions(value: unknown): number[][] {
  if (value === undefined) return [];
  const definitions = requiredArray(value, 'split_definitions');
  return definitions.map((definition, index) => {
    const split = requiredNumberArray(definition, `split_definitions[${index}]`);
    if (split.length === 0) {
      throw new Error(
        `Invalid phyloMovieData payload: split_definitions[${index}] must not be empty`
      );
    }
    // Every node carrying this split gets this same array, because the payload
    // interns one entry per distinct split and readers hand it straight to the
    // node. Copying per node would allocate millions of arrays on the transport
    // path, so the array is frozen instead: an in-place sort or push by a
    // consumer throws here rather than silently corrupting every node that
    // shares the split. Nothing mutates them today.
    return Object.freeze(split) as number[];
  });
}

export function validateTreeList(
  value: unknown,
  annotationDefinitions: AnnotationDefinition[] = [],
  treeDictionaries: TreePayloadDictionaries = {
    treeNameDefinitions: [],
    splitDefinitions: [],
  }
): TreeNode[] {
  const trees = requiredArray(value, 'interpolated_trees');
  return trees.map((tree, index) =>
    validateTreeNode(tree, `interpolated_trees[${index}]`, annotationDefinitions, treeDictionaries)
  );
}

export function validateTreePayloadList(
  value: unknown,
  annotationDefinitions: AnnotationDefinition[] = [],
  treeDictionaries: TreePayloadDictionaries = {
    treeNameDefinitions: [],
    splitDefinitions: [],
  }
): unknown[] {
  const trees = requiredArray(value, 'interpolated_trees');
  trees.forEach((tree, index) =>
    validateTreePayloadNode(
      tree,
      `interpolated_trees[${index}]`,
      annotationDefinitions,
      treeDictionaries
    )
  );
  return trees;
}
