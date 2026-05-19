import { clamp } from '../../domain/math/mathUtils.js';
import { PlaybackCursor } from '../../timeline/time/PlaybackCursor.js';

const TIMELINE_PROGRESS_EPSILON = 1e-9;

/**
 * Playback slice: animation playback, navigation, scrubbing, and rendering guards.
 */
export const createPlaybackSlice = (set, get) => ({
  // ==========================================================================
  // STATE: Playback
  // ==========================================================================
  playing: false,
  playhead: createPlayhead(),
  animationStartTime: null,
  animationSpeed: 1,
  transitionDuration: 1.0, // seconds
  pauseDuration: 0.0, // seconds


  // ==========================================================================
  // STATE: Navigation
  // ==========================================================================
  frameIndex: 0,
  navigationDirection: 'forward', // 'forward', 'backward', or 'jump'


  // ==========================================================================
  // STATE: Timeline Segments
  // ==========================================================================
  currentSegmentIndex: 0,
  totalSegments: 0,
  treeInSegment: 1,
  treesInSegment: 1,

  // ==========================================================================
  // STATE: Rendering
  // ==========================================================================
  renderInProgress: false,

  // ==========================================================================
  // ACTIONS: Playback Control
  // ==========================================================================
  play: () => {
    const state = get();
    const { playing, treeList, animationSpeed, movieTimelineManager, transitionDuration, pauseDuration } = state;
    if (playing) return;

    const totalTrees = treeList.length;
    if (totalTrees === 0) return;

    const { animationProgress, timelineProgress } = getCurrentPlayhead(state);
    const timelineDerivedProgress = typeof timelineProgress === 'number'
      ? getLinearProgressForTimelineProgress(movieTimelineManager, timelineProgress, totalTrees)
      : null;
    const currentProgress = timelineDerivedProgress ?? animationProgress;
    const initialProgress = currentProgress >= 1.0 ? 0 : currentProgress;
    const initialTimelineProgress = currentProgress >= 1.0
      ? (getWeightedTimelineProgressForLinearProgress(0, totalTrees, movieTimelineManager) ?? 0)
      : (typeof timelineProgress === 'number'
        ? timelineProgress
        : (getWeightedTimelineProgressForLinearProgress(initialProgress, totalTrees, movieTimelineManager) ?? initialProgress));
    const initialCursor = getCursorAtTimelineProgress(movieTimelineManager, initialTimelineProgress);
    const initialFrameIndex = resolveCursorFrameIndex(
      initialCursor,
      progressToFrameIndex(initialProgress, totalTrees),
      totalTrees
    );
    const safeSpeed = Number.isFinite(animationSpeed) && animationSpeed > 0 ? animationSpeed : 1;
    const playbackTimeSeconds = getPlaybackTimeSecondsForPlayhead(
      initialProgress,
      initialTimelineProgress,
      totalTrees,
      transitionDuration,
      pauseDuration,
      movieTimelineManager
    );
    const timeOffset = (playbackTimeSeconds / safeSpeed) * 1000;
    const adjustedStartTime = performance.now() - timeOffset;

    set({
      playing: true,
      animationStartTime: adjustedStartTime,
      ...createPlayheadState({
        animationProgress: initialProgress,
        timelineProgress: initialTimelineProgress
      }, initialFrameIndex)
    });
  },

  stop: () => {
    const state = get();
    const { animationProgress } = getCurrentPlayhead(state);
    const { treeList } = state;
    const weightedTimelineProgress = getWeightedTimelineProgressForLinearProgress(
      animationProgress,
      treeList?.length ?? 0,
      state.movieTimelineManager
    );
    set({
      playing: false,
      animationStartTime: null,
      ...createPlayheadState({
        ...getCurrentPlayhead(state),
        timelineProgress: weightedTimelineProgress ?? animationProgress
      }, state.frameIndex)
    });
  },

  setAnimationSpeed: (newSpeed) => {
    const { playing, animationStartTime, animationSpeed: oldSpeed } = get();

    if (playing && animationStartTime) {
      const now = performance.now();
      const elapsed = now - animationStartTime;
      const newStartTime = now - (elapsed * oldSpeed / newSpeed);
      set({ animationSpeed: newSpeed, animationStartTime: newStartTime });
    } else {
      set({ animationSpeed: newSpeed });
    }
  },

  adjustAnimationStartTime: (deltaMs) => {
    set((state) => ({
      animationStartTime: (state.animationStartTime || 0) + deltaMs
    }));
  },

  // ==========================================================================
  // ACTIONS: Navigation
  // ==========================================================================
  setNavigationDirection: (direction) => set({ navigationDirection: direction }),

  goToPosition: (position, direction, options = {}) => {
    const { treeList, frameIndex, renderInProgress, movieTimelineManager, playing } = get();
    if (renderInProgress || !treeList?.length) return;

    const requestedFrameIndex = clamp(position, 0, treeList.length - 1);
    const totalTrees = treeList.length;
    const explicitTimelineProgress = getTimelineProgressOption(options);
    const cursor = explicitTimelineProgress !== null
      ? getCursorAtTimelineProgress(movieTimelineManager, explicitTimelineProgress)
      : getCursorForFrame(movieTimelineManager, requestedFrameIndex, direction);
    const newIndex = resolveCursorFrameIndex(cursor, requestedFrameIndex, totalTrees);
    const newAnimationProgress = getAnimationProgressForFrameIndex(newIndex, totalTrees);
    const newTimelineProgress = explicitTimelineProgress
      ?? getCursorTimelineProgress(cursor)
      ?? getWeightedTimelineProgressForFrameIndex(movieTimelineManager, newIndex)
      ?? newAnimationProgress;

    if (newIndex === frameIndex) {
      if (playing || explicitTimelineProgress !== null) {
        set({
          playing: false,
          animationStartTime: null,
          navigationDirection: direction || 'jump',
          ...createPlayheadState({
            animationProgress: newAnimationProgress,
            timelineProgress: newTimelineProgress
          }, newIndex)
        });
        syncColorManagerForFrame(get, newIndex);
      }
      return;
    }

    const navDirection = direction || (newIndex > frameIndex ? 'forward' : 'backward');

    set({
      playing: false,
      animationStartTime: null,
      navigationDirection: navDirection,
      ...createPlayheadState({
        animationProgress: newAnimationProgress,
        timelineProgress: newTimelineProgress
      }, newIndex)
    });
    syncColorManagerForFrame(get, newIndex);
  },

  forward: () => {
    const { frameIndex, treeList, goToPosition, renderInProgress } = get();
    if (renderInProgress) return;

    const nextIndex = frameIndex + 1;
    if (nextIndex < treeList.length) {
      goToPosition(nextIndex);
    } else {
      set({ playing: false });
    }
  },

  backward: () => {
    const { frameIndex, goToPosition, renderInProgress } = get();
    if (renderInProgress) return;
    goToPosition(frameIndex - 1);
  },

  goToNextInputTree: () => {
    const { frameIndex, transitionResolver, goToPosition, renderInProgress } = get();
    if (renderInProgress) return;

    const inputTreeIndices = transitionResolver?.fullTreeIndices || [];
    const nextInputTreeIndex = inputTreeIndices.find(idx => idx > frameIndex);
    if (nextInputTreeIndex !== undefined) goToPosition(nextInputTreeIndex, 'forward');
  },

  goToPreviousInputTree: () => {
    const { frameIndex, transitionResolver, goToPosition, renderInProgress } = get();
    if (renderInProgress) return;

    const inputTreeIndices = transitionResolver?.fullTreeIndices || [];
    let previousInputTreeIndex = null;
    for (let i = inputTreeIndices.length - 1; i >= 0; i--) {
      if (inputTreeIndices[i] < frameIndex) {
        previousInputTreeIndex = inputTreeIndices[i];
        break;
      }
    }
    if (previousInputTreeIndex !== null) goToPosition(previousInputTreeIndex, 'backward');
  },

  // ==========================================================================
  // ACTIONS: Scrubbing / Timeline Progress
  // ==========================================================================
  updateTimelineState: (timelineState) => {
    const newTimelineProgress = clamp(timelineState.timelineProgress, 0, 1);
    const state = get();
    const currentPlayhead = getCurrentPlayhead(state);

    if (
      state.currentSegmentIndex === timelineState.currentSegmentIndex &&
      state.totalSegments === timelineState.totalSegments &&
      state.treeInSegment === timelineState.treeInSegment &&
      state.treesInSegment === timelineState.treesInSegment &&
      areTimelineProgressValuesEqual(currentPlayhead.timelineProgress, newTimelineProgress)
    ) {
      return;
    }

    set({
      currentSegmentIndex: timelineState.currentSegmentIndex,
      totalSegments: timelineState.totalSegments,
      treeInSegment: timelineState.treeInSegment,
      treesInSegment: timelineState.treesInSegment,
      ...createPlayheadState({
        ...currentPlayhead,
        timelineProgress: newTimelineProgress
      }, state.frameIndex)
    });
  },

  setScrubPosition: (progress) => {
    const { treeList, movieTimelineManager } = get();
    if (!treeList?.length) return;

    const clampedProgress = clamp(progress, 0, 1);
    const totalTrees = treeList.length;
    const exactFrameIndex = clampedProgress * (totalTrees - 1);
    const frameIndex = Math.floor(exactFrameIndex);
    const timelineProgress = getWeightedTimelineProgressForLinearProgress(
      clampedProgress,
      totalTrees,
      movieTimelineManager
    ) ?? clampedProgress;

    set({
      ...createPlayheadState({
        animationProgress: clampedProgress,
        timelineProgress
      }, clamp(frameIndex, 0, totalTrees - 1))
    });
  },

  setTimelineProgress: (progress, frameIndex) => {
    const { treeList, movieTimelineManager } = get();
    const clampedProgress = clamp(progress, 0, 1);
    const cursor = getCursorAtTimelineProgress(movieTimelineManager, clampedProgress);
    const requestedFrameIndex = Number.isFinite(frameIndex) ? frameIndex : null;
    const clampedFrameIndex = resolveCursorFrameIndex(
      cursor,
      requestedFrameIndex,
      treeList.length,
      Boolean(movieTimelineManager)
    );
    const animationProgress = getLinearProgressForTimelineProgress(
      movieTimelineManager,
      clampedProgress,
      treeList.length
    ) ?? getAnimationProgressForFrameIndex(clampedFrameIndex, treeList.length);

    set({
      navigationDirection: 'jump',
      ...createPlayheadState({
        animationProgress,
        timelineProgress: getCursorTimelineProgress(cursor) ?? clampedProgress
      }, clampedFrameIndex)
    });
  },

  setPlayhead: (nextPlayhead, frameIndexOverride = null) => {
    const treeCount = get().treeList?.length ?? 0;
    const maxIndex = Math.max(0, treeCount - 1);
    const inferredFrameIndex = progressToFrameIndex(nextPlayhead?.animationProgress, treeCount);
    const playheadFrameIndex = Number.isFinite(nextPlayhead?.frameIndex)
      ? clamp(Math.floor(nextPlayhead.frameIndex), 0, maxIndex)
      : null;
    const requestedFrameIndex = Number.isFinite(frameIndexOverride)
      ? clamp(Math.floor(frameIndexOverride), 0, maxIndex)
      : (playheadFrameIndex ?? inferredFrameIndex);
    const cursor = createPlaybackCursor(nextPlayhead, requestedFrameIndex);

    set({
      playhead: cursor.toPlayhead(),
      frameIndex: cursor.frameIndex
    });
  },

  // ==========================================================================
  // ACTIONS: Rendering Lock
  // ==========================================================================
  setRenderInProgress: (inProgress) => set({ renderInProgress: inProgress }),

  // ==========================================================================
  // ACTIONS: Reset
  // ==========================================================================
  resetPlayback: () => set({
    playing: false,
    ...createPlayheadState(),
    animationStartTime: null,
    navigationDirection: 'forward',
    currentSegmentIndex: 0,
    totalSegments: 0,
    treeInSegment: 1,
    treesInSegment: 1,
    renderInProgress: false,
  }),
});

