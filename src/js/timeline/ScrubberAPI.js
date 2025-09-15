import { useAppStore } from '../core/store.js';
import { TimelineMathUtils } from './TimelineMathUtils.js';

export class ScrubberAPI {
  constructor(treeController, transitionResolver, timelineManager = null) {
    this.treeController = treeController;
    this.transitionResolver = transitionResolver;
    this.timelineManager = timelineManager;
    this.currentProgress = 0;
    this.lastInterpolationState = null;
  }
  async updatePosition(progress) {
    const clampedProgress = TimelineMathUtils.clampProgress(progress);
    await this._performScrubUpdate(clampedProgress);
  }
  async endScrubbing(finalProgress = null) {
    if (
      finalProgress !== null &&
      Math.abs(TimelineMathUtils.clampProgress(finalProgress) - this.currentProgress) > 1e-6
    ) {
      await this._performScrubUpdate(TimelineMathUtils.clampProgress(finalProgress));
    }
    this.lastInterpolationState = null;
  }
  async startScrubbing(progress) {
    this.currentProgress = TimelineMathUtils.clampProgress(progress ?? 0);
    this.lastInterpolationState = null;
  }
  async _performScrubUpdate(progress) {
        this.currentProgress = progress;

        try {
            const interpolationData = await this._getInterpolationData(progress);

            if (!interpolationData) return;

            const direction = useAppStore.getState().navigationDirection;

            useAppStore.getState().setNavigationDirection(direction);

            await this._renderScrubFrame(interpolationData, direction);

            this.lastInterpolationState = {
                progress,
                interpolationData,
                direction,
                timestamp: this.lastUpdateTime
            };

        } catch (error) {}
  }
  async _renderScrubFrame(interpolationData, direction) {
    const { fromTree, toTree, timeFactor, fromIndex, toIndex } = interpolationData;
    const storeState = useAppStore.getState();
    const { updateColorManagerMarkedSubtrees, updateColorManagerActiveChangeEdge,
            getActualHighlightData, getCurrentActiveChangeEdge,
            markedComponentsEnabled, activeChangeEdgesEnabled } = storeState;
    const primaryTreeIndex = timeFactor < 0.5 ? fromIndex : toIndex;
    const originalTreeIndex = storeState.currentTreeIndex;
    storeState.currentTreeIndex = primaryTreeIndex;
    if (markedComponentsEnabled) {
      const markedComponents = getActualHighlightData();
      updateColorManagerMarkedSubtrees(markedComponents);
    } else {
      updateColorManagerMarkedSubtrees([]);
    }
    if (activeChangeEdgesEnabled) {
      const activeChangeEdge = getCurrentActiveChangeEdge();
      updateColorManagerActiveChangeEdge(activeChangeEdge);
    } else {
      updateColorManagerActiveChangeEdge([]);
    }

    // Use specialized scrubbing render mode
    const renderOptions = {
      scrubMode: true,
      direction: direction,
    };

    // Call optimized scrubbing render method with proper tree indices
    const enhancedOptions = {
      ...renderOptions,
      fromTreeIndex: fromIndex,
      toTreeIndex: toIndex
    };

    try {
      await this.treeController.renderScrubFrame(fromTree, toTree, timeFactor, enhancedOptions);
    } finally {
      storeState.currentTreeIndex = originalTreeIndex;
    }
  }

  async _getInterpolationData(progress) {
    const storeState = useAppStore.getState();
    const { treeList, movieData } = storeState;
    const segments = this.timelineManager?.segments;
    const totalDuration = this.timelineManager?.timelineData?.totalDuration;
    if (segments && Number.isFinite(totalDuration) && totalDuration > 0) {
      const currentTime = TimelineMathUtils.progressToTime(progress, totalDuration);
      const segmentDurations = this.timelineManager?.timelineData?.segmentDurations || TimelineMathUtils.calculateSegmentDurations(segments);

      let accumulatedTime = 0;
      let segIndex = segments.length - 1; // Default to last segment

      for (let i = 0; i < segments.length; i++) {
          const duration = segmentDurations[i];
          const endTime = accumulatedTime + duration;

          if (i === segments.length - 1 && currentTime >= endTime) {
              segIndex = i;
              break;
          }
          if (currentTime < endTime) {
              segIndex = i;
              break;
          }
          if (currentTime === endTime && duration === 0) {
              segIndex = i;
              break;
          }
          accumulatedTime = endTime;
      }

      const segment = segments[segIndex];
      const segStart = accumulatedTime;
      const segDur = segmentDurations[segIndex] || 1;
      if (segment?.isFullTree || !segment?.hasInterpolation || !Array.isArray(segment?.interpolationData)) {
        const idx = segment?.interpolationData?.[0]?.originalIndex ?? 0;
        return {
          fromTree: movieData.interpolated_trees[idx],
          toTree: movieData.interpolated_trees[idx],
          timeFactor: 0,
          fromIndex: idx,
          toIndex: idx
        };
      }
      const steps = segment.interpolationData.length;
      if (steps <= 1) {
        const idx = segment.interpolationData[0].originalIndex;
        return {
          fromTree: movieData.interpolated_trees[idx],
          toTree: movieData.interpolated_trees[idx],
          timeFactor: 0,
          fromIndex: idx,
          toIndex: idx
        };
      }
      const local = Math.max(0, Math.min(1, (currentTime - segStart) / segDur));
      const exact = local * (steps - 1);
      const fromStep = Math.floor(exact);
      const toStep = Math.min(fromStep + 1, steps - 1);
      const timeFactor = exact - fromStep;

      const fromIndex = segment.interpolationData[fromStep].originalIndex;
      const toIndex = segment.interpolationData[toStep].originalIndex;

      return {
        fromTree: movieData.interpolated_trees[fromIndex],
        toTree: movieData.interpolated_trees[toIndex],
        timeFactor,
        fromIndex,
        toIndex
      };
    }
    return TimelineMathUtils.getInterpolationDataForProgress(progress, treeList, movieData);
  }
  _detectNavigationDirection(currentProgress) {
        // This method is no longer used but can be kept for reference or removed.
        if (!this.lastInterpolationState) {
            return 'forward';
        }

        const prevProgress = this.lastInterpolationState.progress;

        if (currentProgress > prevProgress) {
            return 'forward';
        } else if (currentProgress < prevProgress) {
            return 'backward';
        } else {
            return 'none';
        }
    }

    destroy() {
    if (this.isActive) {
      this.endScrubbing();
    }

    this.lastInterpolationState = null;
    this.treeController = null;
    this.transitionResolver = null;
  }
}
