/**
 * ScrubberAPI - Dedicated scrubbing interface for timeline interactions
 *
 * This API provides a clean, optimized interface for scrubbing operations,
 * decoupled from the regular animation playback system. It handles:
 * - Element lifecycle management during scrubbing
 * - Performance optimization for high-frequency updates
 * - State synchronization between timeline and WebGL renderers
 * - Proper element creation/destruction sequencing
 */

import { useAppStore } from '../core/store.js';
import { TIMELINE_CONSTANTS } from './constants.js';
import { TimelineMathUtils } from './TimelineMathUtils.js';

export class ScrubberAPI {
  constructor(treeController, transitionResolver, timelineManager = null) {
    this.treeController = treeController;
    this.transitionResolver = transitionResolver;
    // Optional: access to timeline segments + total duration for accurate mapping
    this.timelineManager = timelineManager;

    // Scrubbing state
    this.isActive = false;
    this.currentProgress = 0;
    this.lastUpdateTime = 0;
    this.pendingUpdate = null;

    // Interpolation state
    this.lastInterpolationState = null;
  }

  /**
   * Start scrubbing mode with optimized element management
   * @param {number} initialProgress - Starting progress (0-1)
   */
  async startScrubbing(initialProgress = 0) {
    if (this.isActive) return;

    
    this.isActive = true;
    this.currentProgress = TimelineMathUtils.clampProgress(initialProgress);

    // Pause store subscriptions during scrubbing
    useAppStore.getState().setSubscriptionPaused(true);

    // Initialize with current position
    await this.updatePosition(initialProgress);
  }

  /**
   * Update scrubbing position with optimized rendering
   * @param {number} progress - Timeline progress (0-1)
   * @param {Object} options - Scrubbing options
   */
  async updatePosition(progress) {
    const clampedProgress = TimelineMathUtils.clampProgress(progress);

    // Throttle high-frequency updates
    const now = performance.now();
    const THROTTLE_MS = TIMELINE_CONSTANTS.SCRUB_THROTTLE_MS; // ~60fps
    if (now - this.lastUpdateTime < THROTTLE_MS) {
      this._scheduleThrottledUpdate(clampedProgress);
      return;
    }

    await this._performScrubUpdate(clampedProgress);
  }

  /**
   * End scrubbing mode and finalize state
   * @param {number} finalProgress - Final progress position
   */
  async endScrubbing(finalProgress = null) {
    if (!this.isActive) {
      return;
    }

    

    // Cancel any pending updates
    if (this.pendingUpdate) {
      cancelAnimationFrame(this.pendingUpdate);
      this.pendingUpdate = null;
    }

    // Only update if finalProgress is provided and different from currentProgress
    if (
      finalProgress !== null &&
      Math.abs(TimelineMathUtils.clampProgress(finalProgress) - this.currentProgress) > 1e-6
    ) {
      await this._performScrubUpdate(TimelineMathUtils.clampProgress(finalProgress));
    }
    // Otherwise, keep the last interpolated state (do not snap)

    // Clear state
    this.lastInterpolationState = null;

    // Resume store subscriptions
    useAppStore.getState().setSubscriptionPaused(false);

    this.isActive = false;
  }

  // Private methods

  /**
   * Perform the actual scrub update with element lifecycle management
   * @private
   */
  async _performScrubUpdate(progress) {
    this.lastUpdateTime = performance.now();
    this.currentProgress = progress;

    try {
      // Get interpolation data for current progress
      const interpolationData = await this._getInterpolationData(progress);

      if (!interpolationData) return;

      // Detect navigation direction for proper element handling
      const direction = this._detectNavigationDirection(progress);

      // Update store navigation direction
      useAppStore.getState().setNavigationDirection(direction);

      // Perform optimized scrubbing render
      await this._renderScrubFrame(interpolationData, direction);

      // Cache successful interpolation state
      this.lastInterpolationState = {
        progress,
        interpolationData,
        direction,
        timestamp: this.lastUpdateTime
      };

    } catch (error) {}
  }

