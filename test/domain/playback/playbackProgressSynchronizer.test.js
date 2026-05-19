import { describe, expect, it, vi } from 'vitest';
import { createPlaybackProgressSynchronizer } from '../../../src/treeVisualisation/systems/PlaybackProgressSynchronizer.js';

describe('PlaybackProgressSynchronizer', () => {
  it('maps linear progress through semantic timeline progress before syncing the store', () => {
    const setPlayhead = vi.fn();
    const prefetchFrame = vi.fn();
    const getTimelineProgressForLinearTreeProgress = vi.fn(() => 0.6);
    const state = {
      treeList: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }],
      movieTimelineManager: {
        getTimelineProgressForLinearTreeProgress
      },
      setPlayhead
    };
    const syncProgress = createPlaybackProgressSynchronizer({
      getState: () => state,
      isPrefetchEnabled: () => true,
      prefetchFrame
    });

    syncProgress(0.25);

    expect(getTimelineProgressForLinearTreeProgress).toHaveBeenCalledWith(0.25, 5);
    expect(setPlayhead).toHaveBeenCalledWith({
      animationProgress: 0.25,
      timelineProgress: 0.6,
      frameIndex: 1
    });
    expect(prefetchFrame).toHaveBeenNthCalledWith(1, 2);
    expect(prefetchFrame).toHaveBeenNthCalledWith(2, 3);
  });

  it('honors cursor-shaped playback state supplied by the animation runner', () => {
    const setPlayhead = vi.fn();
    const prefetchFrame = vi.fn();
    const state = {
      treeList: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
      setPlayhead
    };
    const syncProgress = createPlaybackProgressSynchronizer({
      getState: () => state,
      isPrefetchEnabled: () => true,
      prefetchFrame
    });

    syncProgress(0.1, {
      timelineProgress: 0.4,
      frameIndex: 2
    });

    expect(setPlayhead).toHaveBeenCalledWith({
      animationProgress: 0.1,
      timelineProgress: 0.4,
      frameIndex: 2
    });
    expect(prefetchFrame).toHaveBeenNthCalledWith(1, 3);
    expect(prefetchFrame).toHaveBeenNthCalledWith(2, 4);
  });
});
