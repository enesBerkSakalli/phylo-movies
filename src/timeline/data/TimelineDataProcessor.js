/**
 * TimelineDataProcessor - Handles data transformation for timeline visualization.
 *
 * Terminology:
 * - anchor tree: observed input tree from a sliding window or bootstrap replicate
 * - transition frame: generated interpolated state between anchor trees
 * - timeline segment: scrubber interval containing either an anchor tree or transition frames
 */
import { TimelineMathUtils } from '../math/TimelineMathUtils.js';
import { getBackendSplitMapValue } from '../../domain/tree/splits.js';

export class TimelineDataProcessor {
    /**
     * Create timeline segments from movie data.
     * @param {Object} movieData - Validated backend movie data
     * @returns {Array} Timeline segments
     */
    static createSegments(movieData) {
        const splitChangeTimeline = movieData?.split_change_timeline;
        if (!Array.isArray(splitChangeTimeline) || splitChangeTimeline.length === 0) {
            throw new Error('[TimelineDataProcessor] split_change_timeline is required for timeline construction');
        }

        return this._createSegmentsFromSplitChangeTimeline(
            splitChangeTimeline,
            movieData?.tree_metadata,
            movieData?.interpolated_trees,
            movieData?.tree_pair_solutions
        );
    }

    /**
     * Create segments from the backend split_change_timeline structure.
     * Backend split names are API vocabulary; frontend segments are timeline vocabulary.
     * @private
     */
    static _createSegmentsFromSplitChangeTimeline(timeline, tree_metadata, interpolated_trees, tree_pair_solutions) {
        const segments = [];

        if (!Array.isArray(timeline) || timeline.length === 0) {
            return segments;
        }

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
        if (!Array.isArray(segments) || segments.length === 0) {
            return {
                totalDuration: 0,
                segmentDurations: [],
                cumulativeDurations: []
            };
        }

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

        return {
            totalDuration,
            segmentDurations,
            cumulativeDurations
        };
    }

    static _appendOriginalTreeSegment(entry, tree_metadata, interpolated_trees, segments) {
        // Anchor tree segment - use global_index for array access.
        const globalIndex = entry.global_index;
        const arrayIdx = globalIndex; // global_index is already 0-indexed in the data
        const treeIndex = entry.tree_index; // Original anchor tree number (0, 1, 2).

        if (interpolated_trees?.[arrayIdx] != null) {
            const metadata = tree_metadata[arrayIdx];
            segments.push({
                index: segments.length,
                segmentType: 'anchor',
                metadata,
                tree: interpolated_trees[arrayIdx],
                pivotEdge: null,
                pivotEdgeTracker: null,
                treePairKey: null,
                treeName: entry.name || `Source Tree ${treeIndex + 1}`,
                hasInterpolation: false,
                isFullTree: true,
                treeInfo: null,
                subtreeMoveCount: 0,
                globalIndex,
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
        const localRange = entry.step_range_local;
        if (!Array.isArray(globalRange) || globalRange.length < 2 || !Array.isArray(localRange) || localRange.length < 2) {
            return;
        }

        const [globalStart, globalEnd] = globalRange;
        const [localStepStart, localStepEnd] = localRange;
        const interpolationData = [];

        // Collect all trees in this range using provided global indices directly
        for (let globalIdx = globalStart; globalIdx <= globalEnd; globalIdx++) {
            const arrayIdx = globalIdx;
            if (interpolated_trees?.[arrayIdx] != null) {
                interpolationData.push({
                    metadata: tree_metadata[arrayIdx],
                    tree: interpolated_trees[arrayIdx],
                    originalIndex: arrayIdx
                });
            }
        }

        const first = interpolationData[0];
        if (!first) {
            return;
        }

        // Calculate subtree changes from jumping subtree solutions
        let subtreeMoveCount = 0;
        let jumpingSubtrees = null;

        const activeChangingSplits = entry.split;
        const pairKey = entry.pair_key;

        if (activeChangingSplits && pairKey && tree_pair_solutions && tree_pair_solutions[pairKey]) {
            const jumpingSolutions = tree_pair_solutions[pairKey].jumping_subtree_solutions;
            const solutions = getBackendSplitMapValue(jumpingSolutions, activeChangingSplits);

            if (solutions) {
                jumpingSubtrees = solutions;
                subtreeMoveCount = Array.from(solutions.flat(2)).length;
            }
        }

        segments.push({
            index: segments.length,
            segmentType: 'transition',
            transitionKind: 'split_event',
            metadata: first.metadata,
            tree: first.tree,
            pivotEdge: entry.split || [],
            jumpingSubtrees: jumpingSubtrees,
            pivotEdgeTracker: entry.split || [],
            treePairKey: entry.pair_key,
            splitEvent: entry,
            localStepStart,
            localStepEnd,
            globalStart,
            globalEnd,
            treeName: `Transition ${entry.pair_key}`,
            hasInterpolation: true,
            isFullTree: false,
            treeInfo: null,
            subtreeMoveCount,
            interpolationData
        });
    }
}
