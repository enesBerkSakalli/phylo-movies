/**
 * TimelineDataProcessor - Handles data transformation for timeline visualization
 * Leverages existing TransitionIndexResolver for most data operations
 */

import { DataSet } from 'vis-timeline/standalone';
import { TIMELINE_CONSTANTS, PHASE_NAMES, COLOR_CLASSES } from './constants.js';

export class TimelineDataProcessor {
    /**
     * Create timeline segments from movie data using TransitionIndexResolver
     * @param {Object} movieData - Raw movie data OR serializer instance
     * @param {TransitionIndexResolver} resolver - Existing transition resolver
     * @returns {Array} Timeline segments
     */
    static createSegments(movieData, resolver) {
        // Check if movieData is a serializer instance
        const isSerializer = movieData && typeof movieData.getTreeMetadata === 'function';

        const tree_metadata = isSerializer ? movieData.getTreeMetadata() : movieData.tree_metadata;
        const interpolated_trees = isSerializer ? movieData.getTrees().interpolatedTrees : movieData.interpolated_trees;
        const activeChangeEdgeTracking = isSerializer ? movieData.getLatticeEdgeTracking() : movieData.activeChangeEdgeTracking || movieData.lattice_edge_tracking;

        console.log('[TimelineDataProcessor] Creating segments from:', {
            tree_metadata: tree_metadata?.length,
            interpolated_trees: interpolated_trees?.length,
            activeChangeEdgeTracking: activeChangeEdgeTracking?.length,
            resolver: !!resolver
        });

        if (!tree_metadata) {
            console.warn('[TimelineDataProcessor] No tree metadata available');
            return [];
        }

        const segments = [];
        const groupedByTransition = new Map();

        // Group metadata by s-edge tracker to create one segment per s-edge transition
        tree_metadata.forEach((metadata, index) => {
            // Handle both old and new field names for backward compatibility
            const activeChangeEdgeTracker = metadata.activeChangeEdgeTracker || metadata.s_edge_tracker;
            const key = activeChangeEdgeTracker || `original_${metadata.source_tree_index || index}`;

            if (!groupedByTransition.has(key)) {
                groupedByTransition.set(key, []);
            }
            groupedByTransition.get(key).push({
                metadata,
                index,
                tree: interpolated_trees[index],
                activeChangeEdge: activeChangeEdgeTracking?.[index] || null
            });
        });

        // Create segments from grouped transitions - one per unique s-edge
        groupedByTransition.forEach((group) => {
            // Check the resolved tracker value for the first item in the group
            const firstMetadata = group[0].metadata;
            const resolvedTracker = firstMetadata.activeChangeEdgeTracker || firstMetadata.s_edge_tracker;

            if (group.length === 1 || !resolvedTracker || resolvedTracker === "None") {
                // Single segment (final tree or original tree without s-edge)
                const { metadata, index, tree, activeChangeEdge } = group[0];
                segments.push({
                    index: segments.length,
                    metadata,
                    tree,
                    activeChangeEdge,
                    phase: metadata.phase,
                    activeChangeEdgeTracker: resolvedTracker,
                    treePairKey: metadata.tree_pair_key,
                    stepInPair: metadata.step_in_pair,
                    treeName: metadata.tree_name || `Tree ${index}`,
                    hasInterpolation: false,
                    isFullTree: true,
                    treeInfo: resolver.getTreeInfo(index),
                    // For single segments, interpolation data is just the tree itself
                    interpolationData: [{
                        tree,
                        progress: 0,
                        metadata,
                        stepInPair: 1,
                        originalIndex: index
                    }]
                });
            } else {
                // Group of 5 interpolation steps for one s-edge - create single segment
                const first = group[0];

                // Ensure we have interpolation data for all 5 steps
                const interpolationData = group
                    .sort((a, b) => a.metadata.step_in_pair - b.metadata.step_in_pair)
                    .map(item => ({
                        tree: item.tree,
                        progress: (item.metadata.step_in_pair - 1) / 4, // 0, 0.25, 0.5, 0.75, 1
                        metadata: item.metadata,
                        stepInPair: item.metadata.step_in_pair,
                        originalIndex: item.index
                    }));

                segments.push({
                    index: segments.length,
                    metadata: first.metadata, // Use first metadata as representative
                    tree: first.tree, // Use first tree as starting point
                    activeChangeEdge: first.activeChangeEdge,
                    phase: first.metadata.phase,
                    activeChangeEdgeTracker: resolvedTracker,
                    treePairKey: first.metadata.tree_pair_key,
                    stepInPair: first.metadata.step_in_pair,
                    treeName: first.metadata.tree_name || `Active Change Edge ${resolvedTracker}`,
                    hasInterpolation: true,
                    isFullTree: false,
                    treeInfo: resolver.getTreeInfo(first.index),
                    interpolationData // Store all 5 interpolation steps
                });
            }
        });

        console.log('[TimelineDataProcessor] Created', segments.length, 'segments');
        console.log('[TimelineDataProcessor] Grouped by transition keys:', Array.from(groupedByTransition.keys()));

        return segments;
    }

