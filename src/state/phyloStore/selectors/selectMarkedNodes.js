import { EMPTY_ARRAY } from './emptyValues.js';

export const selectMarkedNodes = (state = {}) => {
  return Array.isArray(state?.manuallyMarkedNodes) ? state.manuallyMarkedNodes : EMPTY_ARRAY;
};
