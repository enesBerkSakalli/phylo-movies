import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../../src/state/phyloStore/store.js';

const trees = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

const resetPlaybackState = () => {
  useAppStore.setState({
    playing: false,
    timelineCursor: null,
    animationStartTime: null,
    animationSpeed: 1,
    frameIndex: 0,
    renderInProgress: false,
    treeList: [],
    movieTimelineManager: null,
  });
};

function createManager(overrides = {}) {
  return {
    timelineData: { totalDuration: 17_000 },
    getCursorForFrame: vi.fn(),
    getCursorAtMovieTime: vi.fn(),
    getCursorAtTimelineProgress: vi.fn(),
    ...overrides,
  };
}

describe('playback navigation', () => {
  afterEach(() => {
    resetPlaybackState();
    vi.restoreAllMocks();
  });

  it('pauses playback and replaces the complete semantic position when seeking', () => {
    const cursor = {
      frameIndex: 2,
      inputTreeIndex: 2,
      sourceFrameIndex: 2,
      msaWindowIndex: 2,
      movieTimeMs: 3000,
      timelineProgress: 0.75,
    };
    const getCursorForFrame = vi.fn(() => cursor);

    useAppStore.setState({
      playing: true,
      animationStartTime: 1000,
      treeList: trees,
      frameIndex: 0,
      movieTimelineManager: createManager({ getCursorForFrame }),
    });

    useAppStore.getState().goToPosition(2, 'forward');

    const state = useAppStore.getState();
    expect(state.playing).toBe(false);
    expect(state.animationStartTime).toBe(null);
    expect(state.frameIndex).toBe(2);
    expect(state.timelineCursor).toBe(cursor);
    expect(state.timelineCursor.movieTimeMs).toBe(3000);
    expect(getCursorForFrame).toHaveBeenCalledWith(2, { occurrence: 'semantic' });
  });

  it('uses an explicit timeline position even when the frame index is unchanged', () => {
    const cursor = {
      frameIndex: 1,
      inputTreeIndex: 1,
      sourceFrameIndex: 1,
      msaWindowIndex: 1,
      movieTimeMs: 2600,
      timelineProgress: 0.65,
    };
    const getCursorAtTimelineProgress = vi.fn(() => cursor);

    useAppStore.setState({
      playing: true,
      animationStartTime: 1000,
      treeList: trees,
      frameIndex: 1,
      movieTimelineManager: createManager({ getCursorAtTimelineProgress }),
    });

    useAppStore.getState().goToPosition(1, 'forward', { timelineProgress: 0.65 });

    const state = useAppStore.getState();
    expect(state.playing).toBe(false);
    expect(state.animationStartTime).toBe(null);
    expect(state.frameIndex).toBe(1);
    expect(state.timelineCursor).toBe(cursor);
    expect(state.timelineCursor.movieTimeMs).toBe(2600);
    expect(getCursorAtTimelineProgress).toHaveBeenCalledWith(0.65);
  });

  it('captures the exact semantic movie position when pausing inside a hold', () => {
    vi.spyOn(performance, 'now').mockReturnValue(10_000);
    const cursor = {
      frameIndex: 7,
      inputTreeIndex: 1,
      sourceFrameIndex: 7,
      msaWindowIndex: 7,
      movieTimeMs: 9000,
      timelineProgress: 9000 / 17_000,
    };
    const getCursorAtMovieTime = vi.fn(() => cursor);

    useAppStore.setState({
      playing: true,
      animationStartTime: 1000,
      animationSpeed: 1,
      treeList: Array.from({ length: 13 }, (_, index) => ({ id: index })),
      frameIndex: 7,
      movieTimelineManager: createManager({ getCursorAtMovieTime }),
    });

    useAppStore.getState().stop();

    const state = useAppStore.getState();
    expect(state.playing).toBe(false);
    expect(state.animationStartTime).toBe(null);
    expect(state.timelineCursor).toBe(cursor);
    expect(state.timelineCursor.movieTimeMs).toBe(9000);
    expect(getCursorAtMovieTime).toHaveBeenCalledWith(9000);
  });

  it('resumes from a final input-tree hold that has not reached movie end', () => {
    vi.spyOn(performance, 'now').mockReturnValue(20_000);
    const cursor = {
      frameIndex: 12,
      inputTreeIndex: 1,
      sourceFrameIndex: 12,
      msaWindowIndex: 12,
      movieTimeMs: 16_000,
      timelineProgress: 16_000 / 17_000,
    };
    const getCursorAtMovieTime = vi.fn(() => cursor);

    useAppStore.setState({
      playing: false,
      timelineCursor: cursor,
      animationStartTime: null,
      animationSpeed: 1,
      treeList: Array.from({ length: 13 }, (_, index) => ({ id: index })),
      frameIndex: 12,
      movieTimelineManager: createManager({ getCursorAtMovieTime }),
    });

    useAppStore.getState().play();

    const state = useAppStore.getState();
    expect(state.playing).toBe(true);
    expect(state.frameIndex).toBe(12);
    expect(state.timelineCursor).toBe(cursor);
    expect(state.timelineCursor.movieTimeMs).toBe(16_000);
    expect(state.animationStartTime).toBe(4000);
    expect(getCursorAtMovieTime).toHaveBeenCalledWith(16_000);
  });
});
