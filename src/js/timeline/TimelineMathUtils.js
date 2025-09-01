/**
 * TimelineMathUtils - Shared mathematical utilities for timeline operations
 * Consolidates redundant calculations across timeline modules
 */

import { TIMELINE_CONSTANTS } from './constants.js';

export class TimelineMathUtils {
    /**
     * Convert progress (0-1) to time in milliseconds
     * @param {number} progress - Progress value between 0 and 1
     * @param {number} totalDuration - Total timeline duration in ms
     * @returns {number} Time in milliseconds
     */
    static progressToTime(progress, totalDuration) {
        const clampedProgress = this.clampProgress(progress);
        return clampedProgress * totalDuration;
    }

    /**
     * Convert time to progress (0-1)
     * @param {number} time - Time in milliseconds
     * @param {number} totalDuration - Total timeline duration in ms
     * @returns {number} Progress value between 0 and 1
     */
    static timeToProgress(time, totalDuration) {
        if (!totalDuration || totalDuration === 0) {
            return TIMELINE_CONSTANTS.DEFAULT_PROGRESS;
        }
        return this.clampProgress(time / totalDuration);
    }

    /**
     * Clamp progress value between 0 and 1
     * @param {number} progress - Progress value to clamp
     * @returns {number} Clamped progress value
     */
    static clampProgress(progress) {
        return Math.max(TIMELINE_CONSTANTS.MIN_PROGRESS, 
                       Math.min(TIMELINE_CONSTANTS.MAX_PROGRESS, progress));
    }

    /**
     * Find which segment contains a given tree index and position within segment
     * Consolidates logic from MovieTimelineManager._findSegmentForTreeIndex
     * @param {Array} segments - Array of timeline segments
     * @param {number} treeIndex - Tree index to find
     * @returns {Object} {segmentIndex, timeInSegment, segment}
     */
    static findSegmentForTreeIndex(segments, treeIndex) {
        if (!segments || segments.length === 0) {
            return {
                segmentIndex: TIMELINE_CONSTANTS.DEFAULT_SEGMENT_INDEX,
                timeInSegment: TIMELINE_CONSTANTS.DEFAULT_PROGRESS,
                segment: null
            };
        }

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];