function createPlaybackCursor(playhead = {}, frameIndex = 0) {
  return PlaybackCursor.fromPlayhead({
    ...playhead,
    frameIndex
  });
}

function createPlayhead(playhead = {}, frameIndex = 0) {
  return createPlaybackCursor(playhead, frameIndex).toPlayhead();
}

function createPlayheadState(playhead = {}, frameIndex = 0) {
  const cursor = createPlaybackCursor(playhead, frameIndex);
  return {
    playhead: cursor.toPlayhead(),
    frameIndex: cursor.frameIndex
  };
}

function areTimelineProgressValuesEqual(currentProgress, nextProgress) {
  if (currentProgress === nextProgress) return true;
  if (!Number.isFinite(currentProgress) || !Number.isFinite(nextProgress)) return false;
  return Math.abs(currentProgress - nextProgress) <= TIMELINE_PROGRESS_EPSILON;
}

function getCurrentPlayhead(state) {
  return createPlayhead(state.playhead, state.frameIndex);
}

function progressToFrameIndex(progress, treeCount) {
  if (!Number.isFinite(progress) || !Number.isFinite(treeCount) || treeCount <= 0) {
    return 0;
  }

  return clamp(Math.floor(progress * Math.max(0, treeCount - 1)), 0, Math.max(0, treeCount - 1));
}

