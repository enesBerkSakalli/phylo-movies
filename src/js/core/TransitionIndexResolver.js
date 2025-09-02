/**
 * TransitionIndexResolver - Centralized logic for mapping tree indices to transition indices.
 *
 * SUPPORTS VARIABLE-LENGTH S-EDGES:
 * This resolver correctly handles variable interpolation counts per s-edge based on real data structure.
 * Unlike hardcoded assumptions, it dynamically adapts to:
 * - pair_0_1: 15 interpolated trees (complex topology differences)
 * - pair_1_2: 0 interpolated trees (identical trees)
 * - Each s-edge can have any number of interpolated trees based on structural differences
 *
 * DATA STRUCTURE UNDERSTANDING:
 * - tree_metadata contains global sequence with variable tree_pair_key groupings
 * - activeChangeEdge_metadata.treesPerActiveChangeEdge provides actual counts per active change edge
 * - Phases: ORIGINAL, DOWN_PHASE, COLLAPSE_PHASE, REORDER_PHASE, PRE_SNAP_PHASE, SNAP_PHASE
 * - activeChangeEdgeTracker provides redundant tracking for grouping (intentional design)
 */
export default class TransitionIndexResolver {
    _cachedFullTreeIndices = null;

    /**
     * Returns true if the given index is a full tree (ORIGINAL phase).
     * This is a method, not just a property, for compatibility with MovieTimelineManager.
     * @param {number} position
     * @returns {boolean}
     */
    isFullTree = (position) => {
        // Robust fallback: treat index 0 as a full tree even if metadata is sparse
        if (position === 0) return true;

        if (position < 0 || position >= this.treeMetadata.length) return false;
        const metadata = this.treeMetadata[position];

        // Check phase first (if available)
        if (metadata?.phase === 'ORIGINAL') return true;

        // No legacy name-based fallback
        return false;
    }

    /**
     * Gets the full tree index (0, 1, 2, ...) for a given tree position.
     * Returns -1 if the position is not a full tree.
     * @param {number} position - The tree index position
     * @returns {number} The full tree index (0-based sequential), or -1 if not a full tree
     */
    getFullTreeIndex = (position) => {
        if (!this.isFullTree(position)) return -1;

        // Count how many full trees come before this position
        let fullTreeCount = 0;
        for (let i = 0; i < position && i < this.treeMetadata.length; i++) {
            if (this.isFullTree(i)) {
                fullTreeCount++;
            }
        }
        return fullTreeCount;
    }

    /**
     * @param {object[]} treeMetadata - Tree metadata from InterpolationSequence
     * @param {any[]} distanceData - The distance data array
     * @param {object} sEdgeMetadata - S-edge summary metadata from backend
     * @param {object} treePairSolutions - Tree pair solutions from ProcessingResult
     * @param {boolean} debug - Enable/disable debug logging
     */
    constructor(treeMetadata, distanceData, sEdgeMetadata, treePairSolutions, debug = false) {
        this.debug = debug;
        // Default to empty structure that supports variable-length s-edges
        this.sEdgeMetadata = sEdgeMetadata || {
            activeChangeEdge_count: 0,
            treesPerActiveChangeEdge: {}, // Variable counts per active change edge
            total_interpolated_trees: 0,
            phase_distribution: {}
        };
        // Store tree_pair_solutions for ProcessingResult compliance
        this.treePairSolutions = treePairSolutions || {};
        this.updateData(treeMetadata, distanceData);
    }

    /**
     * Updates the resolver with new data and clears the cache.
     * @param {object[]} treeMetadata - Tree metadata from InterpolationSequence
     * @param {any[]} distanceData - The distance data array
     */
    updateData(treeMetadata, distanceData) {
        this.treeMetadata = treeMetadata ?? [];
        this.distanceData = distanceData ?? [];

        // Process active change edge structure from metadata
        this._processSEdgeStructure();

        // Clear caches
        this._cachedFullTreeIndices = null;

        if (this.debug) {
            console.debug("TIR: Updated data -", this.treeMetadata.length, "trees,", this.sEdgeMetadata.activeChangeEdge_count, "active change edges");
        }
    }

