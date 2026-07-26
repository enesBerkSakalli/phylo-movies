/** @param {import('../../../types/store').AppStoreState} state */
export const selectFileName = (state) => {
  return state.fileName || null;
};
