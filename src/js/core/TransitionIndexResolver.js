export default class TransitionIndexResolver {
    constructor(treeMetadata, distanceData, treePairSolutions, pairInterpolationRanges) {
        this.treeMetadata = treeMetadata;
        this.pairInterpolationRanges = pairInterpolationRanges;
    }

    get fullTreeIndices() {
        return this.pairInterpolationRanges.map(range => range[0]);
    }

    getSourceTreeIndex(position) {
        return this.treeMetadata[position].source_tree_global_index + 1;
    }

    getTreeIndexForDistanceIndex(distanceIndex) {
        return this.pairInterpolationRanges[distanceIndex][0];
    }
}

