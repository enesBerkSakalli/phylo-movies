export function createPlaybackProgressSynchronizer({
  getState,
  isPrefetchEnabled = () => false,
  prefetchFrame = () => {},
}) {
  return ({ movieTimeMs }) => {
    getState().seek(movieTimeMs);

    if (isPrefetchEnabled()) {
      const { frameIndex } = getState();
      prefetchFrame(frameIndex + 1);
      prefetchFrame(frameIndex + 2);
    }
  };
}
