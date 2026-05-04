import { clamp } from '../../domain/math/mathUtils.js';

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
  currentTreeIndex: 0,
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
    const safeSpeed = Number.isFinite(animationSpeed) && animationSpeed > 0 ? animationSpeed : 1;
    const playbackTimeSeconds = getPlaybackTimeSecondsForLinearProgress(
      initialProgress,
      totalTrees,
      transitionDuration,
      pauseDuration
    );
    const timeOffset = (playbackTimeSeconds / safeSpeed) * 1000;
    const adjustedStartTime = performance.now() - timeOffset;

    set({
      playing: true,
      animationStartTime: adjustedStartTime,
      ...createPlayheadState({
        animationProgress: initialProgress,
        timelineProgress: initialTimelineProgress,
        currentTreeIndex: progressToTreeIndex(initialProgress, totalTrees)
      })
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
      })
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

  goToPosition: (position, direction) => {
    const { treeList, currentTreeIndex, renderInProgress, movieTimelineManager } = get();
    if (renderInProgress || !treeList?.length) return;

    const newIndex = clamp(position, 0, treeList.length - 1);
    if (newIndex === currentTreeIndex) return;

    const navDirection = direction || (newIndex > currentTreeIndex ? 'forward' : 'backward');
    const totalTrees = treeList.length;
    const newAnimationProgress = totalTrees > 1 ? newIndex / (totalTrees - 1) : 0;
    const newTimelineProgress = getWeightedTimelineProgressForTreeIndex(movieTimelineManager, newIndex);

    set({
      navigationDirection: navDirection,
      ...createPlayheadState({
        animationProgress: newAnimationProgress,
        timelineProgress: newTimelineProgress ?? newAnimationProgress,
        currentTreeIndex: newIndex
      })
    });
  },

  forward: () => {
    const { currentTreeIndex, treeList, goToPosition, renderInProgress } = get();
    if (renderInProgress) return;

    const nextIndex = currentTreeIndex + 1;
    if (nextIndex < treeList.length) {
      goToPosition(nextIndex);
    } else {
      set({ playing: false });
    }
  },

  backward: () => {
    const { currentTreeIndex, goToPosition, renderInProgress } = get();
    if (renderInProgress) return;
    goToPosition(currentTreeIndex - 1);
  },

  goToNextAnchor: () => {
    const { currentTreeIndex, transitionResolver, goToPosition, renderInProgress } = get();
    if (renderInProgress) return;

    const anchors = transitionResolver?.fullTreeIndices || [];
    const nextAnchor = anchors.find(idx => idx > currentTreeIndex);
    if (nextAnchor !== undefined) goToPosition(nextAnchor, 'forward');
  },

  goToPreviousAnchor: () => {
    const { currentTreeIndex, transitionResolver, goToPosition, renderInProgress } = get();
    if (renderInProgress) return;

    const anchors = transitionResolver?.fullTreeIndices || [];
    let prevAnchor = null;
    for (let i = anchors.length - 1; i >= 0; i--) {
      if (anchors[i] < currentTreeIndex) {
        prevAnchor = anchors[i];
        break;
      }
    }
    if (prevAnchor !== null) goToPosition(prevAnchor, 'backward');
  },

  // ==========================================================================
  // ACTIONS: Scrubbing / Timeline Progress
  // ==========================================================================
  updateTimelineState: (timelineState) => {
    const newTimelineProgress = clamp(timelineState.timelineProgress, 0, 1);
    const currentPlayhead = getCurrentPlayhead(get());

    set({
      currentSegmentIndex: timelineState.currentSegmentIndex,
      totalSegments: timelineState.totalSegments,
      treeInSegment: timelineState.treeInSegment,
      treesInSegment: timelineState.treesInSegment,
      ...createPlayheadState({
        ...currentPlayhead,
        timelineProgress: newTimelineProgress
      })
    });
  },

  setScrubPosition: (progress) => {
    const { treeList, movieTimelineManager } = get();
    if (!treeList?.length) return;

    const clampedProgress = clamp(progress, 0, 1);
    const totalTrees = treeList.length;
    const exactTreeIndex = clampedProgress * (totalTrees - 1);
    const currentTreeIndex = Math.floor(exactTreeIndex);
    const timelineProgress = getWeightedTimelineProgressForLinearProgress(
      clampedProgress,
      totalTrees,
      movieTimelineManager
    ) ?? clampedProgress;

    set({
      ...createPlayheadState({
        animationProgress: clampedProgress,
        timelineProgress,
        currentTreeIndex: clamp(currentTreeIndex, 0, totalTrees - 1)
      })
    });
  },

  setTimelineProgress: (progress, treeIndex) => {
    const { treeList, movieTimelineManager } = get();
    const maxIndex = Math.max(0, treeList.length - 1);
    const clampedProgress = clamp(progress, 0, 1);
    const rawTreeIndex = Number.isFinite(treeIndex) ? treeIndex : 0;
    const clampedTreeIndex = Math.round(clamp(rawTreeIndex, 0, maxIndex));
    const animationProgress = getLinearProgressForTimelineProgress(
      movieTimelineManager,
      clampedProgress,
      treeList.length
    ) ?? (maxIndex > 0 ? clampedTreeIndex / maxIndex : 0);

    set({
      navigationDirection: 'jump',
      ...createPlayheadState({
        animationProgress,
        timelineProgress: clampedProgress,
        currentTreeIndex: clampedTreeIndex
      })
    });
  },

  setPlayhead: (nextPlayhead) => {
    set(createPlayheadState(nextPlayhead));
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

function createPlayhead(playhead = {}) {
  const animationProgress = Number.isFinite(playhead.animationProgress)
    ? clamp(playhead.animationProgress, 0, 1)
    : 0;
  const timelineProgress = Number.isFinite(playhead.timelineProgress)
    ? clamp(playhead.timelineProgress, 0, 1)
    : null;
  const currentTreeIndex = Number.isFinite(playhead.currentTreeIndex)
    ? Math.max(0, Math.floor(playhead.currentTreeIndex))
    : 0;

  return {
    animationProgress,
    timelineProgress,
    currentTreeIndex
  };
}

function createPlayheadState(playhead = {}) {
  const nextPlayhead = createPlayhead(playhead);
  return {
    playhead: nextPlayhead,
    currentTreeIndex: nextPlayhead.currentTreeIndex
  };
}

function getCurrentPlayhead(state) {
  return createPlayhead(state.playhead);
}

function progressToTreeIndex(progress, treeCount) {
  if (!Number.isFinite(progress) || !Number.isFinite(treeCount) || treeCount <= 0) {
    return 0;
  }

  return clamp(Math.floor(progress * Math.max(0, treeCount - 1)), 0, Math.max(0, treeCount - 1));
}

function getWeightedTimelineProgressForTreeIndex(movieTimelineManager, treeIndex) {
  return movieTimelineManager?.getTimelineProgressForTreeIndex?.(treeIndex) ?? null;
}

function getWeightedTimelineProgressForLinearProgress(progress, treeCount, movieTimelineManager) {
  return movieTimelineManager?.getTimelineProgressForLinearTreeProgress?.(progress, treeCount) ?? null;
}

function getLinearProgressForTimelineProgress(movieTimelineManager, timelineProgress, treeCount) {
  if (!Number.isFinite(timelineProgress) || !Number.isFinite(treeCount) || treeCount <= 1) {
    return null;
  }

  const interpolationData = movieTimelineManager?.getInterpolationDataForTimelineProgress?.(timelineProgress);
  if (!interpolationData) return null;

  const fromIndex = Number(interpolationData.fromIndex);
  const toIndex = Number(interpolationData.toIndex);
  const timeFactor = Number(interpolationData.timeFactor);
  if (!Number.isFinite(fromIndex)) return null;

  const safeToIndex = Number.isFinite(toIndex) ? toIndex : fromIndex;
  const safeTimeFactor = Number.isFinite(timeFactor) ? clamp(timeFactor, 0, 1) : 0;
  const exactTreeIndex = fromIndex + ((safeToIndex - fromIndex) * safeTimeFactor);

  return clamp(exactTreeIndex / (treeCount - 1), 0, 1);
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
  const exactTreeIndex = clampedProgress * segmentCount;
  const fromIndex = Math.min(Math.floor(exactTreeIndex), segmentCount - 1);
  const timeFactor = exactTreeIndex - fromIndex;

  return (fromIndex * (safeTransitionDuration + safePauseDuration)) +
    (timeFactor * safeTransitionDuration);
}
