import { toSubtreeKey } from '../tree/splits.js';
import { forEachAnnotationPair } from './annotationValueLayout.ts';

const splitKeyDefinitionsCache = new WeakMap();

export function hydrateMovieTreeAtIndex(movieData, treeIndex) {
  if (
    !Number.isInteger(treeIndex) ||
    treeIndex < 0 ||
    treeIndex >= movieData.interpolated_trees.length
  ) {
    throw new Error(
      `Invalid phyloMovieData payload: interpolated_trees[${treeIndex}] is not available`
    );
  }

  return hydrateTreePayloadNode(
    movieData.interpolated_trees[treeIndex],
    movieData.annotation_definitions ?? [],
    {
      treeNameDefinitions: movieData.tree_name_definitions ?? [],
      splitDefinitions: movieData.split_definitions ?? [],
      splitKeyDefinitions: getSplitKeyDefinitions(movieData.split_definitions),
    }
  );
}

/** Hydrates one node of either encoding, leaving its children for the walker. */
function hydrateNodeShell(value, annotationDefinitions, treeDictionaries) {
  if (Array.isArray(value)) {
    const annotations =
      value[3] === null ? undefined : hydrateAnnotationValues(value[3], annotationDefinitions);
    const splitIndices = resolveSplitIndices(
      undefined,
      value[2],
      treeDictionaries.splitDefinitions
    );
    const splitKey = resolveSplitKey(undefined, value[2], splitIndices, treeDictionaries);
    return {
      node: {
        name: resolveTreeName(undefined, value[1], treeDictionaries.treeNameDefinitions),
        length: value[0],
        split_indices: splitIndices,
        ...(splitKey === null ? {} : { splitKey }),
        ...(annotations === undefined ? {} : { annotations }),
        children: [],
      },
      rawChildren: value[4],
    };
  }

  const splitIndices = resolveSplitIndices(
    value.split_indices,
    value.split_ref,
    treeDictionaries.splitDefinitions
  );
  const splitKey = resolveSplitKey(value.splitKey, value.split_ref, splitIndices, treeDictionaries);
  const annotations =
    value.annotations ??
    (value.annotation_values === undefined
      ? undefined
      : hydrateAnnotationValues(value.annotation_values, annotationDefinitions));
  return {
    node: {
      name: resolveTreeName(value.name, value.name_ref, treeDictionaries.treeNameDefinitions),
      length: value.length,
      split_indices: splitIndices,
      ...(splitKey === null ? {} : { splitKey }),
      ...(annotations === undefined ? {} : { annotations }),
      children: [],
    },
    rawChildren: value.children,
  };
}

/**
 * Iterative preorder walk: children are pushed reversed so they pop in source
 * order, and each hydrated node is appended to its parent's children array as
 * it is visited, which reproduces the order the recursion built.
 */
function hydrateTreePayloadNode(
  rootValue,
  annotationDefinitions = [],
  treeDictionaries = {
    treeNameDefinitions: [],
    splitDefinitions: [],
  }
) {
  const root = hydrateNodeShell(rootValue, annotationDefinitions, treeDictionaries);
  const stack = [];
  for (let index = root.rawChildren.length - 1; index >= 0; index -= 1) {
    stack.push([root.rawChildren[index], root.node.children]);
  }

  while (stack.length > 0) {
    const [rawNode, siblings] = stack.pop();
    const { node, rawChildren } = hydrateNodeShell(
      rawNode,
      annotationDefinitions,
      treeDictionaries
    );
    siblings.push(node);
    for (let index = rawChildren.length - 1; index >= 0; index -= 1) {
      stack.push([rawChildren[index], node.children]);
    }
  }

  return root.node;
}

function resolveTreeName(name, nameRef, treeNameDefinitions) {
  if (name !== undefined) return name;
  return treeNameDefinitions[nameRef];
}

function resolveSplitIndices(splitIndices, splitRef, splitDefinitions) {
  if (splitIndices !== undefined) return splitIndices;
  return splitDefinitions[splitRef];
}

