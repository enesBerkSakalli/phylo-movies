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
  });
};

describe('playback navigation', () => {
  afterEach(() => {
    resetPlaybackState();
  });

  it('pauses playback when navigation seeks to another frame', () => {
    const getTimelineProgressForFrameIndex = vi.fn(() => 0.75);

    useAppStore.setState({
      playing: true,
      animationStartTime: 1000,
      treeList: trees,
      frameIndex: 0,
      movieTimelineManager: {
        getTimelineProgressForFrameIndex,
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
    expect(getTimelineProgressForFrameIndex).toHaveBeenCalledWith(2);
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
  });
});
