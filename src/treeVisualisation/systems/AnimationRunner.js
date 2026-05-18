import { detectAnimationStage } from '../deckgl/interpolation/stages/animationStageDetector.js';
import { applyStageEasing } from '../deckgl/interpolation/stages/stageEasing.js';
import {
  calculatePlaybackState,
  resolveTransitionSemanticIndex
} from '../../domain/animation/AnimationTiming.js';
import { selectActiveTreeList } from '../../state/phyloStore/selectors/treeSelectors.js';

/**
 * AnimationRunner
 *
 * Orchestrates the high-frequency animation loop for the tree visualization.
 * It decouples "Game Time" (AnimationTiming.js) from "Render Time" (deck.gl),
 * allowing the animation to maintain correct pacing even if rendering drifts.
 *
 * Performance Note:
 * This class uses a "pacing loop" rather than a blind requestAnimationFrame loop.
 * If rendering takes > 16ms, it awaits completion before scheduling the next frame,
 * effectively dropping FPS to match render speed rather than stacking frames.
 */
export class AnimationRunner {
  constructor({
    getState,
    getOrCacheInterpolationData,
    renderSingleFrame,
    renderComparisonFrame,
    setAnimationStage,
    syncHighlightsForIndex = () => {},
    updateProgress,
    stopAnimation
  }) {
    // Dependencies
    this.getState = getState;
    this.getOrCacheInterpolationData = getOrCacheInterpolationData;
    this.renderSingleFrame = renderSingleFrame;
    this.renderComparisonFrame = renderComparisonFrame;
    this.setAnimationStage = setAnimationStage;
    this.syncHighlightsForIndex = syncHighlightsForIndex;
    this.updateProgress = updateProgress;
    this.stopAnimation = stopAnimation;

    // State
    this.animationFrameId = null;
    this.isRunning = false;
    this._isRendering = false;
    this._runToken = 0;
    this._lastAnimationStage = null;
    this._lastProgressSyncTime = 0;

    // Performance optimization: Cache stage detection to avoid O(N) set building every frame
    this._stageCache = {
      fromIndex: -1,
      toIndex: -1,
      fromLayoutCacheKey: null,
      toLayoutCacheKey: null,
      transitionChangeModel: null,
      stage: null
    };

    // Bind loop to preserve 'this' context
    this._onFrame = this._onFrame.bind(this);
  }

