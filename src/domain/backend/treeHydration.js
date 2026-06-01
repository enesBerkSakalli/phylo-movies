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

  const annotations =
    value.annotations ??
    (value.annotation_values === undefined
      ? undefined
      : hydrateAnnotationValues(value.annotation_values, annotationDefinitions));

  return {
    name: resolveTreeName(value.name, value.name_ref, treeDictionaries.treeNameDefinitions),
    length: value.length,
    split_indices: resolveSplitIndices(
      value.split_indices,
      value.split_ref,
      treeDictionaries.splitDefinitions
    ),
    ...(annotations === undefined ? {} : { annotations }),
    children: value.children.map((child) =>
      hydrateTreePayloadNode(child, annotationDefinitions, treeDictionaries)
    ),
  };
}

function hydrateTupleTreePayloadNode(value, annotationDefinitions, treeDictionaries) {
  const annotations =
    value[3] === null ? undefined : hydrateAnnotationValues(value[3], annotationDefinitions);

  return {
    name: resolveTreeName(undefined, value[1], treeDictionaries.treeNameDefinitions),
    length: value[0],
    split_indices: resolveSplitIndices(undefined, value[2], treeDictionaries.splitDefinitions),
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