    /**
     * A lazily-computed getter for the sequence indices of all full trees ('T').
     * @returns {number[]}
     */
    get fullTreeIndices() {
        if (!this._cachedFullTreeIndices) {
            this._cachedFullTreeIndices = this.treeMetadata.reduce((acc, metadata, i) => {
                if (this.isFullTree(i)) {
                    acc.push(i);
                }
                return acc;
            }, []);
            if (this.debug) {
                console.debug("TIR: Cached", this._cachedFullTreeIndices.length, "full trees");
            }
        }
        return this._cachedFullTreeIndices;
    }

    /**
     * Process active change edge structure from tree metadata with variable-length support
     * CRITICAL: Follows ProcessingResult logic - only processes actual interpolation
     * @private
     */
    _processSEdgeStructure() {
        this.sEdgeCount = this.sEdgeMetadata.activeChangeEdge_count || 0;
        // Support both legacy number format and new object format
        this.treesPerSEdgeMap = typeof this.sEdgeMetadata.treesPerActiveChangeEdge === 'object'
            ? this.sEdgeMetadata.treesPerActiveChangeEdge || {}
            : {};
        this.totalInterpolatedTrees = this.sEdgeMetadata.total_interpolated_trees || 0;

        // Group trees by activeChangeEdgeTracker/tree_pair_key
        this.treesBySEdge = new Map();
        this.treesByPhase = new Map();
        this.actualInterpolationMap = new Map(); // Track which pairs actually have interpolation

        this.treeMetadata.forEach((metadata, index) => {
            // Group by tree_pair_key (represents active change edge)
            if (metadata.tree_pair_key) {
                if (!this.treesBySEdge.has(metadata.tree_pair_key)) {
                    this.treesBySEdge.set(metadata.tree_pair_key, []);
                }
                this.treesBySEdge.get(metadata.tree_pair_key).push({
                    index,
                    metadata,
                    stepInPair: metadata.step_in_pair
                });

                // CRITICAL: Check if this pair actually has interpolation
                this._updateInterpolationMap(metadata.tree_pair_key);
            }

            // Group by phase
            const phase = metadata.phase || 'UNKNOWN';
            if (!this.treesByPhase.has(phase)) {
                this.treesByPhase.set(phase, []);
            }
            this.treesByPhase.get(phase).push(index);
        });
    }

    /**
     * Update interpolation map based on ProcessingResult logic
     * @param {string} treePairKey - Tree pair key to check
     * @private
     */
    _updateInterpolationMap(treePairKey) {
        if (this.actualInterpolationMap.has(treePairKey)) {
            return; // Already checked
        }

        // Use tree_pair_solutions to determine interpolation presence
        const pairSolution = this.treePairSolutions[treePairKey];
        const hasInterpolation = pairSolution &&
                                 pairSolution.lattice_edge_solutions &&
                                 typeof pairSolution.lattice_edge_solutions === 'object' &&
                                 Object.keys(pairSolution.lattice_edge_solutions).length > 0;

        this.actualInterpolationMap.set(treePairKey, hasInterpolation);
    }



    /**
     * Gets the highlight data index for a given sequence position.
     * The index `k` corresponds to the transition block starting with `T_k`.
     * @param {number} position - Sequence position.
     * @returns {number} Highlight data index, or -1 if no highlight applies.
     */
    getHighlightingIndex(position) {
        // Primary: use metadata mapping when available
        if (position >= 0 && position < this.treeMetadata.length) {
            const metadata = this.treeMetadata[position];
            if (this.debug) console.debug("TIR: getHighlightingIndex for position", position, "metadata:", metadata);

            // Use tree_pair_key for direct mapping to highlight data
            if (metadata?.tree_pair_key) {
                return this._getHighlightIndexFromPairKey(metadata.tree_pair_key);
            }

            // Fallback to segment-based logic for original trees
            const fullTreeIndices = this.fullTreeIndices;
            if (fullTreeIndices.length > 0) {
                for (let k = 0; k < fullTreeIndices.length - 1; k++) {
                    const startIdx = fullTreeIndices[k];
                    const endIdx = fullTreeIndices[k + 1];
                    if (position >= startIdx && position < endIdx) {
                        return k;
                    }
                }
            }
        }

        // Metadata-sparse fallback: derive from distance index when possible, else 0
        const di = Math.floor(this.getDistanceIndex(position));
        if (this.treesBySEdge && this.treesBySEdge.size > 0) {
            return Math.max(0, Math.min(this.treesBySEdge.size - 1, di));
        }
        return Math.max(0, di);
    }