    /**
     * Generate color mapping for tree pairs
     * @param {Array} segments - Timeline segments
     * @returns {Object} Color mapping
     */
    static getTreePairColors(segments) {
        const pairColors = {};
        const uniquePairs = [...new Set(segments.map(s => s.treePairKey || 'original'))];

        uniquePairs.forEach((pairKey, index) => {
            pairColors[pairKey] = COLOR_CLASSES[index % COLOR_CLASSES.length];
        });

        return pairColors;
    }

    /**
     * Generate tooltip text for segment using resolver
     * @param {Object} segment - Timeline segment
     * @param {number} index - Segment index
     * @param {number} total - Total segments
     * @returns {string} Tooltip text
     */
    static getSegmentTooltip(segment, index, total) {
        const position = `Tree ${index + 1} of ${total}`;
        const { treeName, treeInfo, isFullTree } = segment;

        if (isFullTree) {
            return `FULL TREE: ${treeName} - ${treeInfo.semanticType} (stable state)`;
        } else if (segment.activeChangeEdgeTracker && segment.activeChangeEdgeTracker !== "None") {
            const leafIndices = TimelineDataProcessor._parseLeafIndices(segment.activeChangeEdgeTracker);
            const phaseDisplay = PHASE_NAMES[segment.phase] || 'Unknown';
            return `${position}: ${treeName} - ${phaseDisplay} phase (modifying leaves: ${leafIndices.join(', ')})`;
        } else {
            return `${position}: ${treeName} - ${treeInfo.semanticType}`;
        }
    }

    /**
     * Create vis-timeline data structures
     * @param {Array} segments - Timeline segments
     * @returns {Object} Timeline data with items and groups
     */
    static createTimelineData(segments) {
        const items = new DataSet();
        const groups = new DataSet([{ id: 1, content: '' }]);

        // Calculate duration: each segment gets duration based on its content
        // - Full trees: 1 unit duration
        // - Interpolation segments: 5 units duration (for 5 steps)
        let totalDuration = 0;
        const segmentDurations = segments.map(segment =>
            segment.hasInterpolation && segment.interpolationData?.length > 1
                ? segment.interpolationData.length * TIMELINE_CONSTANTS.UNIT_DURATION_MS
                : TIMELINE_CONSTANTS.UNIT_DURATION_MS
        );
        totalDuration = segmentDurations.reduce((sum, duration) => sum + duration, 0);

        const pairColors = TimelineDataProcessor.getTreePairColors(segments);
        let currentTime = 0;

        segments.forEach((segment, index) => {
            const duration = segmentDurations[index];
            const baseClass = segment.isFullTree ? 'full-tree-segment' : 'interpolation-segment';
            const pairColorClass = pairColors[segment.treePairKey] || 'tree-pair-default';
            const segmentClass = `${baseClass} ${pairColorClass} ${segment.treeInfo.colorClass}`;

            items.add({
                id: index + 1,
                content: '',
                start: currentTime,
                end: currentTime + duration,
                type: 'range',
                className: segmentClass,
                group: 1,
                title: TimelineDataProcessor.getSegmentTooltip(segment,
                    segment.interpolationData?.[0]?.originalIndex || segment.index,
                    segments.reduce((total, seg) =>
                        total + (seg.hasInterpolation && seg.interpolationData?.length > 1
                            ? seg.interpolationData.length : 1), 0))
            });

            currentTime += duration;
        });

        return { items, groups, totalDuration };
    }

    /**
     * Get segment at specific progress
     * @param {Array} segments - Timeline segments
     * @param {number} progress - Progress (0-1)
     * @returns {Object} Segment data
     */
    static getSegmentAt(segments, progress) {
        const segmentIndex = Math.floor(progress * segments.length);
        return segments[Math.min(segmentIndex, segments.length - 1)];
    }

