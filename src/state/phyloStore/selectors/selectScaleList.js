import { EMPTY_ARRAY } from './emptyValues.js';

export const selectScaleList = (state = {}) => {
  return Array.isArray(state?.scaleList) ? state.scaleList : EMPTY_ARRAY;
};
