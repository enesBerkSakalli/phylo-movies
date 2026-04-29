import { EMPTY_ARRAY } from './emptyValues.js';

export const selectTreeControllers = (state = {}) => {
  return Array.isArray(state?.treeControllers) ? state.treeControllers : EMPTY_ARRAY;
};
