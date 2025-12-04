export default class TransitionIndexResolver {
    constructor(treeMetadata = [], distanceData = null, treePairSolutions = null, pairInterpolationRanges = []) {
        this.treeMetadata = Array.isArray(treeMetadata) ? treeMetadata : [];
        this.distanceData = distanceData;
        this.treePairSolutions = treePairSolutions;
        this.pairInterpolationRanges = Array.isArray(pairInterpolationRanges) ? pairInterpolationRanges : [];
        this._cachedFullTreeIndices = null;
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
                if (Array.isArray(range) && typeof range[0] === 'number') {
                    indices.add(range[0]);
                }
            }
            const lastRange = this.pairInterpolationRanges[this.pairInterpolationRanges.length - 1];
            if (Array.isArray(lastRange) && typeof lastRange[1] === 'number') {
                indices.add(lastRange[1]);
            }
        }

        // Fallback to metadata flags when interpolation ranges are missing.
        if (!indices.size && this.treeMetadata.length) {
            this.treeMetadata.forEach((entry, idx) => {
                if (entry?.is_full_tree) {
                    indices.add(idx);
                }
            });
        }

        // Always include first/last anchors as a final fallback.
        if (!indices.size && this.treeMetadata.length) {
            indices.add(0);
            indices.add(this.treeMetadata.length - 1);
        }

        this._cachedFullTreeIndices = Array.from(indices).sort((a, b) => a - b);
        return this._cachedFullTreeIndices;
    }

    /**
     * Returns the 0-based source tree index for a given sequence position.
     */
    getSourceTreeIndex(position = 0) {
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
            if (Array.isArray(range) && typeof range[0] === 'number') {
                return range[0];
            }
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
     */
    isFullTree(index) {
        if (!this.treeMetadata.length) {
            return this.fullTreeIndices.includes(index);
        }

        const clampedIndex = Math.min(Math.max(0, index), this.treeMetadata.length - 1);
        const meta = this.treeMetadata[clampedIndex];
        if (typeof meta?.is_full_tree === 'boolean') {
            return meta.is_full_tree;
        }

        return this.fullTreeIndices.includes(clampedIndex);
    }
}
