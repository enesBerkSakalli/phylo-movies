/**
 * TimelineDataProcessor - Handles data transformation for timeline visualization
 * Leverages existing TransitionIndexResolver for most data operations
 */
import { TimelineMathUtils } from '../math/TimelineMathUtils.js';

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

        const splitChangeTimeline = movieData.split_change_timeline;
        const segments = this._createSegmentsFromSplitChangeTimeline(
            splitChangeTimeline,
            tree_metadata,
            interpolated_trees,
            movieData.tree_pair_solutions
        );
        return segments;
    }

    /**
     * Create segments from split_change_timeline data structure
     * @private
     */
    static _createSegmentsFromSplitChangeTimeline(timeline, tree_metadata, interpolated_trees, tree_pair_solutions) {
        const segments = [];

        for (const entry of timeline) {
            if (entry.type === 'original') {
                this._appendOriginalTreeSegment(entry, tree_metadata, interpolated_trees, segments);
            } else if (entry.type === 'split_event') {
                this._appendSplitEventSegment(entry, tree_metadata, interpolated_trees, tree_pair_solutions, segments);
            }
        }

        return segments;
    }


    /**
     * Creates timeline data structures from segments.
     * @param {Array} segments - Timeline segments from createSegments()
     * @returns {{totalDuration: number, segmentDurations: number[], cumulativeDurations: number[]}} Timeline metadata
     */
    static createTimelineData(segments) {
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

        return { totalDuration, segmentDurations, cumulativeDurations };
    }

    static _appendOriginalTreeSegment(entry, tree_metadata, interpolated_trees, segments) {
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
                pivotEdge: null,
                phase: 'Original',
                pivotEdgeTracker: null,
                treePairKey: null,
                stepInPair: null,
                treeName: entry.name || `Anchor Tree ${treeIndex + 1}`,
                hasInterpolation: false,
                isFullTree: true,
                treeInfo: null,
                subtreeMoveCount: 0,
                originalTreeIndex: treeIndex,  // Original anchor tree index (0-based)
                interpolationData: [{
                    metadata,
                    tree: interpolated_trees[arrayIdx],
                    originalIndex: arrayIdx  // Store the actual array index for navigation
                }]
            });
        }
    }

    static _appendSplitEventSegment(entry, tree_metadata, interpolated_trees, tree_pair_solutions, segments) {
        const globalRange = entry.step_range_global;
        const interpolationData = [];

        // Collect all trees in this range using provided global indices directly
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

        const first = interpolationData[0];

        // Calculate subtree changes from jumping subtree solutions
        let subtreeMoveCount = 0;
        let jumpingSubtrees = null;

        const activeChangingSplits = entry.split;
        const pairKey = entry.pair_key;

        if (activeChangingSplits && pairKey && tree_pair_solutions && tree_pair_solutions[pairKey]) {
            const jumpingSolutions = tree_pair_solutions[pairKey].jumping_subtree_solutions;
            const edgeKey = `[${activeChangingSplits.join(', ')}]`;
            const solutions = jumpingSolutions?.[edgeKey];

            if (solutions) {
                jumpingSubtrees = solutions;
                subtreeMoveCount = Array.from(solutions.flat(2)).length;
            }
        }

        segments.push({
            index: segments.length,
            metadata: first.metadata,
            tree: first.tree,
            pivotEdge: entry.split || [],
            jumpingSubtrees: jumpingSubtrees,
            phase: 'Original',
            pivotEdgeTracker: entry.split || [],
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
