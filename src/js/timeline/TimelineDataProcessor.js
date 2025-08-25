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
        const activeChangeEdgeTracking = isSerializer ? movieData.getLatticeEdgeTracking() : movieData.lattice_edge_tracking;

        const segments = [];
        const groupedByTransition = new Map();

        // Group CONSECUTIVE trees with the same lattice edges
        let currentGroup = [];
        let currentEdgeKey = null;
        let groupCounter = 0;
        
        tree_metadata.forEach((metadata, index) => {
            const activeChangeEdge = activeChangeEdgeTracking?.[index] || null;
            const edgeKey = activeChangeEdge === null ? 'null' : JSON.stringify(activeChangeEdge);
            
            // If this is a different edge pattern than the current group, save current and start new
            if (edgeKey !== currentEdgeKey) {
                if (currentGroup.length > 0) {
                    // Save the current group
                    const groupKey = `group_${groupCounter++}_${currentEdgeKey}`;
                    groupedByTransition.set(groupKey, currentGroup);
                }
                // Start a new group
                currentGroup = [];
                currentEdgeKey = edgeKey;
            }
            
            // Add to current group
            currentGroup.push({
                metadata,
                index,
                tree: interpolated_trees[index],
                activeChangeEdge: activeChangeEdge
            });
        });
        
        // Don't forget the last group
        if (currentGroup.length > 0) {
            const groupKey = `group_${groupCounter++}_${currentEdgeKey}`;
            groupedByTransition.set(groupKey, currentGroup);
        }

        // Create segments from grouped transitions
        let segmentIndex = 0;
        groupedByTransition.forEach((group) => {
            const first = group[0];
            
            // If all trees in group have no activeChangeEdge (full trees)
            const allNull = group.every(item => item.activeChangeEdge === null);
            if (allNull) {
                // Create individual segments for each full tree
                group.forEach(item => {
                    const { metadata, index, tree, activeChangeEdge } = item;
                    segments.push({
                        index: segments.length,
                        metadata,
                        tree,
                        activeChangeEdge,
                        phase: metadata.phase,
                        activeChangeEdgeTracker: null,
                        treePairKey: metadata.tree_pair_key,
                        stepInPair: metadata.step_in_pair,
                        treeName: metadata.tree_name || `Tree ${index}`,
                        hasInterpolation: false,
                        isFullTree: true,
                        treeInfo: resolver.getTreeInfo(index),
                                interpolationData: [{
                            tree,
                            progress: 0,
                            metadata,
                            stepInPair: 1,
                            originalIndex: index
                        }]
                    });
                    segmentIndex++;
                });
            } else {
                const interpolationData = group
                    .sort((a, b) => a.index - b.index)
                    .map((item, idx) => ({
                        tree: item.tree,
                        progress: group.length > 1 ? idx / (group.length - 1) : 0,
                        metadata: item.metadata,
                        stepInPair: item.metadata.step_in_pair || idx + 1,
                        originalIndex: item.index
                    }));

                const edgeIndices = first.activeChangeEdge ? first.activeChangeEdge.join(',') : '';
                segments.push({
                    index: segments.length,
                    metadata: first.metadata,
                    tree: first.tree,
                    activeChangeEdge: first.activeChangeEdge,
                    phase: first.metadata.phase,
                    activeChangeEdgeTracker: edgeIndices,
                    treePairKey: first.metadata.tree_pair_key,
                    stepInPair: first.metadata.step_in_pair,
                    treeName: first.metadata.tree_name || `Interpolation [${edgeIndices}]`,
                    hasInterpolation: true,
                    isFullTree: false,
                    treeInfo: resolver.getTreeInfo(first.index),
                    interpolationData // Store all trees with same lattice edges
                });
                segmentIndex++;
            }
        });


        return segments;
    }

    /**
     * Get color class for a segment based on its type, edge count, and duration
     * @param {Object} segment - Timeline segment
     * @param {number} totalLeaves - Total possible edges
     * @param {number} segmentDuration - Duration of this segment in ms
     * @param {number} maxDuration - Maximum duration across all segments
     * @returns {string} CSS class name for coloring
     */
    static getSegmentColorClass(segment, totalLeaves = null, segmentDuration = null, maxDuration = null) {
        if (segment.isFullTree) {
            return COLOR_CLASSES.FULL_TREE;
        } else if (segment.activeChangeEdge && Array.isArray(segment.activeChangeEdge)) {
            const edgeCount = segment.activeChangeEdge.length;
            const maxPossibleEdges = totalLeaves || 15;
            
            // Calculate complexity score: fewer edges = higher complexity, longer duration = higher complexity
            const edgeComplexity = 1 - (edgeCount / maxPossibleEdges);
            const durationComplexity = segmentDuration && maxDuration ? 
                (segmentDuration / maxDuration) : 0.5;
            
            // Combined complexity score: 60% duration, 40% edge count
            const complexityScore = (durationComplexity * 0.6) + (edgeComplexity * 0.4);
            
            const colorClass = COLOR_CLASSES.getInterpolationClassByComplexity(complexityScore);
            return colorClass;
        }
        // Fallback for segments without edge information
        return 'timeline-segment-default';
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
        const segmentDurations = TimelineDataProcessor.calculateSegmentDurations(segments);
        const totalDuration = segmentDurations.reduce((sum, duration) => sum + duration, 0);

        // Find the maximum number of edges across all segments to determine color scale
        let maxEdgeCount = 0;
        
        segments.forEach(segment => {
            if (segment.activeChangeEdge && Array.isArray(segment.activeChangeEdge)) {
                const count = segment.activeChangeEdge.length;
                maxEdgeCount = Math.max(maxEdgeCount, count);
            }
        });
        
        const totalPossibleEdges = maxEdgeCount || 10;
        
        // Find max duration for interpolation segments only
        let maxInterpolationDuration = 0;
        segments.forEach((segment, idx) => {
            if (segment.hasInterpolation) {
                maxInterpolationDuration = Math.max(maxInterpolationDuration, segmentDurations[idx]);
            }
        });
        

        let currentTime = 0;

        segments.forEach((segment, index) => {
            const duration = segmentDurations[index];
            const colorClass = TimelineDataProcessor.getSegmentColorClass(
                segment, 
                totalPossibleEdges,
                segment.hasInterpolation ? duration : null,
                maxInterpolationDuration
            );
            const segmentClass = `timeline-segment ${colorClass}`;
            

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
                            ? seg.interpolationData.length : 1), 0)),
                editable: false,
                selectable: true
            });

            currentTime += duration;
        });

        return { items, groups, totalDuration };
    }


    /**
     * Calculate segment durations for timeline segments
     * @param {Array} segments - Timeline segments
     * @returns {Array} Array of segment durations in milliseconds
     */
    static calculateSegmentDurations(segments) {
        if (!segments?.length) return [];

        return segments.map(segment => {
            // Interpolated segments with multiple trees get proportional duration
            if (segment.hasInterpolation && segment.interpolationData?.length > 1) {
                return segment.interpolationData.length * TIMELINE_CONSTANTS.UNIT_DURATION_MS;
            }
            // Single tree segments get base duration
            return TIMELINE_CONSTANTS.UNIT_DURATION_MS;
        });
    }

    /**
     * Get target segment index during scrubbing
     * @param {Array} segments - Timeline segments
     * @param {number} currentTime - Current time in ms
     * @returns {number} Target segment index
     */
    static getTargetSegmentIndex(segments, currentTime) {
        if (!segments?.length) return 0;

        // Use consolidated duration calculation
        const segmentDurations = TimelineDataProcessor.calculateSegmentDurations(segments);

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
                const stepIndex = Math.floor(segmentProgress * segment.interpolationData.length);
                const clampedStepIndex = Math.min(stepIndex, segment.interpolationData.length - 1);
                return segment.interpolationData[clampedStepIndex].originalIndex;
            } else {
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
