import { useAppStore } from '@/store/store.js';
import { detectAnimationStage } from '@/core/treeVisualisation/deckgl/interpolation/stages/animationStageDetector.js';
import { applyStageEasing } from '@/core/treeVisualisation/deckgl/interpolation/stages/stageEasing.js';
import { calculateMetricScale } from '@/core/treeVisualisation/viewport/ViewportGeometryService.js';

/**
 * Handles the rendering of interpolated frames for animation and scrubbing.
 * Coordinates between InterpolationCache, TreeInterpolator, and Deck/Layer Managers.
 */
export class InterpolationRenderer {
  constructor(controller) {
    this.controller = controller;
  }

  // ==========================================================================
  // INTERPOLATION DATA ASSEMBLY
  // ==========================================================================

  getOrCacheInterpolationData(fromTreeData, toTreeData, fromTreeIndex, toTreeIndex) {
    const { dataFrom, dataTo } = this.controller.interpolationCache.getOrCacheInterpolationData(
      fromTreeData,
      toTreeData,
      fromTreeIndex,
      toTreeIndex
    );

    if (!dataFrom || !dataTo) {
      console.warn('[InterpolationRenderer] Layout calculation failed, skipping frame');
      return { dataFrom: null, dataTo: null };
    }

    return { dataFrom, dataTo };
  }

  buildInterpolatedData(fromTreeData, toTreeData, t, options = {}) {
    const { fromTreeIndex, toTreeIndex } = options;
    const { dataFrom, dataTo } = this.controller.interpolationCache.buildInterpolationInputs(
      fromTreeData,
      toTreeData,
      fromTreeIndex,
      toTreeIndex
    );

    if (!dataFrom || !dataTo) {
      console.warn('[InterpolationRenderer] Layout calculation failed in buildInterpolatedData, returning empty substitute');
      return { nodes: [], links: [], labels: [], extensions: [] };
    }

    const { branchTransformation } = useAppStore.getState();
    const interpolatedData = this.controller.treeInterpolator.interpolateTreeData(dataFrom, dataTo, t, branchTransformation);

    // --- Adaptive Visual Scaling ---
    interpolatedData.metricScale = calculateMetricScale(
      dataFrom.max_radius,
      dataTo.max_radius,
      t,
      this.controller.width,
      this.controller.height
    );

    return interpolatedData;
  }

  // ==========================================================================
  // RENDERING
  // ==========================================================================

  /*
   * Renders a single interpolated frame between two trees.
   */
  async renderSingleInterpolatedFrame(fromTreeData, toTreeData, timeFactor, options = {}) {
    if (!this.controller.ready) {
      await this.controller.readyPromise;
    }

    const { fromTreeIndex, toTreeIndex, stage } = options;
    let t = Math.max(0, Math.min(1, timeFactor));
    if (fromTreeData === toTreeData) t = 0;

    // Delegate to interpolation cache to fetch Layout Data
    const { dataFrom, dataTo } = this.getOrCacheInterpolationData(
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
      branchTransformation,
      stage
    );
    interpolatedData.targetData = dataTo; // Add target data for movement arrow endpoints

    // Update Visuals
    this.controller._updateLayersEfficiently(interpolatedData);
    this.controller.viewportManager.updateScreenPositions(interpolatedData.nodes, this.controller.viewSide);

    // NOTE: Auto-fit during playback is intentionally disabled here.
    // Fitting every interpolation frame causes camera "jumping" that disrupts the viewing experience.
    // Auto-fit should only happen on discrete tree changes (next/prev buttons) or when playback starts,
    // NOT on every animation frame. The bounding box changes subtly during interpolation
    // and constant refitting makes the camera fight against user interaction.
    //
    // If auto-fit on tree change is needed, it should be triggered:
    // - At the START of playback (once)
    // - When user manually navigates to a new tree (not during animation)
    // - In StaticRenderer for discrete jumps
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
        const interpolatedData = this.buildInterpolatedData(fromTreeData, toTreeData, timeFactor, options);
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
    const { dataFrom, dataTo } = this.getOrCacheInterpolationData(fromTree, toTree, fromIndex, toIndex);

    const stage = detectAnimationStage(dataFrom, dataTo);
    t = applyStageEasing(t, stage);

    return this.renderSingleInterpolatedFrame(fromTree, toTree, t, {
      fromTreeIndex: fromIndex,
      toTreeIndex: toIndex,
      stage
    });
  }
}
