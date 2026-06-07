import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../../src/state/phyloStore/store.js';

const trees = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

const resetPlaybackState = () => {
  useAppStore.setState({
    playing: false,
    animationStartTime: null,
    animationSpeed: 1,
    transitionDuration: 1,
    pauseDuration: 0,
    playhead: {
      animationProgress: 0,
      timelineProgress: null,
    },
    frameIndex: 0,
    navigationDirection: 'forward',
    renderInProgress: false,
    treeList: [],
    movieTimelineManager: null,
    timelineCursor: null,
  });
};

describe('playback navigation', () => {
  afterEach(() => {
    resetPlaybackState();
  });

  it('pauses playback when navigation seeks to another frame', () => {
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
      movieTimelineManager: {
        getCursorForFrame,
      },
      playhead: {
        animationProgress: 0,
        timelineProgress: 0,
      },
    });

    useAppStore.getState().goToPosition(2, 'jump');

    const state = useAppStore.getState();
    expect(state.playing).toBe(false);
    expect(state.animationStartTime).toBe(null);
    expect(state.frameIndex).toBe(2);
    expect(state.navigationDirection).toBe('jump');
    expect(state.playhead).toEqual({
      animationProgress: 1,
      timelineProgress: 0.75,
    });
    expect(state.timelineCursor).toBe(cursor);
    expect(getCursorForFrame).toHaveBeenCalledWith(2, {});
  });

  it('refreshes timeline progress when navigation seeks to the current frame with an explicit timeline position', () => {
    useAppStore.setState({
      playing: true,
      animationStartTime: 1000,
      treeList: trees,
      frameIndex: 1,
      playhead: {
        animationProgress: 0.5,
        timelineProgress: 0.5,
      },
      movieTimelineManager: {
        getCursorAtTimelineProgress: vi.fn((timelineProgress) => ({
          frameIndex: 1,
          inputTreeIndex: 1,
          sourceFrameIndex: 1,
          msaWindowIndex: 1,
          movieTimeMs: 2600,
          timelineProgress,
        })),
      },
    });

    useAppStore.getState().goToPosition(1, 'jump', { timelineProgress: 0.65 });

    const state = useAppStore.getState();
    expect(state.playing).toBe(false);
    expect(state.animationStartTime).toBe(null);
    expect(state.frameIndex).toBe(1);
    expect(state.navigationDirection).toBe('jump');
    expect(state.playhead).toEqual({
      animationProgress: 0.5,
      timelineProgress: 0.65,
    });
    expect(state.timelineCursor).toMatchObject({
      frameIndex: 1,
      timelineProgress: 0.65,
    });
  });

  it('preserves exact semantic timeline progress when playback pauses inside a hold', () => {
    const pauseProgress = 9000 / 17000;
    const holdStartProgress = 8700 / 17000;
    const cursor = {
      frameIndex: 7,
      inputTreeIndex: 1,
      sourceFrameIndex: 7,
      msaWindowIndex: 7,
      movieTimeMs: 9000,
      timelineProgress: pauseProgress,
    };
    const getCursorAtTimelineProgress = vi.fn(() => cursor);

    useAppStore.setState({
      playing: true,
      animationStartTime: 1000,
      treeList: Array.from({ length: 13 }, (_, index) => ({ id: index })),
      frameIndex: 7,
      movieTimelineManager: {
        getTimelineProgressForLinearTreeProgress: vi.fn(() => holdStartProgress),
        getCursorAtTimelineProgress,
      },
      playhead: {
        animationProgress: 7 / 12,
        timelineProgress: pauseProgress,
      },
    });

    useAppStore.getState().stop();

    const state = useAppStore.getState();
    expect(state.playing).toBe(false);
    expect(state.animationStartTime).toBe(null);
    expect(state.playhead.timelineProgress).toBe(pauseProgress);
    expect(state.timelineCursor).toBe(cursor);
    expect(getCursorAtTimelineProgress).toHaveBeenCalledWith(pauseProgress);
  });

  it('resumes from final input-tree hold instead of restarting when semantic time has not finished', () => {
    const previousPerformance = globalThis.performance;
    const now = 20_000;
    globalThis.performance = {
      ...(previousPerformance || {}),
      now: () => now,
    };

    try {
      const timelineProgress = 16000 / 17000;
      const cursor = {
        frameIndex: 12,
        inputTreeIndex: 1,
        sourceFrameIndex: 12,
        msaWindowIndex: 12,
        movieTimeMs: 16000,
        timelineProgress,
      };

      useAppStore.setState({
        playing: false,
        animationStartTime: null,
        animationSpeed: 1,
        transitionDuration: 1,
        pauseDuration: 0,
        treeList: Array.from({ length: 13 }, (_, index) => ({ id: index })),
        frameIndex: 12,
        movieTimelineManager: {
          timelineData: { totalDuration: 17000 },
          resolveFrameAtTimelineProgress: vi.fn(() => ({
            sourceTreeIndex: 12,
            targetTreeIndex: 12,
            transitionProgress: 0,
          })),
          getCursorAtTimelineProgress: vi.fn(() => cursor),
        },
        playhead: {
          animationProgress: 1,
          timelineProgress,
        },
      });

      useAppStore.getState().play();

      const state = useAppStore.getState();
      expect(state.playing).toBe(true);
      expect(state.frameIndex).toBe(12);
      expect(state.playhead.timelineProgress).toBe(timelineProgress);
      expect(state.playhead.animationProgress).toBe(1);
      expect(state.animationStartTime).toBe(now - 16000);
    } finally {
      globalThis.performance = previousPerformance;
    }
  });
});
