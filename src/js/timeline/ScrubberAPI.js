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
            markedComponentsEnabled, activeChangeEdgesEnabled,
            comparisonMode, treeControllers, transitionResolver, movieData } = storeState;
    const primaryTreeIndex = timeFactor < 0.5 ? fromIndex : toIndex;
    if (markedComponentsEnabled) {
      const markedComponents = getActualHighlightData(primaryTreeIndex);
      updateColorManagerMarkedSubtrees(markedComponents);
    } else {
      updateColorManagerMarkedSubtrees([]);
    }
    if (activeChangeEdgesEnabled) {
      const activeChangeEdge = getCurrentActiveChangeEdge(primaryTreeIndex);
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

    // In comparison mode, pass right tree index for static display
    if (comparisonMode) {
      const full = Array.isArray(transitionResolver?.fullTreeIndices) ? transitionResolver.fullTreeIndices : [];
      // Show the next anchor after the current interpolated index
      const rightIndex = full.find((i) => i > primaryTreeIndex) ?? full[full.length - 1] ?? primaryTreeIndex;

      enhancedOptions.comparisonMode = true;
      enhancedOptions.rightTreeIndex = rightIndex;
    }

    await this.treeController.renderScrubFrame(fromTree, toTree, timeFactor, enhancedOptions);
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
      let segStart = 0;

      for (let i = 0; i < segments.length; i++) {
          const duration = segmentDurations[i];
          const segmentStart = accumulatedTime;
          const segmentEnd = accumulatedTime + duration;

          // Check if currentTime falls within this segment
          // For 0-duration segments, we need exact match or range check
          if (duration === 0) {
              // Anchor segment: check if time matches exactly
              if (currentTime === segmentStart) {
                  segIndex = i;
                  segStart = segmentStart;
                  // Don't break yet - check if there are more anchors at same time
              }
          } else {
              // Interpolation segment: check if time is within range
              if (currentTime >= segmentStart && currentTime < segmentEnd) {
                  segIndex = i;
                  segStart = segmentStart;
                  break;
              }
          }

          accumulatedTime = segmentEnd;
      }

      // Handle edge case: if we're at the very end
      if (segIndex === -1 || currentTime >= totalDuration) {
          segIndex = segments.length - 1;
          segStart = accumulatedTime - (segmentDurations[segIndex] || 0);
      }

      const segment = segments[segIndex];
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
