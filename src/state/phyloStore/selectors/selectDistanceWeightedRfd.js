const EMPTY_DISTANCE_SERIES = [];

export const selectDistanceWeightedRfd = (state) => state.treeDistances?.weighted_robinson_foulds ?? EMPTY_DISTANCE_SERIES;