function getAnimationProgressForFrameIndex(frameIndex, treeCount) {
  if (!Number.isFinite(treeCount) || treeCount <= 1) return 0;
  return clamp(frameIndex, 0, treeCount - 1) / (treeCount - 1);
}

function getWeightedTimelineProgressForFrameIndex(movieTimelineManager, frameIndex) {
  return movieTimelineManager?.getTimelineProgressForFrameIndex?.(frameIndex) ?? null;
}

function getTimelineProgressOption(options) {
  const progress = options?.timelineProgress;
  return Number.isFinite(progress) ? clamp(progress, 0, 1) : null;
}

function getWeightedTimelineProgressForLinearProgress(progress, treeCount, movieTimelineManager) {
  return movieTimelineManager?.getTimelineProgressForLinearTreeProgress?.(progress, treeCount) ?? null;
}

function getCursorAtTimelineProgress(movieTimelineManager, timelineProgress) {
  if (!Number.isFinite(timelineProgress)) return null;
  return movieTimelineManager?.getCursorAtTimelineProgress?.(timelineProgress) ?? null;
}

function getCursorForFrame(movieTimelineManager, frameIndex, direction) {
  const occurrence = direction === 'backward' ? 'last' : 'first';
  return movieTimelineManager?.getCursorForFrame?.(frameIndex, { occurrence }) ?? null;
}

