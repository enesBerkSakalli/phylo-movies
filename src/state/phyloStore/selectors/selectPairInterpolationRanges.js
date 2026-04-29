import { EMPTY_ARRAY } from './emptyValues.js';

export const selectPairInterpolationRanges = (state = {}) => {
  return Array.isArray(state?.pairInterpolationRanges) ? state.pairInterpolationRanges : EMPTY_ARRAY;
};
