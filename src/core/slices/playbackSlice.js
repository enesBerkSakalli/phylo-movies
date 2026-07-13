import { clamp } from '../../domain/math/mathUtils.js';
import { selectInputFrameIndices } from '../../state/phyloStore/selectors/treeSelectors.js';

/**
 * Playback state is anchored to semantic movie time. Frame and timeline cursor
 * values are derived together whenever playback moves.
 */
export const createPlaybackSlice = (set, get) => ({
  playing: false,
  timelineCursor: null,
  animationStartTime: null,
  animationSpeed: 1,
  frameIndex: 0,
  renderInProgress: false,

  play: () => {
    const state = get();
    if (state.playing || state.treeList.length === 0) return;

    const manager = requireTimelineManager(state);
    const totalDurationMs = requireTimelineDuration(manager);
    const animationSpeed = normalizeAnimationSpeed(state.animationSpeed);
    const storedMovieTimeMs = state.timelineCursor?.movieTimeMs ?? 0;
    const initialMovieTimeMs =
      Number.isFinite(storedMovieTimeMs) && storedMovieTimeMs < totalDurationMs
        ? clamp(storedMovieTimeMs, 0, totalDurationMs)
        : 0;
    const cursor = requireCursor(manager.getCursorAtMovieTime(initialMovieTimeMs));

    set({
      playing: true,
      animationStartTime: performance.now() - cursor.movieTimeMs / animationSpeed,
      ...createPlaybackPosition(cursor),
    });
  },

  stop: () => {
    const state = get();
    const manager = state.movieTimelineManager;
    const movieTimeMs = resolveCurrentMovieTime(state, performance.now());
    const cursor = manager?.getCursorAtMovieTime?.(movieTimeMs) ?? state.timelineCursor;

    set({
      playing: false,
      animationStartTime: null,
      ...(cursor ? createPlaybackPosition(cursor) : {}),
    });
  },

  setAnimationSpeed: (newSpeed) => {
    const speed = normalizeAnimationSpeed(newSpeed);
    const state = get();

    if (!state.playing || !Number.isFinite(state.animationStartTime)) {
      set({ animationSpeed: speed });
      return;
    }

    const now = performance.now();
    const movieTimeMs = resolveCurrentMovieTime(state, now);
    const manager = requireTimelineManager(state);
    const cursor = requireCursor(manager.getCursorAtMovieTime(movieTimeMs));
    set({
      animationSpeed: speed,
      animationStartTime: now - movieTimeMs / speed,
      ...createPlaybackPosition(cursor),
    });
  },

  goToPosition: (position, direction, options = {}) => {
    const state = get();
    if (state.renderInProgress || state.treeList.length === 0) return;

    const manager = requireTimelineManager(state);
    if (!Number.isFinite(position)) {
      throw new Error('[playbackSlice] navigation position must be finite');
    }
    const requestedFrameIndex = clamp(Math.floor(position), 0, state.treeList.length - 1);
    const cursor = Number.isFinite(options.timelineProgress)
      ? manager.getCursorAtTimelineProgress(clamp(options.timelineProgress, 0, 1))
      : manager.getCursorForFrame(requestedFrameIndex, {
          occurrence: direction === 'backward' ? 'last' : 'semantic',
        });

    set({
      playing: false,
      animationStartTime: null,
      ...createPlaybackPosition(requireCursor(cursor)),
    });
    syncColorManagerForFrame(get, cursor.frameIndex);
  },

  forward: () => {
    const { frameIndex, treeList, goToPosition, renderInProgress } = get();
    if (renderInProgress) return;
    if (frameIndex + 1 < treeList.length) {
      goToPosition(frameIndex + 1, 'forward');
    } else {
      set({ playing: false, animationStartTime: null });
    }
  },

  backward: () => {
    const { frameIndex, goToPosition, renderInProgress } = get();
    if (!renderInProgress) goToPosition(frameIndex - 1, 'backward');
  },

  goToNextInputTree: () => {
    const state = get();
    if (state.renderInProgress) return;
    const nextIndex = selectInputFrameIndices(state).find((index) => index > state.frameIndex);
    if (nextIndex !== undefined) state.goToPosition(nextIndex, 'forward');
  },

  goToPreviousInputTree: () => {
    const state = get();
    if (state.renderInProgress) return;
    const inputTreeIndices = selectInputFrameIndices(state);
    for (let index = inputTreeIndices.length - 1; index >= 0; index -= 1) {
      if (inputTreeIndices[index] < state.frameIndex) {
        state.goToPosition(inputTreeIndices[index], 'backward');
        return;
      }
    }
  },

  setTimelineProgress: (progress) => {
    const state = get();
    const manager = requireTimelineManager(state);
    const numericProgress = Number(progress);
    if (!Number.isFinite(numericProgress)) {
      throw new Error('[playbackSlice] timeline progress must be finite');
    }
    const cursor = requireCursor(manager.getCursorAtTimelineProgress(clamp(numericProgress, 0, 1)));
    set(createPlaybackPosition(cursor));
  },

  setTimelineCursor: (cursor) => set(createPlaybackPosition(requireCursor(cursor))),

  setRenderInProgress: (inProgress) => set({ renderInProgress: inProgress }),

  resetPlayback: () =>
    set({
      playing: false,
      timelineCursor: null,
      animationStartTime: null,
      frameIndex: 0,
      renderInProgress: false,
    }),
});

function createPlaybackPosition(cursor) {
  if (!Number.isInteger(cursor.frameIndex) || !Number.isFinite(cursor.movieTimeMs)) {
    throw new Error('[playbackSlice] timeline cursor requires frameIndex and movieTimeMs');
  }

  return {
    frameIndex: cursor.frameIndex,
    timelineCursor: cursor,
  };
}

function requireTimelineManager(state) {
  const manager = state.movieTimelineManager;
  if (
    !manager ||
    typeof manager.getCursorAtMovieTime !== 'function' ||
    typeof manager.getCursorAtTimelineProgress !== 'function' ||
    typeof manager.getCursorForFrame !== 'function'
  ) {
    throw new Error('[playbackSlice] semantic timeline manager is required');
  }
  return manager;
}

function requireTimelineDuration(manager) {
  const duration = manager.timelineData?.totalDuration;
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error('[playbackSlice] semantic timeline duration is required');
  }
  return duration;
}

function requireCursor(cursor) {
  if (!cursor) throw new Error('[playbackSlice] timeline cursor is required');
  return cursor;
}

function normalizeAnimationSpeed(value) {
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function resolveCurrentMovieTime(state, timestamp) {
  const totalDurationMs = state.movieTimelineManager?.timelineData?.totalDuration;
  if (
    !state.playing ||
    !Number.isFinite(state.animationStartTime) ||
    !Number.isFinite(totalDurationMs)
  ) {
    return Number.isFinite(state.timelineCursor?.movieTimeMs)
      ? state.timelineCursor.movieTimeMs
      : 0;
  }

  const elapsed = Math.max(0, timestamp - state.animationStartTime);
  return clamp(elapsed * normalizeAnimationSpeed(state.animationSpeed), 0, totalDurationMs);
}

function syncColorManagerForFrame(get, frameIndex) {
  get().updateColorManagerForIndex?.(frameIndex);
}