function getCursorTimelineProgress(cursor) {
  return Number.isFinite(cursor?.timelineProgress) ? clamp(cursor.timelineProgress, 0, 1) : null;
}

function syncColorManagerForFrame(get, frameIndex) {
  get().updateColorManagerForIndex?.(frameIndex);
}

function resolveCursorFrameIndex(cursor, requestedFrameIndex, frameCount, requireCursor = false) {
  const maxIndex = Math.max(0, (Number.isFinite(frameCount) ? frameCount : 0) - 1);
  if (Number.isInteger(cursor?.frameIndex)) {
    return clamp(Math.floor(cursor.frameIndex), 0, maxIndex);
  }
  if (requireCursor) {
    throw new Error('[playbackSlice] playback cursor frameIndex is required');
  }
  const candidate = Number.isFinite(requestedFrameIndex) ? requestedFrameIndex : 0;
  return clamp(Math.floor(candidate), 0, maxIndex);
}

function getLinearProgressForTimelineProgress(movieTimelineManager, timelineProgress, treeCount) {
  if (!Number.isFinite(timelineProgress) || !Number.isFinite(treeCount) || treeCount <= 1) {
    return null;
  }

  const transitionFrame = movieTimelineManager?.getTransitionFrameForTimelineProgress?.(timelineProgress);
  if (!transitionFrame) return null;

  const fromIndex = Number(transitionFrame.sourceTreeIndex);
  const toIndex = Number(transitionFrame.targetTreeIndex);
  const transitionProgress = Number(transitionFrame.transitionProgress);
  if (!Number.isFinite(fromIndex)) return null;

  const safeToIndex = Number.isFinite(toIndex) ? toIndex : fromIndex;
  const safeTransitionProgress = Number.isFinite(transitionProgress) ? clamp(transitionProgress, 0, 1) : 0;
  const exactFrameIndex = fromIndex + ((safeToIndex - fromIndex) * safeTransitionProgress);

  return clamp(exactFrameIndex / (treeCount - 1), 0, 1);
}

