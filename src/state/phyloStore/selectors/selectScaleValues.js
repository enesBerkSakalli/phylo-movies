import { EMPTY_ARRAY } from './emptyValues.js';

export const selectScaleValues = (state = {}) => {
  return Array.isArray(state?.scaleValues) ? state.scaleValues : EMPTY_ARRAY;
};