function resolveSplitKey(splitKey, splitRef, splitIndices, treeDictionaries) {
  if (typeof splitKey === 'string' && splitKey.length > 0) return splitKey;
  if (Number.isInteger(splitRef)) {
    return treeDictionaries.splitKeyDefinitions?.[splitRef] ?? null;
  }
  return Array.isArray(splitIndices) && splitIndices.length > 0 ? toSubtreeKey(splitIndices) : null;
}

function getSplitKeyDefinitions(splitDefinitions) {
  if (!Array.isArray(splitDefinitions)) return [];

  const cached = splitKeyDefinitionsCache.get(splitDefinitions);
  if (cached) return cached;

  const splitKeyDefinitions = splitDefinitions.map((split) =>
    Array.isArray(split) && split.length > 0 ? toSubtreeKey(split) : null
  );
  splitKeyDefinitionsCache.set(splitDefinitions, splitKeyDefinitions);
  return splitKeyDefinitions;
}

function hydrateAnnotationValues(annotationValues, annotationDefinitions) {
  const fields = {};
  forEachAnnotationPair(annotationValues, (definitionIndex, value) => {
    const definition = annotationDefinitions[definitionIndex];
    const { key, ...schema } = definition;
    fields[key] = {
      ...schema,
      value,
    };
  });
  return { fields };
}

/**
 * Expand one tree of a PMB1 payload into the same node shape the JSON path
 * produces. Reads the block's typed arrays rather than a nested node graph, so
 * only the requested tree becomes objects; the rest of the payload stays an
 * ArrayBuffer.
 *
 * Reference bounds are checked here rather than when the container is opened,
 * which keeps the cost proportional to the one tree being read.
 */
export function hydrateBinaryTreeAtIndex(binaryPayload, movieData, treeIndex) {
  const block = binaryPayload.readTreeBlock(treeIndex);
  const annotationDefinitions = movieData.annotation_definitions ?? [];
  const treeNameDefinitions = movieData.tree_name_definitions ?? [];
  const splitDefinitions = movieData.split_definitions ?? [];
  const splitKeyDefinitions = getSplitKeyDefinitions(splitDefinitions);
  const valueDefinitions = binaryPayload.annotationValueDefinitions;

  const nodes = new Array(block.nodeCount);

  for (let index = 0; index < block.nodeCount; index += 1) {
    const nameRef = block.nameRef[index];
    const splitRef = block.splitRef[index];
    if (nameRef >= treeNameDefinitions.length) {
      throw new Error(
        `Invalid phyloMovieData payload: interpolated_trees[${treeIndex}] name_ref must reference tree_name_definitions`
      );
    }
    if (splitRef >= splitDefinitions.length) {
      throw new Error(
        `Invalid phyloMovieData payload: interpolated_trees[${treeIndex}] split_ref must reference split_definitions`
      );
    }

    const start = block.annotationOffset[index];
    const end = block.annotationOffset[index + 1];
    let annotations;
    if (end > start) {
      const fields = {};
      for (let offset = start; offset < end; offset += 1) {
        const definition = annotationDefinitions[block.annotationDefinition[offset]];
        if (!definition) {
          throw new Error(
            `Invalid phyloMovieData payload: interpolated_trees[${treeIndex}] annotation must reference annotation_definitions`
          );
        }
        const { key, ...schema } = definition;
        fields[key] = {
          ...schema,
          value: valueDefinitions[block.annotationValue[offset]],
        };
      }
      annotations = { fields };
    }

    const splitKey = splitKeyDefinitions[splitRef] ?? null;
    nodes[index] = {
      name: treeNameDefinitions[nameRef],
      length: block.length[index],
      split_indices: splitDefinitions[splitRef],
      ...(splitKey === null ? {} : { splitKey }),
      ...(annotations === undefined ? {} : { annotations }),
      children: [],
    };
  }

  // Preorder guarantees a parent is built before any of its children, and the
  // encoder emits children in source order, so appending reproduces it.
  for (let index = 0; index < block.nodeCount; index += 1) {
    const parentIndex = block.parent[index];
    if (parentIndex >= 0) nodes[parentIndex].children.push(nodes[index]);
  }

  return block.nodeCount > 0 ? nodes[0] : null;
}
