export default class TransitionIndexResolver {
    constructor(treeMetadata = [], distanceData = null, treePairSolutions = null, pairInterpolationRanges = []) {
        this.treeMetadata = treeMetadata;
        this.distanceData = distanceData;
        this.treePairSolutions = treePairSolutions;
        this.pairInterpolationRanges = pairInterpolationRanges;
        this._cachedFullTreeIndices = null;
        this._cachedFullTreeIndicesSet = null;  // O(1) lookup Set
    }

    /**
     * Returns a sorted list of full-tree indices derived from interpolation ranges.
     * Ensures that both the start of each range and the final anchor are included.
     */
    get fullTreeIndices() {
        if (this._cachedFullTreeIndices) {
            return this._cachedFullTreeIndices;
        }

        const indices = new Set();

        if (this.pairInterpolationRanges.length) {
            for (const range of this.pairInterpolationRanges) {
                indices.add(range[0]);
            }
            const lastRange = this.pairInterpolationRanges[this.pairInterpolationRanges.length - 1];
            indices.add(lastRange[1]);
        }

        // Always include first/last anchors as a final fallback.
        if (!indices.size && this.treeMetadata.length) {
            indices.add(0);
            indices.add(this.treeMetadata.length - 1);
        }

        this._cachedFullTreeIndices = Array.from(indices).sort((a, b) => a - b);
        this._cachedFullTreeIndicesSet = indices;  // Cache Set for O(1) lookup
        return this._cachedFullTreeIndices;
    }

    /**
     * Returns the Set of full-tree indices for O(1) membership checks.
     * @private
     */
    _getFullTreeIndicesSet() {
        if (!this._cachedFullTreeIndicesSet) {
            // Populate both caches
            this.fullTreeIndices;
        }
        return this._cachedFullTreeIndicesSet;
    }

    /**
     * Returns the global source tree index for a given sequence position.
     */
    getSourceGlobalIndex(position = 0) {
        if (!this.treeMetadata.length) {
            return position;
        }

        const clampedIndex = Math.min(Math.max(0, position), this.treeMetadata.length - 1);
        const meta = this.treeMetadata[clampedIndex];

        if (meta && typeof meta.source_tree_global_index === 'number') {
            return meta.source_tree_global_index;
        }

        return clampedIndex;
    }

    /**
     * Maps a distance index (timeline distance array position) back to a tree index.
     */
    getTreeIndexForDistanceIndex(distanceIndex = 0) {
        if (this.pairInterpolationRanges.length) {
            const clampedIndex = Math.min(Math.max(0, distanceIndex), this.pairInterpolationRanges.length - 1);
            const range = this.pairInterpolationRanges[clampedIndex];
            return range[0];
        }

        const anchors = this.fullTreeIndices;
        if (anchors.length) {
            const clampedIndex = Math.min(Math.max(0, distanceIndex), anchors.length - 1);
            return anchors[clampedIndex] ?? 0;
        }

        return 0;
    }

    /**
     * Indicates whether the provided index corresponds to a full (non-interpolated) tree.
     * Uses O(1) Set lookup instead of O(n) array.includes().
     */
    isFullTree(index) {
        if (!this.treeMetadata.length) {
            return this._getFullTreeIndicesSet().has(index);
        }

        const clampedIndex = Math.min(Math.max(0, index), this.treeMetadata.length - 1);
        return this._getFullTreeIndicesSet().has(clampedIndex);
    }
}
