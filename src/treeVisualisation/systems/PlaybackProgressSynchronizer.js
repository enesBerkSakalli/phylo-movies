import { selectActiveTreeList } from '../../state/phyloStore/store.js';

export function createPlaybackProgressSynchronizer({
  getState,
  isPrefetchEnabled = () => false,
  prefetchFrame = () => {}
}) {
  return (progress, playbackState = {}) => {
    const state = getState();
    const syncState = resolvePlaybackProgressSyncState({
      state,
      progress,
      playbackState
    });

    state.setPlayhead({
      animationProgress: syncState.animationProgress,
      timelineProgress: syncState.timelineProgress,
      currentTreeIndex: syncState.currentTreeIndex
    });

    if (isPrefetchEnabled() && syncState.totalTrees > 0) {
      prefetchFrame(syncState.currentTreeIndex + 1);
      prefetchFrame(syncState.currentTreeIndex + 2);
    }
  };
}

export function resolvePlaybackProgressSyncState({
  state,
  progress,
  playbackState = {},
  treeList = selectActiveTreeList(state)
}) {
  const totalTrees = treeList?.length || 0;
  const derivedTreeIndex = totalTrees > 0
    ? Math.min(Math.floor(progress * (totalTrees - 1)), totalTrees - 1)
    : 0;
  const currentTreeIndex = Number.isInteger(playbackState.currentTreeIndex)
    ? playbackState.currentTreeIndex
    : derivedTreeIndex;
  const timelineProgress = Number.isFinite(playbackState.timelineProgress)
    ? playbackState.timelineProgress
    : (state.movieTimelineManager?.getTimelineProgressForLinearTreeProgress?.(progress, totalTrees) ?? progress);

  return {
    animationProgress: progress,
    timelineProgress,
    currentTreeIndex,
    totalTrees
  };
}
