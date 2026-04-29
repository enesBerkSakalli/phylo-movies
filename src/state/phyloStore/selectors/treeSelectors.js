const EMPTY_TREE_LIST = Object.freeze([]);

export const selectActiveTreeList = (state = {}) => {
  return Array.isArray(state?.treeList) ? state.treeList : EMPTY_TREE_LIST;
};

export const selectCurrentTree = (state = {}) => {
  const treeList = selectActiveTreeList(state);
  const { currentTreeIndex } = state || {};
  if (typeof currentTreeIndex !== 'number') {
    return null;
  }
  return treeList[currentTreeIndex] ?? null;
};
