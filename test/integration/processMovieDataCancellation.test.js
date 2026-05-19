// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/data/apiConfig', () => ({
  resolveApiUrl: vi.fn(async (endpoint) => endpoint)
}));

class MockEventSource {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.listeners = {};
    this.close = vi.fn();
    MockEventSource.instances.push(this);
  }

  addEventListener(type, listener) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  emit(type, data) {
    for (const listener of this.listeners[type] || []) {
      listener({ data });
    }
  }
}

describe('processMovieData cancellation', () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.stubGlobal('EventSource', MockEventSource);
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ channel_id: 'channel-1' })
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('closes the progress stream and stops reporting progress when aborted', async () => {
    const { processMovieData } = await import('../../src/pages/WorkspaceInitialization/services/movieProcessing.js');
    const controller = new AbortController();
    const onProgress = vi.fn();

    const processing = processMovieData(
      { treesFile: new File(['(a);'], 'tree.nwk') },
      onProgress,
      { signal: controller.signal }
    );

    await vi.waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });

    const eventSource = MockEventSource.instances[0];
    controller.abort();
    await Promise.resolve();

    expect(eventSource.close).toHaveBeenCalledTimes(1);

    eventSource.emit('progress', JSON.stringify({ percent: 50, message: 'late progress' }));
    expect(onProgress).not.toHaveBeenCalled();
    await expect(processing).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('resolves only after the movie stream contract completes', async () => {
    const { processMovieData } = await import('../../src/pages/WorkspaceInitialization/services/movieProcessing.js');
    const onProgress = vi.fn();

    const processing = processMovieData(
      { treesFile: new File(['(a);'], 'tree.nwk') },
      onProgress
    );

    await vi.waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });

    const eventSource = MockEventSource.instances[0];
    const metadata = {
      file_name: 'tree.nwk',
      tree_metadata: [],
    };

    eventSource.emit('metadata', JSON.stringify({ metadata }));
    eventSource.emit('trees_chunk', JSON.stringify({
      trees: [{ name: 'a' }],
      start_index: 0,
      end_index: 1,
      total: 2,
    }));
    eventSource.emit('trees_chunk', JSON.stringify({
      trees: [{ name: 'b' }],
      start_index: 1,
      end_index: 2,
      total: 2,
    }));
    eventSource.emit('complete', JSON.stringify({ data: null }));

    await expect(processing).resolves.toEqual({
      ...metadata,
      interpolated_trees: [{ name: 'a' }, { name: 'b' }],
    });
    expect(eventSource.close).toHaveBeenCalledTimes(1);
  });

  it('rejects tree chunks whose indexes do not match the stream contract', async () => {
    const { processMovieData } = await import('../../src/pages/WorkspaceInitialization/services/movieProcessing.js');

    const processing = processMovieData(
      { treesFile: new File(['(a);'], 'tree.nwk') },
      vi.fn()
    );

    await vi.waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });

    const eventSource = MockEventSource.instances[0];
    eventSource.emit('metadata', JSON.stringify({
      metadata: {
        file_name: 'tree.nwk',
        tree_metadata: [],
      },
    }));
    eventSource.emit('trees_chunk', JSON.stringify({
      trees: [{ name: 'a' }],
      start_index: 0,
      end_index: '1',
      total: 1,
    }));
    eventSource.emit('complete', JSON.stringify({ data: null }));

    await expect(processing).rejects.toThrow('Invalid tree chunk indexes from tree processing stream');
    expect(eventSource.close).toHaveBeenCalledTimes(1);
  });

  it('rejects completion when the streamed chunks are incomplete', async () => {
    const { processMovieData } = await import('../../src/pages/WorkspaceInitialization/services/movieProcessing.js');

    const processing = processMovieData(
      { treesFile: new File(['(a);'], 'tree.nwk') },
      vi.fn()
    );

    await vi.waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });

    const eventSource = MockEventSource.instances[0];
    eventSource.emit('metadata', JSON.stringify({
      metadata: {
        file_name: 'tree.nwk',
        tree_metadata: [],
      },
    }));
    eventSource.emit('trees_chunk', JSON.stringify({
      trees: [{ name: 'a' }],
      start_index: 0,
      end_index: 1,
      total: 2,
    }));
    eventSource.emit('complete', JSON.stringify({ data: null }));

    await expect(processing).rejects.toThrow('Tree stream ended after 1 trees, expected 2');
    expect(eventSource.close).toHaveBeenCalledTimes(1);
  });

  it('rejects legacy complete-event movie payloads without stream metadata', async () => {
    const { processMovieData } = await import('../../src/pages/WorkspaceInitialization/services/movieProcessing.js');

    const processing = processMovieData(
      { treesFile: new File(['(a);'], 'tree.nwk') },
      vi.fn()
    );

    await vi.waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });

    const eventSource = MockEventSource.instances[0];
    eventSource.emit('complete', JSON.stringify({
      data: { interpolated_trees: [] },
    }));

    await expect(processing).rejects.toThrow('Complete event received before metadata event');
    expect(eventSource.close).toHaveBeenCalledTimes(1);
  });
});
