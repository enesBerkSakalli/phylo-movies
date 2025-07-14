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
 * - s_edge_metadata.trees_per_s_edge provides actual counts per s-edge
 * - Phases: ORIGINAL, DOWN_PHASE, COLLAPSE_PHASE, REORDER_PHASE, PRE_SNAP_PHASE, SNAP_PHASE
 * - s_edge_tracker provides redundant tracking for grouping (intentional design)
 */
export default class TransitionIndexResolver {
    _cachedFullTreeIndices = null;
    _cachedConsensusTreeIndices = null;

    /**
     * Returns true if the given index is a full tree (ORIGINAL phase).
     * This is a method, not just a property, for compatibility with MovieTimelineManager.
     * @param {number} position
     * @returns {boolean}
     */
    /**
     * Returns true if the given index is a full tree (ORIGINAL phase).
     * This is a method, not a property, for compatibility with MovieTimelineManager.
     */
    isFullTree = (position) => {
        if (position < 0 || position >= this.treeMetadata.length) return false;
        return this.treeMetadata[position]?.phase === 'ORIGINAL' ?? false;
    }

    /**
     * @param {object[]} treeMetadata - Tree metadata from InterpolationSequence
     * @param {any[]} highlightData - The highlight data array
     * @param {any[]} distanceData - The distance data array
     * @param {object} sEdgeMetadata - S-edge summary metadata from backend
     * @param {object} treePairSolutions - Tree pair solutions from ProcessingResult
     * @param {boolean} debug - Enable/disable debug logging
     */
    constructor(treeMetadata, highlightData, distanceData, sEdgeMetadata, treePairSolutions, debug = false) {
        this.debug = debug;
        // Default to empty structure that supports variable-length s-edges
        this.sEdgeMetadata = sEdgeMetadata || {
            s_edge_count: 0,
            trees_per_s_edge: {}, // Variable counts per s-edge
            total_interpolated_trees: 0,
            phase_distribution: {}
        };
        // CRITICAL: Store tree_pair_solutions for ProcessingResult compliance
        this.treePairSolutions = treePairSolutions || {};
        this.updateData(treeMetadata, highlightData, distanceData);
    }

    /**
     * Updates the resolver with new data and clears the cache.
     * @param {object[]} treeMetadata - Tree metadata from InterpolationSequence
     * @param {any[]} highlightData - The highlight data array
     * @param {any[]} distanceData - The distance data array
     */
    updateData(treeMetadata, highlightData, distanceData) {
        this.treeMetadata = treeMetadata ?? [];
        this.highlightData = highlightData ?? [];
        this.distanceData = distanceData ?? [];

        // Process s_edge structure from metadata
        this._processSEdgeStructure();

        // Clear caches
        this._cachedFullTreeIndices = null;
        this._cachedConsensusTreeIndices = null;

        if (this.debug) {
            console.debug("TIR: Updated data -", this.treeMetadata.length, "trees,", this.sEdgeMetadata.s_edge_count, "s_edges");
        }
    }

