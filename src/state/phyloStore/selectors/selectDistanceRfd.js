import { EMPTY_ARRAY } from './emptyValues.js';

export const selectDistanceRfd = (state = {}) => {
  return Array.isArray(state?.distanceRfd) ? state.distanceRfd : EMPTY_ARRAY;
};
