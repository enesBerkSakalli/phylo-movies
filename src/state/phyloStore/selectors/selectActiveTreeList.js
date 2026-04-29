import { EMPTY_TREE_LIST } from './emptyValues.js';

export const selectActiveTreeList = (state = {}) => {
  return Array.isArray(state?.treeList) ? state.treeList : EMPTY_TREE_LIST;
};
