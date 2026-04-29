import { EMPTY_ARRAY } from './emptyValues.js';

export const selectTreeMetadata = (state = {}) => {
  return Array.isArray(state?.treeMetadata) ? state.treeMetadata : EMPTY_ARRAY;
};
