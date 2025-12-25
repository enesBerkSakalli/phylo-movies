import { clamp } from '../../domain/math/mathUtils.js';

// Playback/navigation slice: timeline navigation, animation progress, and guards
export const createPlaybackSlice = (set, get) => ({
  // Dynamic application state
  currentTreeIndex: 0,
  navigationDirection: 'forward', // 'forward', 'backward', or 'jump'
  segmentProgress: 0, // 0-1 progress within the current segment (for interpolation)

  // Timeline-specific state for grouped segments
  currentSegmentIndex: 0, // Current segment index (0-based)
  totalSegments: 0, // Total number of segments
  treeInSegment: 1, // Position within current segment (1-based)
  treesInSegment: 1, // Total trees in current segment
  timelineProgress: 0, // 0-1 progress through entire timeline

  playing: false,
  renderInProgress: false,

  // Animation state management
  animationProgress: 0, // 0-1 progress through entire movie
  animationStartTime: null, // Performance timestamp when animation started
  animationSpeed: 1,

  // Camera auto-fit policy
  autoFitOnTreeChange: true,

  play: () => {
    const { playing, animationProgress, timelineProgress, treeList, animationSpeed } = get();
    if (playing) return;

    const totalTrees = treeList.length;
    // Use timelineProgress if available (from scrubbing), otherwise animationProgress
    const currentProgress = timelineProgress ?? animationProgress;
    const initialProgress = currentProgress >= 1.0 ? 0 : currentProgress;
    const timeOffset = (initialProgress * (totalTrees - 1) / animationSpeed) * 1000;
    const adjustedStartTime = performance.now() - timeOffset;

    set({
      playing: true,
      animationStartTime: adjustedStartTime,
      animationProgress: initialProgress,
      timelineProgress: null // Clear scrubbed position so animation progress takes over
    });
    // NO animation loop here. The TreeAnimationController is responsible for driving the updates.
  },

  /**
   * Stops timeline playback and preserves animation state
   */
  stop: () => {
    set({
      playing: false,
      animationStartTime: null
    });
  },

  /**
   * Sets the animation playback speed multiplier
   * @param {number} newSpeed - Speed multiplier (1.0 = normal speed)
   */
  setAnimationSpeed: (newSpeed) => {
    const { playing, animationStartTime, animationSpeed: oldSpeed } = get();

    if (playing && animationStartTime) {
      const now = performance.now();
      // Calculate how much "virtual time" has passed at the old speed
      const elapsed = now - animationStartTime;
      // Adjust start time so that (now - newStartTime) * newSpeed === elapsed * oldSpeed
      // This preserves the current animation progress
      const newStartTime = now - (elapsed * oldSpeed / newSpeed);

      set({
        animationSpeed: newSpeed,
        animationStartTime: newStartTime
      });
    } else {
      set({ animationSpeed: newSpeed });
    }
  },

  /**
   * Updates animation progress and automatically updates currentTreeIndex
   * @param {number} timestamp - Current animation timestamp
   * @returns {boolean} True if animation should stop (progress >= 1.0)
   */
  updateAnimationProgress: (timestamp) => {
    const { animationStartTime, animationSpeed, treeList, playing } = get();

    if (!playing || !animationStartTime || !treeList.length) {
      return false;
    }

    const elapsed = (timestamp - animationStartTime) / 1000; // Convert to seconds
    const totalTrees = treeList.length;
    if (totalTrees <= 1) {
      set({
        animationProgress: 1,
        currentTreeIndex: 0
      });
      return true;
    }
    const progress = (elapsed * animationSpeed) / (totalTrees - 1);
    const clampedProgress = Math.min(progress, 1.0);

    // Calculate current tree index from animation progress
    const exactTreeIndex = clampedProgress * (totalTrees - 1);
    const discreteTreeIndex = Math.round(exactTreeIndex);

    // Update both animation progress and current tree index
    // This will trigger the ColorManager subscription automatically
    set({
      animationProgress: clampedProgress,
      currentTreeIndex: clamp(discreteTreeIndex, 0, totalTrees - 1)
    });

    return progress >= 1.0;
  },

  /**
   * Gets current animation interpolation data
   * @returns {Object|null} Animation data with fromTreeIndex, toTreeIndex, exactTreeIndex, easedProgress
   */
  getAnimationInterpolationData: () => {
    const { animationProgress, treeList, playing } = get();

    if (!playing || !treeList.length) {
      return null;
    }

    // Map animation progress to actual tree indices accounting for grouped segments
    const totalTrees = treeList.length;
    const exactTreeIndex = animationProgress * (totalTrees - 1);
    const fromTreeIndex = Math.floor(exactTreeIndex);
    const toTreeIndex = Math.min(fromTreeIndex + 1, totalTrees - 1);
    const segmentProgress = exactTreeIndex - fromTreeIndex;

    // Use linear progress - easing is applied within the rendering controller when needed
    const easedProgress = segmentProgress;

    return {
      exactTreeIndex,
      fromTreeIndex,
      toTreeIndex,
      segmentProgress,
      easedProgress,
      progress: animationProgress
    };
  },

  // --- Navigation Actions ---
  /**
   * Sets navigation direction for interpolation handling
   * @param {string} direction - Navigation direction ('forward', 'backward', 'jump')
   */
  setNavigationDirection: (direction) => set({ navigationDirection: direction }),

  /**
   * Sets segment progress for interpolation (0-1 within current segment)
   * @param {number} progress - Segment progress (0-1)
   */
  setSegmentProgress: (progress) => set({ segmentProgress: clamp(progress, 0, 1) }),

  /**
   * Updates timeline-specific state for grouped segments
   * @param {Object} timelineState - Timeline state object
   * @param {number} timelineState.currentSegmentIndex - Current segment index (0-based)
   * @param {number} timelineState.totalSegments - Total number of segments
   * @param {number} timelineState.treeInSegment - Position within current segment (1-based)
   * @param {number} timelineState.treesInSegment - Total trees in current segment
   * @param {number} timelineState.timelineProgress - Timeline progress (0-1)
   */
  updateTimelineState: (timelineState) => set({
    currentSegmentIndex: timelineState.currentSegmentIndex || 0,
    totalSegments: timelineState.totalSegments || 0,
    treeInSegment: timelineState.treeInSegment || 1,
    treesInSegment: timelineState.treesInSegment || 1,
    timelineProgress: clamp(timelineState.timelineProgress || 0, 0, 1)
  }),

  /**
   * Sets the scrubber position to an exact interpolated point
   * @param {number} progress - Animation progress (0-1)
   */
  setScrubPosition: (progress) => {
    const { treeList } = get();
    if (!treeList || treeList.length === 0) return;

    const clampedProgress = clamp(progress, 0, 1);
    const totalTrees = treeList.length;

    // Calculate exact tree position
    const exactTreeIndex = clampedProgress * (totalTrees - 1);
    const currentTreeIndex = Math.floor(exactTreeIndex);
    const segmentProgress = exactTreeIndex - currentTreeIndex;

    set({
      animationProgress: clampedProgress,
      currentTreeIndex: clamp(currentTreeIndex, 0, totalTrees - 1),
      segmentProgress: segmentProgress,
      // Maintain current direction or set to none/jump if needed
    });
  },

  /**
   * Sets timeline progress based on an exact timeline-relative progress (0-1),
   * keeping the current tree index in sync with that point on the timeline.
   * This avoids snapping to anchor trees when the scrubber is released mid-segment.
   * @param {number} progress - Timeline progress (0-1)
   * @param {number} treeIndex - Tree index corresponding to the timeline position
   * @param {number} [segmentProgress=0] - Progress within the current segment (0-1)
   */
  setTimelineProgress: (progress, treeIndex, segmentProgress = 0) => {
    const { treeList } = get();
    const clampedProgress = clamp(progress, 0, 1);
    const maxIndex = Math.max(0, (treeList?.length || 1) - 1);
    const clampedTreeIndex = clamp(treeIndex ?? 0, 0, maxIndex);

    set({
      // Don't update animationProgress - preserve scrubbed position independently
      timelineProgress: clampedProgress,
      currentTreeIndex: clampedTreeIndex,
      segmentProgress: clamp(segmentProgress, 0, 1),
      navigationDirection: 'jump'
    });
  },

  /**
   * Navigates to a specific tree position in the timeline
   * @param {number} position - Target tree index (0-based)
   * @param {string} [direction] - Optional navigation direction override
   */
  goToPosition: (position, direction) => {
    const { treeList, currentTreeIndex, renderInProgress } = get();

    // Only skip if actively rendering, not during general updates
    if (renderInProgress) {
      return;
    }

    if (!treeList || treeList.length === 0) {
      return;
    }

    const newIndex = clamp(position, 0, treeList.length - 1);
    if (newIndex !== currentTreeIndex) {
      let navDirection = direction;
      if (!navDirection) {
        // Auto-detect direction based on position change
        navDirection = newIndex > currentTreeIndex ? 'forward' : 'backward';
      }

      // **THE FIX**: Calculate and set animationProgress along with the tree index.
      const totalTrees = treeList.length;
      const newAnimationProgress = totalTrees > 1 ? newIndex / (totalTrees - 1) : 0;

      set({
        currentTreeIndex: newIndex,
        navigationDirection: navDirection,
        segmentProgress: 0, // Reset segment progress on discrete navigation
        animationProgress: newAnimationProgress, // Sync animation progress
        timelineProgress: newAnimationProgress // Sync timeline progress to ensure scrubber updates
      });

      // The subscription will automatically handle the color manager update.
      // No need for manual calls here.
    }
  },

  /**
   * Advances to the next tree in the timeline
   */
  forward: () => {
    const { currentTreeIndex, treeList, goToPosition, renderInProgress } = get();

    // Only skip if actively rendering, not during general updates
    if (renderInProgress) return;

    const nextIndex = currentTreeIndex + 1;
    if (nextIndex < treeList.length) {
      goToPosition(nextIndex);
    } else {
      set({ playing: false }); // Stop at the end
    }
  },

  /**
   * Goes back to the previous tree in the timeline
   */
  backward: () => {
    const { currentTreeIndex, goToPosition, renderInProgress } = get();

    // Only skip if actively rendering, not during general updates
    if (renderInProgress) return;

    goToPosition(currentTreeIndex - 1);
  },

  /**
   * Navigates to the next anchor (full) tree in the timeline
   */
  goToNextAnchor: () => {
    const { currentTreeIndex, transitionResolver, goToPosition, renderInProgress } = get();

    if (renderInProgress) return;

    const anchors = transitionResolver?.fullTreeIndices || [];
    const nextAnchor = anchors.find(idx => idx > currentTreeIndex);

    if (nextAnchor !== undefined) {
      goToPosition(nextAnchor, 'forward');
    }
  },

  /**
   * Navigates to the previous anchor (full) tree in the timeline
   */
  goToPreviousAnchor: () => {
    const { currentTreeIndex, transitionResolver, goToPosition, renderInProgress } = get();

    if (renderInProgress) return;

    const anchors = transitionResolver?.fullTreeIndices || [];

    // Find the last anchor strictly before current position
    let prevAnchor = null;
    for (let i = anchors.length - 1; i >= 0; i--) {
      if (anchors[i] < currentTreeIndex) {
        prevAnchor = anchors[i];
        break;
      }
    }

    if (prevAnchor !== null) {
      goToPosition(prevAnchor, 'backward');
    }
  },

  // --- Rendering Lock ---
  /**
   * Sets the rendering progress state to prevent concurrent operations
   * @param {boolean} inProgress - Whether rendering is currently in progress
   */
  setRenderInProgress: (inProgress) => set({
    renderInProgress: inProgress
  }),
});