  /**
   * Render a scrubbing frame with optimized element management
   * @private
   */
  async _renderScrubFrame(interpolationData, direction) {
    const { fromTree, toTree, timeFactor, fromIndex, toIndex } = interpolationData;

    // CRITICAL FIX: Update ColorManager state during scrubbing
    // Since store subscriptions are paused, we need to manually update ColorManager
    const storeState = useAppStore.getState();
    const { updateColorManagerMarkedComponents, updateColorManagerActiveChangeEdge,
            getActualHighlightData, getCurrentActiveChangeEdge,
            markedComponentsEnabled, activeChangeEdgesEnabled } = storeState;

    // Calculate which tree index we're primarily rendering (for color state)
    const primaryTreeIndex = timeFactor < 0.5 ? fromIndex : toIndex;

    // Temporarily update currentTreeIndex for ColorManager calculations
    const originalTreeIndex = storeState.currentTreeIndex;
    storeState.currentTreeIndex = primaryTreeIndex;

    // Only update ColorManager if the respective toggles are enabled
    if (markedComponentsEnabled) {
      const markedComponents = getActualHighlightData();
      updateColorManagerMarkedComponents(markedComponents);
    } else {
      // Clear marked components if toggle is off
      updateColorManagerMarkedComponents([]);
    }

    if (activeChangeEdgesEnabled) {
      const activeChangeEdge = getCurrentActiveChangeEdge();
      updateColorManagerActiveChangeEdge(activeChangeEdge);
    } else {
      // Clear active change edges if toggle is off
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
      // Restore original currentTreeIndex
      storeState.currentTreeIndex = originalTreeIndex;
    }
  }

  /**
   * Schedule throttled update to avoid overwhelming the renderer
   * @private
   */
  _scheduleThrottledUpdate(progress) {
    if (this.pendingUpdate) {
      cancelAnimationFrame(this.pendingUpdate);
    }

    this.pendingUpdate = requestAnimationFrame(async () => {
      await this._performScrubUpdate(progress);
      this.pendingUpdate = null;
    });
  }

  /**
   * Get interpolation data for current progress
   * @private
   */
  async _getInterpolationData(progress) {
    const storeState = useAppStore.getState();
    const { treeList, movieData } = storeState;

    // If we have timeline context, use segment-aware time mapping to avoid offsets
    const segments = this.timelineManager?.segments;
    const totalDuration = this.timelineManager?.timelineData?.totalDuration;
    if (segments && Number.isFinite(totalDuration) && totalDuration > 0) {
      const currentTime = TimelineMathUtils.progressToTime(progress, totalDuration);

      // Find segment containing currentTime using cached durations
      const segmentDurations = this.timelineManager?.timelineData?.segmentDurations || TimelineMathUtils.calculateSegmentDurations(segments);
      let accumulatedTime = 0;
      let segIndex = 0;
      for (let i = 0; i < segmentDurations.length; i++) {
        const dur = segmentDurations[i];
        if (currentTime >= accumulatedTime && currentTime < accumulatedTime + dur) {
          segIndex = i;
          break;
        }
        accumulatedTime += dur;
      }

      const segment = segments[segIndex];
      const segStart = accumulatedTime;
      const segDur = segmentDurations[segIndex] || 1;

      // Full tree (anchor) -> no interpolation
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

      // Position within segment -> map to adjacent trees
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

    // Fallback: uniform mapping across all trees (legacy)
    return TimelineMathUtils.getInterpolationDataForProgress(progress, treeList, movieData);
  }

  /**
   * Detect navigation direction based on progress change
   * @private
   */
  _detectNavigationDirection(currentProgress) {
    if (!this.lastInterpolationState) {
      return 'forward'; // Default for first update
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

  /**
   * Destroy the scrubber API and clean up resources
   */
  destroy() {
    if (this.isActive) {
      this.endScrubbing();
    }

    this.lastInterpolationState = null;
    this.treeController = null;
    this.transitionResolver = null;
  }
}
