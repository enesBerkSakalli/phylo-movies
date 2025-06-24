/**
 * TransitionIndexResolver - Centralized logic for mapping tree indices to transition indices.
 */
export default class TransitionIndexResolver {
    _cachedFullTreeIndices = null;
    _cachedConsensusTreeIndices = null;

    /**
     * @param {object[]} sequenceData - Array of sequence items, e.g., [{name: 'T0', type: 'T'}, {name: 'IT1', type: 'IT'}].
     * @param {any[]} highlightData - The highlight data array.
     * @param {any[]} distanceData - The distance data array.
     * @param {boolean} debug - Enable/disable debug logging.
     * @param {number} numOriginalTransitions - The number of original transitions (typically highlightData.length).
     */
    constructor(sequenceData, highlightData, distanceData, debug = false, numOriginalTransitions = 0) {
        this.debug = debug;
        // Initialize numOriginalTransitions first as updateData might use it.
        this.numOriginalTransitions = numOriginalTransitions;
        this.updateData(sequenceData, highlightData, distanceData, numOriginalTransitions);
    }

    /**
     * Updates the resolver with new data and clears the cache.
     * @param {object[]} sequenceData
     * @param {any[]} highlightData
     * @param {any[]} distanceData
     * @param {number} numOriginalTransitions
     */
    updateData(sequenceData, highlightData, distanceData, numOriginalTransitions) {
        this.sequenceData = sequenceData ?? [];
        this.highlightData = highlightData ?? []; // Stored for reference, or if other methods need it
        this.distanceData = distanceData ?? [];
        // If numOriginalTransitions is explicitly passed, use it, otherwise derive from highlightData.
        // This ensures that if highlightData is empty but we know the number of transitions, it's respected.
        this.numOriginalTransitions = numOriginalTransitions !== undefined ? numOriginalTransitions : (this.highlightData?.length || 0);
        this._cachedFullTreeIndices = null; // Invalidate cache
        this._cachedConsensusTreeIndices = null; // Invalidate cache

        if (this.debug) {
            console.log("[TIR] Data updated. Sequence length:", this.sequenceData.length, "Num original transitions:", this.numOriginalTransitions);
        }
    }

    /**
     * A lazily-computed getter for the sequence indices of all full trees ('T').
     * @returns {number[]}
     */
    get fullTreeIndices() {
        if (!this._cachedFullTreeIndices) {
            this._cachedFullTreeIndices = this.sequenceData.reduce((acc, item, i) => {
                if (item?.type === 'T') {
                    acc.push(i);
                }
                return acc;
            }, []);
            if (this.debug) {
                console.log("[TIR] Cached fullTreeIndices:", this._cachedFullTreeIndices);
            }
        }
        return this._cachedFullTreeIndices;
    }

