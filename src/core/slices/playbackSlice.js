import { clamp } from '../../domain/math/mathUtils.js';
import { selectInputFrameIndices } from '../../state/phyloStore/selectors/treeSelectors.js';
import { TransitionFrame } from '../../treeVisualisation/TransitionFrame.js';

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

    const timeline = requireTimeline(state);
    const totalDurationMs = requireTimelineDuration(timeline);
    const animationSpeed = normalizeAnimationSpeed(state.animationSpeed);
    const storedMovieTimeMs = state.timelineCursor?.movieTimeMs ?? 0;
    const initialMovieTimeMs =
      Number.isFinite(storedMovieTimeMs) && storedMovieTimeMs < totalDurationMs
        ? clamp(storedMovieTimeMs, 0, totalDurationMs)
        : 0;
    const cursor = requireCursor(timeline.cursorAt(initialMovieTimeMs));

    set({
      playing: true,
      animationStartTime: performance.now() - cursor.movieTimeMs / animationSpeed,
      ...createPlaybackPosition(cursor),
    });
  },

  stop: () => {
    const state = get();
    const movieTimeMs = resolveCurrentMovieTime(state, performance.now());
    const cursor = state.timeline?.cursorAt(movieTimeMs) ?? state.timelineCursor;

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
    const cursor = requireCursor(requireTimeline(state).cursorAt(movieTimeMs));
    set({
      animationSpeed: speed,
      animationStartTime: now - movieTimeMs / speed,
      ...createPlaybackPosition(cursor),
    });
  },

  goToPosition: (position, direction, options = {}) => {
    const state = get();
    if (state.renderInProgress || state.treeList.length === 0) return;

    const timeline = requireTimeline(state);
    if (!Number.isFinite(position)) {
      throw new Error('[playbackSlice] navigation position must be finite');
    }
    const requestedFrameIndex = clamp(Math.floor(position), 0, state.treeList.length - 1);
    const cursor = Number.isFinite(options.movieTimeMs)
      ? timeline.cursorAt(options.movieTimeMs)
      : timeline.cursorForFrame(requestedFrameIndex, {
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

  seek: (movieTimeMs) => {
    if (!Number.isFinite(movieTimeMs)) {
      throw new Error('[playbackSlice] movie time must be finite');
    }
    set(createPlaybackPosition(requireCursor(requireTimeline(get()).cursorAt(movieTimeMs))));
  },

  /** The frame to draw at a movie time, with its trees hydrated; null when they are unavailable. */
  frameAt: (movieTimeMs) => {
    const { timeline, ensureTreesHydrated } = get();
    const frame = timeline?.frameAt(movieTimeMs);
    if (!frame) return null;

    const [sourceTree, targetTree] =
      ensureTreesHydrated?.([frame.sourceTreeIndex, frame.targetTreeIndex]) ?? [];
    return sourceTree && targetTree
      ? TransitionFrame.from({ ...frame, sourceTree, targetTree })
      : null;
  },

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

function requireTimeline(state) {
  const timeline = state.timeline;
  if (
    !timeline ||
    typeof timeline.cursorAt !== 'function' ||
    typeof timeline.cursorForFrame !== 'function'
  ) {
    throw new Error('[playbackSlice] semantic timeline is required');
  }
  return timeline;
}

function requireTimelineDuration(timeline) {
  const duration = timeline.totalDuration;
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
  const totalDurationMs = state.timeline?.totalDuration;
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
