import { TimelineMathUtils } from '../math/TimelineMathUtils.js';

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
    this.lastTransitionState = null;
    this.pendingProgress = null;
    this.processingPromise = null;
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  async startScrubbing(progress) {
    this.currentProgress = TimelineMathUtils.clampProgress(progress ?? 0);
    this.lastTransitionState = null;
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

    const snapshot = this.lastTransitionState;
    this.lastTransitionState = null;
    this.pendingProgress = null;
    return snapshot;
  }

  destroy() {
    this.lastTransitionState = null;
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
      const transitionFrame = await this._getTransitionFrame(progress);
      if (!transitionFrame) return;

      const state = this.store.getState();
      const direction = state.navigationDirection;

      state.setTimelineProgress(progress, transitionFrame.cursorTreeIndex);
      await this._renderScrubFrame(transitionFrame, direction);

      this.lastTransitionState = { progress, transitionFrame, direction };
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

  async _renderScrubFrame(transitionFrame, direction) {
    const state = this.store.getState();

    state.updateColorManagerForIndex?.(transitionFrame.highlightTreeIndex);

    const options = transitionFrame.toRenderOptions({
      scrubMode: true,
      direction
    });

    if (state.comparisonMode) {
      const inputTreeIndices = this.transitionResolver?.fullTreeIndices ?? [];
      options.comparisonMode = true;
      options.rightTreeIndex = inputTreeIndices.find((i) => i > transitionFrame.sourceTreeIndex) ?? inputTreeIndices[inputTreeIndices.length - 1];
    }

    await this.treeController.renderComparisonAwareScrubFrame(
      transitionFrame.sourceTree,
      transitionFrame.targetTree,
      transitionFrame.renderProgress,
      options
    );
  }
  // ==========================================================================
  // TRANSITION FRAME
  // ==========================================================================

  async _getTransitionFrame(progress) {
    if (!this.timelineManager) {
      return null;
    }

    return this.timelineManager.getTransitionFrameForTimelineProgress(progress);
  }
}