    /**
     * A lazily-computed getter for the sequence indices of all full trees ('T').
     * @returns {number[]}
     */
    get fullTreeIndices() {
        if (!this._cachedFullTreeIndices) {
            this._cachedFullTreeIndices = this.treeMetadata.reduce((acc, metadata, i) => {
                if (metadata?.phase === 'ORIGINAL') {
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
     * Process s_edge structure from tree metadata with variable-length support
     * CRITICAL: Follows ProcessingResult logic - only processes actual interpolation
     * @private
     */
    _processSEdgeStructure() {
        this.sEdgeCount = this.sEdgeMetadata.s_edge_count || 0;
        // Support both legacy number format and new object format
        this.treesPerSEdgeMap = typeof this.sEdgeMetadata.trees_per_s_edge === 'object'
            ? this.sEdgeMetadata.trees_per_s_edge || {}
            : {};
        this.totalInterpolatedTrees = this.sEdgeMetadata.total_interpolated_trees || 0;

        // Group trees by s_edge/tree_pair_key
        this.treesBySEdge = new Map();
        this.treesByPhase = new Map();
        this.actualInterpolationMap = new Map(); // Track which pairs actually have interpolation

        this.treeMetadata.forEach((metadata, index) => {
            // Group by tree_pair_key (represents s_edge)
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

        if (this.debug) {
            console.debug('TIR: S-edge structure processed (ProcessingResult compliant):', {
                sEdgeCount: this.sEdgeCount,
                treesPerSEdgeMap: this.treesPerSEdgeMap,
                treesBySEdge: Object.fromEntries(this.treesBySEdge),
                treesByPhase: Object.fromEntries(this.treesByPhase),
                actualInterpolationMap: Object.fromEntries(this.actualInterpolationMap),
                actualSEdgeLengths: Object.fromEntries(
                    Array.from(this.treesBySEdge.entries()).map(([key, trees]) => [key, trees.length])
                )
            });
        }
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

        const pairSolution = this.treePairSolutions[treePairKey];
        // CRITICAL FIX: lattice_edge_solutions is an object/dict, not an array
        const hasInterpolation = pairSolution &&
                                pairSolution.lattice_edge_solutions &&
                                typeof pairSolution.lattice_edge_solutions === 'object' &&
                                Object.keys(pairSolution.lattice_edge_solutions).length > 0;

        this.actualInterpolationMap.set(treePairKey, hasInterpolation);
    }

    /**
     * A lazily-computed getter for the sequence indices of all consensus trees ('C').
     * @returns {number[]}
     */
    get consensusTreeIndices() {
        if (!this._cachedConsensusTreeIndices) {
            this._cachedConsensusTreeIndices = this.treeMetadata.reduce((acc, metadata, i) => {
                if (metadata?.phase === 'COLLAPSE_PHASE' || metadata?.phase === 'REORDER_PHASE') {
                    acc.push(i);
                }
                return acc;
            }, []);
            if (this.debug) {
                console.debug("TIR: Cached", this._cachedConsensusTreeIndices.length, "consensus trees");
            }
        }
        return this._cachedConsensusTreeIndices;
    }

    /**
     * Gets the highlight data index for a given sequence position.
     * The index `k` corresponds to the transition block starting with `T_k`.
     * @param {number} position - Sequence position.
     * @returns {number} Highlight data index, or -1 if no highlight applies.
     */
    getHighlightingIndex(position) {
        if (position < 0 || position >= this.treeMetadata.length) {
            if (this.debug) console.debug("TIR: Invalid position", position, "TreeMetadata length:", this.treeMetadata.length);
            return -1;
        }

        const metadata = this.treeMetadata[position];
        if (this.debug) console.debug("TIR: getHighlightingIndex for position", position, "metadata:", metadata);

        // Use tree_pair_key for direct mapping to highlight data
        if (metadata.tree_pair_key) {
            return this._getHighlightIndexFromPairKey(metadata.tree_pair_key);
        }

        // Fallback to segment-based logic for original trees
        const fullTreeIndices = this.fullTreeIndices;
        if (fullTreeIndices.length === 0) {
            if (this.debug) console.debug("TIR: No full trees found");
            return -1;
        }

        // Find which segment this position belongs to
        for (let k = 0; k < fullTreeIndices.length - 1; k++) {
            const startIdx = fullTreeIndices[k];
            const endIdx = fullTreeIndices[k + 1];

            if (position >= startIdx && position < endIdx) {
                return k; // Highlight data index for this segment
            }
        }

        if (this.debug) {
            console.debug("TIR: No highlight data for position", position);
        }
        return -1;
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

            // Calculate fractional distance index based on actual s_edge progress
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

    /**
     * Maps from distance/transition index to the corresponding full tree sequence index.
     * For distance index i, this returns the sequence index of the target full tree
     * of the i-th transition (i.e., T_(i+1)).
     * @param {number} distanceIndex - The distance/transition index.
     * @returns {number} The sequence index of the corresponding full tree.
     */
    getTreeIndexForDistanceIndex(distanceIndex) {
        const fullTreeIndices = this.fullTreeIndices;

        if (fullTreeIndices.length === 0) {
            return 0; // Fallback
        }

        // Distance index i corresponds to the transition from T_i to T_(i+1)
        // We want to return the sequence index of T_(i+1)
        if (distanceIndex < 0) {
            return fullTreeIndices[0]; // First full tree
        }

        if (distanceIndex >= fullTreeIndices.length - 1) {
            return fullTreeIndices[fullTreeIndices.length - 1]; // Last full tree
        }

        // Return the target full tree of the transition
        return fullTreeIndices[distanceIndex + 1];
    }

    /**
     * Checks if the tree at a given position is a consensus tree.
     * @param {number} position - Sequence position.
     * @returns {boolean} True if the tree is a consensus tree.
     */
    isConsensusTree(position) {
        if (position < 0 || position >= this.treeMetadata.length) return false;
        const phase = this.treeMetadata[position]?.phase;
        return phase === 'COLLAPSE_PHASE' || phase === 'REORDER_PHASE';
    }

    /**
     * Checks if the tree at a given position is an interpolated tree.
     * @param {number} position - Sequence position.
     * @returns {boolean} True if the tree is an interpolated tree.
     */
    isInterpolatedTree(position) {
        if (position < 0 || position >= this.treeMetadata.length) return false;
        const phase = this.treeMetadata[position]?.phase;
        return phase === 'DOWN_PHASE' || phase === 'PRE_SNAP_PHASE' || phase === 'SNAP_PHASE';
    }

    /**
     * Determines the interpolation direction for an IT tree.
     * Based on variable s-edge structure: T, IT_DOWN(s), C(s), IT_UP(s), T
     * DOWN_PHASE trees move away from source, PRE_SNAP_PHASE/SNAP_PHASE approach target
     * @param {number} position - Sequence position.
     * @returns {string|null} 'IT_DOWN', 'IT_UP', or null if not an interpolated tree.
     */
    getInterpolationDirection = (position) => {
        if (position < 0 || position >= this.treeMetadata.length) return null;

        const metadata = this.treeMetadata[position];
        const phase = metadata?.phase;

        if (phase === 'DOWN_PHASE') return 'IT_DOWN';
        if (phase === 'PRE_SNAP_PHASE' || phase === 'SNAP_PHASE') return 'IT_UP';

        return null;
    }

    /**
     * Detects the transition type between two tree positions.
     * Used for implementing phase-aware animations.
     * @param {number} fromPosition - Source tree position.
     * @param {number} toPosition - Target tree position.
     * @returns {object} Object describing the transition type and animation strategy.
     */
    getTransitionType = (fromPosition, toPosition) => {
        const fromInfo = this.getTreeInfo(fromPosition);
        const toInfo = this.getTreeInfo(toPosition);

        // Use phase-based transition detection
        const fromPhase = fromInfo.phase;
        const toPhase = toInfo.phase;

        const isITDownToC = fromPhase === 'DOWN_PHASE' &&
                           (toPhase === 'COLLAPSE_PHASE' || toPhase === 'REORDER_PHASE');

        const isITUpToC = (fromPhase === 'PRE_SNAP_PHASE' || fromPhase === 'SNAP_PHASE') &&
                         (toPhase === 'COLLAPSE_PHASE' || toPhase === 'REORDER_PHASE');

        const isCToITUp = (fromPhase === 'COLLAPSE_PHASE' || fromPhase === 'REORDER_PHASE') &&
                         (toPhase === 'PRE_SNAP_PHASE' || toPhase === 'SNAP_PHASE');

        // Animation strategy determination
        let animationStrategy = 'default';

        if (isITDownToC || isITUpToC) {
            animationStrategy = 'exit_first';
        } else if (isCToITUp) {
            animationStrategy = 'animate_then_enter';
        }

        return {
            fromPhase,
            toPhase,
            fromDirection: this.getInterpolationDirection(fromPosition),
            toDirection: this.getInterpolationDirection(toPosition),
            isITDownToC,
            isITUpToC,
            isCToITUp,
            animationStrategy,
            description: `${fromInfo.semanticType} → ${toInfo.semanticType}`,
            requiresSpecialHandling: isITDownToC || isITUpToC || isCToITUp
        };
    }

    /**
     * Gets the consensus tree number from the tree name.
     * Assumes consensus trees are named like 'C_1', 'C_2', etc.
     * @param {number} position - Sequence position.
     * @returns {number} The consensus tree number, or -1 if not a consensus tree or number cannot be extracted.
     */

    getConsensusTreeNumber = (position) => {
        if (position < 0 || position >= this.treeMetadata.length) return -1;

        const metadata = this.treeMetadata[position];
        if (!metadata || !this.isConsensusTree(position)) return -1;

        // Extract number from consensus tree name (e.g., 'C0_1' -> 1)
        const match = metadata.tree_name?.match(/^C(\d+)_(\d+)/);
        if (match) {
            return parseInt(match[2], 10); // Return the second number
        }

        return -1;
    }

    /**
     * Gets information about the tree at a given position.
     * Enhanced with semantic meaning and visual context for UI components.
     * @param {number} position - Sequence position.
     * @returns {object} Object containing tree information: { type, isConsensus, consensusNumber, name, semanticType, colorClass }.
     */
    getTreeInfo = (position) => {
        if (position < 0 || position >= this.treeMetadata.length) {
            return {
                phase: 'UNKNOWN',
                isConsensus: false,
                consensusNumber: -1,
                name: 'Unknown',
                semanticType: 'Unknown',
                colorClass: 'tree-type-unknown'
            };
        }

        const metadata = this.treeMetadata[position];
        const phase = metadata?.phase || 'UNKNOWN';
        const name = metadata?.tree_name || 'Unknown';
        const isConsensus = this.isConsensusTree(position);
        const consensusNumber = isConsensus ? this.getConsensusTreeNumber(position) : -1;

        // Map phases to semantic types
        let semanticType, colorClass;
        switch (phase) {
            case 'ORIGINAL':
                semanticType = 'Reconstructed';
                colorClass = 'tree-type-full';
                break;
            case 'DOWN_PHASE':
            case 'PRE_SNAP_PHASE':
            case 'SNAP_PHASE':
                semanticType = 'Interpolated';
                colorClass = 'tree-type-intermediate';
                break;
            case 'COLLAPSE_PHASE':
            case 'REORDER_PHASE':
                semanticType = 'Consensus';
                colorClass = 'tree-type-consensus';
                break;
            default:
                semanticType = 'Unknown';
                colorClass = 'tree-type-unknown';
        }

        return {
            phase,
            isConsensus,
            consensusNumber,
            name,
            semanticType,
            colorClass,
            ...metadata // Include all metadata for enhanced access
        };
    }

    getNextPosition = (currentPosition) => {
        if (!Array.isArray(this.treeMetadata) || this.treeMetadata.length === 0) return 0;
        return Math.min(currentPosition + 1, this.treeMetadata.length - 1);
    }

    getPreviousPosition = (currentPosition) => {
        if (!Array.isArray(this.treeMetadata) || this.treeMetadata.length === 0) return 0;
        return Math.max(currentPosition - 1, 0);
    }

    getNextFullTreeSequenceIndex = (currentIndex) => {
        if (this.fullTreeIndices.length === 0) return currentIndex;
        const nextIndex = this.fullTreeIndices.find(index => index > currentIndex);
        return nextIndex ?? this.fullTreeIndices.at(-1) ?? currentIndex;
    }

    getPreviousFullTreeSequenceIndex = (currentIndex) => {
        if (this.fullTreeIndices.length === 0) return currentIndex;
        const prevIndex = this.fullTreeIndices.findLast(index => index < currentIndex);
        return prevIndex ?? this.fullTreeIndices[0] ?? currentIndex;
    }

    /**
     * Get the next consensus tree sequence index from the current position.
     * @param {number} currentIndex - Current sequence position.
     * @returns {number} Next consensus tree sequence index.
     */
    getNextConsensusTreeSequenceIndex = (currentIndex) => {
        if (this.consensusTreeIndices.length === 0) return currentIndex;
        const nextIndex = this.consensusTreeIndices.find(index => index > currentIndex);
        return nextIndex ?? this.consensusTreeIndices.at(-1) ?? currentIndex;
    }

    /**
     * Get the previous consensus tree sequence index from the current position.
     * @param {number} currentIndex - Current sequence position.
     * @returns {number} Previous consensus tree sequence index.
     */
    getPreviousConsensusTreeSequenceIndex = (currentIndex) => {
        if (this.consensusTreeIndices.length === 0) return currentIndex;
        const prevIndex = this.consensusTreeIndices.findLast(index => index < currentIndex);
        return prevIndex ?? this.consensusTreeIndices[0] ?? currentIndex;
    }

    /**
     * Get the global tree index for a specific step within an s-edge.
     * @param {string} pairKey - The tree pair key (e.g., "pair_0_1").
     * @param {number} step - The 1-based step number within the s-edge.
     * @returns {number|null} The global tree index, or null if not found.
     */
    getTreeIndexForSEdgeStep = (pairKey, step) => {
        const treesInPair = this.treesBySEdge.get(pairKey);
        if (treesInPair) {
            const targetTree = treesInPair.find(t => t.stepInPair === step);
            return targetTree ? targetTree.index : null;
        }
        return null;
    }

    /**
     * Get the global index of the first tree of the next s-edge.
     * @param {string} currentPairKey - The tree pair key of the current s-edge.
     * @returns {number|null} The global tree index, or null if at the last s-edge.
     */
    getNextSEdgeFirstTreeIndex = (currentPairKey) => {
        const currentPairMatch = currentPairKey.match(/pair_(\d+)_(\d+)/);
        if (!currentPairMatch) return null;

        const currentPairIndex = parseInt(currentPairMatch[1]);
        const nextPairKey = `pair_${currentPairIndex + 1}_${currentPairIndex + 2}`;

        const nextSEdgeTrees = this.treesBySEdge.get(nextPairKey);
        if (nextSEdgeTrees && nextSEdgeTrees.length > 0) {
            // Find the first tree with step_in_pair === 1 (or just the first tree if no steps)
            const firstTree = nextSEdgeTrees.find(t => t.stepInPair === 1) || nextSEdgeTrees[0];
            return firstTree.index;
        }
        return null;
    }

    /**
     * Get the global index of the first tree of the previous s-edge.
     * @param {string} currentPairKey - The tree pair key of the current s-edge.
     * @returns {number|null} The global tree index, or null if at the first s-edge.
     */
    getPrevSEdgeFirstTreeIndex = (currentPairKey) => {
        const currentPairMatch = currentPairKey.match(/pair_(\d+)_(\d+)/);
        if (!currentPairMatch) return null;

        const currentPairIndex = parseInt(currentPairMatch[1]);
        if (currentPairIndex === 0) return null; // Already at the first s-edge

        const prevPairKey = `pair_${currentPairIndex - 1}_${currentPairIndex}`;

        const prevSEdgeTrees = this.treesBySEdge.get(prevPairKey);
        if (prevSEdgeTrees && prevSEdgeTrees.length > 0) {
            // Find the first tree with step_in_pair === 1 (or just the first tree if no steps)
            const firstTree = prevSEdgeTrees.find(t => t.stepInPair === 1) || prevSEdgeTrees[0];
            return firstTree.index;
        }
        return null;
    }

    validateData = () => {
        const issues = [];

        // Basic data structure validation
        if (!this.treeMetadata || this.treeMetadata.length === 0) {
            issues.push("Tree metadata is empty.");
        }
        if (!this.highlightData) {
            issues.push("Highlight data is undefined.");
        }
        if (this.sEdgeCount < 0) {
            issues.push("S-edge count is negative.");
        }

        // S-edge structure validation
        if (this.treeMetadata.length > 0) {
            const hasValidFullTrees = this.fullTreeIndices.length > 0;
            if (!hasValidFullTrees) {
                issues.push("No valid full trees (ORIGINAL phase) found.");
            }

            // Validate s_edge structure with variable-length support
            const actualInterpolatedTrees = this.treeMetadata.filter(m => m.phase !== 'ORIGINAL').length;
            const expectedFromMetadata = this.totalInterpolatedTrees;

            if (expectedFromMetadata > 0 && expectedFromMetadata !== actualInterpolatedTrees) {
                issues.push(`S-edge tree count mismatch: metadata indicates ${expectedFromMetadata}, but found ${actualInterpolatedTrees} interpolated trees`);
            }

            // Validate individual s-edge lengths match metadata
            for (const [sEdgeKey, trees] of this.treesBySEdge.entries()) {
                const actualLength = trees.length;
                const expectedLength = this.treesPerSEdgeMap[sEdgeKey];
                if (expectedLength && expectedLength !== actualLength) {
                    issues.push(`S-edge ${sEdgeKey} length mismatch: expected ${expectedLength}, got ${actualLength}`);
                }
            }

            // Validate phase consistency
            let hasUnknownPhases = false;
            this.treeMetadata.forEach((metadata) => {
                if (!metadata.phase || metadata.phase === 'UNKNOWN') {
                    hasUnknownPhases = true;
                }
            });
            if (hasUnknownPhases) {
                issues.push("Some trees have unknown or missing phase information.");
            }
        }

        return { isValid: issues.length === 0, issues };
    };

    /**
     * Get current s_edge information for a given tree position.
     * @param {number} position - The global tree index.
     * @returns {object} Object containing s_edge details.
     */
    getSEdgeInfo = (position) => {
        const metadata = this.treeMetadata?.[position];
        if (!metadata) {
            return {
                sEdgeIndex: -1,
                stepInPair: -1,
                totalSteps: 0,
                pairKey: null,
                phase: 'UNKNOWN'
            };
        }

        let sEdgeIndex = -1;
        if (metadata.tree_pair_key) {
            const match = metadata.tree_pair_key.match(/pair_(\d+)_(\d+)/);
            if (match) {
                sEdgeIndex = parseInt(match[1]);
            }
        }

        // Get actual step count for this s_edge from backend metadata
        let totalSteps = 0;
        if (metadata.tree_pair_key) {
            totalSteps = this.treesPerSEdgeMap?.[metadata.tree_pair_key] || 0;
        }

        return {
            sEdgeIndex,
            stepInPair: metadata.step_in_pair || -1,
            totalSteps,
            pairKey: metadata.tree_pair_key,
            phase: metadata.phase || 'UNKNOWN'
        };
    }

    getDebugInfo = () => ({
        treeMetadataLength: this.treeMetadata.length,
        fullTreeCount: this.fullTreeIndices.length,
        consensusTreeCount: this.consensusTreeIndices.length,
        highlightDataLength: this.highlightData.length,
        distanceDataLength: this.distanceData?.length || 0,
        sEdgeCount: this.sEdgeCount,
        treesPerSEdgeMap: this.treesPerSEdgeMap,
        totalInterpolatedTrees: this.totalInterpolatedTrees,
        firstFullTreeIndex: this.fullTreeIndices.length > 0 ? this.fullTreeIndices[0] : -1,
        lastFullTreeIndex: this.fullTreeIndices.length > 0 ? this.fullTreeIndices.at(-1) : -1,
        firstConsensusTreeIndex: this.consensusTreeIndices.length > 0 ? this.consensusTreeIndices[0] : -1,
        lastConsensusTreeIndex: this.consensusTreeIndices.length > 0 ? this.consensusTreeIndices.at(-1) : -1,
        phaseDistribution: this.sEdgeMetadata.phase_distribution,
        sEdgeStructure: Object.fromEntries(this.treesBySEdge),
        actualSEdgeLengths: Object.fromEntries(
            Array.from(this.treesBySEdge.entries()).map(([key, trees]) => [key, trees.length])
        ),
        contractCompliance: this.validateData()
    });

}
