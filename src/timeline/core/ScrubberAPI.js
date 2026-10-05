import { selectInputFrameIndices } from '../../state/phyloStore/selectors/treeSelectors.js';

// ============================================================================
// SCRUBBER API
// ============================================================================

export class ScrubberAPI {
  constructor(treeController, timelineManager = null, store) {
    this.treeController = treeController;
    this.timelineManager = timelineManager;
    this.store = store;
    this.currentMs = 0;
    this.lastTransitionState = null;
    this.pendingMs = null;
    this.processingPromise = null;
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  async startScrubbing(movieTimeMs) {
    this.currentMs = movieTimeMs ?? 0;
    this.lastTransitionState = null;
    this.pendingMs = null;
  }

  async updatePosition(movieTimeMs) {
    this.currentMs = movieTimeMs;
    this.pendingMs = movieTimeMs;
    await this._flushPendingUpdates();
  }

  async endScrubbing(finalMs = null) {
    if (finalMs !== null) {
      if (finalMs !== this.currentMs || this.pendingMs !== null) {
        this.currentMs = finalMs;
        this.pendingMs = finalMs;
        await this._flushPendingUpdates();
      }
    } else if (this.processingPromise) {
      await this.processingPromise;
    }

    const snapshot = this.lastTransitionState;
    this.lastTransitionState = null;
    this.pendingMs = null;
    return snapshot;
  }

  destroy() {
    this.lastTransitionState = null;
    this.pendingMs = null;
    this.processingPromise = null;
    this.treeController = null;
    this.store = null;
  }

  // ==========================================================================
  // SCRUB UPDATE
  // ==========================================================================

  async _performScrubUpdate(movieTimeMs) {
    this.currentMs = movieTimeMs;
    try {
      const transitionFrame = this.timelineManager?.frameAt?.(movieTimeMs);
      if (!transitionFrame) return;

      this.store.getState().seek(movieTimeMs);
      await this._renderScrubFrame(transitionFrame);

      this.lastTransitionState = { movieTimeMs, transitionFrame };
    } catch (error) {
      console.error('[ScrubberAPI] Scrub update failed:', {
        movieTimeMs,
        error,
      });
    }
  }

  async _flushPendingUpdates() {
    if (this.processingPromise) {
      return this.processingPromise;
    }

    this.processingPromise = (async () => {
      while (this.pendingMs !== null && this.treeController) {
        const nextMs = this.pendingMs;
        this.pendingMs = null;
        await this._performScrubUpdate(nextMs);
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

  async _renderScrubFrame(transitionFrame) {
    const state = this.store.getState();
    if (!transitionFrame.sourceTree || !transitionFrame.targetTree) return;

    state.updateColorManagerForIndex?.(transitionFrame.highlightTreeIndex);

    const options = transitionFrame.toRenderOptions({
      scrubMode: true,
    });

    if (state.comparisonMode) {
      const inputTreeIndices = selectInputFrameIndices(state);
      options.comparisonMode = true;
      options.rightTreeIndex =
        inputTreeIndices.find((i) => i > transitionFrame.sourceTreeIndex) ??
        inputTreeIndices[inputTreeIndices.length - 1];
    }

    await this.treeController.renderComparisonAwareScrubFrame(
      transitionFrame.sourceTree,
      transitionFrame.targetTree,
      transitionFrame.renderProgress,
      options
    );
  }
}
