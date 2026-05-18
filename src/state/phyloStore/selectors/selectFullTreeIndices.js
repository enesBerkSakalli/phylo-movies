const EMPTY_FULL_TREE_INDICES = [];

export const selectFullTreeIndices = (state) => state.transitionResolver?.fullTreeIndices ?? EMPTY_FULL_TREE_INDICES;