function getPlaybackDurationSeconds(treeCount, transitionDuration = 1, pauseDuration = 0) {
  if (!Number.isFinite(treeCount) || treeCount <= 1) return 0;

  const segmentCount = treeCount - 1;
  const safeTransitionDuration = Number.isFinite(transitionDuration) && transitionDuration > 0
    ? transitionDuration
    : 1;
  const safePauseDuration = Number.isFinite(pauseDuration) && pauseDuration > 0
    ? pauseDuration
    : 0;

  return (segmentCount * safeTransitionDuration) +
    (Math.max(0, segmentCount - 1) * safePauseDuration);
}

function getPlaybackTimeSecondsForLinearProgress(progress, treeCount, transitionDuration = 1, pauseDuration = 0) {
  if (!Number.isFinite(treeCount) || treeCount <= 1) return 0;

  const clampedProgress = clamp(progress, 0, 1);
  if (clampedProgress >= 1) {
    return getPlaybackDurationSeconds(treeCount, transitionDuration, pauseDuration);
  }

  const segmentCount = treeCount - 1;
  const safeTransitionDuration = Number.isFinite(transitionDuration) && transitionDuration > 0
    ? transitionDuration
    : 1;
  const safePauseDuration = Number.isFinite(pauseDuration) && pauseDuration > 0
    ? pauseDuration
    : 0;
  const exactFrameIndex = clampedProgress * segmentCount;
  const fromIndex = Math.min(Math.floor(exactFrameIndex), segmentCount - 1);
  const timeFactor = exactFrameIndex - fromIndex;

  return (fromIndex * (safeTransitionDuration + safePauseDuration)) +
    (timeFactor * safeTransitionDuration);
}

function getPlaybackTimeSecondsForPlayhead(
  progress,
  timelineProgress,
  treeCount,
  transitionDuration,
  pauseDuration,
  movieTimelineManager
) {
  const timelineDurationMs = movieTimelineManager?.timelineData?.totalDuration;
  if (Number.isFinite(timelineProgress) && Number.isFinite(timelineDurationMs) && timelineDurationMs > 0) {
    return clamp(timelineProgress, 0, 1) * (timelineDurationMs / 1000);
  }

  return getPlaybackTimeSecondsForLinearProgress(
    progress,
    treeCount,
    transitionDuration,
    pauseDuration
  );
}