    /**
     * Get segments for interpolation at specific time
     * @param {Array} segments - Timeline segments
     * @param {number} currentTime - Current time in ms
     * @returns {Object} From and to segments with progress
     */
    static getSegmentsForInterpolation(segments, currentTime) {
        // Calculate actual segment durations
        const segmentDurations = segments.map(segment =>
            segment.hasInterpolation && segment.interpolationData?.length > 1
                ? segment.interpolationData.length * TIMELINE_CONSTANTS.UNIT_DURATION_MS
                : TIMELINE_CONSTANTS.UNIT_DURATION_MS
        );

        let accumulatedTime = 0;
        let segmentIndex = 0;
        let segmentStartTime = 0;
        let segmentDuration = 0;

        // Find which segment contains the currentTime
        for (let i = 0; i < segments.length; i++) {
            const duration = segmentDurations[i];
            if (currentTime >= accumulatedTime && currentTime < accumulatedTime + duration) {
                segmentIndex = i;
                segmentStartTime = accumulatedTime;
                segmentDuration = duration;
                break;
            }
            accumulatedTime += duration;
        }

        if (segmentIndex >= 0 && segmentIndex < segments.length && segmentDuration > 0) {
            const segment = segments[segmentIndex];
            const segmentProgress = (currentTime - segmentStartTime) / segmentDuration;

            if (segment.hasInterpolation && segment.interpolationData.length > 1) {
                // This segment has interpolation data - find the appropriate interpolation step
                const interpolationProgress = segmentProgress;

                // Find the two closest interpolation steps
                const stepSize = 1 / (segment.interpolationData.length - 1);
                const stepIndex = Math.min(
                    Math.floor(interpolationProgress / stepSize),
                    segment.interpolationData.length - 2
                );

                const fromStep = segment.interpolationData[stepIndex];
                const toStep = segment.interpolationData[stepIndex + 1];

                const stepStart = stepIndex * stepSize;
                const stepProgress = (interpolationProgress - stepStart) / stepSize;

                return {
                    fromSegment: {
                        ...segment,
                        tree: fromStep.tree,
                        metadata: fromStep.metadata,
                        index: fromStep.originalIndex
                    },
                    toSegment: {
                        ...segment,
                        tree: toStep.tree,
                        metadata: toStep.metadata,
                        index: toStep.originalIndex
                    },
                    segmentProgress: stepProgress
                };
            } else {
                // Single segment without interpolation - use the original tree index
                const originalIndex = segment.interpolationData[0].originalIndex;
                return {
                    fromSegment: { ...segment, index: originalIndex },
                    toSegment: { ...segment, index: originalIndex },
                    segmentProgress: 0
                };
            }
        }

        return null;
    }

    /**
     * Get target segment index during scrubbing
     * @param {Array} segments - Timeline segments
     * @param {number} currentTime - Current time in ms
     * @returns {number} Target segment index
     */
    static getTargetSegmentIndex(segments, currentTime) {
        if (!segments?.length) return 0;

        // Calculate actual segment durations
        const segmentDurations = segments.map(segment =>
            segment.hasInterpolation && segment.interpolationData?.length > 1
                ? segment.interpolationData.length * TIMELINE_CONSTANTS.UNIT_DURATION_MS
                : TIMELINE_CONSTANTS.UNIT_DURATION_MS
        );

        let accumulatedTime = 0;
        let segmentIndex = 0;
        let segmentStartTime = 0;
        let segmentDuration = 0;

        // Find which segment contains the currentTime
        for (let i = 0; i < segments.length; i++) {
            const duration = segmentDurations[i];
            if (currentTime >= accumulatedTime && currentTime < accumulatedTime + duration) {
                segmentIndex = i;
                segmentStartTime = accumulatedTime;
                segmentDuration = duration;
                break;
            }
            accumulatedTime += duration;
        }

        if (segmentIndex >= 0 && segmentIndex < segments.length && segmentDuration > 0) {
            const segment = segments[segmentIndex];
            const segmentProgress = (currentTime - segmentStartTime) / segmentDuration;

            if (segment.hasInterpolation && segment.interpolationData.length > 1) {
                // For interpolation segments, map to the actual tree index
                const stepIndex = Math.floor(segmentProgress * segment.interpolationData.length);
                const clampedStepIndex = Math.min(stepIndex, segment.interpolationData.length - 1);
                return segment.interpolationData[clampedStepIndex].originalIndex;
            } else {
                // For single tree segments, return the original tree index
                return segment.interpolationData[0].originalIndex;
            }
        }

        return segments[Math.max(0, Math.min(segmentIndex, segments.length - 1))]?.interpolationData?.[0]?.originalIndex || 0;
    }

    /**
     * Parse leaf indices from activeChangeEdgeTracker string
     * @private
     * @param {string} activeChangeEdgeKey - Active change edge tracker like "(9,10,11)"
     * @returns {Array<number>} Array of leaf indices
     */
    static _parseLeafIndices(activeChangeEdgeKey) {
        if (!activeChangeEdgeKey?.trim()) return [];

        try {
            const cleanKey = activeChangeEdgeKey.replace(/[()]/g, '').trim();
            if (!cleanKey) return [];

            return cleanKey
                .split(',')
                .map(idx => parseInt(idx.trim(), 10))
                .filter(Number.isInteger);
        } catch (error) {
            console.warn(`[TimelineDataProcessor] Failed to parse leaf indices from "${activeChangeEdgeKey}":`, error);
            return [];
        }
    }
}
