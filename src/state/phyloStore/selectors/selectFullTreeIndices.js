import { EMPTY_ARRAY } from './emptyValues.js';

export const selectFullTreeIndices = (state = {}) => {
  return Array.isArray(state?.fullTreeIndices) ? state.fullTreeIndices : EMPTY_ARRAY;
};
