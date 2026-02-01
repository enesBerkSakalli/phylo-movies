import { detectAnimationStage } from '../deckgl/interpolation/stages/animationStageDetector.js';
import { applyStageEasing } from '../deckgl/interpolation/stages/stageEasing.js';
import { calculatePlaybackState } from '../../domain/animation/AnimationTiming.js';

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
    updateProgress,
    stopAnimation,
    requestRedraw
  }) {
    // Dependencies
    this.getState = getState;
    this.getOrCacheInterpolationData = getOrCacheInterpolationData;
    this.renderSingleFrame = renderSingleFrame;
    this.renderComparisonFrame = renderComparisonFrame;
    this.setAnimationStage = setAnimationStage;
    this.updateProgress = updateProgress;
    this.stopAnimation = stopAnimation;
    this.requestRedraw = requestRedraw;

    // State4
    this.animationFrameId = null;
    this.isRunning = false;
    this._isRendering = false;
    this._lastAnimationStage = null;
    this._lastProgressSyncTime = 0;

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
    this.animationFrameId = requestAnimationFrame(this._onFrame);
  }

  /**
   * Stops the animation loop immediately.
   * Cancels any pending frame and prevents async renders from committing.
   */
  stop() {
    this.isRunning = false;
    this._isRendering = false; // Reset lock
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * The core pacing loop.
   * Ensures one render completes before the next is scheduled.
   * @param {number} timestamp - Provided by requestAnimationFrame
   */
  async _onFrame(timestamp) {
    // 1. Safety Check: If stopped or paused externally, exit.
    if (!this.isRunning) return;

    const { playing } = this.getState();
    if (!playing) {
      this.stop();
      return;
    }

    // 2. Overlap Protection: Skip this rAF if previous render is still working.
    // This allows the loop to "wait" for heavy renders without stacking frames.
    if (this._isRendering) {
      this.animationFrameId = requestAnimationFrame(this._onFrame);
      return;
    }

    this._isRendering = true;

    try {
      const shouldStop = await this._processFrame(timestamp);

      if (shouldStop) {
        this.stopAnimation(); // Dispatch 'playing: false' to store
        this.stop();          // Stop local loop
        return;
      }

      // 3. Render Request: Mark as dirty for deck.gl
      this.requestRedraw();

    } catch (err) {
      console.error('[AnimationRunner] Frame error:', err);
      // On critical error, stop to prevent log spam
      this.stop();
      this.stopAnimation();
    } finally {
      this._isRendering = false;

      // 4. Schedule Next: Only AFTER work is done (prevents "Spiral of Death")
      if (this.isRunning) {
        this.animationFrameId = requestAnimationFrame(this._onFrame);
      }
    }
  }

  /**
   * Processes a single frame: Calculations -> Data Fetch -> Render -> Side Effects
   */
  async _processFrame(timestamp) {
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

    // Note: getOrCacheInterpolationData signature mismatch in previous thought?
    // User code passed 4 args: (fromTree, toTree, fromIndex, toIndex)
    const { dataFrom, dataTo } = this.getOrCacheInterpolationData(fromTree, toTree, fromIndex, toIndex);

    // 3. Robustness: Missing Data Policy
    if (!dataFrom || !dataTo) {
      // Return false to continue loop (seeking past gaps), unless finished
      return isFinished;
    }

    // 4. Stage Detection & Side Effects
    const stage = detectAnimationStage(dataFrom, dataTo);
    this._syncStore(timestamp, progress, stage, isFinished);

    // 5. Easing & Render
    // Check running state again before expensive async render/interpolation
    if (!this.isRunning) return isFinished;

    const easedT = applyStageEasing(localT, stage);

    await this._render(state, fromTree, toTree, easedT, fromIndex, toIndex);

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

  async _render(state, fromTree, toTree, easedT, fromIndex, toIndex) {
    if (state.comparisonMode) {
      const rightParams = getComparisonTarget(state, fromIndex, toIndex);
      // Only render comparison if we have a valid right tree
      if (rightParams) {
        await this.renderComparisonFrame(fromTree, toTree, easedT, {
          fromTreeIndex: fromIndex,
          toTreeIndex: toIndex,
          ...rightParams
        });
      }
    } else {
      await this.renderSingleFrame(fromTree, toTree, easedT, {
        fromTreeIndex: fromIndex,
        toTreeIndex: toIndex
      });
    }
  }
}

// --- Pure Helper Functions ---

/**
 * Extracts and calculates basic timing info
 */
function getPlaybackState(state, timestamp) {
  const { animationStartTime, animationSpeed, treeList } = state;
  // Guard: Invalid config
  if (!animationStartTime || !treeList || treeList.length === 0) return null;

  return calculatePlaybackState({
    timestamp,
    startTime: animationStartTime,
    speed: animationSpeed,
    totalItems: treeList.length
  });
}

/**
 * Determines which tree list to use (Standard vs Movie mode)
 */
function getActiveTreeSequence(state) {
  // Prefer the TreeList model if available
  return state.treeList || state.movieData?.interpolated_trees;
}

/**
 * Access a tree from the sequence, handling both TreeList model and Array
 */
function getTreeFromSequence(sequence, index) {
  if (!sequence) return null;
  // If it's a TreeList model (has .get method), use it
  if (sequence instanceof Object && 'get' in sequence && typeof sequence.get === 'function') {
    return sequence.get(index);
  }
  // Otherwise treat as array
  return sequence[index];
}

/**
 * Encapsulates logic for finding the comparison tree
 */
function getComparisonTarget(state, fromIndex, toIndex) {
  const { transitionResolver, movieData } = state;
  const full = Array.isArray(transitionResolver?.fullTreeIndices) ? transitionResolver.fullTreeIndices : [];

  // Find the next full tree in the sequence to compare against
  const rightIdx = full.find((i) => i > fromIndex) ?? full[full.length - 1] ?? toIndex;
  const rightTree = movieData?.interpolated_trees?.[rightIdx];

  return rightTree ? { rightTree, rightTreeIndex: rightIdx } : null;
}
