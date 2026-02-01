import { useAppStore } from '../../core/store.js';
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
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  async startScrubbing(progress) {
    this.currentProgress = TimelineMathUtils.clampProgress(progress ?? 0);
    this.lastInterpolationState = null;
  }

  async updatePosition(progress) {
    await this._performScrubUpdate(TimelineMathUtils.clampProgress(progress));
  }

  async endScrubbing(finalProgress = null) {
    if (finalProgress !== null) {
      const clamped = TimelineMathUtils.clampProgress(finalProgress);
      if (Math.abs(clamped - this.currentProgress) > 1e-6) {
        await this._performScrubUpdate(clamped);
      }
    }
    const snapshot = this.lastInterpolationState;
    this.lastInterpolationState = null;
    return snapshot;
  }

  destroy() {
    this.lastInterpolationState = null;
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
      await this._renderScrubFrame(interpolationData, direction);

      this.lastInterpolationState = { progress, interpolationData, direction };
    } catch (error) { }
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
    const { colorManager, activeChangeEdgesEnabled,
      getMarkedSubtreeData, getCurrentActiveChangeEdge,
      getSubtreeHistoryData, updateColorManagerHistorySubtrees, markedSubtreesEnabled,
      getSourceDestinationEdgeData, updateColorManagerSourceDestinationEdges,
      getCurrentMovingSubtreeData, updateColorManagerMovingSubtree } = state;
    if (!colorManager) return;

    // Always update subtree data for dimming purposes
    // The markedSubtreesEnabled flag controls coloring, not the data availability
    colorManager.updateMarkedSubtrees(
      getMarkedSubtreeData(treeIndex).map(toSet)
    );
    colorManager.updateActiveChangeEdge(
      activeChangeEdgesEnabled ? getCurrentActiveChangeEdge(treeIndex) : []
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
    const segments = this.timelineManager?.segments;
    const timelineData = this.timelineManager?.timelineData;

    if (segments?.length && timelineData?.totalDuration > 0) {
      return this._getSegmentAwareInterpolation(progress, segments, timelineData, movieData);
    }
    return TimelineMathUtils.getInterpolationDataForProgress(progress, treeList, movieData);
  }

  _getSegmentAwareInterpolation(progress, segments, timelineData, movieData) {
    const { totalDuration, segmentDurations, cumulativeDurations } = timelineData;
    const currentTime = TimelineMathUtils.progressToTime(progress, totalDuration);
    const segIndex = TimelineMathUtils._binarySearchSegment(cumulativeDurations, currentTime);
    const segment = segments[segIndex];

    if (!segment) return this._createStaticResult(0, movieData);

    if (segment.isFullTree || !segment.hasInterpolation) {
      return this._createStaticResult(segment.interpolationData[0].originalIndex, movieData);
    }

    const steps = segment.interpolationData.length;
    if (steps <= 1) {
      return this._createStaticResult(segment.interpolationData[0].originalIndex, movieData);
    }

    const segStart = segIndex > 0 ? cumulativeDurations[segIndex - 1] : 0;
    const localProgress = (currentTime - segStart) / segmentDurations[segIndex];
    const exactStep = localProgress * (steps - 1);
    const fromStep = Math.floor(exactStep);
    const toStep = Math.min(fromStep + 1, steps - 1);

    return {
      fromTree: movieData.interpolated_trees[segment.interpolationData[fromStep].originalIndex],
      toTree: movieData.interpolated_trees[segment.interpolationData[toStep].originalIndex],
      timeFactor: exactStep - fromStep,
      fromIndex: segment.interpolationData[fromStep].originalIndex,
      toIndex: segment.interpolationData[toStep].originalIndex
    };
  }

  _createStaticResult(idx, movieData) {
    const tree = movieData.interpolated_trees[idx];
    return { fromTree: tree, toTree: tree, timeFactor: 0, fromIndex: idx, toIndex: idx };
  }
}
