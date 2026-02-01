import { useAppStore } from '../../core/store.js';
import { detectAnimationStage } from '../deckgl/interpolation/stages/animationStageDetector.js';
import { applyStageEasing } from '../deckgl/interpolation/stages/stageEasing.js';

/**
 * Handles the rendering of interpolated frames for animation and scrubbing.
 * Coordinates between InterpolationCache, TreeInterpolator, and Deck/Layer Managers.
 */
export class InterpolationRenderer {
  constructor(controller) {
    this.controller = controller;
  }

  /*
   * Renders a single interpolated frame between two trees.
   */
  async renderSingleInterpolatedFrame(fromTreeData, toTreeData, timeFactor, options = {}) {
    if (!this.controller.ready) {
      await this.controller.readyPromise;
    }

    const { fromTreeIndex, toTreeIndex } = options;
    let t = Math.max(0, Math.min(1, timeFactor));
    if (fromTreeData === toTreeData) t = 0;

    // Delegate to controller to fetch cached Layout Data
    const { dataFrom, dataTo } = this.controller._getOrCacheInterpolationData(
      fromTreeData,
      toTreeData,
      fromTreeIndex,
      toTreeIndex
    );

    if (!dataFrom || !dataTo) return;

    // Perform Geometry Interpolation
    const { branchTransformation } = useAppStore.getState();
    const interpolatedData = this.controller.treeInterpolator.interpolateTreeData(
      dataFrom,
      dataTo,
      t,
      branchTransformation
    );
    interpolatedData.targetData = dataTo; // Add target data for movement arrow endpoints

    // Update Visuals
    this.controller._updateLayersEfficiently(interpolatedData);
    this.controller.viewportManager.updateScreenPositions(interpolatedData.nodes, this.controller.viewSide);
  }

  /*
   * Handles scrubbing interactions, respecting Comparison Mode if active.
   */
  async renderComparisonAwareScrubFrame(fromTreeData, toTreeData, timeFactor, options = {}) {
    if (!this.controller.ready) {
      await this.controller.readyPromise;
    }

    const { comparisonMode, rightTreeIndex, fromTreeIndex } = options;

    if (comparisonMode && typeof rightTreeIndex === 'number') {
      const { movieData } = useAppStore.getState();
      const rightTree = movieData?.interpolated_trees?.[rightTreeIndex];

      if (rightTree) {
        // Build raw interpolation inputs for comparison renderer
        const interpolatedData = this.controller._buildInterpolatedData(fromTreeData, toTreeData, timeFactor, options);
        await this.controller.layerManager.renderComparisonAnimated({
          interpolatedData,
          rightTree,
          rightIndex: rightTreeIndex,
          leftIndex: fromTreeIndex
        });
        return;
      }
    }

    // Default to single view behavior
    await this.renderSingleInterpolatedFrame(fromTreeData, toTreeData, timeFactor, options);
  }

  /*
   * High-level entry point for scrubbing to a specific progress (0.0 - 1.0).
   * Handles tree index calculation, casing, and stage detection.
   */
  async renderProgress(progress) {
    if (!this.controller.ready) {
      await this.controller.readyPromise;
    }

    const state = useAppStore.getState();
    const treeList = state.movieData?.interpolated_trees || state.treeList;

    if (!treeList || treeList.length === 0) return;

    const totalTrees = treeList.length;

    // Safety check for single tree
    if (totalTrees === 1) {
      return this.controller.renderAllElements({ treeIndex: 0 });
    }

    const exactTreeIndex = progress * (totalTrees - 1);
    const fromIndex = Math.floor(exactTreeIndex);
    const toIndex = Math.min(fromIndex + 1, totalTrees - 1);
    let t = exactTreeIndex - fromIndex;

    // Optimization: Snap to nearest integer if very close, avoiding interpolation overhead
    if (t <= 0.001 || fromIndex === toIndex) {
      const snapIndex = Math.round(exactTreeIndex);
      return this.controller.renderAllElements({ treeIndex: snapIndex });
    }

    // Get tree data
    const fromTree = treeList[fromIndex];
    const toTree = treeList[toIndex];

    // Stage detection logic for visual consistency during scrubbing
    // (We reuse the controller's logic to fetch cached layout data to check stages)
    const { dataFrom, dataTo } = this.controller._getOrCacheInterpolationData(fromTree, toTree, fromIndex, toIndex);

    const stage = detectAnimationStage(dataFrom, dataTo);
    t = applyStageEasing(t, stage);

    return this.renderSingleInterpolatedFrame(fromTree, toTree, t, {
      fromTreeIndex: fromIndex,
      toTreeIndex: toIndex
    });
  }
}
