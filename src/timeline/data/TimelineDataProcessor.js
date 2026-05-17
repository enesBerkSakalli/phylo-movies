/**
 * TimelineDataProcessor - Handles data transformation for timeline visualization.
 *
 * Terminology:
 * - anchor tree: observed input tree from a sliding window or bootstrap replicate
 * - transition frame: generated interpolated state between anchor trees
 * - timeline segment: scrubber interval containing either an anchor tree or transition frames
 */
import { TimelineMathUtils } from '../math/TimelineMathUtils.js';
import { flattenSplitSets, getBackendSplitMapValue } from '../../domain/tree/splits.js';

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
            movieData?.tree_pair_solutions,
            movieData?.pair_interpolation_ranges
        );
    }

    /**
     * Create segments from the backend split_change_timeline structure.
     * Backend split names are API vocabulary; frontend segments are timeline vocabulary.
     * @private
     */
    static _createSegmentsFromSplitChangeTimeline(
        timeline,
        tree_metadata,
        interpolated_trees,
        tree_pair_solutions,
        pair_interpolation_ranges = []
    ) {
        const segments = [];

        if (!Array.isArray(timeline) || timeline.length === 0) {
            return segments;
        }

        const originalEntries = timeline
            .filter(entry => entry?.type === 'original')
            .sort((a, b) => (a.tree_index ?? 0) - (b.tree_index ?? 0));
        const splitEventsByPair = this._groupSplitEventsByPair(timeline);

        if (originalEntries.length === 0) {
            for (const entry of timeline) {
                if (entry?.type === 'split_event') {
                    this._appendSplitEventSegment(entry, tree_metadata, interpolated_trees, tree_pair_solutions, segments);
                }
            }
            return segments;
        }

        for (let i = 0; i < originalEntries.length; i++) {
            const entry = originalEntries[i];
            this._appendOriginalTreeSegment(entry, tree_metadata, interpolated_trees, segments);

            if (i >= originalEntries.length - 1) continue;

            const pairKey = `pair_${entry.tree_index}_${originalEntries[i + 1].tree_index}`;
            const pairRange = Array.isArray(pair_interpolation_ranges?.[entry.tree_index])
                ? pair_interpolation_ranges[entry.tree_index]
                : [entry.global_index, originalEntries[i + 1].global_index];

            this._appendPairTransitionSegments({
                pairKey,
                pairRange,
                splitEvents: splitEventsByPair.get(pairKey) || [],
                tree_metadata,
                interpolated_trees,
                tree_pair_solutions,
                segments
            });
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
                treeName: entry.name || `Source Tree ${treeIndex + 1}`,
                hasInterpolation: false,
                isFullTree: true,
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

    static _groupSplitEventsByPair(timeline) {
        const byPair = new Map();

        for (const entry of timeline) {
            if (entry?.type !== 'split_event' || typeof entry.pair_key !== 'string') {
                continue;
            }

            if (!byPair.has(entry.pair_key)) {
                byPair.set(entry.pair_key, []);
            }
            byPair.get(entry.pair_key).push(entry);
        }

        for (const events of byPair.values()) {
            events.sort((a, b) => {
                const aStart = Array.isArray(a.step_range_global) ? a.step_range_global[0] : 0;
                const bStart = Array.isArray(b.step_range_global) ? b.step_range_global[0] : 0;
                return aStart - bStart;
            });
        }

        return byPair;
    }

    static _appendPairTransitionSegments({
        pairKey,
        pairRange,
        splitEvents,
        tree_metadata,
        interpolated_trees,
        tree_pair_solutions,
        segments
    }) {
        if (!Array.isArray(pairRange) || pairRange.length < 2) {
            return;
        }

        const [pairStart, pairEnd] = pairRange;
        if (!Number.isInteger(pairStart) || !Number.isInteger(pairEnd) || pairEnd <= pairStart) {
            return;
        }

        if (!Array.isArray(splitEvents) || splitEvents.length === 0) {
            this._appendBranchLengthOnlySegment(
                pairKey,
                pairStart,
                pairEnd,
                tree_metadata,
                interpolated_trees,
                segments
            );
            return;
        }

        for (const entry of splitEvents) {
            const globalRange = entry.step_range_global;
            if (!Array.isArray(globalRange) || globalRange.length < 2) continue;

            const [globalStart] = globalRange;
            const contextStart = Number.isInteger(globalStart)
                ? Math.max(pairStart, globalStart - 1)
                : pairStart;

            this._appendSplitEventSegment(
                entry,
                tree_metadata,
                interpolated_trees,
                tree_pair_solutions,
                segments,
                { contextStart, sourceGlobalIndex: pairStart }
            );
        }
    }

    static _appendSplitEventSegment(
        entry,
        tree_metadata,
        interpolated_trees,
        tree_pair_solutions,
        segments,
        options = {}
    ) {
        const globalRange = entry.step_range_global;
        const localRange = entry.step_range_local;
        if (!Array.isArray(globalRange) || globalRange.length < 2 || !Array.isArray(localRange) || localRange.length < 2) {
            return;
        }

        const [globalStart, globalEnd] = globalRange;
        const [localStepStart, localStepEnd] = localRange;
        const contextStart = Number.isInteger(options.contextStart)
            ? Math.min(options.contextStart, globalStart)
            : globalStart;
        const interpolationData = this._collectInterpolationData(
            contextStart,
            globalEnd,
            tree_metadata,
            interpolated_trees
        );

        const first = interpolationData[0];
        if (!first) {
            return;
        }

        // Calculate subtree changes from the affected-subtree contract.
        let subtreeMoveCount = 0;
        let affectedSubtrees = null;

        const activeChangingSplits = entry.split;
        const pairKey = entry.pair_key;

        if (activeChangingSplits && pairKey && tree_pair_solutions && tree_pair_solutions[pairKey]) {
            const affectedSubtreesBySplit = tree_pair_solutions[pairKey].affected_subtrees_by_split;
            const subtreesForSplit = getBackendSplitMapValue(affectedSubtreesBySplit, activeChangingSplits);

            if (subtreesForSplit) {
                affectedSubtrees = subtreesForSplit;
                subtreeMoveCount = new Set(flattenSplitSets(subtreesForSplit).flat()).size;
            }
        }

        const firstGenerated = this._collectInterpolationData(
            globalStart,
            globalStart,
            tree_metadata,
            interpolated_trees
        )[0];
        const sourceGlobalIndex = Number.isInteger(firstGenerated?.metadata?.source_tree_global_index)
            ? firstGenerated.metadata.source_tree_global_index
            : (Number.isInteger(options.sourceGlobalIndex) ? options.sourceGlobalIndex : null);

        segments.push({
            index: segments.length,
            pivotEdge: entry.split || [],
            affectedSubtrees,
            treePairKey: entry.pair_key,
            localStepStart,
            localStepEnd,
            globalStart,
            globalEnd,
            contextStart,
            sourceGlobalIndex,
            generatedFrameCount: globalEnd - globalStart + 1,
            animationStepCount: Math.max(0, interpolationData.length - 1),
            treeName: `Transition ${entry.pair_key}`,
            hasInterpolation: true,
            isFullTree: false,
            subtreeMoveCount,
            interpolationData
        });
    }

    static _appendBranchLengthOnlySegment(
        pairKey,
        globalStart,
        globalEnd,
        tree_metadata,
        interpolated_trees,
        segments
    ) {
        const interpolationData = this._collectInterpolationData(
            globalStart,
            globalEnd,
            tree_metadata,
            interpolated_trees
        );

        if (interpolationData.length < 2) {
            return;
        }

        segments.push({
            index: segments.length,
            pivotEdge: [],
            affectedSubtrees: null,
            treePairKey: pairKey,
            localStepStart: null,
            localStepEnd: null,
            globalStart,
            globalEnd,
            contextStart: globalStart,
            sourceGlobalIndex: globalStart,
            generatedFrameCount: 0,
            animationStepCount: interpolationData.length - 1,
            treeName: `Branch-length update ${pairKey}`,
            hasInterpolation: true,
            isFullTree: false,
            subtreeMoveCount: 0,
            interpolationData
        });
    }

    static _collectInterpolationData(start, end, tree_metadata, interpolated_trees) {
        const interpolationData = [];

        if (!Number.isInteger(start) || !Number.isInteger(end) || end < start) {
            return interpolationData;
        }

        for (let globalIdx = start; globalIdx <= end; globalIdx++) {
            const arrayIdx = globalIdx;
            if (interpolated_trees?.[arrayIdx] != null) {
                interpolationData.push({
                    metadata: tree_metadata?.[arrayIdx],
                    tree: interpolated_trees[arrayIdx],
                    originalIndex: arrayIdx
                });
            }
        }

        return interpolationData;
    }
}
