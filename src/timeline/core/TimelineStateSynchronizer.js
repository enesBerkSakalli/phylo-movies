export class TimelineStateSynchronizer {
  constructor({ timelineDataset, store }) {
    this.timelineDataset = timelineDataset;
    this.store = store;
  }

  syncRendererFromStore(timeline) {
    if (!timeline) return null;

    const movieTimeMs = this.store.getState().timelineCursor?.movieTimeMs ?? 0;
    const cursor = this.timelineDataset.getCursorAtMovieTime(movieTimeMs, { bias: 'nearest' });
    if (!cursor) return null;

    timeline.setCustomTime(cursor.movieTimeMs);
    return cursor;
  }

  restoreMountedState(timeline) {
    this.syncRendererFromStore(timeline);
  }
}