  /**
   * Starts the animation loop.
   * Idempotent: Calling start() while running has no effect.
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this._runToken += 1;
    this._scheduleFrame(this._runToken);
  }

  /**
   * Stops the animation loop immediately.
   * Cancels any pending frame and invalidates stale frame callbacks.
   */
  stop() {
    this.isRunning = false;
    this._runToken += 1;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  _scheduleFrame(runToken) {
    this.animationFrameId = requestAnimationFrame((timestamp) => this._onFrame(timestamp, runToken));
  }

  /**
   * The core pacing loop.
   * Ensures one render completes before the next is scheduled.
   * @param {number} timestamp - Provided by requestAnimationFrame
   */
  async _onFrame(timestamp, runToken = this._runToken) {
    // 1. Safety Check: If stopped or paused externally, exit.
    if (!this.isRunning || runToken !== this._runToken) return;

    const { playing } = this.getState();
    if (!playing) {
      this.stop();
      return;
    }

    // 2. Overlap Protection: Skip this rAF if previous render is still working.
    // This allows the loop to "wait" for heavy renders without stacking frames.
    if (this._isRendering) {
      this._scheduleFrame(runToken);
      return;
    }

    this._isRendering = true;

    try {
      const shouldStop = await this._processFrame(timestamp, runToken);

      if (!this.isRunning || runToken !== this._runToken) {
        return;
      }

      if (shouldStop) {
        this.stopAnimation(); // Dispatch 'playing: false' to store
        this.stop();          // Stop local loop
        return;
      }

    } catch (err) {
      if (runToken !== this._runToken) return;
      console.error('[AnimationRunner] Frame error:', err);
      // On critical error, stop to prevent log spam
      this.stop();
      this.stopAnimation();
    } finally {
      this._isRendering = false;

      // 4. Schedule Next: Only AFTER work is done (prevents "Spiral of Death")
      if (this.isRunning && runToken === this._runToken) {
        this._scheduleFrame(runToken);
      }
    }
  }

  /**
   * Processes a single frame: Calculations -> Data Fetch -> Render -> Side Effects
   */
  async _processFrame(timestamp, runToken = this._runToken) {
    const state = this.getState();

    // 1. Timing Calculation (Pure)
    const playback = getPlaybackState(state, timestamp);
    if (!playback) return true; // Stop if invalid config

    const { progress, isFinished, fromIndex, toIndex, localT } = playback;

    // 2. Data Access
    const trees = getActiveTreeSequence(state);
    const fromTree = trees[fromIndex];
    const toTree = trees[toIndex];

    if (!fromTree) return true; // End of list safety

    const { dataFrom, dataTo, transitionChangeModel } = this.getOrCacheInterpolationData(fromTree, toTree, fromIndex, toIndex);

    // 3. Robustness: Missing Data Policy
    if (!dataFrom || !dataTo) {
      // Return false to continue loop (seeking past gaps), unless finished
      return isFinished;
    }

    // 4. Stage Detection & Side Effects
    // OPTIMIZATION: Check cache first. This prevents iterating thousands of nodes 60 times/sec.
    let stage;
    const fromLayoutCacheKey = dataFrom.layoutCacheKey ?? null;
    const toLayoutCacheKey = dataTo.layoutCacheKey ?? null;
    if (
      this._stageCache.fromIndex === fromIndex &&
      this._stageCache.toIndex === toIndex &&
      this._stageCache.fromLayoutCacheKey === fromLayoutCacheKey &&
      this._stageCache.toLayoutCacheKey === toLayoutCacheKey &&
      this._stageCache.transitionChangeModel === transitionChangeModel
    ) {
      stage = this._stageCache.stage;
    } else {
      stage = detectAnimationStage(dataFrom, dataTo, transitionChangeModel);
      this._stageCache = {
        fromIndex,
        toIndex,
        fromLayoutCacheKey,
        toLayoutCacheKey,
        transitionChangeModel,
        stage
      };
    }

    this._syncStore(timestamp, progress, stage, isFinished);
    this.syncHighlightsForIndex(resolveTransitionSemanticIndex(fromIndex, toIndex, localT));

    // 5. Easing & Render
    // Check running state again before expensive async render/interpolation.
    if (!this.isRunning || runToken !== this._runToken) return isFinished;

    const easedT = applyStageEasing(localT, stage);

    await this._render(state, fromTree, toTree, easedT, fromIndex, toIndex, stage, localT);

    return isFinished;
  }

  _syncStore(timestamp, progress, stage, isFinished) {
    // Throttle progress updates to ~10fps
    if (isFinished || timestamp - this._lastProgressSyncTime > 100) {
      this.updateProgress(progress);
      this._lastProgressSyncTime = timestamp;
    }

    // Update Stage only on change
    if (stage !== this._lastAnimationStage) {
      this.setAnimationStage(stage);
      this._lastAnimationStage = stage;
    }
  }

  async _render(state, fromTree, toTree, easedT, fromIndex, toIndex, stage, rawTimeFactor = easedT) {
    if (state.comparisonMode) {
      const rightParams = getComparisonTarget(state, fromIndex, toIndex);
      // Only render comparison if we have a valid right tree
      if (rightParams) {
        await this.renderComparisonFrame(fromTree, toTree, easedT, {
          fromTreeIndex: fromIndex,
          toTreeIndex: toIndex,
          stage,
          rawTimeFactor,
          ...rightParams
        });
      }
    } else {
      await this.renderSingleFrame(fromTree, toTree, easedT, {
        fromTreeIndex: fromIndex,
        toTreeIndex: toIndex,
        stage,
        rawTimeFactor
      });
    }
  }
}

// --- Pure Helper Functions ---

/**
 * Extracts and calculates basic timing info
 */
function getPlaybackState(state, timestamp) {
  const { animationStartTime, animationSpeed, transitionDuration, pauseDuration } = state;
  const treeList = selectActiveTreeList(state);
  // Guard: Invalid config
  if (!animationStartTime || !treeList || treeList.length === 0) return null;

  return calculatePlaybackState({
    timestamp,
    startTime: animationStartTime,
    speed: animationSpeed,
    totalItems: treeList.length,
    transitionDuration,
    pauseDuration
  });
}

/**
 * Determines which tree list to use (Standard vs Movie mode)
 */
function getActiveTreeSequence(state) {
  return selectActiveTreeList(state);
}

/**
 * Encapsulates logic for finding the comparison tree
 */
function getComparisonTarget(state, fromIndex, toIndex) {
  const { transitionResolver } = state;
  const treeList = selectActiveTreeList(state);
  const full = Array.isArray(transitionResolver?.fullTreeIndices) ? transitionResolver.fullTreeIndices : [];

  // Find the next full tree in the sequence to compare against
  const rightIdx = full.find((i) => i > fromIndex) ?? full[full.length - 1] ?? toIndex;
  const rightTree = treeList[rightIdx];

  return rightTree ? { rightTree, rightTreeIndex: rightIdx } : null;
}
