import { clamp } from '../../domain/math/mathUtils.js';

/**
 * Playback slice: animation playback, navigation, scrubbing, and rendering guards.
 */
export const createPlaybackSlice = (set, get) => ({
  // ==========================================================================
  // STATE: Playback
  // ==========================================================================
  playing: false,
  animationProgress: 0,
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
  timelineProgress: null,

  // ==========================================================================
  // STATE: Rendering
  // ==========================================================================
  renderInProgress: false,
  autoFitOnTreeChange: true,

  // ==========================================================================
  // ACTIONS: Playback Control
  // ==========================================================================
  play: () => {
    const { playing, animationProgress, timelineProgress, treeList, animationSpeed } = get();
    if (playing) return;

    const totalTrees = treeList.length;
    const currentProgress = timelineProgress ?? animationProgress;
    const initialProgress = currentProgress >= 1.0 ? 0 : currentProgress;
    const timeOffset = (initialProgress * (totalTrees - 1) / animationSpeed) * 1000;
    const adjustedStartTime = performance.now() - timeOffset;

    set({
      playing: true,
      animationStartTime: adjustedStartTime,
      animationProgress: initialProgress,
      timelineProgress: null
    });
  },

  stop: () => {
    const { animationProgress } = get();
    set({
      playing: false,
      animationStartTime: null,
      timelineProgress: animationProgress
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
    const { treeList, currentTreeIndex, renderInProgress } = get();
    if (renderInProgress || !treeList?.length) return;

    const newIndex = clamp(position, 0, treeList.length - 1);
    if (newIndex === currentTreeIndex) return;

    const navDirection = direction || (newIndex > currentTreeIndex ? 'forward' : 'backward');
    const totalTrees = treeList.length;
    const newAnimationProgress = totalTrees > 1 ? newIndex / (totalTrees - 1) : 0;

    set({
      currentTreeIndex: newIndex,
      navigationDirection: navDirection,
      animationProgress: newAnimationProgress,
      timelineProgress: newAnimationProgress
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
    const { timelineProgress: existingProgress } = get();
    const newTimelineProgress = existingProgress != null
      ? existingProgress
      : clamp(timelineState.timelineProgress, 0, 1);

    set({
      currentSegmentIndex: timelineState.currentSegmentIndex,
      totalSegments: timelineState.totalSegments,
      treeInSegment: timelineState.treeInSegment,
      treesInSegment: timelineState.treesInSegment,
      timelineProgress: newTimelineProgress
    });
  },

  setScrubPosition: (progress) => {
    const { treeList } = get();
    if (!treeList?.length) return;

    const clampedProgress = clamp(progress, 0, 1);
    const totalTrees = treeList.length;
    const exactTreeIndex = clampedProgress * (totalTrees - 1);
    const currentTreeIndex = Math.floor(exactTreeIndex);
    const segmentProgress = exactTreeIndex - currentTreeIndex;

    set({
      animationProgress: clampedProgress,
      currentTreeIndex: clamp(currentTreeIndex, 0, totalTrees - 1)
    });
  },

  setTimelineProgress: (progress, treeIndex) => {
    const { treeList } = get();
    const maxIndex = Math.max(0, treeList.length - 1);
    const clampedProgress = clamp(progress, 0, 1);

    set({
      timelineProgress: clampedProgress,
      animationProgress: clampedProgress,
      currentTreeIndex: clamp(treeIndex, 0, maxIndex),
      navigationDirection: 'jump'
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
    animationProgress: 0,
    animationStartTime: null,
    currentTreeIndex: 0,
    navigationDirection: 'forward',
    currentSegmentIndex: 0,
    totalSegments: 0,
    treeInSegment: 1,
    treesInSegment: 1,
    timelineProgress: null,
    renderInProgress: false,
  }),
});