    /**
     * Extract highlight index from tree_pair_key
     * @param {string} pairKey - e.g., "pair_0_1"
     * @returns {number} Highlight data index
     * @private
     */
    _getHighlightIndexFromPairKey(pairKey) {
        if (!pairKey) return -1;

        // Extract pair index from "pair_0_1" format
        const match = pairKey.match(/pair_(\d+)_(\d+)/);
        if (match) {
            return parseInt(match[1]); // Return source tree index
        }
        return -1;
    }

    /**
     * Gets the distance data index for a given sequence position.
     * This logic remains different from highlighting:
     * - Intermediate trees use the distance of the transition they are in.
     * - Full trees use the distance of the transition that *led to* them.
     * @param {number} position - Sequence position.
     * @returns {number} Distance data index.
     */
    getDistanceIndex(position) {
        if (position < 0 || position >= this.treeMetadata.length) {
            return 0;
        }

        const metadata = this.treeMetadata[position];
        if (!metadata) {
            console.warn(`[TIR] No metadata found for position ${position}`);
            return 0;
        }

        // Use global_tree_index for more precise distance mapping
        if (metadata.global_tree_index !== undefined) {
            return this._mapGlobalIndexToDistanceIndex(metadata.global_tree_index, metadata.tree_pair_key);
        }

        // Fallback to tree_pair_key based calculation with ProcessingResult logic
        if (metadata.tree_pair_key) {
            const pairIndex = this._getHighlightIndexFromPairKey(metadata.tree_pair_key);
            const stepInPair = metadata.step_in_pair || 1;

            // CRITICAL: Check if this pair actually has interpolation
            const hasActualInterpolation = this.actualInterpolationMap.get(metadata.tree_pair_key);
            if (!hasActualInterpolation) {
                // No s-edges = identical trees, use discrete distance index
                return pairIndex;
            }

            const treesInThisSEdge = this.treesPerSEdgeMap[metadata.tree_pair_key] || 1;

            // Calculate fractional distance index based on actual active change edge progress
            return pairIndex + (stepInPair - 1) / treesInThisSEdge;
        }

        // Final fallback to position-based logic
        const fullTreeIndices = this.fullTreeIndices;
        if (this.isFullTree(position)) {
            const fullTreePositionInList = fullTreeIndices.indexOf(position);
            return Math.max(0, fullTreePositionInList - 1);
        }

        const distanceIndex = fullTreeIndices.findLastIndex(treeIndex => treeIndex <= position);
        return Math.max(0, distanceIndex);
    }

    /**
     * Map global tree index to distance data index with ProcessingResult logic
     * @param {number} globalIndex
     * @param {string} treePairKey - Current tree's s-edge key for length lookup
     * @returns {number}
     * @private
     */
    _mapGlobalIndexToDistanceIndex(globalIndex, treePairKey) {
        // CRITICAL: Check if this pair actually has interpolation
        if (treePairKey) {
            const hasActualInterpolation = this.actualInterpolationMap.get(treePairKey);
            if (!hasActualInterpolation) {
                // No s-edges = identical trees, use discrete mapping
                const pairIndex = this._getHighlightIndexFromPairKey(treePairKey);
                return Math.max(0, pairIndex);
            }

            // Has interpolation - use variable s-edge mapping
            const treesInSEdge = this.treesPerSEdgeMap[treePairKey];
            if (treesInSEdge) {
                return Math.max(0, Math.floor(globalIndex / treesInSEdge));
            }
        }

        // Fallback: use average trees per s-edge if available
        const totalSEdges = this.sEdgeCount || 1;
        const averageTreesPerSEdge = this.totalInterpolatedTrees / totalSEdges || 1;
        return Math.max(0, Math.floor(globalIndex / averageTreesPerSEdge));
    }



    
}
