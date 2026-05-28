// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/data/apiConfig', () => ({
  resolveApiUrl: vi.fn(async (endpoint) => endpoint),
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

function makeStreamMetadata(fileName = 'tree.nwk') {
  return {
    file_name: fileName,
    frames: [
      {
        frame_index: 0,
        frame_type: 'input_tree',
        state_semantics: 'processed_input_tree',
        is_observed_input: true,
        input_tree_index: 0,
        pair_id: null,
        pair_ordinal: null,
        local_step_index: null,
        source_frame_index: null,
        target_frame_index: null,
      },
      {
        frame_index: 1,
        frame_type: 'input_tree',
        state_semantics: 'processed_input_tree',
        is_observed_input: true,
        input_tree_index: 1,
        pair_id: null,
        pair_ordinal: null,
        local_step_index: null,
        source_frame_index: null,
        target_frame_index: null,
      },
    ],
    pairs: [],
    temporal_events: [],
    subtree_highlight_tracking: [null, null],
    pair_metrics: { rows: [], semantics: {} },
    msa: { sequences: null, window_size: 1, step_size: 1 },
  };
}

describe('processMovieData cancellation', () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.stubGlobal('EventSource', MockEventSource);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ channel_id: 'channel-1' }),
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('closes the progress stream and stops reporting progress when aborted', async () => {
    const { processMovieData } =
      await import('../../src/pages/WorkspaceInitialization/services/movieProcessing.js');
    const controller = new AbortController();
    const onProgress = vi.fn();

    const processing = processMovieData({ treesFile: new File(['(a);'], 'tree.nwk') }, onProgress, {
      signal: controller.signal,
    });

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
    const { processMovieData } =
      await import('../../src/pages/WorkspaceInitialization/services/movieProcessing.js');
    const onProgress = vi.fn();

    const processing = processMovieData({ treesFile: new File(['(a);'], 'tree.nwk') }, onProgress);

    await vi.waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });

    const eventSource = MockEventSource.instances[0];
    const metadata = makeStreamMetadata();

    eventSource.emit('metadata', JSON.stringify({ metadata }));
    eventSource.emit(
      'trees_chunk',
      JSON.stringify({
        trees: [{ name: 'a' }],
        start_index: 0,
        end_index: 1,
        total: 2,
      })
    );
    eventSource.emit(
      'trees_chunk',
      JSON.stringify({
        trees: [{ name: 'b' }],
        start_index: 1,
        end_index: 2,
        total: 2,
      })
    );
    eventSource.emit('complete', JSON.stringify({ data: null }));

    await expect(processing).resolves.toEqual({
      ...metadata,
      interpolated_trees: [{ name: 'a' }, { name: 'b' }],
    });
    expect(eventSource.close).toHaveBeenCalledTimes(1);
  });

  it('rejects tree chunks whose indexes do not match the stream contract', async () => {
    const { processMovieData } =
      await import('../../src/pages/WorkspaceInitialization/services/movieProcessing.js');

    const processing = processMovieData({ treesFile: new File(['(a);'], 'tree.nwk') }, vi.fn());

    await vi.waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });

    const eventSource = MockEventSource.instances[0];
    eventSource.emit(
      'metadata',
      JSON.stringify({
        metadata: {
          ...makeStreamMetadata(),
        },
      })
    );
    eventSource.emit(
      'trees_chunk',
      JSON.stringify({
        trees: [{ name: 'a' }],
        start_index: 0,
        end_index: '1',
        total: 1,
      })
    );
    eventSource.emit('complete', JSON.stringify({ data: null }));

    await expect(processing).rejects.toThrow(
      'Tree processing stream contract error: tree chunk indexes are invalid'
    );
    expect(eventSource.close).toHaveBeenCalledTimes(1);
  });

  it('rejects completion when the streamed chunks are incomplete', async () => {
    const { processMovieData } =
      await import('../../src/pages/WorkspaceInitialization/services/movieProcessing.js');

    const processing = processMovieData({ treesFile: new File(['(a);'], 'tree.nwk') }, vi.fn());

    await vi.waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });

    const eventSource = MockEventSource.instances[0];
    eventSource.emit(
      'metadata',
      JSON.stringify({
        metadata: {
          ...makeStreamMetadata(),
        },
      })
    );
    eventSource.emit(
      'trees_chunk',
      JSON.stringify({
        trees: [{ name: 'a' }],
        start_index: 0,
        end_index: 1,
        total: 2,
      })
    );
    eventSource.emit('complete', JSON.stringify({ data: null }));

    await expect(processing).rejects.toThrow(
      'Tree processing stream contract error: stream ended after 1 trees, expected 2.'
    );
    expect(eventSource.close).toHaveBeenCalledTimes(1);
  });

  it('rejects legacy complete-event movie payloads without stream metadata', async () => {
    const { processMovieData } =
      await import('../../src/pages/WorkspaceInitialization/services/movieProcessing.js');

    const processing = processMovieData({ treesFile: new File(['(a);'], 'tree.nwk') }, vi.fn());

    await vi.waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });

    const eventSource = MockEventSource.instances[0];
    eventSource.emit(
      'complete',
      JSON.stringify({
        data: { interpolated_trees: [] },
      })
    );

    await expect(processing).rejects.toThrow(
      'Tree processing stream contract error: completion arrived before metadata.'
    );
    expect(eventSource.close).toHaveBeenCalledTimes(1);
  });

  it('wraps backend upload rejections with status and retry guidance', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ error: 'Tree file is empty' }),
    }));

    const { processMovieData } =
      await import('../../src/pages/WorkspaceInitialization/services/movieProcessing.js');

    await expect(
      processMovieData({ treesFile: new File([''], 'empty.nwk') }, vi.fn())
    ).rejects.toThrow(
      'The backend rejected the dataset upload (400 Bad Request). Check the selected files and tree-inference settings, then try again. Backend response: Tree file is empty'
    );
  });

  it('explains proxy failures as backend reachability failures', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: async () => {
        throw new Error('not json');
      },
      text: async () => 'Proxy error: ECONNREFUSED 127.0.0.1:5002',
    }));

    const { processMovieData } =
      await import('../../src/pages/WorkspaceInitialization/services/movieProcessing.js');

    await expect(
      processMovieData({ treesFile: new File(['(a);'], 'tree.nwk') }, vi.fn())
    ).rejects.toThrow(
      'The frontend could not reach the BranchArchitect backend (502 Bad Gateway). Start or restart the backend with ./start.sh, confirm http://127.0.0.1:5002/health reports ready, then try again. Backend response: Proxy error: ECONNREFUSED 127.0.0.1:5002'
    );
  });
});
