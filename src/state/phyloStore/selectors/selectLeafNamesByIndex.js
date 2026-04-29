import { EMPTY_ARRAY } from './emptyValues.js';

export const selectLeafNamesByIndex = (state = {}) => {
  return Array.isArray(state?.leafNamesByIndex) ? state.leafNamesByIndex : EMPTY_ARRAY;
};
