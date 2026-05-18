import { TimelineMathUtils } from '../math/TimelineMathUtils.js';
import { resolveTransitionSemanticIndex } from '../../domain/animation/AnimationTiming.js';

// ============================================================================
// SCRUBBER API
// ============================================================================

export class ScrubberAPI {
  constructor(treeController, transitionResolver, timelineManager = null, store) {
    this.treeController = treeController;
    this.transitionResolver = transitionResolver;
    this.timelineManager = timelineManager;
    this.store = store;
    this.currentProgress = 0;
    this.lastInterpolationState = null;
    this.pendingProgress = null;
    this.processingPromise = null;
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  async startScrubbing(progress) {
    this.currentProgress = TimelineMathUtils.clampProgress(progress ?? 0);
    this.lastInterpolationState = null;
    this.pendingProgress = null;
  }

  async updatePosition(progress) {
    const clampedProgress = TimelineMathUtils.clampProgress(progress);
    this.currentProgress = clampedProgress;
    this.pendingProgress = clampedProgress;
    await this._flushPendingUpdates();
  }

  async endScrubbing(finalProgress = null) {
    if (finalProgress !== null) {
      const clamped = TimelineMathUtils.clampProgress(finalProgress);
      if (Math.abs(clamped - this.currentProgress) > 1e-6 || this.pendingProgress !== null) {
        this.currentProgress = clamped;
        this.pendingProgress = clamped;
        await this._flushPendingUpdates();
      }
    } else if (this.processingPromise) {
      await this.processingPromise;
    }

    const snapshot = this.lastInterpolationState;
    this.lastInterpolationState = null;
    this.pendingProgress = null;
    return snapshot;
  }

  destroy() {
    this.lastInterpolationState = null;
    this.pendingProgress = null;
    this.processingPromise = null;
    this.treeController = null;
    this.transitionResolver = null;
    this.store = null;
  }

  // ==========================================================================
  // SCRUB UPDATE
  // ==========================================================================

  async _performScrubUpdate(progress) {
    this.currentProgress = progress;
    try {
      const interpolationData = await this._getInterpolationData(progress);
      if (!interpolationData) return;

      const state = this.store.getState();
      const direction = state.navigationDirection;
      const primaryTreeIndex = interpolationData.timeFactor < 0.5
        ? interpolationData.fromIndex
        : interpolationData.toIndex;

      state.setTimelineProgress(progress, primaryTreeIndex);
      await this._renderScrubFrame(interpolationData, direction);

      this.lastInterpolationState = { progress, interpolationData, direction };
    } catch (error) {
      console.error('[ScrubberAPI] Scrub update failed:', {
        progress,
        error
      });
    }
  }

  async _flushPendingUpdates() {
    if (this.processingPromise) {
      return this.processingPromise;
    }

    this.processingPromise = (async () => {
      while (this.pendingProgress !== null && this.treeController) {
        const nextProgress = this.pendingProgress;
        this.pendingProgress = null;
        await this._performScrubUpdate(nextProgress);
      }
    })();

    try {
      await this.processingPromise;
    } finally {
      this.processingPromise = null;
    }
  }

  // ==========================================================================
  // RENDERING
  // ==========================================================================

  async _renderScrubFrame(interpolationData, direction) {
    const { fromTree, toTree, timeFactor, fromIndex, toIndex } = interpolationData;
    const state = this.store.getState();
    const semanticTreeIndex = resolveTransitionSemanticIndex(fromIndex, toIndex, timeFactor);

    state.updateColorManagerForIndex?.(semanticTreeIndex);

    const options = {
      scrubMode: true,
      direction,
      fromTreeIndex: fromIndex,
      toTreeIndex: toIndex,
    };

    if (state.comparisonMode) {
      const anchors = this.transitionResolver?.fullTreeIndices ?? [];
      options.comparisonMode = true;
      options.rightTreeIndex = anchors.find((i) => i > fromIndex) ?? anchors[anchors.length - 1];
    }

    await this.treeController.renderComparisonAwareScrubFrame(fromTree, toTree, timeFactor, options);
  }
  // ==========================================================================
  // INTERPOLATION DATA
  // ==========================================================================

  async _getInterpolationData(progress) {
    if (!this.timelineManager) {
      return null;
    }

    return this.timelineManager.getInterpolationDataForTimelineProgress(progress);
  }
}
