const EMPTY_DISTANCE_SERIES = [];

export const selectDistanceRfd = (state) => state.treeDistances?.robinson_foulds ?? EMPTY_DISTANCE_SERIES;
