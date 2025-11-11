import { TIMELINE_CONSTANTS } from './constants.js';

export class TimelineMathUtils {
    static EPSILON_MS = 1;
    static progressToTime(progress, totalDuration) {
        const clampedProgress = this.clampProgress(progress);
        return clampedProgress * totalDuration;
    }
    static timeToProgress(time, totalDuration) {
        if (!totalDuration || totalDuration === 0) {
            return TIMELINE_CONSTANTS.DEFAULT_PROGRESS;
        }
        return this.clampProgress(time / totalDuration);
    }
    static clampProgress(progress) {
        return Math.max(TIMELINE_CONSTANTS.MIN_PROGRESS,
                       Math.min(TIMELINE_CONSTANTS.MAX_PROGRESS, progress));
    }

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
            if (segment.isFullTree) {
                if (segment.interpolationData?.[0]?.originalIndex === treeIndex) {
                    return {
                        segmentIndex: i,
                        timeInSegment: 0,
                        segment
                    };
                }
            }
            else if (segment.hasInterpolation && segment.interpolationData?.length > 1) {
                const interpolationData = segment.interpolationData;
                for (let j = 0; j < interpolationData.length; j++) {
                    if (interpolationData[j].originalIndex === treeIndex) {
                        const timeInSegment = j * TIMELINE_CONSTANTS.UNIT_DURATION_MS;
                        return { segmentIndex: i, timeInSegment, segment };
                    }
                }
            } else {
                if (segment.interpolationData?.[0]?.originalIndex === treeIndex) {
                    return {
                        segmentIndex: i,
                        timeInSegment: TIMELINE_CONSTANTS.DEFAULT_PROGRESS,
                        segment
                    };
                }
            }
        }
        return {
            segmentIndex: TIMELINE_CONSTANTS.DEFAULT_SEGMENT_INDEX,
            timeInSegment: TIMELINE_CONSTANTS.DEFAULT_PROGRESS,
            segment: null
        };
    }
    static getTargetTreeForTime(segments, currentTime, segmentDurations, bias = 'nearest') {
        let accumulatedTime = 0;
        let segmentIndex = segments.length - 1; // Default to last segment
        let segmentStartTime = 0;
        let segmentDuration = 0;

        for (let i = 0; i < segments.length; i++) {
            const duration = segmentDurations[i];
            const endTime = accumulatedTime + duration;

            // Handle being exactly at the end of the timeline
            if (i === segments.length - 1 && currentTime >= endTime) {
                segmentIndex = i;
                break;
            }

            // If the current time is less than the end of this segment, we've found it.
            if (currentTime < endTime) {
                segmentIndex = i;
                break;
            }
            // If time is exactly on a boundary, and the segment is a zero-duration one, it's that one.
            if (currentTime === endTime && duration === 0) {
                segmentIndex = i;
                break;
            }
            accumulatedTime = endTime;
        }

        // Recalculate start time for the found segment
        accumulatedTime = 0;
        for (let i = 0; i < segmentIndex; i++) {
            accumulatedTime += segmentDurations[i];
        }
        segmentStartTime = accumulatedTime;
        segmentDuration = segmentDurations[segmentIndex];

        if (segmentIndex >= 0 && segmentIndex < segments.length && segmentDuration >= 0) {
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
            } else {
                return {
                    treeIndex: segment.interpolationData[0].originalIndex,
                    segmentIndex,
                    segmentProgress: TIMELINE_CONSTANTS.DEFAULT_PROGRESS
                };
            }
        }
        const fallbackSegment = segments[Math.max(0, Math.min(segmentIndex, segments.length - 1))];
        return {
            treeIndex: fallbackSegment?.interpolationData?.[0]?.originalIndex || TIMELINE_CONSTANTS.DEFAULT_TREE_INDEX,
            segmentIndex: Math.max(0, Math.min(segmentIndex, segments.length - 1)),
            segmentProgress: TIMELINE_CONSTANTS.DEFAULT_PROGRESS
        };
    }
    static clampTimeForFinalization(segments, currentTime, segmentDurations, bias = 'nearest') {
        try {
            if (!segments?.length || !segmentDurations?.length) return currentTime;
            const cumulativeDurations = (() => {
                const arr = new Array(segmentDurations.length);
                let acc = 0;
                for (let i = 0; i < segmentDurations.length; i++) {
                    acc += segmentDurations[i];
                    arr[i] = acc;
                }
                return arr;
            })();
            let lo = 0, hi = cumulativeDurations.length - 1, idx = -1;
            while (lo <= hi) {
                const mid = (lo + hi) >> 1;
                if (currentTime < cumulativeDurations[mid]) { idx = mid; hi = mid - 1; }
                else { lo = mid + 1; }
            }
            if (idx < 0) idx = 0;

            const segStart = idx === 0 ? 0 : cumulativeDurations[idx - 1];
            const segEnd = cumulativeDurations[idx];
            const seg = segments[idx];
            if (seg?.isFullTree) {
                if (bias === 'forward' && idx < segments.length - 1) {
                    const nextEnd = cumulativeDurations[idx + 1];
                    return Math.min(nextEnd - this.EPSILON_MS, segEnd + this.EPSILON_MS);
                }
                if (bias === 'backward') {
                    return Math.max(0, segStart - this.EPSILON_MS);
                }
                return segStart + Math.max(1, Math.floor((segEnd - segStart) / 2));
            }
            return Math.max(segStart + this.EPSILON_MS, Math.min(currentTime, segEnd - this.EPSILON_MS));
        } catch {
            return currentTime;
        }
    }
    static calculateTreePositionInSegment(segment, currentTreeIndex) {
        if (!segment || !segment.hasInterpolation || !segment.interpolationData?.length) {
            return {
                treeInSegment: TIMELINE_CONSTANTS.DEFAULT_TREE_IN_SEGMENT,
                treesInSegment: TIMELINE_CONSTANTS.DEFAULT_TREES_IN_SEGMENT
            };
        }

        const treesInSegment = segment.interpolationData.length;
        if (treesInSegment > 1) {
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
    static calculateTimeForSegment(segments, segmentIndex, timeInSegment = TIMELINE_CONSTANTS.DEFAULT_PROGRESS, segmentDurations = null) {
        const durations = segmentDurations || this.calculateSegmentDurations(segments);
        let currentTime = 0;
        for (let i = 0; i < segmentIndex && i < durations.length; i++) {
            currentTime += durations[i];
        }
        const seg = segments?.[segmentIndex];
        const segDur = durations?.[segmentIndex] ?? 0;
        let within = timeInSegment;
        if (seg && !seg.isFullTree) {
            within = Math.max(this.EPSILON_MS, Math.min(timeInSegment, segDur - this.EPSILON_MS));
        }
        currentTime += within;
        return currentTime;
    }
    static calculateSegmentDurations(segments) {
        if (!segments?.length) return [];

        const durations = segments.map((segment, idx) => {
            let duration;
            if (segment.isFullTree) {
                // Give anchor segments a small duration for better hover detection
                // This makes them easier to hover over in the UI
                duration = TIMELINE_CONSTANTS.UNIT_DURATION_MS * 0.5;
            }
            else if (segment.hasInterpolation && segment.interpolationData?.length > 1) {
                duration = segment.interpolationData.length * TIMELINE_CONSTANTS.UNIT_DURATION_MS;
            } else {
                duration = TIMELINE_CONSTANTS.UNIT_DURATION_MS;
            }

            return duration;
        });

        return durations;
    }
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
}
