let cachedTreeSource = null;
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
  const treeSource = state.treeSource;
  const treeList = state.treeList;
  const treeHydrationVersion = state.treeHydrationVersion ?? 0;

  if (
    treeSource === cachedTreeSource &&
    treeList === cachedTreeList &&
    treeHydrationVersion === cachedTreeHydrationVersion
  ) {
    return cachedStats;
  }

  const sourceTreeCount = treeSource?.treeCount ?? 0;
  const totalTrees = sourceTreeCount || treeList.length;
  const hydratedTrees = treeList.reduce((count, tree) => count + (tree ? 1 : 0), 0);
  let compactPayloadTrees = 0;
  for (let index = 0; index < sourceTreeCount; index += 1) {
    if (treeSource.isCompactAt(index)) compactPayloadTrees += 1;
  }

  cachedTreeSource = treeSource;
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
