import { selectActiveTreeList, useAppStore } from '../../state/phyloStore/store.js';
import { detectAnimationStage } from '../deckgl/interpolation/stages/animationStageDetector.js';
import { applyStageEasing } from '../deckgl/interpolation/stages/stageEasing.js';
import { TransitionFrame } from '../../timeline/time/TransitionFrame.js';

/**
 * Handles the rendering of transition frames for animation and scrubbing.
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

    const transitionFrame = createRenderFrame(fromTreeData, toTreeData, timeFactor, options);
    const t = transitionFrame.isStatic ? 0 : transitionFrame.renderProgress;

    // Delegate to controller to fetch cached Layout Data
    const cachedInputs = this.controller._getOrCacheInterpolationData(
      transitionFrame.sourceTree,
      transitionFrame.targetTree,
      transitionFrame.sourceTreeIndex,
      transitionFrame.targetTreeIndex
    );
    const { dataFrom, dataTo } = cachedInputs;
    const transitionChangeModel = transitionFrame.transitionChangeModel || cachedInputs.transitionChangeModel;

    if (!dataFrom || !dataTo) return;

    // Perform Geometry Interpolation
    this.controller._syncInterpolatorRootAngle?.();
    const interpolatedData = this.controller.treeInterpolator.interpolateTreeData(
      dataFrom,
      dataTo,
      t,
      {
        stage: transitionFrame.stage,
        transitionChangeModel,
        rawTimeFactor: transitionFrame.transitionProgress,
        linkGeometryMode: this.controller._getLinkGeometryMode?.() ?? 'radial-elbow'
      }
    );
    interpolatedData.targetData = dataTo; // Add target data for movement arrow endpoints

    // Update Visuals
    this.controller._updateLayersEfficiently(interpolatedData);

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

    const { comparisonMode, rightTreeIndex } = options;
    const transitionFrame = createRenderFrame(fromTreeData, toTreeData, timeFactor, options);

    if (comparisonMode && typeof rightTreeIndex === 'number') {
      const rightTree = selectActiveTreeList(useAppStore.getState())[rightTreeIndex];

      if (rightTree) {
        // Build raw interpolation inputs for comparison renderer
        const interpolatedData = this.controller._buildInterpolatedData(
          transitionFrame.sourceTree,
          transitionFrame.targetTree,
          transitionFrame.renderProgress,
          transitionFrame.toRenderOptions(options)
        );
        await this.controller.layerManager.renderComparisonAnimated({
          interpolatedData,
          rightTree,
          rightIndex: rightTreeIndex,
          activeTreeIndex: transitionFrame.comparisonActiveTreeIndex
        });
        return;
      }
    }

    // Default to single view behavior
    await this.renderSingleInterpolatedFrame(
      transitionFrame.sourceTree,
      transitionFrame.targetTree,
      transitionFrame.renderProgress,
      transitionFrame.toRenderOptions(options)
    );
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
    const treeList = selectActiveTreeList(state);

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
    const transitionFrame = TransitionFrame.from({
      sourceTree: fromTree,
      targetTree: toTree,
      sourceTreeIndex: fromIndex,
      targetTreeIndex: toIndex,
      transitionProgress: t
    });

    // Stage detection logic for visual consistency during scrubbing
    // (We reuse the controller's logic to fetch cached layout data to check stages)
    const { dataFrom, dataTo, transitionChangeModel } = this.controller._getOrCacheInterpolationData(
      transitionFrame.sourceTree,
      transitionFrame.targetTree,
      transitionFrame.sourceTreeIndex,
      transitionFrame.targetTreeIndex
    );

    const stage = detectAnimationStage(dataFrom, dataTo, transitionChangeModel);
    const renderFrame = transitionFrame.withRenderState({
      renderProgress: applyStageEasing(t, stage),
      stage,
      transitionChangeModel
    });

    return this.renderSingleInterpolatedFrame(
      renderFrame.sourceTree,
      renderFrame.targetTree,
      renderFrame.renderProgress,
      renderFrame.toRenderOptions()
    );
  }

  /*
   * Render a weighted timeline progress value from the timeline subsystem.
   * This keeps scrubbed timeline positions distinct from the linear playback clock.
   */
  async renderTimelineProgress(progress) {
    if (!this.controller.ready) {
      await this.controller.readyPromise;
    }

    const state = useAppStore.getState();
    const transitionFrame = state.movieTimelineManager?.getTransitionFrameForTimelineProgress?.(progress);

    if (!transitionFrame?.sourceTree || !transitionFrame?.targetTree) {
      return;
    }

    if (transitionFrame.transitionProgress <= 0.001 || transitionFrame.isStatic) {
      return this.controller.renderAllElements({ treeIndex: transitionFrame.sourceTreeIndex });
    }

    const { dataFrom, dataTo, transitionChangeModel } = this.controller._getOrCacheInterpolationData(
      transitionFrame.sourceTree,
      transitionFrame.targetTree,
      transitionFrame.sourceTreeIndex,
      transitionFrame.targetTreeIndex
    );
    const stage = detectAnimationStage(dataFrom, dataTo, transitionChangeModel);
    const renderFrame = transitionFrame.withRenderState({
      renderProgress: applyStageEasing(transitionFrame.transitionProgress, stage),
      stage,
      transitionChangeModel
    });

    return this.renderSingleInterpolatedFrame(
      renderFrame.sourceTree,
      renderFrame.targetTree,
      renderFrame.renderProgress,
      renderFrame.toRenderOptions()
    );
  }
}

function createRenderFrame(fromTreeData, toTreeData, timeFactor, options = {}) {
  const transitionProgress = options.rawTimeFactor ?? timeFactor;
  return TransitionFrame.from({
    sourceTree: fromTreeData,
    targetTree: toTreeData,
    sourceTreeIndex: options.fromTreeIndex,
    targetTreeIndex: options.toTreeIndex,
    transitionProgress,
    holdKind: options.holdKind
  }, {
    renderProgress: timeFactor,
    stage: options.stage,
    transitionChangeModel: options.transitionChangeModel
  });
}