            // For full tree segments (anchor points), position is always at the center
            // These are just visual markers, not scrubbable regions
            if (segment.isFullTree) {
                if (segment.interpolationData?.[0]?.originalIndex === treeIndex) {
                    // Return middle of the reduced-width segment
                    const segmentDuration = TIMELINE_CONSTANTS.UNIT_DURATION_MS * TIMELINE_CONSTANTS.ANCHOR_DURATION_MULTIPLIER;
                    return { 
                        segmentIndex: i, 
                        timeInSegment: segmentDuration / 2,  // Position at center of narrow marker
                        segment 
                    };
                }
            }
            // For interpolation segments
            else if (segment.hasInterpolation && segment.interpolationData?.length > 1) {
                // Check if tree index is within this interpolated segment
                const interpolationData = segment.interpolationData;
                for (let j = 0; j < interpolationData.length; j++) {
                    if (interpolationData[j].originalIndex === treeIndex) {
                        // Found the tree in this segment
                        const timeInSegment = j * TIMELINE_CONSTANTS.UNIT_DURATION_MS;
                        return { segmentIndex: i, timeInSegment, segment };
                    }
                }
            } else {
                // Single tree segment - check if this is the tree we're looking for
                if (segment.interpolationData?.[0]?.originalIndex === treeIndex) {
                    return { 
                        segmentIndex: i, 
                        timeInSegment: TIMELINE_CONSTANTS.DEFAULT_PROGRESS,
                        segment 
                    };
                }
            }
        }

        // Tree index not found in any segment
        return {
            segmentIndex: TIMELINE_CONSTANTS.DEFAULT_SEGMENT_INDEX,
            timeInSegment: TIMELINE_CONSTANTS.DEFAULT_PROGRESS,
            segment: null
        };
    }

    /**
     * Get target tree index for a given time position
     * Consolidates logic from TimelineDataProcessor.getTargetSegmentIndex
     * @param {Array} segments - Timeline segments
     * @param {number} currentTime - Current time in ms
     * @param {Array} segmentDurations - Pre-calculated segment durations
     * @returns {Object} {treeIndex, segmentIndex, segmentProgress}
     */
    static getTargetTreeForTime(segments, currentTime, segmentDurations) {
        if (!segments?.length) {
            return {
                treeIndex: TIMELINE_CONSTANTS.DEFAULT_TREE_INDEX,
                segmentIndex: TIMELINE_CONSTANTS.DEFAULT_SEGMENT_INDEX,
                segmentProgress: TIMELINE_CONSTANTS.DEFAULT_PROGRESS
            };
        }

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

        // Handle edge case: time beyond last segment
        if (segmentIndex === 0 && currentTime >= accumulatedTime) {
            segmentIndex = segments.length - 1;
            const segment = segments[segmentIndex];
            const lastInterp = segment.interpolationData?.[segment.interpolationData.length - 1];
            return {
                treeIndex: lastInterp?.originalIndex || TIMELINE_CONSTANTS.DEFAULT_TREE_INDEX,
                segmentIndex,
                segmentProgress: TIMELINE_CONSTANTS.MAX_PROGRESS
            };
        }

        if (segmentIndex >= 0 && segmentIndex < segments.length && segmentDuration > 0) {
            const segment = segments[segmentIndex];
            
            // For full tree segments (anchor points), always return the single tree
            // These are not scrubbable - they're just visual markers for interpolation boundaries
            if (segment.isFullTree) {
                return {
                    treeIndex: segment.interpolationData[0].originalIndex,
                    segmentIndex,
                    segmentProgress: 0.5  // Always at center since they're not scrubbable
                };
            }
            
            // For interpolation segments, calculate position within the segment
            const segmentProgress = (currentTime - segmentStartTime) / segmentDuration;

            if (segment.hasInterpolation && segment.interpolationData.length > 1) {
                // Use Math.round for better scrubbing accuracy
                const exactPosition = segmentProgress * (segment.interpolationData.length - 1);
                const stepIndex = Math.round(exactPosition);
                const clampedStepIndex = Math.max(0, Math.min(stepIndex, segment.interpolationData.length - 1));
                
                return {
                    treeIndex: segment.interpolationData[clampedStepIndex].originalIndex,
                    segmentIndex,
                    segmentProgress: this.clampProgress(segmentProgress)
                };
            } else {
                return {
                    treeIndex: segment.interpolationData[0].originalIndex,
                    segmentIndex,
                    segmentProgress: TIMELINE_CONSTANTS.DEFAULT_PROGRESS
                };
            }
        }

        // Fallback
        const fallbackSegment = segments[Math.max(0, Math.min(segmentIndex, segments.length - 1))];
        return {
            treeIndex: fallbackSegment?.interpolationData?.[0]?.originalIndex || TIMELINE_CONSTANTS.DEFAULT_TREE_INDEX,
            segmentIndex: Math.max(0, Math.min(segmentIndex, segments.length - 1)),
            segmentProgress: TIMELINE_CONSTANTS.DEFAULT_PROGRESS
        };
    }

    /**
     * Calculate position of a tree within a segment
     * @param {Object} segment - The segment object
     * @param {number} currentTreeIndex - Current tree index
     * @returns {Object} {treeInSegment, treesInSegment}
     */
    static calculateTreePositionInSegment(segment, currentTreeIndex) {
        if (!segment || !segment.hasInterpolation || !segment.interpolationData?.length) {
            return {
                treeInSegment: TIMELINE_CONSTANTS.DEFAULT_TREE_IN_SEGMENT,
                treesInSegment: TIMELINE_CONSTANTS.DEFAULT_TREES_IN_SEGMENT
            };
        }

        const treesInSegment = segment.interpolationData.length;
        
        if (treesInSegment > 1) {
            // Find which tree in the interpolation data matches currentTreeIndex
            const foundIndex = segment.interpolationData.findIndex(item =>
                item.originalIndex === currentTreeIndex);
            const treeInSegment = foundIndex !== -1 ? 
                foundIndex + TIMELINE_CONSTANTS.INDEX_OFFSET_UI : 
                TIMELINE_CONSTANTS.DEFAULT_TREE_IN_SEGMENT;
            
            return { treeInSegment, treesInSegment };
        }

        return {
            treeInSegment: TIMELINE_CONSTANTS.DEFAULT_TREE_IN_SEGMENT,
            treesInSegment: TIMELINE_CONSTANTS.DEFAULT_TREES_IN_SEGMENT
        };
    }

    /**
     * Calculate time position for a given segment
     * @param {Array} segments - All segments
     * @param {number} segmentIndex - Target segment index
     * @param {number} timeInSegment - Additional time within segment
     * @param {Array} segmentDurations - Pre-calculated durations (optional)
     * @returns {number} Total time in milliseconds
     */
    static calculateTimeForSegment(segments, segmentIndex, timeInSegment = TIMELINE_CONSTANTS.DEFAULT_PROGRESS, segmentDurations = null) {
        // Use provided durations or calculate them
        const durations = segmentDurations || this.calculateSegmentDurations(segments);
        
        let currentTime = 0;
        for (let i = 0; i < segmentIndex && i < durations.length; i++) {
            currentTime += durations[i];
        }
        currentTime += timeInSegment;

        return currentTime;
    }

    /**
     * Calculate segment durations for timeline segments
     * @param {Array} segments - Timeline segments
     * @returns {Array} Array of segment durations in milliseconds
     */
    static calculateSegmentDurations(segments) {
        if (!segments?.length) return [];

        return segments.map(segment => {
            // Full tree segments (anchor points) get reduced duration - they're not scrubbable
            // They just mark the boundaries between interpolation sequences
            if (segment.isFullTree) {
                return TIMELINE_CONSTANTS.UNIT_DURATION_MS * TIMELINE_CONSTANTS.ANCHOR_DURATION_MULTIPLIER; // Half duration, visual marker
            }
            // Interpolated segments with multiple trees get proportional duration
            else if (segment.hasInterpolation && segment.interpolationData?.length > 1) {
                return segment.interpolationData.length * TIMELINE_CONSTANTS.UNIT_DURATION_MS;
            }
            // Default single tree segments get base duration
            return TIMELINE_CONSTANTS.UNIT_DURATION_MS;
        });
    }

    /**
     * Get interpolation data for scrubbing at specific progress
     * @param {number} progress - Timeline progress (0-1)
     * @param {Array} treeList - List of all trees
     * @param {Object} movieData - Movie data with interpolated trees
     * @returns {Object|null} Interpolation data or null
     */
    static getInterpolationDataForProgress(progress, treeList, movieData) {
        if (!treeList || !movieData || !movieData.interpolated_trees) {
            return null;
        }

        const clampedProgress = this.clampProgress(progress);
        const totalTrees = treeList.length;
        const exactIndex = clampedProgress * (totalTrees - 1);
        const fromIndex = Math.floor(exactIndex);
        const toIndex = Math.min(fromIndex + 1, totalTrees - 1);
        const timeFactor = exactIndex - fromIndex;

        return {
            fromTree: movieData.interpolated_trees[fromIndex],
            toTree: movieData.interpolated_trees[toIndex],
            timeFactor: timeFactor,
            fromIndex: fromIndex,
            toIndex: toIndex
        };
    }

    // Removed calculateTimelineState (dead code; store provides dedicated updaters)
}
