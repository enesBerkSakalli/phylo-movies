import { TIMELINE_CONSTANTS, TIMING_PROFILE } from '../constants.js';
import { TimelineTimingResolver } from './TimelineTimingResolver.js';
import { getSegmentBounds, timeToSegmentIndex } from '../utils/segmentTiming.js';

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
        if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
            return 0;
        }
        return this.clampProgress(progress) * totalDuration;
    }

    static timeToProgress(time, totalDuration) {
        if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
            return TIMELINE_CONSTANTS.DEFAULT_PROGRESS;
        }
        return this.clampProgress(time / totalDuration);
    }

    static clampProgress(progress) {
        if (!Number.isFinite(progress)) {
            return TIMELINE_CONSTANTS.DEFAULT_PROGRESS;
        }
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
                if (TimelineTimingResolver.hasSemanticTiming(segment)) {
                    const segmentDuration = this.calculateSegmentDuration(segment);
                    const timeInSegment = TimelineTimingResolver.getTimeForTreeIndex(
                        segment,
                        treeIndex,
                        segmentDuration,
                        this.EPSILON_MS
                    );
                    if (timeInSegment !== null) {
                        return { segmentIndex: i, timeInSegment, segment };
                    }
                }

                const segmentDuration = this.calculateSegmentDuration(segment);
                for (let j = 0; j < segment.interpolationData.length; j++) {
                    if (segment.interpolationData[j].originalIndex === treeIndex) {
                        return {
                            segmentIndex: i,
                            timeInSegment: this._getInterpolationTimeInSegment(j, segment.interpolationData.length, segmentDuration),
                            segment
                        };
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
        if (!Array.isArray(segments) || segments.length === 0 || !Array.isArray(segmentDurations) || segmentDurations.length === 0) {
            return {
                treeIndex: null,
                segmentIndex: TIMELINE_CONSTANTS.DEFAULT_SEGMENT_INDEX,
                segmentProgress: TIMELINE_CONSTANTS.DEFAULT_PROGRESS
            };
        }

        const timelineData = {
            segmentDurations,
            cumulativeDurations: cumulativeDurations || this._buildCumulative(segmentDurations)
        };
        const segmentIndex = timeToSegmentIndex(currentTime, timelineData, {
            preferLastAtSameTime: false,
            includeEnd: true
        });
        const bounds = getSegmentBounds(segmentIndex, timelineData);
        const segmentStartTime = bounds?.start ?? 0;
        const segmentDuration = segmentDurations[segmentIndex];
        const segment = segments[segmentIndex];

        if (!segment || !Number.isFinite(segmentDuration) || segmentDuration <= 0) {
            return {
                treeIndex: null,
                segmentIndex: TIMELINE_CONSTANTS.DEFAULT_SEGMENT_INDEX,
                segmentProgress: TIMELINE_CONSTANTS.DEFAULT_PROGRESS
            };
        }

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

        if (TimelineTimingResolver.hasSemanticTiming(segment)) {
            return TimelineTimingResolver.getTargetTree(
                segment,
                clampedTime - segmentStartTime,
                segmentIndex,
                segmentProgress,
                bias,
                this.clampProgress.bind(this)
            );
        }

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
        return segments.map((segment) => this.calculateSegmentDuration(segment));
    }

    static calculateSegmentDuration(segment) {
        const semanticDuration = TimelineTimingResolver.calculateTimingDuration(segment);
        if (semanticDuration !== null) {
            return semanticDuration;
        }

        if (segment.isFullTree) {
            return TIMING_PROFILE.anchorHoldMs;
        }
        if (segment.hasInterpolation && segment.interpolationData?.length > 1) {
            return (segment.interpolationData.length - 1) * TIMING_PROFILE.motionStepMs;
        }
        return TIMING_PROFILE.motionStepMs;
    }

    // ==========================================================================
    // INTERPOLATION DATA
    // ==========================================================================

    static getInterpolationDataForProgress(progress, treeList) {
        if (!Array.isArray(treeList) || treeList.length === 0) {
            return {
                fromTree: null,
                toTree: null,
                timeFactor: 0,
                fromIndex: -1,
                toIndex: -1
            };
        }

        const clampedProgress = this.clampProgress(progress);
        const totalTrees = treeList.length;
        const exactIndex = clampedProgress * (totalTrees - 1);
        const fromIndex = Math.floor(exactIndex);
        const toIndex = Math.min(fromIndex + 1, totalTrees - 1);

        return {
            fromTree: treeList[fromIndex],
            toTree: treeList[toIndex],
            timeFactor: exactIndex - fromIndex,
            fromIndex,
            toIndex
        };
    }

    static getInterpolationDataForTimelineProgress(progress, segments, timelineData, treeList) {
        if (
            !Array.isArray(segments) ||
            segments.length === 0 ||
            !Array.isArray(treeList) ||
            treeList.length === 0 ||
            !timelineData ||
            !Number.isFinite(timelineData.totalDuration) ||
            timelineData.totalDuration <= 0
        ) {
            return null;
        }

        const currentTime = this.progressToTime(progress, timelineData.totalDuration);
        const segmentIndex = timeToSegmentIndex(currentTime, timelineData, {
            preferLastAtSameTime: false,
            includeEnd: true
        });
        const segment = segments[segmentIndex];

        if (!segment) {
            return this._createStaticInterpolationResult(0, treeList);
        }

        const bounds = getSegmentBounds(segmentIndex, timelineData);
        const segmentStart = bounds?.start ?? 0;
        const segmentDuration = timelineData.segmentDurations[segmentIndex];
        const localTime = Math.max(0, Math.min(
            currentTime - segmentStart,
            Number.isFinite(segmentDuration) ? segmentDuration : 0
        ));

        if (TimelineTimingResolver.hasSemanticTiming(segment)) {
            return TimelineTimingResolver.getInterpolationData(
                segment,
                localTime,
                treeList,
                this._createStaticInterpolationResult.bind(this),
                this.clampProgress.bind(this)
            );
        }

        if (segment.isFullTree || !segment.hasInterpolation) {
            return this._createStaticInterpolationResult(segment.interpolationData[0].originalIndex, treeList);
        }

        const steps = segment.interpolationData.length;
        if (steps <= 1) {
            return this._createStaticInterpolationResult(segment.interpolationData[0].originalIndex, treeList);
        }

        const localProgress = this.clampProgress((currentTime - segmentStart) / segmentDuration);
        const exactStep = localProgress * (steps - 1);
        const fromStep = Math.floor(exactStep);
        const toStep = Math.min(fromStep + 1, steps - 1);

        return {
            fromTree: treeList[segment.interpolationData[fromStep].originalIndex],
            toTree: treeList[segment.interpolationData[toStep].originalIndex],
            timeFactor: exactStep - fromStep,
            fromIndex: segment.interpolationData[fromStep].originalIndex,
            toIndex: segment.interpolationData[toStep].originalIndex
        };
    }

    static getTimelineProgressForTreeIndex(segments, timelineData, treeIndex) {
        if (
            !Number.isInteger(treeIndex) ||
            !Array.isArray(segments) ||
            !timelineData ||
            !Number.isFinite(timelineData.totalDuration) ||
            timelineData.totalDuration <= 0
        ) {
            return null;
        }

        const lookup = this.findSegmentForTreeIndex(segments, treeIndex);
        if (lookup.segmentIndex < 0 || !lookup.segment) {
            return null;
        }

        const bounds = getSegmentBounds(lookup.segmentIndex, timelineData);
        if (!bounds) return null;
        return this.timeToProgress(bounds.start + lookup.timeInSegment, timelineData.totalDuration);
    }

    static getTimelineProgressForLinearTreeProgress(progress, treeCount, segments, timelineData) {
        if (!Number.isFinite(treeCount) || treeCount <= 1) {
            return this.getTimelineProgressForTreeIndex(segments, timelineData, 0);
        }

        const clampedProgress = this.clampProgress(progress);
        const exactTreeIndex = clampedProgress * (treeCount - 1);
        const fromIndex = Math.floor(exactTreeIndex);
        const toIndex = Math.min(fromIndex + 1, treeCount - 1);
        const timeFactor = exactTreeIndex - fromIndex;

        const fromProgress = this.getTimelineProgressForTreeIndex(segments, timelineData, fromIndex);
        const toProgress = this.getTimelineProgressForTreeIndex(segments, timelineData, toIndex);

        if (fromProgress == null || toProgress == null) {
            return clampedProgress;
        }

        return fromProgress + ((toProgress - fromProgress) * timeFactor);
    }

    // ==========================================================================
    // BINARY SEARCH HELPERS
    // ==========================================================================

    static _buildCumulative(segmentDurations) {
        const arr = new Array(segmentDurations.length);
        let acc = 0;
        for (let i = 0; i < segmentDurations.length; i++) {
            acc += segmentDurations[i];
            arr[i] = acc;
        }
        return arr;
    }

    static _getInterpolationTimeInSegment(stepIndex, totalSteps, segmentDuration) {
        if (totalSteps <= 1 || !Number.isFinite(segmentDuration) || segmentDuration <= 0) {
            return TIMELINE_CONSTANTS.DEFAULT_PROGRESS;
        }

        if (stepIndex <= 0) {
            return TIMELINE_CONSTANTS.DEFAULT_PROGRESS;
        }

        if (stepIndex >= totalSteps - 1) {
            return Math.max(
                TIMELINE_CONSTANTS.DEFAULT_PROGRESS,
                segmentDuration - this.EPSILON_MS
            );
        }

        return (stepIndex / (totalSteps - 1)) * segmentDuration;
    }

    static _createStaticInterpolationResult(idx, treeList, extra = {}) {
        const tree = treeList?.[idx];
        return { fromTree: tree, toTree: tree, timeFactor: 0, fromIndex: idx, toIndex: idx, ...extra };
    }
}
