import { useAppStore } from '../../state/phyloStore/store.js';
import { TimelineMathUtils } from '../math/TimelineMathUtils.js';

// ============================================================================
// HELPERS
// ============================================================================

const toSet = (v) => v instanceof Set ? v : new Set(v);

// ============================================================================
// SCRUBBER API
// ============================================================================

export class ScrubberAPI {
  constructor(treeController, transitionResolver, timelineManager = null) {
    this.treeController = treeController;
    this.transitionResolver = transitionResolver;
    this.timelineManager = timelineManager;
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
  }

  // ==========================================================================
  // SCRUB UPDATE
  // ==========================================================================

  async _performScrubUpdate(progress) {
    this.currentProgress = progress;
    try {
      const interpolationData = await this._getInterpolationData(progress);
      if (!interpolationData) return;

      const direction = useAppStore.getState().navigationDirection;
      const primaryTreeIndex = interpolationData.timeFactor < 0.5
        ? interpolationData.fromIndex
        : interpolationData.toIndex;

      useAppStore.getState().setTimelineProgress(progress, primaryTreeIndex);
      await this._renderScrubFrame(interpolationData, direction);

      this.lastInterpolationState = { progress, interpolationData, direction };
    } catch (error) { }
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
    const state = useAppStore.getState();
    const primaryTreeIndex = timeFactor < 0.5 ? fromIndex : toIndex;

    this._updateColorManagerForScrub(state, primaryTreeIndex);

    const options = {
      scrubMode: true,
      direction,
      fromTreeIndex: fromIndex,
      toTreeIndex: toIndex,
    };

    if (state.comparisonMode) {
      const anchors = state.transitionResolver.fullTreeIndices;
      options.comparisonMode = true;
      options.rightTreeIndex = anchors.find((i) => i > fromIndex) ?? anchors[anchors.length - 1];
    }

    await this.treeController.renderComparisonAwareScrubFrame(fromTree, toTree, timeFactor, options);
  }

  _updateColorManagerForScrub(state, treeIndex) {
    const { colorManager, pivotEdgesEnabled,
      getMarkedSubtreeData, getCurrentPivotEdge,
      getSubtreeHistoryData, updateColorManagerHistorySubtrees, markedSubtreesEnabled,
      getSourceDestinationEdgeData, updateColorManagerSourceDestinationEdges,
      getCurrentMovingSubtreeData, updateColorManagerMovingSubtree } = state;
    if (!colorManager) return;

    // Always update subtree data for dimming purposes
    // The markedSubtreesEnabled flag controls coloring, not the data availability
    colorManager.updateMarkedSubtrees(
      getMarkedSubtreeData(treeIndex).map(toSet)
    );
    colorManager.updatePivotEdge(
      pivotEdgesEnabled ? getCurrentPivotEdge(treeIndex) : []
    );
    if (updateColorManagerHistorySubtrees && getSubtreeHistoryData) {
      const history = markedSubtreesEnabled === false ? [] : getSubtreeHistoryData(treeIndex);
      updateColorManagerHistorySubtrees(history);
    }

    if (updateColorManagerSourceDestinationEdges && getSourceDestinationEdgeData) {
      const { source, dest } = getSourceDestinationEdgeData(treeIndex);
      updateColorManagerSourceDestinationEdges(source, dest);
    }

    if (updateColorManagerMovingSubtree && getCurrentMovingSubtreeData) {
      updateColorManagerMovingSubtree(getCurrentMovingSubtreeData(treeIndex));
    }
  }

  // ==========================================================================
  // INTERPOLATION DATA
  // ==========================================================================

  async _getInterpolationData(progress) {
    const { treeList, movieData } = useAppStore.getState();
    const timelineInterpolation = this.timelineManager?.getInterpolationDataForTimelineProgress?.(progress);

    if (timelineInterpolation) {
      return timelineInterpolation;
    }

    return TimelineMathUtils.getInterpolationDataForProgress(progress, treeList, movieData);
  }
}
