import { toSubtreeKey } from '../tree/splits.js';

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

export function hydrateTreePayloadNode(
  value,
  annotationDefinitions = [],
  treeDictionaries = {
    treeNameDefinitions: [],
    splitDefinitions: [],
  }
) {
  if (Array.isArray(value)) {
    return hydrateTupleTreePayloadNode(value, annotationDefinitions, treeDictionaries);
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
    name: resolveTreeName(value.name, value.name_ref, treeDictionaries.treeNameDefinitions),
    length: value.length,
    split_indices: splitIndices,
    ...(splitKey === null ? {} : { splitKey }),
    ...(annotations === undefined ? {} : { annotations }),
    children: value.children.map((child) =>
      hydrateTreePayloadNode(child, annotationDefinitions, treeDictionaries)
    ),
  };
}

function hydrateTupleTreePayloadNode(value, annotationDefinitions, treeDictionaries) {
  const annotations =
    value[3] === null ? undefined : hydrateAnnotationValues(value[3], annotationDefinitions);
  const splitIndices = resolveSplitIndices(undefined, value[2], treeDictionaries.splitDefinitions);
  const splitKey = resolveSplitKey(undefined, value[2], splitIndices, treeDictionaries);

  return {
    name: resolveTreeName(undefined, value[1], treeDictionaries.treeNameDefinitions),
    length: value[0],
    split_indices: splitIndices,
    ...(splitKey === null ? {} : { splitKey }),
    ...(annotations === undefined ? {} : { annotations }),
    children: value[4].map((child) =>
      hydrateTreePayloadNode(child, annotationDefinitions, treeDictionaries)
    ),
  };
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
  annotationValues.forEach(([definitionIndex, value]) => {
    const definition = annotationDefinitions[definitionIndex];
    const { key, ...schema } = definition;
    fields[key] = {
      ...schema,
      value,
    };
  });
  return { fields };
}
