export function createPlaybackProgressSynchronizer({
  getState,
  isPrefetchEnabled = () => false,
  prefetchFrame = () => {},
}) {
  return (playbackState = {}) => {
    const state = getState();
    const cursor = playbackState.timelineCursor;
    if (!cursor) {
      throw new Error('[PlaybackProgressSynchronizer] timeline cursor is required');
    }

    state.setTimelineCursor(cursor);

    if (isPrefetchEnabled()) {
      prefetchFrame(cursor.frameIndex + 1);
      prefetchFrame(cursor.frameIndex + 2);
    }
  };
}
