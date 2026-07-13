import { describe, expect, it, vi } from 'vitest';
import { createPlaybackProgressSynchronizer } from '../../../src/treeVisualisation/systems/PlaybackProgressSynchronizer.js';

describe('PlaybackProgressSynchronizer', () => {
  it('syncs semantic movie time and its cursor as one playback position', () => {
    const setTimelineCursor = vi.fn();
    const prefetchFrame = vi.fn();
    const cursor = {
      frameIndex: 2,
      movieTimeMs: 4200,
      timelineProgress: 0.4,
    };
    const syncProgress = createPlaybackProgressSynchronizer({
      getState: () => ({ setTimelineCursor }),
      isPrefetchEnabled: () => true,
      prefetchFrame,
    });

    syncProgress({ timelineCursor: cursor });

    expect(setTimelineCursor).toHaveBeenCalledWith(cursor);
    expect(prefetchFrame).toHaveBeenNthCalledWith(1, 3);
    expect(prefetchFrame).toHaveBeenNthCalledWith(2, 4);
  });

  it('rejects progress updates without a semantic cursor', () => {
    const syncProgress = createPlaybackProgressSynchronizer({
      getState: () => ({ setTimelineCursor: vi.fn() }),
    });

    expect(() => syncProgress()).toThrow('timeline cursor is required');
  });
});
