export const selectFileName = (state = {}) => {
  return typeof state?.fileName === 'string' && state.fileName.length > 0
    ? state.fileName
    : null;
};
