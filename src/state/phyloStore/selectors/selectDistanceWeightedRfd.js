import { EMPTY_ARRAY } from './emptyValues.js';

export const selectDistanceWeightedRfd = (state = {}) => {
  return Array.isArray(state?.distanceWeightedRfd) ? state.distanceWeightedRfd : EMPTY_ARRAY;
};
