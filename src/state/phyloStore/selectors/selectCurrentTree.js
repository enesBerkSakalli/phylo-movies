import { selectActiveTreeList } from './selectActiveTreeList.js';

export const selectCurrentTree = (state) => {
  return selectActiveTreeList(state)[state.currentTreeIndex] ?? null;
};
