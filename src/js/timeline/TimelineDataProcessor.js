/**
 * TimelineDataProcessor - Handles data transformation for timeline visualization
 * Leverages existing TransitionIndexResolver for most data operations
 */

import { TIMELINE_CONSTANTS, PHASE_NAMES } from './constants.js';
import { TimelineMathUtils } from './TimelineMathUtils.js';

export class TimelineDataProcessor {
    /**
     * Create timeline segments from movie data using TransitionIndexResolver
     * @param {Object} movieData - Raw movie data OR serializer instance
     * @returns {Array} Timeline segments
     */
    static createSegments(movieData) {
        // Check if movieData is a serializer instance
        const isSerializer = movieData && typeof movieData.getTreeMetadata === 'function';

        const tree_metadata = isSerializer ? movieData.getTreeMetadata() : movieData.tree_metadata;
        const interpolated_trees = isSerializer ? movieData.getTrees().interpolatedTrees : movieData.interpolated_trees;

        let splitChangeTimeline;
        splitChangeTimeline = movieData.split_change_timeline;
        const segments = this._createSegmentsFromSplitChangeTimeline(
            splitChangeTimeline,
            tree_metadata,
            interpolated_trees,
            movieData.split_change_tracking,
            movieData.tree_pair_solutions
        );
        return segments;
    }

    /**
     * Create segments from split_change_timeline data structure
     * @private
     */
    static _createSegmentsFromSplitChangeTimeline(timeline, tree_metadata, interpolated_trees, split_change_tracking, tree_pair_solutions) {
        const segments = [];

        if (!timeline || !Array.isArray(timeline)) {
            console.warn('[TimelineDataProcessor] split_change_timeline is not available or not an array, falling back to empty segments');
            return segments;
        }

        for (const entry of timeline) {
            if (entry.type === 'original') {
                // Full tree anchor point - use global_index for array access
                const globalIndex = entry.global_index;
                const arrayIdx = globalIndex; // global_index is already 0-indexed in the data
                const treeIndex = entry.tree_index; // This is the original tree number (0, 1, 2)

                if (arrayIdx >= 0 && arrayIdx < interpolated_trees.length) {
                    const metadata = tree_metadata[arrayIdx];
                    segments.push({
                        index: segments.length,
                        metadata,
                        tree: interpolated_trees[arrayIdx],
                        activeChangeEdge: null,
                        phase: metadata?.phase || PHASE_NAMES.ORIGINAL,
                        activeChangeEdgeTracker: null,
                        treePairKey: null,
                        stepInPair: null,
                        treeName: entry.name || `Anchor Tree ${treeIndex + 1}`,
                        hasInterpolation: false,
                        isFullTree: true,
                        treeInfo: null,
                        subtreeMoveCount: 0,
                        interpolationData: [{
                            metadata,
                            tree: interpolated_trees[arrayIdx],
                            originalIndex: arrayIdx  // Store the actual array index for navigation
                        }]
                    });
                }
            } else if (entry.type === 'split_event') {
                // Interpolation segment
                const globalRange = entry.step_range_global;
                const interpolationData = [];

                // Collect all trees in this range using provided global indices directly
                // The backend provides step_range_global as array indices (inclusive)
                for (let globalIdx = globalRange[0]; globalIdx <= globalRange[1]; globalIdx++) {
                    const arrayIdx = globalIdx;
                    if (arrayIdx >= 0 && arrayIdx < interpolated_trees.length) {
                        interpolationData.push({
                            metadata: tree_metadata[arrayIdx],
                            tree: interpolated_trees[arrayIdx],
                            originalIndex: arrayIdx
                        });
                    }
                }

                if (interpolationData.length > 0) {
                    const first = interpolationData[0];

                    // Calculate subtree changes from jumping subtree solutions
                    let subtreeMoveCount = 0;
                    let jumpingSubtrees = null;

                    // Use entry.split (from split_change_timeline) as the key, not split_change_tracking
                    const activeChangingSplits = entry.split;
                    const pairKey = entry.pair_key;

                    if (activeChangingSplits && pairKey && tree_pair_solutions && tree_pair_solutions[pairKey]) {
                        const jumpingSolutions = tree_pair_solutions[pairKey].jumping_subtree_solutions;
                        const edgeKey = `[${activeChangingSplits.join(', ')}]`;
                        const solutions = jumpingSolutions?.[edgeKey];

                        if (solutions) {
                            // Store the jumping subtree solutions (leaf indices)
                            jumpingSubtrees = solutions;
                            // Flatten and count the jumping subtree solutions
                            subtreeMoveCount = Array.from(solutions.flat(2)).length;
                        }
                    }

                    // Fallback to split length if jumping solutions not available
                    if (subtreeMoveCount === 0) {
                        subtreeMoveCount = entry.split ? entry.split.length : 0;
                    }

                    segments.push({
                        index: segments.length,
                        metadata: first.metadata,
                        tree: first.tree,
                        activeChangeEdge: entry.split || [],
                        jumpingSubtrees: jumpingSubtrees,
                        phase: first.metadata?.phase || PHASE_NAMES.ORIGINAL,
                        activeChangeEdgeTracker: entry.split || [],
                        treePairKey: entry.pair_key,
                        stepInPair: entry.step_range_local?.[0],
                        treeName: `Transition ${entry.pair_key}`,
                        hasInterpolation: true,
                        isFullTree: false,
                        treeInfo: null,
                        subtreeMoveCount,
                        interpolationData
                    });
                }
            }
        }

        return segments;
    }


    /**
     * Create timeline data structures
     * @param {Array} segments - Timeline segments
     * @param {Array} sortedLeaves - Optional sorted leaves array for tooltips
     * @returns {Object} Timeline data with durations and metadata
     */
    static createTimelineData(segments) {
        // Calculate duration: each segment gets duration based on its content (cached)
        const segmentDurations = TimelineMathUtils.calculateSegmentDurations(segments);
        const cumulativeDurations = (() => {
            const arr = new Array(segmentDurations.length);
            let acc = 0;
            for (let i = 0; i < segmentDurations.length; i++) {
                acc += segmentDurations[i];
                arr[i] = acc;
            }
            return arr;
        })();

        const totalDuration = segmentDurations.reduce((sum, duration) => sum + duration, 0);

        // Determine global min/max of subtree movements across segments
        let minSubtreeMoves = Infinity;
        let maxSubtreeMoves = -Infinity;
        for (const seg of segments) {
            const c = typeof seg.subtreeMoveCount === 'number' ? seg.subtreeMoveCount : 0;
            if (!seg.isFullTree) { // consider only transition segments for scale
                minSubtreeMoves = Math.min(minSubtreeMoves, c);
                maxSubtreeMoves = Math.max(maxSubtreeMoves, c);
            }
        }


        return { totalDuration, segmentDurations, cumulativeDurations, minSubtreeMoves, maxSubtreeMoves };
    }
}
