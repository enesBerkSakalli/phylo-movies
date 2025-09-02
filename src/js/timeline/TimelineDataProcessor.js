/**
 * TimelineDataProcessor - Handles data transformation for timeline visualization
 * Leverages existing TransitionIndexResolver for most data operations
 */

import { TIMELINE_CONSTANTS, PHASE_NAMES, COLOR_CLASSES } from './constants.js';
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
        const segments = this._createSegmentsFromSplitChangeTimeline(splitChangeTimeline, tree_metadata, interpolated_trees);
        return segments;
    }

    /**
     * Create segments from split_change_timeline data structure
     * @private
     */
    static _createSegmentsFromSplitChangeTimeline(timeline, tree_metadata, interpolated_trees) {
        const segments = [];
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

                // Collect all trees in this range using global indices
                // globalRange is 1-indexed, convert to 0-indexed for array access
                for (let globalIdx = globalRange[0]; globalIdx <= globalRange[1]; globalIdx++) {
                    const arrayIdx = globalIdx - 1; // Convert 1-indexed to 0-indexed
                    if (arrayIdx >= 0 && arrayIdx < interpolated_trees.length) {
                        interpolationData.push({
                            metadata: tree_metadata[arrayIdx],
                            tree: interpolated_trees[arrayIdx],
                            originalIndex: arrayIdx  // Store the 0-indexed position
                        });
                    }
                }

                if (interpolationData.length > 0) {
                    const first = interpolationData[0];
                    const subtreeMoveCount = entry.subtrees ? entry.subtrees.length : 0;

                    segments.push({
                        index: segments.length,
                        metadata: first.metadata,
                        tree: first.tree,
                        activeChangeEdge: entry.split || [],
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
     * Determine subtree movement count for a given step using split_change_events if available.
     * Falls back to split_change length, otherwise 0.
     */
    static _getSubtreeMoveCount(movieData, metadata) {
        try {
            const key = metadata?.tree_pair_key;
            const step = metadata?.step_in_pair;
            const events = movieData?.split_change_events?.[key];
            if (Array.isArray(events) && typeof step === 'number') {
                for (const ev of events) {
                    const r = ev?.step_range;
                    if (Array.isArray(r) && r.length === 2 && step >= r[0] && step <= r[1]) {
                        const subs = ev?.subtrees;
                        if (Array.isArray(subs)) {
                            return subs.length;
                        }
                    }
                }
            }
            // Fallback: if split_change is present on metadata, treat any movement as one group
            if (Array.isArray(metadata?.split_change)) {
                return metadata.split_change.length > 0 ? 1 : 0;
            }
        } catch {}
        return 0;
    }

    /**
     * Get both subtree move count and an event identity for grouping transitions by event ranges
     */
    static _getEventInfo(movieData, metadata) {
        try {
            const key = metadata?.tree_pair_key;
            const step = metadata?.step_in_pair;
            const events = movieData?.split_change_events?.[key];
            if (Array.isArray(events) && typeof step === 'number') {
                for (let i = 0; i < events.length; i++) {
                    const ev = events[i];
                    const r = ev?.step_range;
                    if (Array.isArray(r) && r.length === 2 && step >= r[0] && step <= r[1]) {
                        const subs = Array.isArray(ev?.subtrees) ? ev.subtrees.length : 0;
                        return { count: subs, eventId: `${key}_${i}` };
                    }
                }
            }
            const fallback = TimelineDataProcessor._getSubtreeMoveCount(movieData, metadata);
            return { count: fallback, eventId: null };
        } catch {
            return { count: 0, eventId: null };
        }
    }

    /**
     * Get color class for a segment based on its type, edge count, and duration
     * @param {Object} segment - Timeline segment
     * @param {number} totalLeaves - Total possible edges
     * @param {number} segmentDuration - Duration of this segment in ms
     * @param {number} maxDuration - Maximum duration across all segments
     * @returns {string} CSS class name for coloring
     */
    static getSegmentColorClass(segment) {
        if (segment.isFullTree) return COLOR_CLASSES.FULL_TREE;
        if (typeof segment.subtreeMoveCount === 'number') {
            // Keep class for CSS variables to be available, final color is computed in renderer
            // Use a moderate class as a neutral base
            return 'timeline-interp-moderate';
        }
        return 'timeline-segment-default';
    }

    // Removed legacy getSegmentTooltip (replaced by buildTimelineTooltipContent)

    /**
     * Create timeline data structures
     * @param {Array} segments - Timeline segments
     * @param {Array} sortedLeaves - Optional sorted leaves array for tooltips
     * @returns {Object} Timeline data with durations and metadata
     */
    static createTimelineData(segments) {
        const items = [];
        const groups = [{ id: 1, content: '' }];

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


        let currentTime = 0;

        segments.forEach((segment, index) => {
            const duration = segmentDurations[index];
            const colorClass = TimelineDataProcessor.getSegmentColorClass(segment);
            const segmentClass = `timeline-segment ${colorClass}`;


            items.push({
                id: index + 1,
                content: '',
                start: currentTime,
                end: currentTime + duration,
                type: 'range',
                className: segmentClass,
                group: 1,
                // No native title tooltip; use custom dynamic overlay for clarity
                editable: false,
                selectable: true
            });

            currentTime += duration;
        });

        return { items, groups, totalDuration, segmentDurations, cumulativeDurations, minSubtreeMoves, maxSubtreeMoves };
    }


    /**
     * Calculate segment durations for timeline segments
     * @param {Array} segments - Timeline segments
     * @returns {Array} Array of segment durations in milliseconds
     */
    static calculateSegmentDurations(segments) {
        return TimelineMathUtils.calculateSegmentDurations(segments);
    }

    /**
     * Get target segment index during scrubbing
     * @param {Array} segments - Timeline segments
     * @param {number} currentTime - Current time in ms
     * @returns {number} Target segment index
     */
    static getTargetSegmentIndex(segments, currentTime, segmentDurations = null) {
        const durations = segmentDurations || TimelineMathUtils.calculateSegmentDurations(segments);
        const { treeIndex } = TimelineMathUtils.getTargetTreeForTime(segments, currentTime, durations);
        return treeIndex;
    }

}
