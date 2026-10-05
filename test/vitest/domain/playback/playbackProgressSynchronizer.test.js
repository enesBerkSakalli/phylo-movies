import { describe, expect, it, vi } from 'vitest';
import { createPlaybackProgressSynchronizer } from '../../../../src/treeVisualisation/systems/PlaybackProgressSynchronizer.js';

describe('PlaybackProgressSynchronizer', () => {
  it('seeks the store to the playback movie time and prefetches ahead of the cursor', () => {
    const seek = vi.fn();
    const prefetchFrame = vi.fn();
    const syncProgress = createPlaybackProgressSynchronizer({
      getState: () => ({ seek, frameIndex: 2 }),
      isPrefetchEnabled: () => true,
      prefetchFrame,
    });

    syncProgress({ movieTimeMs: 4200 });

    expect(seek).toHaveBeenCalledWith(4200);
    expect(prefetchFrame).toHaveBeenNthCalledWith(1, 3);
    expect(prefetchFrame).toHaveBeenNthCalledWith(2, 4);
  });
});
