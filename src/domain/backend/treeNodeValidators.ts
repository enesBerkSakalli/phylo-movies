/**
 * Tree node validation for both encodings the backend emits: expanded object
 * nodes and compact tuple nodes, each on a hydrating path that builds
 * TreeNodes and a transport path that checks without allocating. The
 * tree_name_definitions and split_definitions dictionaries live here because
 * node validation resolves name_ref and split_ref against them.
 */

import type { SplitDefinitions, SplitIndices, TreeNode } from './phyloMovieTypes';
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
  splitDefinitions: SplitDefinitions;
};

/**
 * Validates the name/length/split_indices fields shared by the expanded
 * TreeNode and payload-only TreeNode validators.
 */
function validateTreeNodeNameLengthAndSplits(
  value: Record<string, unknown>,
  fieldName: string,
  treeDictionaries: TreePayloadDictionaries
): { name: string; length: number; splitIndices: SplitIndices } {
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

const OBJECT_NODE_KEYS = [
  'name',
  'name_ref',
  'length',
  'split_indices',
  'split_ref',
  'annotations',
  'annotation_values',
  'children',
] as const;

type EnterTask = {
  phase: 'enter';
  value: unknown;
  fieldName: string;
  siblings: TreeNode[] | null;
};
type ExitTask =
  | {
      phase: 'exit';
      fieldName: string;
      node: TreeNode | null;
      form: 'tuple';
      annotationValues: unknown;
    }
  | {
      phase: 'exit';
      fieldName: string;
      node: TreeNode | null;
      form: 'object';
      annotations: unknown;
      annotationValues: unknown;
    };

/**
 * Walks one tree with an explicit stack instead of recursion, in the two modes
 * the callers need: building TreeNodes, or checking without allocating.
 *
 * The per-node operation order is the one the recursive version had. Each node
 * validates its shape, name/length/splits and the both-annotations
 * contradiction on entry; its exit task is pushed under its children, so the
 * whole subtree is processed before the node's own annotations - exactly where
 * the recursion validated them.
 */
function walkTreeNode(
  value: unknown,
  fieldName: string,
  annotationDefinitions: AnnotationDefinition[],
  treeDictionaries: TreePayloadDictionaries,
  buildNodes: boolean
): TreeNode | null {
  let root: TreeNode | null = null;
  const stack: Array<EnterTask | ExitTask> = [{ phase: 'enter', value, fieldName, siblings: null }];

  while (stack.length > 0) {
    const task = stack.pop() as EnterTask | ExitTask;
    if (task.phase === 'exit') {
      finishNodeAnnotations(task, annotationDefinitions, buildNodes);
      continue;
    }

    const nodeValue = task.value;
    const nodeField = task.fieldName;
    let children: unknown[];
    let node: TreeNode | null = null;
    let exit: ExitTask;

    if (Array.isArray(nodeValue)) {
      if (nodeValue.length !== 5) {
        throw new Error(
          `Invalid phyloMovieData payload: ${nodeField} tuple node must be [length, name_ref, split_ref, annotation_values, children]`
        );
      }
      const { name, length, splitIndices } = validateTupleTreeNodeLengthNameAndSplits(
        nodeValue,
        nodeField,
        treeDictionaries
      );
      children = requiredArray(nodeValue[4], `${nodeField}[4]`);
      if (buildNodes) node = { name, length, split_indices: splitIndices, children: [] };
      exit = {
        phase: 'exit',
        fieldName: nodeField,
        node,
        form: 'tuple',
        annotationValues: nodeValue[3],
      };
    } else {
      assertRecord(nodeValue, nodeField);
      assertExactRecordKeys(nodeValue, nodeField, OBJECT_NODE_KEYS);
      const { name, length, splitIndices } = validateTreeNodeNameLengthAndSplits(
        nodeValue,
        nodeField,
        treeDictionaries
      );
      if (nodeValue.annotations !== undefined && nodeValue.annotation_values !== undefined) {
        throw new Error(
          `Invalid phyloMovieData payload: ${nodeField} must not include both annotations and annotation_values`
        );
      }
      children = requiredArray(nodeValue.children, `${nodeField}.children`);
      if (buildNodes) node = { name, length, split_indices: splitIndices, children: [] };
      exit = {
        phase: 'exit',
        fieldName: nodeField,
        node,
        form: 'object',
        annotations: nodeValue.annotations,
        annotationValues: nodeValue.annotation_values,
      };
    }

    if (node) {
      if (task.siblings) task.siblings.push(node);
      else root = node;
    }

    stack.push(exit);
    for (let index = children.length - 1; index >= 0; index -= 1) {
      stack.push({
        phase: 'enter',
        value: children[index],
        fieldName: `${nodeField}.children[${index}]`,
        siblings: node === null ? null : node.children,
      });
    }
  }

  return root;
}

function finishNodeAnnotations(
  task: ExitTask,
  annotationDefinitions: AnnotationDefinition[],
  buildNodes: boolean
): void {
  if (task.form === 'tuple') {
    assertTupleAnnotationSlot(task.annotationValues, task.fieldName);
    if (!buildNodes) {
      if (task.annotationValues !== null) {
        validateCompactAnnotationValues(
          task.annotationValues,
          `${task.fieldName}.annotation_values`,
          annotationDefinitions
        );
      }
      return;
    }
    const annotations =
      task.annotationValues === null
        ? undefined
        : validateNodeAnnotations(
            undefined,
            task.annotationValues,
            `${task.fieldName}.annotations`,
            `${task.fieldName}.annotation_values`,
            annotationDefinitions
          );
    if (annotations !== undefined && task.node) task.node.annotations = annotations;
    return;
  }

  if (!buildNodes) {
    validateTransportNodeAnnotations(
      task.annotations,
      task.annotationValues,
      `${task.fieldName}.annotations`,
      `${task.fieldName}.annotation_values`,
      annotationDefinitions
    );
    return;
  }
  const annotations = validateNodeAnnotations(
    task.annotations,
    task.annotationValues,
    `${task.fieldName}.annotations`,
    `${task.fieldName}.annotation_values`,
    annotationDefinitions
  );
  if (annotations !== undefined && task.node) task.node.annotations = annotations;
}

/**
 * Validates the [length, name_ref, split_ref] leading fields of a tuple node.
 */
function validateTupleTreeNodeLengthNameAndSplits(
  value: unknown[],
  fieldName: string,
  treeDictionaries: TreePayloadDictionaries
): { name: string; length: number; splitIndices: SplitIndices } {
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
  splitDefinitions: SplitDefinitions
): SplitIndices {
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

export function validateSplitDefinitions(value: unknown): SplitDefinitions {
  if (value === undefined) return [];
  const definitions = requiredArray(value, 'split_definitions');
  const validatedDefinitions = definitions.map((definition, index) => {
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
    // shares the split. The outer table is frozen below so later hydration
    // cannot resolve the same split_ref to a replacement entry.
    return Object.freeze(split);
  });
  return Object.freeze(validatedDefinitions);
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
  return trees.map(
    (tree, index) =>
      walkTreeNode(
        tree,
        `interpolated_trees[${index}]`,
        annotationDefinitions,
        treeDictionaries,
        true
      ) as TreeNode
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
    walkTreeNode(
      tree,
      `interpolated_trees[${index}]`,
      annotationDefinitions,
      treeDictionaries,
      false
    )
  );
  return trees;
}
