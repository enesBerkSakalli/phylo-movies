import { selectTreeControllers } from './selectTreeControllers.js';

export const selectPrimaryTreeController = (state = {}) => {
  return selectTreeControllers(state)[0] ?? null;
};
