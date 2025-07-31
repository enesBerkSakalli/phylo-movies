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

    // Performance configuration
    this.THROTTLE_MS = 16; // 60fps max
    this.ELEMENT_CREATION_TIMEOUT = 100; // ms to wait for element creation

    // Element tracking for scrubbing
    this.scrubbingElements = {
      links: new Set(),
      nodes: new Set(),
      extensions: new Set(),
      labels: new Set()
    };

    // Cached interpolation state
    this.lastInterpolationState = null;
    this.interpolationCache = new Map();
  }

  /**
   * Start scrubbing mode with optimized element management
   * @param {number} initialProgress - Starting progress (0-1)
   */
  async startScrubbing(initialProgress = 0) {
    if (this.isActive) {
      console.warn('[ScrubberAPI] Already in scrubbing mode');
      return;
    }

    console.log('[ScrubberAPI] Starting scrubbing mode');
    this.isActive = true;
    this.currentProgress = clamp(initialProgress, 0, 1);

    // Pause store subscriptions during scrubbing
    useAppStore.getState().setSubscriptionPaused(true);

    // Pre-cache nearby trees for smooth scrubbing
    await this._precacheNearbyTrees(initialProgress);

    // Initialize with current position
    await this.updatePosition(initialProgress);
  }

  /**
   * Update scrubbing position with optimized rendering
   * @param {number} progress - Timeline progress (0-1)
   * @param {Object} options - Scrubbing options
   */
  async updatePosition(progress, options = {}) {
    if (!this.isActive) {
      console.warn('[ScrubberAPI] Not in scrubbing mode');
      return;
    }

    const clampedProgress = clamp(progress, 0, 1);

    // Throttle high-frequency updates
    const now = performance.now();
    if (now - this.lastUpdateTime < this.THROTTLE_MS) {
      this._scheduleThrottledUpdate(clampedProgress, options);
      return;
    }

    await this._performScrubUpdate(clampedProgress, options);
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

    // Finalize position if provided
    if (finalProgress !== null) {
      await this._performScrubUpdate(clamp(finalProgress, 0, 1), { isFinalization: true });
    }

    // Clean up scrubbing-specific elements
    await this._cleanupScrubbingElements();

    // Clear caches
    this.interpolationCache.clear();
    this.lastInterpolationState = null;

    // Resume store subscriptions
    useAppStore.getState().setSubscriptionPaused(false);

    this.isActive = false;
    console.log('[ScrubberAPI] Scrubbing mode ended');
  }

  /**
   * Get current scrubbing state information
   * @returns {Object} Scrubbing state
   */
  getState() {
    return {
      isActive: this.isActive,
      currentProgress: this.currentProgress,
      lastUpdateTime: this.lastUpdateTime,
      elementCounts: {
        links: this.scrubbingElements.links.size,
        nodes: this.scrubbingElements.nodes.size,
        extensions: this.scrubbingElements.extensions.size,
        labels: this.scrubbingElements.labels.size
      }
    };
  }

  // Private methods

  /**
   * Perform the actual scrub update with element lifecycle management
   * @private
   */
  async _performScrubUpdate(progress, options = {}) {
    this.lastUpdateTime = performance.now();
    this.currentProgress = progress;

    const { isFinalization = false } = options;

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
      await this._renderScrubFrame(interpolationData, direction, isFinalization);

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
  async _renderScrubFrame(interpolationData, direction, isFinalization) {
    const { fromTree, toTree, timeFactor, fromIndex, toIndex } = interpolationData;

    // Use specialized scrubbing render mode
    const renderOptions = {
      highlightEdges: this._getHighlightEdges(fromIndex, toIndex),
      scrubMode: true,
      direction: direction,
      isFinalization: isFinalization,
      // Always render both extensions and labels during scrubbing for smooth position updates
      skipExtensions: false,  // Always render extensions so positions update during scrubbing
      skipLabels: false  // Always render labels so positions update during scrubbing
    };

    // Call optimized scrubbing render method with proper tree indices
    const enhancedOptions = {
      ...renderOptions,
      fromTreeIndex: fromIndex,
      toTreeIndex: toIndex
    };
    await this.treeController.renderScrubFrame(fromTree, toTree, timeFactor, enhancedOptions);
  }

  /**
   * Schedule throttled update to avoid overwhelming the renderer
   * @private
   */
  _scheduleThrottledUpdate(progress, options) {
    if (this.pendingUpdate) {
      cancelAnimationFrame(this.pendingUpdate);
    }

    this.pendingUpdate = requestAnimationFrame(async () => {
      await this._performScrubUpdate(progress, options);
      this.pendingUpdate = null;
    });
  }

  /**
   * Get interpolation data with caching optimization
   * @private
   */
  async _getInterpolationData(progress) {
    const cacheKey = Math.round(progress * 1000); // Cache at 0.1% precision

    if (this.interpolationCache.has(cacheKey)) {
      return this.interpolationCache.get(cacheKey);
    }

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

    const interpolationData = {
      fromTree: movieData.interpolated_trees[fromIndex],
      toTree: movieData.interpolated_trees[toIndex],
      timeFactor: timeFactor,
      fromIndex: fromIndex,
      toIndex: toIndex
    };

    // Cache the result
    this.interpolationCache.set(cacheKey, interpolationData);

    // Limit cache size
    if (this.interpolationCache.size > 100) {
      const firstKey = this.interpolationCache.keys().next().value;
      this.interpolationCache.delete(firstKey);
    }

    return interpolationData;
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
   * Get highlight edges for current interpolation position
   * @private
   */
  _getHighlightEdges(fromIndex, toIndex) {
    const { movieData } = useAppStore.getState();

    if (!movieData?.lattice_edge_tracking) {
      return [];
    }

    // Use the target tree index for highlighting
    const targetIndex = Math.round((fromIndex + toIndex) / 2);
    const latticeEdge = movieData.lattice_edge_tracking[targetIndex];

    return latticeEdge ? [latticeEdge] : [];
  }

  /**
   * Pre-cache nearby trees for smooth scrubbing performance
   * @private
   */
  async _precacheNearbyTrees(progress) {
    const { treeList, cacheTreePositions } = useAppStore.getState();

    if (!treeList) return;

    const totalTrees = treeList.length;
    const centerIndex = Math.round(progress * (totalTrees - 1));
    const cacheRadius = Math.min(5, Math.floor(totalTrees / 10)); // Cache 5 trees or 10% of total

    for (let offset = -cacheRadius; offset <= cacheRadius; offset++) {
      const treeIndex = centerIndex + offset;

      if (treeIndex >= 0 && treeIndex < totalTrees) {
        const treeData = treeList[treeIndex];

        if (treeData && !useAppStore.getState().getLayoutCache(treeIndex)) {
          // Calculate and cache layout for this tree using the correct method
          const layout = this.treeController.calculateLayout(treeData, {
            treeIndex: treeIndex,
            updateController: false
          });
          if (layout && cacheTreePositions) {
            cacheTreePositions(treeIndex, layout);
          }
        }
      }
    }
  }

  /**
   * Clean up elements created during scrubbing
   * @private
   */
  async _cleanupScrubbingElements() {
    // Remove temporary elements that were created only for scrubbing
    const cleanupPromises = [];

    // Clean up any temporary links
    if (this.scrubbingElements.links.size > 0) {
      cleanupPromises.push(this._cleanupElementType('links'));
    }

    // Clean up any temporary nodes
    if (this.scrubbingElements.nodes.size > 0) {
      cleanupPromises.push(this._cleanupElementType('nodes'));
    }

    await Promise.all(cleanupPromises);

    // Clear tracking sets
    Object.values(this.scrubbingElements).forEach(set => set.clear());
  }

  /**
   * Clean up specific element type
   * @private
   */
  async _cleanupElementType(elementType) {
    const elements = this.scrubbingElements[elementType];

    elements.forEach(elementKey => {
      switch (elementType) {
        case 'links':
          this.treeController.linkRenderer?.removeLinkByKey?.(elementKey);
          break;
        case 'nodes':
          this.treeController.nodeRenderer?.removeNodeByKey?.(elementKey);
          break;
        // Add other element types as needed
      }
    });
  }

  /**
   * Destroy the scrubber API and clean up resources
   */
  destroy() {
    if (this.isActive) {
      this.endScrubbing();
    }

    this.interpolationCache.clear();
    this.lastInterpolationState = null;
    this.treeController = null;
    this.transitionResolver = null;
  }
}
