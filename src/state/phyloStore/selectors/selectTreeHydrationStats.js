function isCompactTreePayload(tree) {
  if (Array.isArray(tree)) return true;
  if (!tree || typeof tree !== 'object') return false;
  return (
    Object.prototype.hasOwnProperty.call(tree, 'name_ref') ||
    Object.prototype.hasOwnProperty.call(tree, 'split_ref') ||
    Object.prototype.hasOwnProperty.call(tree, 'annotation_values')
  );
}

let cachedTreePayloadList = null;
let cachedTreeList = null;
let cachedTreeHydrationVersion = null;
let cachedStats = Object.freeze({
  totalTrees: 0,
  hydratedTrees: 0,
  compactPayloadTrees: 0,
  hydratedPercent: 0,
  treeHydrationVersion: 0,
});

export const selectTreeHydrationStats = (state) => {
  const treePayloadList = state.treePayloadList;
  const treeList = state.treeList;
  const treeHydrationVersion = state.treeHydrationVersion ?? 0;

  if (
    treePayloadList === cachedTreePayloadList &&
    treeList === cachedTreeList &&
    treeHydrationVersion === cachedTreeHydrationVersion
  ) {
    return cachedStats;
  }

  const totalTrees = treePayloadList.length || treeList.length;
  const hydratedTrees = treeList.reduce((count, tree) => count + (tree ? 1 : 0), 0);
  const compactPayloadTrees = treePayloadList.reduce(
    (count, tree) => count + (isCompactTreePayload(tree) ? 1 : 0),
    0
  );

  cachedTreePayloadList = treePayloadList;
  cachedTreeList = treeList;
  cachedTreeHydrationVersion = treeHydrationVersion;
  cachedStats = {
    totalTrees,
    hydratedTrees,
    compactPayloadTrees,
    hydratedPercent: totalTrees > 0 ? hydratedTrees / totalTrees : 0,
    treeHydrationVersion,
  };
  return cachedStats;
};
