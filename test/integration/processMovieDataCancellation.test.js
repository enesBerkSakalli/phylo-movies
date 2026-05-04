// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/data/apiConfig', () => ({
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
    const { processMovieData } = await import('@/pages/WorkspaceInitialization/services/movieProcessing.js');
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
});
