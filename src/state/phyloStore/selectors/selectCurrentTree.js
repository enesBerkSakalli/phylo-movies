import { selectActiveTreeList } from './selectActiveTreeList.js';

export const selectCurrentTree = (state = {}) => {
  const treeList = selectActiveTreeList(state);
  const { currentTreeIndex } = state || {};
  if (typeof currentTreeIndex !== 'number') {
    return null;
  }
  return treeList[currentTreeIndex] ?? null;
};
