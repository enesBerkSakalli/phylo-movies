export const selectMaxScale = (state = {}) => {
  const maxScale = Number(state?.maxScale);
  return Number.isFinite(maxScale) ? maxScale : 0;
};
