import { TIMELINE_CONSTANTS } from '../constants.js';

/**
 * Timeline math utilities for progress/time conversion, segment lookup, and duration calculations.
 */
export class TimelineMathUtils {

    // ==========================================================================
    // CONSTANTS
    // ==========================================================================

    static EPSILON_MS = 1;

    // ==========================================================================
    // PROGRESS / TIME CONVERSION
    // ==========================================================================

    static progressToTime(progress, totalDuration) {
        return this.clampProgress(progress) * totalDuration;
    }

    static timeToProgress(time, totalDuration) {
        return this.clampProgress(time / totalDuration);
    }

    static clampProgress(progress) {
        return Math.max(TIMELINE_CONSTANTS.MIN_PROGRESS, Math.min(TIMELINE_CONSTANTS.MAX_PROGRESS, progress));
    }

    // ==========================================================================
    // SEGMENT LOOKUP
    // ==========================================================================

    static findSegmentForTreeIndex(segments, treeIndex) {
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];

            if (segment.isFullTree) {
                if (segment.interpolationData?.[0]?.originalIndex === treeIndex) {
                    return { segmentIndex: i, timeInSegment: 0, segment };
                }
            } else if (segment.hasInterpolation && segment.interpolationData?.length > 1) {
                for (let j = 0; j < segment.interpolationData.length; j++) {
                    if (segment.interpolationData[j].originalIndex === treeIndex) {
                        return { segmentIndex: i, timeInSegment: j * TIMELINE_CONSTANTS.UNIT_DURATION_MS, segment };
                    }
                }
            } else if (segment.interpolationData?.[0]?.originalIndex === treeIndex) {
                return { segmentIndex: i, timeInSegment: TIMELINE_CONSTANTS.DEFAULT_PROGRESS, segment };
            }
        }

        return {
            segmentIndex: TIMELINE_CONSTANTS.DEFAULT_SEGMENT_INDEX,
            timeInSegment: TIMELINE_CONSTANTS.DEFAULT_PROGRESS,
            segment: null
        };
    }

    // ==========================================================================
    // TREE INDEX RESOLUTION
    // ==========================================================================

    static getTargetTreeForTime(segments, currentTime, segmentDurations, bias = 'nearest', cumulativeDurations = null) {
        const cumulative = cumulativeDurations || this._buildCumulative(segmentDurations);
        const segmentIndex = this._binarySearchSegment(cumulative, currentTime);
        const segmentStartTime = segmentIndex === 0 ? 0 : cumulative[segmentIndex - 1];
        const segmentDuration = segmentDurations[segmentIndex];
        const segment = segments[segmentIndex];

        if (segment.isFullTree) {
            return {
                treeIndex: segment.interpolationData[0].originalIndex,
                segmentIndex,
                segmentProgress: 0.5
            };
        }

        const clampedTime = Math.max(
            segmentStartTime + this.EPSILON_MS,
            Math.min(currentTime, segmentStartTime + segmentDuration - this.EPSILON_MS)
        );
        const segmentProgress = (clampedTime - segmentStartTime) / segmentDuration;

        if (segment.hasInterpolation && segment.interpolationData.length > 1) {
            const exactPosition = segmentProgress * (segment.interpolationData.length - 1);
            let stepIndex;

            if (bias === 'forward') {
                stepIndex = Math.ceil(exactPosition - 1e-8);
            } else if (bias === 'backward') {
                stepIndex = Math.floor(exactPosition + 1e-8);
            } else {
                stepIndex = Math.round(exactPosition);
            }

            const clampedStepIndex = Math.max(0, Math.min(stepIndex, segment.interpolationData.length - 1));

            return {
                treeIndex: segment.interpolationData[clampedStepIndex].originalIndex,
                segmentIndex,
                segmentProgress: this.clampProgress(segmentProgress)
            };
        }

        return {
            treeIndex: segment.interpolationData[0].originalIndex,
            segmentIndex,
            segmentProgress: TIMELINE_CONSTANTS.DEFAULT_PROGRESS
        };
    }

    static calculateTreePositionInSegment(segment, currentTreeIndex) {
        const treesInSegment = segment.interpolationData.length;

        if (treesInSegment > 1) {
            const foundIndex = segment.interpolationData.findIndex(item => item.originalIndex === currentTreeIndex);
            const treeInSegment = foundIndex !== -1
                ? foundIndex + TIMELINE_CONSTANTS.INDEX_OFFSET_UI
                : TIMELINE_CONSTANTS.DEFAULT_TREE_IN_SEGMENT;
            return { treeInSegment, treesInSegment };
        }

        return {
            treeInSegment: TIMELINE_CONSTANTS.DEFAULT_TREE_IN_SEGMENT,
            treesInSegment: TIMELINE_CONSTANTS.DEFAULT_TREES_IN_SEGMENT
        };
    }

    // ==========================================================================
    // DURATION CALCULATIONS
    // ==========================================================================

    static calculateSegmentDurations(segments) {
        return segments.map((segment) => {
            if (segment.isFullTree) {
                return TIMELINE_CONSTANTS.UNIT_DURATION_MS * 0.5;
            }
            if (segment.hasInterpolation && segment.interpolationData?.length > 1) {
                return segment.interpolationData.length * TIMELINE_CONSTANTS.UNIT_DURATION_MS;
            }
            return TIMELINE_CONSTANTS.UNIT_DURATION_MS;
        });
    }

    // ==========================================================================
    // INTERPOLATION DATA
    // ==========================================================================

    static getInterpolationDataForProgress(progress, treeList, movieData) {
        const clampedProgress = this.clampProgress(progress);
        const totalTrees = treeList.length;
        const exactIndex = clampedProgress * (totalTrees - 1);
        const fromIndex = Math.floor(exactIndex);
        const toIndex = Math.min(fromIndex + 1, totalTrees - 1);

        return {
            fromTree: movieData.interpolated_trees[fromIndex],
            toTree: movieData.interpolated_trees[toIndex],
            timeFactor: exactIndex - fromIndex,
            fromIndex,
            toIndex
        };
    }

    // ==========================================================================
    // BINARY SEARCH HELPERS
    // ==========================================================================

    static _binarySearchSegment(cumulativeDurations, time) {
        let lo = 0;
        let hi = cumulativeDurations.length - 1;

        while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            if (cumulativeDurations[mid] <= time) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }
        return lo;
    }

    static _buildCumulative(segmentDurations) {
        const arr = new Array(segmentDurations.length);
        let acc = 0;
        for (let i = 0; i < segmentDurations.length; i++) {
            acc += segmentDurations[i];
            arr[i] = acc;
        }
        return arr;
    }
}
