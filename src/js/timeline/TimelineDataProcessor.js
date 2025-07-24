/**
 * TimelineDataProcessor - Handles data transformation for timeline visualization
 * Leverages existing TransitionIndexResolver for most data operations
 */

import { DataSet } from 'vis-timeline/standalone';
import { TIMELINE_CONSTANTS, PHASE_NAMES, COLOR_CLASSES } from './constants.js';

export class TimelineDataProcessor {
    /**
     * Create timeline segments from movie data using TransitionIndexResolver
     * @param {Object} movieData - Raw movie data
     * @param {TransitionIndexResolver} resolver - Existing transition resolver
     * @returns {Array} Timeline segments
     */
    static createSegments(movieData, resolver) {
        const { tree_metadata, interpolated_trees, lattice_edge_tracking } = movieData;
        
        if (!tree_metadata) {
            console.warn('[TimelineDataProcessor] No tree metadata available');
            return [];
        }
        
        return tree_metadata
            .map((metadata, index) => ({
                index,
                metadata,
                tree: interpolated_trees[index],
                latticeEdge: lattice_edge_tracking?.[index] || null,
                phase: metadata.phase,
                sEdgeTracker: metadata.s_edge_tracker,
                treePairKey: metadata.tree_pair_key,
                stepInPair: metadata.step_in_pair,
                treeName: metadata.tree_name || `Tree ${index}`,
                hasInterpolation: true,
                // Add resolver-based information
                isFullTree: resolver.isFullTree(index),
                treeInfo: resolver.getTreeInfo(index)
            }))
            .filter(Boolean);
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
        } else if (segment.sEdgeTracker && segment.sEdgeTracker !== "None") {
            const leafIndices = TimelineDataProcessor._parseLeafIndices(segment.sEdgeTracker);
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
        const totalDuration = segments.length * TIMELINE_CONSTANTS.UNIT_DURATION_MS;
        const pairColors = TimelineDataProcessor.getTreePairColors(segments);

        segments.forEach((segment, index) => {
            const baseClass = segment.isFullTree ? 'full-tree-segment' : 'interpolation-segment';
            const pairColorClass = pairColors[segment.treePairKey] || 'tree-pair-default';
            const segmentClass = `${baseClass} ${pairColorClass} ${segment.treeInfo.colorClass}`;

            items.add({
                id: index + 1,
                content: '',
                start: index * TIMELINE_CONSTANTS.UNIT_DURATION_MS,
                end: (index + 1) * TIMELINE_CONSTANTS.UNIT_DURATION_MS,
                type: 'range',
                className: segmentClass,
                group: 1,
                title: TimelineDataProcessor.getSegmentTooltip(segment, index, segments.length)
            });
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
        const segmentIndex = Math.floor(currentTime / TIMELINE_CONSTANTS.UNIT_DURATION_MS);
        const segmentProgress = (currentTime - segmentIndex * TIMELINE_CONSTANTS.UNIT_DURATION_MS) / TIMELINE_CONSTANTS.UNIT_DURATION_MS;

        if (segmentIndex >= 0 && segmentIndex < segments.length) {
            const fromSegment = segments[segmentIndex];
            const toSegment = segments[Math.min(segmentIndex + 1, segments.length - 1)];
            return { fromSegment, toSegment, segmentProgress };
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
        
        const segmentIndex = Math.floor(currentTime / TIMELINE_CONSTANTS.UNIT_DURATION_MS);
        const segmentProgress = (currentTime - segmentIndex * TIMELINE_CONSTANTS.UNIT_DURATION_MS) / TIMELINE_CONSTANTS.UNIT_DURATION_MS;

        let targetSegmentIndex = segmentIndex;
        if (segmentProgress > TIMELINE_CONSTANTS.SEGMENT_PROGRESS_THRESHOLD && segmentIndex + 1 < segments.length) {
            targetSegmentIndex = segmentIndex + 1;
        }

        return Math.max(0, Math.min(targetSegmentIndex, segments.length - 1));
    }

    /**
     * Parse leaf indices from s_edge_tracker string
     * @private
     * @param {string} sEdgeKey - S-edge tracker like "(9,10,11)"
     * @returns {Array<number>} Array of leaf indices
     */
    static _parseLeafIndices(sEdgeKey) {
        if (!sEdgeKey?.trim()) return [];
        
        try {
            const cleanKey = sEdgeKey.replace(/[()]/g, '').trim();
            if (!cleanKey) return [];
            
            return cleanKey
                .split(',')
                .map(idx => parseInt(idx.trim(), 10))
                .filter(Number.isInteger);
        } catch (error) {
            console.warn(`[TimelineDataProcessor] Failed to parse leaf indices from "${sEdgeKey}":`, error);
            return [];
        }
    }
}