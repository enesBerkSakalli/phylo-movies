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

    const { timeline, animationSpeed } = state;
    const storedMovieTimeMs = state.timelineCursor?.movieTimeMs ?? 0;
    const cursor = timeline.cursorAt(
      storedMovieTimeMs < timeline.totalDuration ? storedMovieTimeMs : 0
    );

    set({
      playing: true,
      animationStartTime: performance.now() - cursor.movieTimeMs / animationSpeed,
      ...positionOf(cursor),
    });
  },

  stop: () => {
    const state = get();
    const cursor =
      state.timeline?.cursorAt(movieTimeAt(state, performance.now())) ?? state.timelineCursor;

    set({
      playing: false,
      animationStartTime: null,
      ...(cursor ? positionOf(cursor) : {}),
    });
  },

  setAnimationSpeed: (newSpeed) => {
    const speed = Number.isFinite(newSpeed) && newSpeed > 0 ? newSpeed : 1;
    const state = get();

    if (!state.playing) {
      set({ animationSpeed: speed });
      return;
    }

    const now = performance.now();
    const movieTimeMs = movieTimeAt(state, now);
    set({
      animationSpeed: speed,
      animationStartTime: now - movieTimeMs / speed,
      ...positionOf(state.timeline.cursorAt(movieTimeMs)),
    });
  },

  goToPosition: (position, direction, options = {}) => {
    const state = get();
    if (state.renderInProgress || state.treeList.length === 0) return;

    const { timeline } = state;
    const cursor = Number.isFinite(options.movieTimeMs)
      ? timeline.cursorAt(options.movieTimeMs)
      : timeline.cursorForFrame(clamp(Math.floor(position), 0, state.treeList.length - 1), {
          occurrence: direction === 'backward' ? 'last' : 'semantic',
        });

    set({ playing: false, animationStartTime: null, ...positionOf(cursor) });
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
    const previous = selectInputFrameIndices(state).findLast((index) => index < state.frameIndex);
    if (previous !== undefined) state.goToPosition(previous, 'backward');
  },

  seek: (movieTimeMs) => set(positionOf(get().timeline.cursorAt(movieTimeMs))),

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

function positionOf(cursor) {
  return { frameIndex: cursor.frameIndex, timelineCursor: cursor };
}

/** Movie time on the playback clock at `now`; where the cursor rests when not playing. */
export function movieTimeAt(state, now) {
  if (!state.playing) return state.timelineCursor?.movieTimeMs ?? 0;
  return clamp(
    (now - state.animationStartTime) * state.animationSpeed,
    0,
    state.timeline.totalDuration
  );
}

function syncColorManagerForFrame(get, frameIndex) {
  get().updateColorManagerForIndex?.(frameIndex);
}
