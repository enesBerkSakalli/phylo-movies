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
import { clamp } from '../utils/MathUtils.js';

export class ScrubberAPI {
  constructor(treeController, transitionResolver) {
    this.treeController = treeController;
    this.transitionResolver = transitionResolver;

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
    if (this.isActive) {
      console.log('[ScrubberAPI] Already in scrubbing mode');
      return;
    }

    console.log('[ScrubberAPI] Starting scrubbing mode');
    this.isActive = true;
    this.currentProgress = clamp(initialProgress, 0, 1);

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
    const clampedProgress = clamp(progress, 0, 1);

    // Throttle high-frequency updates
    const now = performance.now();
    const THROTTLE_MS = 16; // ~60fps
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

    console.log('[ScrubberAPI] Ending scrubbing mode');

    // Cancel any pending updates
    if (this.pendingUpdate) {
      cancelAnimationFrame(this.pendingUpdate);
      this.pendingUpdate = null;
    }

    // Only update if finalProgress is provided and different from currentProgress
    if (
      finalProgress !== null &&
      Math.abs(clamp(finalProgress, 0, 1) - this.currentProgress) > 1e-6
    ) {
      await this._performScrubUpdate(clamp(finalProgress, 0, 1));
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

      if (!interpolationData) {
        console.warn('[ScrubberAPI] No interpolation data for progress:', progress);
        return;
      }

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

    } catch (error) {
      console.error('[ScrubberAPI] Error during scrub update:', error);
    }
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
            getActualHighlightData, getCurrentActiveChangeEdge } = storeState;

    // Calculate which tree index we're primarily rendering (for color state)
    const primaryTreeIndex = timeFactor < 0.5 ? fromIndex : toIndex;

    // Temporarily update currentTreeIndex for ColorManager calculations
    const originalTreeIndex = storeState.currentTreeIndex;
    storeState.currentTreeIndex = primaryTreeIndex;

    // Get highlight data for the primary tree index
    const markedComponents = getActualHighlightData();
    const activeChangeEdge = getCurrentActiveChangeEdge();

        // Update ColorManager state for proper coloring during scrubbing
    updateColorManagerMarkedComponents(markedComponents);
    updateColorManagerActiveChangeEdge(activeChangeEdge);

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

    if (!treeList || !movieData) {
      return null;
    }

    // Calculate tree indices
    const totalTrees = treeList.length;
    const exactIndex = progress * (totalTrees - 1);
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