    /**
     * A lazily-computed getter for the sequence indices of all consensus trees ('C').
     * @returns {number[]}
     */
    get consensusTreeIndices() {
        if (!this._cachedConsensusTreeIndices) {
            this._cachedConsensusTreeIndices = this.sequenceData.reduce((acc, item, i) => {
                if (item?.type === 'C') {
                    acc.push(i);
                }
                return acc;
            }, []);
            if (this.debug) {
                console.log("[TIR] Cached consensusTreeIndices:", this._cachedConsensusTreeIndices);
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
        if (position < 0 || position >= this.sequenceData.length) {
            if (this.debug) console.log(`[TIR] getHighlightingIndex: Invalid sequence position: ${position}`);
            return -1;
        }

        const fullTreeSeqIndices = this.fullTreeIndices;

        if (fullTreeSeqIndices.length === 0) {
            if (this.debug) console.log("[TIR] getHighlightingIndex: No full trees found in sequenceData.");
            return -1;
        }

        let originalPairIndex = -1;

        // Iterate through the full trees to find which segment the current position falls into.
        // T_k (at fullTreeSeqIndices[k]) starts the k-th segment.
        // This segment uses highlightData[k].
        for (let k = 0; k < fullTreeSeqIndices.length; k++) {
            const startOfPairSeqIdx = fullTreeSeqIndices[k]; // Sequence index of T_k
            // The end of this segment is either the start of the next full tree or the end of the sequence.
            const endOfPairSeqIdx = (k + 1 < fullTreeSeqIndices.length) ? fullTreeSeqIndices[k + 1] : this.sequenceData.length;

            if (position >= startOfPairSeqIdx && position < endOfPairSeqIdx) {
                originalPairIndex = k; // This 'k' is the index of OriginalT_k, so we use highlightData[k]
                break;
            }
        }

        if (originalPairIndex === -1) {
            // This case should ideally not be hit if position is valid and fullTreeSeqIndices is populated,
            // as the loop should cover all positions.
            // However, as a fallback, if the position is the very last item and it's a full tree,
            // it belongs to the last segment.
            if (position === this.sequenceData.length - 1 && this.isFullTree(position)) {
                 // The index of the last full tree in fullTreeSeqIndices corresponds to its segment index.
                originalPairIndex = fullTreeSeqIndices.indexOf(position);
            }

            if (originalPairIndex === -1 && this.debug) {
                 const itemName = this.sequenceData[position]?.name || 'Unknown';
                console.log(`[TIR] getHighlightingIndex: Could not determine originalPairIndex for position ${position} (${itemName}). Fallback to -1.`);
                return -1; // Explicitly return -1 if no segment found
            }
        }

        // Ensure the determined originalPairIndex is valid for highlightData
        if (originalPairIndex >= 0 && originalPairIndex < this.numOriginalTransitions) {
            if (this.debug) {
                const itemName = this.sequenceData[position]?.name || 'Unknown';
                console.log(`[TIR] getHighlightingIndex: SeqPos ${position} (${itemName}) -> originalPairIndex ${originalPairIndex} -> highlightIndex ${originalPairIndex}`);
            }
            return originalPairIndex;
        } else {
            // This means originalPairIndex is for a transition that doesn't have highlight data
            // (e.g., if T_L is the last tree, originalPairIndex might be L, but highlightData only goes up to L-1)
            if (this.debug) {
                const itemName = this.sequenceData[position]?.name || 'Unknown';
                console.log(`[TIR] getHighlightingIndex: SeqPos ${position} (${itemName}) -> originalPairIndex ${originalPairIndex}, which is out of bounds for highlightData (numOriginalTransitions: ${this.numOriginalTransitions}). No highlight.`);
            }
            return -1; // No specific highlight
        }
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
        if (position < 0 || position >= this.sequenceData.length) {
            return 0; // Default to 0 for charts
        }

        // For a full tree T_k, the distance is from the previous transition (k-1).
        if (this.isFullTree(position)) {
            const fullTreePositionInList = this.fullTreeIndices.indexOf(position);
            // Math.max ensures T0 (at position 0, fullTreePositionInList 0) returns distance index 0.
            return Math.max(0, fullTreePositionInList - 1);
        }

        // For an intermediate tree, the distance is from the current transition block 'k'.
        // findLastIndex returns the index in fullTreeIndices of the last T_k where treeIndex <= position.
        // This 'k' corresponds to the transition block.
        const distanceIndex = this.fullTreeIndices.findLastIndex(treeIndex => treeIndex <= position);
        return Math.max(0, distanceIndex); // Clamp to 0 in case of -1 (e.g., before first T tree).
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

    isFullTree = (position) => {
        if (position < 0 || position >= this.sequenceData.length) return false;
        return this.sequenceData[position]?.type === 'T' ?? false;
    }

    /**
     * Checks if the tree at a given position is a consensus tree.
     * @param {number} position - Sequence position.
     * @returns {boolean} True if the tree is a consensus tree.
     */
    isConsensusTree = (position) => {
        if (position < 0 || position >= this.sequenceData.length) return false;
        return this.sequenceData[position]?.type === 'C' ?? false;
    }

    /**
     * Gets the consensus tree number from the tree name.
     * Assumes consensus trees are named like 'C_1', 'C_2', etc.
     * @param {number} position - Sequence position.
     * @returns {number} The consensus tree number, or -1 if not a consensus tree or number cannot be extracted.
     */

    getConsensusTreeNumber = (position) => {
        if (position < 0 || position >= this.sequenceData.length) return -1;

        const item = this.sequenceData[position];
        if (!item || item.type !== 'C') return -1;

        // Extract number from consensus tree name (e.g., 'C_1' -> 1, 'C_15' -> 15)
        const match = item.name.match(/^C_(\d+)$/);
        if (match) {
            return parseInt(match[1], 10);
        }

        // Alternative patterns: 'Consensus_1', 'consensus1', etc.
        const altMatch = item.name.match(/^[Cc]onsensus[_-]?(\d+)$/);
        if (altMatch) {
            return parseInt(altMatch[1], 10);
        }

        return -1;
    }

    /**
     * Gets information about the tree at a given position.
     * @param {number} position - Sequence position.
     * @returns {object} Object containing tree information: { type, isConsensus, consensusNumber, name }.
     */
    getTreeInfo = (position) => {
        if (position < 0 || position >= this.sequenceData.length) {
            return { type: 'UNKNOWN', isConsensus: false, consensusNumber: -1, name: 'Unknown' };
        }

        const item = this.sequenceData[position];
        const type = item?.type || 'UNKNOWN';
        const name = item?.name || 'Unknown';
        const isConsensus = type === 'C';
        const consensusNumber = isConsensus ? this.getConsensusTreeNumber(position) : -1;

        return { type, isConsensus, consensusNumber, name };
    }

    getNextPosition = (currentPosition) => {
        if (this.sequenceData.length === 0) return 0;
        return Math.min(currentPosition + 1, this.sequenceData.length - 1);
    }

    getPreviousPosition = (currentPosition) => {
        if (this.sequenceData.length === 0) return 0;
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

    validateData = () => {
        const issues = [];
        
        // Basic data structure validation
        if (!this.sequenceData || this.sequenceData.length === 0) {
            issues.push("Sequence data is empty.");
        }
        if (!this.highlightData) {
            issues.push("Highlight data is undefined.");
        }
        if (this.numOriginalTransitions < 0) {
            issues.push("Number of original transitions is negative.");
        }
        
        // Backend-Frontend contract validation
        if (this.sequenceData.length > 0) {
            // Validate tree naming patterns
            const hasValidFullTrees = this.fullTreeIndices.length > 0;
            if (!hasValidFullTrees) {
                issues.push("No valid full trees (T pattern) found in sequence data.");
            }
            
            // Validate highlight data length matches original transitions
            const expectedHighlightLength = this.fullTreeIndices.length > 0 ? this.fullTreeIndices.length - 1 : 0;
            if (this.highlightData.length !== expectedHighlightLength && this.highlightData.length > 0) {
                issues.push(`Highlight data length mismatch: expected ${expectedHighlightLength}, got ${this.highlightData.length}`);
            }
            
            // Validate distance data exists
            if (!this.distanceData || this.distanceData.length === 0) {
                issues.push("Distance data is missing or empty.");
            }
            
            // Validate tree type consistency  
            let hasUnknownTypes = false;
            this.sequenceData.forEach((item, i) => {
                if (!item.type || item.type === 'UNKNOWN') {
                    hasUnknownTypes = true;
                }
            });
            if (hasUnknownTypes) {
                issues.push("Some trees have unknown or missing type information.");
            }
        }
        
        return { isValid: issues.length === 0, issues };
    };

    getDebugInfo = () => ({
        sequenceLength: this.sequenceData.length,
        fullTreeCount: this.fullTreeIndices.length,
        consensusTreeCount: this.consensusTreeIndices.length,
        highlightDataLength: this.highlightData.length,
        distanceDataLength: this.distanceData?.length || 0,
        numOriginalTransitions: this.numOriginalTransitions,
        firstFullTreeIndex: this.fullTreeIndices.length > 0 ? this.fullTreeIndices[0] : -1,
        lastFullTreeIndex: this.fullTreeIndices.length > 0 ? this.fullTreeIndices.at(-1) : -1,
        firstConsensusTreeIndex: this.consensusTreeIndices.length > 0 ? this.consensusTreeIndices[0] : -1,
        lastConsensusTreeIndex: this.consensusTreeIndices.length > 0 ? this.consensusTreeIndices.at(-1) : -1,
        expectedTransitions: this.fullTreeIndices.length > 0 ? this.fullTreeIndices.length - 1 : 0,
        contractCompliance: this.validateBackendContract()
    });
    
    validateBackendContract = () => {
        const issues = [];
        const expectedTransitions = this.fullTreeIndices.length > 0 ? this.fullTreeIndices.length - 1 : 0;
        
        // Check highlight data contract
        if (this.highlightData.length !== expectedTransitions && this.highlightData.length > 0) {
            issues.push(`Highlight data: expected ${expectedTransitions}, got ${this.highlightData.length}`);
        }
        
        // Check if full trees are properly spaced (basic interpolation validation)
        if (this.fullTreeIndices.length > 1) {
            const spacings = [];
            for (let i = 1; i < this.fullTreeIndices.length; i++) {
                spacings.push(this.fullTreeIndices[i] - this.fullTreeIndices[i-1]);
            }
            const minSpacing = Math.min(...spacings);
            const maxSpacing = Math.max(...spacings);
            if (minSpacing < 2) {
                issues.push(`Full trees too close: minimum spacing ${minSpacing}`);
            }
            if (maxSpacing - minSpacing > 10) {
                issues.push(`Inconsistent interpolation: spacing varies from ${minSpacing} to ${maxSpacing}`);
            }
        }
        
        return {
            isCompliant: issues.length === 0,
            issues
        };
    };
}
