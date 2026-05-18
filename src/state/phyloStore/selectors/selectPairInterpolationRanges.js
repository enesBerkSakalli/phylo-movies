const EMPTY_PAIR_INTERPOLATION_RANGES = [];

export const selectPairInterpolationRanges = (state) => state.transitionResolver?.pairInterpolationRanges ?? EMPTY_PAIR_INTERPOLATION_RANGES;
