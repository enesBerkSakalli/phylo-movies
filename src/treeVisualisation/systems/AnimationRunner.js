import { detectAnimationStage } from '../deckgl/interpolation/stages/animationStageDetector.js';
import { applyStageEasing } from '../deckgl/interpolation/stages/stageEasing.js';
import { calculatePlaybackState } from '../../domain/animation/AnimationTiming.js';
import { selectActiveTreeList, selectInputFrameIndices } from '../../state/phyloStore/selectors/treeSelectors.js';
import { PlaybackCursor } from '../../timeline/time/PlaybackCursor.js';
import { TransitionFrame } from '../../timeline/time/TransitionFrame.js';

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

    const transitionFrame = TransitionFrame.from({
      sourceTree: fromTree,
      targetTree: toTree,
      sourceTreeIndex: fromIndex,
      targetTreeIndex: toIndex,
      transitionProgress: localT,
      holdKind: playback.holdKind
    }, {
      timelineProgress: playback.timelineProgress
    });

    const { dataFrom, dataTo, transitionChangeModel } = this.getOrCacheInterpolationData(
      transitionFrame.sourceTree,
      transitionFrame.targetTree,
      transitionFrame.sourceTreeIndex,
      transitionFrame.targetTreeIndex
    );

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

    this._syncStore(timestamp, progress, stage, isFinished, playback);
    this.syncHighlightsForIndex(transitionFrame.highlightTreeIndex);

    // 5. Easing & Render
    // Check running state again before expensive async render/interpolation.
    if (!this.isRunning || runToken !== this._runToken) return isFinished;

    const easedT = applyStageEasing(localT, stage);
    const renderFrame = transitionFrame.withRenderState({
      renderProgress: easedT,
      stage,
      transitionChangeModel
    });

    await this._render(state, renderFrame);

    return isFinished;
  }

  _syncStore(timestamp, progress, stage, isFinished, playback = {}) {
    // Throttle progress updates to ~10fps
    if (isFinished || timestamp - this._lastProgressSyncTime > 100) {
      this.updateProgress(progress, {
        timelineProgress: playback.timelineProgress,
        frameIndex: playback.frameIndex,
        holdKind: playback.holdKind
      });
      this._lastProgressSyncTime = timestamp;
    }

    // Update Stage only on change
    if (stage !== this._lastAnimationStage) {
      this.setAnimationStage(stage);
      this._lastAnimationStage = stage;
    }
  }

  async _render(state, transitionFrame) {
    if (state.comparisonMode) {
      const rightParams = getComparisonTarget(
        state,
        transitionFrame.sourceTreeIndex,
        transitionFrame.targetTreeIndex
      );
      // Only render comparison if we have a valid right tree
      if (rightParams) {
        await this.renderComparisonFrame(
          transitionFrame.sourceTree,
          transitionFrame.targetTree,
          transitionFrame.renderProgress,
          transitionFrame.toRenderOptions({
            ...rightParams
          })
        );
      }
    } else {
      await this.renderSingleFrame(
        transitionFrame.sourceTree,
        transitionFrame.targetTree,
        transitionFrame.renderProgress,
        transitionFrame.toRenderOptions()
      );
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
  if (!Number.isFinite(animationStartTime) || !treeList || treeList.length === 0) return null;

  const semanticPlayback = getSemanticTimelinePlaybackState(state, timestamp, treeList);
  if (semanticPlayback) {
    return semanticPlayback;
  }

  return calculatePlaybackState({
    timestamp,
    startTime: animationStartTime,
    speed: animationSpeed,
    totalItems: treeList.length,
    transitionDuration,
    pauseDuration
  });
}

function getSemanticTimelinePlaybackState(state, timestamp, treeList) {
  const { animationStartTime, animationSpeed, movieTimelineManager } = state;
  const totalDurationMs = movieTimelineManager?.timelineData?.totalDuration;

  if (
    !movieTimelineManager ||
    typeof movieTimelineManager.getTransitionFrameForTimelineProgress !== 'function' ||
    !Number.isFinite(totalDurationMs) ||
    totalDurationMs <= 0
  ) {
    return null;
  }

  const safeSpeed = Number.isFinite(animationSpeed) && animationSpeed > 0 ? animationSpeed : 1;
  const elapsedMs = Math.max(0, timestamp - animationStartTime) * safeSpeed;
  const rawProgress = elapsedMs / totalDurationMs;
  const timelineProgress = Math.max(0, Math.min(1, rawProgress));
  const transitionFrame = movieTimelineManager.getTransitionFrameForTimelineProgress(timelineProgress);

  if (!transitionFrame) {
    return null;
  }

  const cursor = PlaybackCursor.fromTransitionFrame(transitionFrame, {
    timelineProgress,
    treeCount: treeList.length
  });
  const playbackState = cursor.toPlaybackState();

  return {
    progress: playbackState.animationProgress,
    timelineProgress: playbackState.timelineProgress,
    isFinished: rawProgress >= 1,
    fromIndex: transitionFrame.sourceTreeIndex,
    toIndex: transitionFrame.targetTreeIndex,
    localT: transitionFrame.transitionProgress,
    isInPause: Boolean(transitionFrame.holdKind),
    holdKind: playbackState.holdKind,
    frameIndex: playbackState.frameIndex
  };
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
  const treeList = selectActiveTreeList(state);
  const inputFrameIndices = selectInputFrameIndices(state);

  const rightIdx = inputFrameIndices.find((i) => i > fromIndex)
    ?? inputFrameIndices[inputFrameIndices.length - 1]
    ?? toIndex;
  const rightTree = treeList[rightIdx];

  return rightTree ? { rightTree, rightTreeIndex: rightIdx } : null;
}
