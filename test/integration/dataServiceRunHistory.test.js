import { beforeEach, describe, expect, it, vi } from 'vitest';
import { smallExampleMovieData } from '../fixtures/timeline/generatedMovieData.js';

const memoryStore = vi.hoisted(() => new Map());
const failingSetKeys = vi.hoisted(() => new Set());

vi.mock('localforage', () => ({
  default: {
    async getItem(key) {
      return memoryStore.get(key) ?? null;
    },
    async setItem(key, value) {
      for (const pattern of failingSetKeys) {
        const [keyPattern, errorName = 'DataCloneError'] = Array.isArray(pattern)
          ? pattern
          : [pattern, 'DataCloneError'];
        if (key.includes(keyPattern)) {
          const error = new Error(
            errorName === 'QuotaExceededError' ? 'quota exceeded' : 'out of memory'
          );
          error.name = errorName;
          throw error;
        }
      }
      memoryStore.set(key, structuredClone(value));
    },
    async removeItem(key) {
      memoryStore.delete(key);
    },
  },
}));

describe('phyloData run history', () => {
  beforeEach(() => {
    memoryStore.clear();
    failingSetKeys.clear();
  });

  it('stores processed runs in an openable history map', async () => {
    const { phyloData } = await import('../../src/services/data/dataService.js');

    const firstRun = makePayload('First run');
    const secondRun = makePayload('Second run');

    await phyloData.set(firstRun, { label: 'First run' });
    await phyloData.set(secondRun, { label: 'Second run' });

    const runs = await phyloData.listRuns();
    expect(runs.map((run) => run.label)).toEqual(['Second run', 'First run']);
    expect(runs[0]).toMatchObject({
      sourceType: 'Integration fixture',
      treeCount: 10,
      frameCount: secondRun.frames.length,
      interpolatedTreeCount: secondRun.interpolated_trees.length,
      treeChunkCount: 1,
      payloadSchemaVersion: 2,
      windowing: '1500 sites, 1000-site step',
      support: 'SH-aLRT, 1000 replicates',
    });
    expect(runs[0].payloadHash).toMatch(/^[a-f0-9]{64}$/);
    expect(memoryStore.get(`phyloMovieRun:${runs[0].id}`)).toMatchObject({
      __phyloChunkedPayload: true,
      treeCount: secondRun.interpolated_trees.length,
      treeChunkCount: 1,
    });
    expect(memoryStore.get(`phyloMovieRun:${runs[0].id}`)).not.toHaveProperty(
      'interpolated_trees'
    );
    expect(memoryStore.get(`phyloMovieRun:${runs[0].id}:trees:0`)).toHaveLength(
      secondRun.interpolated_trees.length
    );

    await phyloData.openRun(runs[1].id);
    expect(memoryStore.get('phyloMovieData')).toMatchObject({
      __phyloRunRef: true,
      runId: runs[1].id,
      payloadSchemaVersion: 2,
    });
    expect((await phyloData.get()).dataset_provenance.source_label).toBe('First run');
  });

  it('does not stringify interpolated tree payloads when creating run metadata', async () => {
    const stringifySpy = vi.spyOn(JSON, 'stringify');
    const { phyloData } = await import('../../src/services/data/dataService.js');

    try {
      await phyloData.set(makePayload('Large run'), { label: 'Large run' });

      expect(
        stringifySpy.mock.calls.some(([value]) =>
          Object.prototype.hasOwnProperty.call(value || {}, 'interpolated_trees')
        )
      ).toBe(false);
    } finally {
      stringifySpy.mockRestore();
    }
  });

  it('stores trusted transport payloads without deep tree validation', async () => {
    const { phyloData } = await import('../../src/services/data/dataService.js');
    const basePayload = makePayload('Trusted run');
    const payload = {
      ...basePayload,
      interpolated_trees: basePayload.frames.map(() => [0]),
    };

    await expect(phyloData.set(payload, { label: 'Trusted run' })).resolves.toMatchObject({
      interpolated_trees: payload.interpolated_trees,
    });
  });

  it('opens multi-chunk run payloads in tree order', async () => {
    const { phyloData } = await import('../../src/services/data/dataService.js');
    const payload = makeChunkedPayload('Chunked run', 257);

    await phyloData.set(payload, { label: 'Chunked run' });
    const [run] = await phyloData.listRuns();

    expect(run.treeChunkCount).toBe(3);
    expect(memoryStore.get(`phyloMovieRun:${run.id}:trees:0`)).toHaveLength(128);
    expect(memoryStore.get(`phyloMovieRun:${run.id}:trees:1`)).toHaveLength(128);
    expect(memoryStore.get(`phyloMovieRun:${run.id}:trees:2`)).toHaveLength(1);

    await phyloData.openRun(run.id);

    expect((await phyloData.get()).interpolated_trees).toEqual(payload.interpolated_trees);
  });

  it('keeps oversized datasets available in memory when browser storage rejects chunks', async () => {
    const { phyloData } = await import('../../src/services/data/dataService.js');
    const payload = makeChunkedPayload('Memory-only run', 257);
    failingSetKeys.add(':trees:1');

    await expect(phyloData.set(payload, { label: 'Memory-only run' })).resolves.toMatchObject({
      interpolated_trees: payload.interpolated_trees,
    });

    expect(memoryStore.has('phyloMovieData')).toBe(false);
    expect((await phyloData.listRuns()).map((run) => run.label)).toEqual([]);
    expect((await phyloData.get()).interpolated_trees).toEqual(payload.interpolated_trees);
  });

  it('keeps oversized datasets available in memory when browser storage quota is exceeded', async () => {
    const { phyloData } = await import('../../src/services/data/dataService.js');
    const payload = makeChunkedPayload('Quota fallback run', 257);
    failingSetKeys.add([':trees:1', 'QuotaExceededError']);

    await expect(phyloData.set(payload, { label: 'Quota fallback run' })).resolves.toMatchObject({
      interpolated_trees: payload.interpolated_trees,
    });

    expect(memoryStore.has('phyloMovieData')).toBe(false);
    expect((await phyloData.listRuns()).map((run) => run.label)).toEqual([]);
    expect((await phyloData.get()).interpolated_trees).toEqual(payload.interpolated_trees);
  });

  it('removes run payloads and clears the active pointer when deleting the open run', async () => {
    const { phyloData } = await import('../../src/services/data/dataService.js');

    await phyloData.set(makePayload('Run to remove'), { label: 'Run to remove' });
    const [run] = await phyloData.listRuns();

    await phyloData.deleteRun(run.id);

    expect(await phyloData.listRuns()).toEqual([]);
    expect(memoryStore.has(`phyloMovieRun:${run.id}`)).toBe(false);
    expect(memoryStore.has(`phyloMovieRun:${run.id}:trees:0`)).toBe(false);
    expect(await phyloData.get()).toBeNull();
  });

  it('removes chunk payloads even when the run index record is missing', async () => {
    const { phyloData } = await import('../../src/services/data/dataService.js');

    await phyloData.set(makeChunkedPayload('Orphan chunk run', 257), { label: 'Orphan chunk run' });
    const [run] = await phyloData.listRuns();
    memoryStore.set('phyloMovieRuns', []);

    await phyloData.deleteRun(run.id);

    expect(memoryStore.has(`phyloMovieRun:${run.id}`)).toBe(false);
    expect(memoryStore.has(`phyloMovieRun:${run.id}:trees:0`)).toBe(false);
    expect(memoryStore.has(`phyloMovieRun:${run.id}:trees:1`)).toBe(false);
    expect(memoryStore.has(`phyloMovieRun:${run.id}:trees:2`)).toBe(false);
  });

  it('prunes saved runs from older payload schema versions', async () => {
    const { phyloData } = await import('../../src/services/data/dataService.js');
    memoryStore.set('phyloMovieRuns', [makeRunRecord('old-run', 1)]);
    memoryStore.set('phyloMovieRun:old-run', makePayload('Old run'));

    expect(await phyloData.listRuns()).toEqual([]);
    expect(memoryStore.get('phyloMovieRuns')).toEqual([]);
    expect(memoryStore.has('phyloMovieRun:old-run')).toBe(false);
  });

  it('clears stale active run references instead of loading old update-pattern data', async () => {
    const { phyloData } = await import('../../src/services/data/dataService.js');
    memoryStore.set('phyloMovieRuns', [makeRunRecord('old-run', 1)]);
    memoryStore.set('phyloMovieRun:old-run', makePayload('Old run'));
    memoryStore.set('phyloMovieData', { __phyloRunRef: true, runId: 'old-run' });

    expect(await phyloData.get()).toBeNull();
    expect(memoryStore.get('phyloMovieRuns')).toEqual([]);
    expect(memoryStore.has('phyloMovieRun:old-run')).toBe(false);
    expect(memoryStore.has('phyloMovieData')).toBe(false);
  });

  it('rejects stale runs when opening from recent history', async () => {
    const { phyloData } = await import('../../src/services/data/dataService.js');
    memoryStore.set('phyloMovieRuns', [makeRunRecord('old-run', 1)]);
    memoryStore.set('phyloMovieRun:old-run', makePayload('Old run'));

    await expect(phyloData.openRun('old-run')).rejects.toThrow(/older movie update pattern/);
    expect(memoryStore.get('phyloMovieRuns')).toEqual([]);
    expect(memoryStore.has('phyloMovieRun:old-run')).toBe(false);
  });

  it('does not load legacy direct payloads without storage compatibility metadata', async () => {
    const { phyloData } = await import('../../src/services/data/dataService.js');
    memoryStore.set('phyloMovieData', makePayload('Legacy active payload'));

    expect(await phyloData.get()).toBeNull();
    expect(memoryStore.has('phyloMovieData')).toBe(false);
  });
});

function makePayload(label) {
  return {
    ...structuredClone(smallExampleMovieData),
    dataset_provenance: {
      source_type: 'Integration fixture',
      source_label: label,
      tree_source: label,
      settings: [
        { label: 'Windowing', value: '1500 sites, 1000-site step' },
        { label: 'Branch support', value: 'SH-aLRT, 1000 replicates' },
      ],
    },
  };
}

function makeChunkedPayload(label, treeCount) {
  const lastFrameIndex = treeCount - 1;
  return {
    ...makePayload(label),
    interpolated_trees: Array.from({ length: treeCount }, (_value, index) => [index]),
    frames: Array.from({ length: treeCount }, (_value, index) =>
      index === 0 || index === lastFrameIndex
        ? makeInputFrame(index, index === 0 ? 0 : 1)
        : makeGeneratedFrame(index, lastFrameIndex)
    ),
    pairs: [makePair(lastFrameIndex)],
    temporal_events: [],
    subtree_highlight_tracking: Array.from({ length: treeCount }, () => null),
    pair_metrics: {
      ...smallExampleMovieData.pair_metrics,
      rows: [
        {
          pair_id: 'pair_0_1',
          pair_ordinal: 0,
          robinson_foulds: 0,
          weighted_robinson_foulds: 0,
        },
      ],
    },
  };
}

function makeInputFrame(index, inputTreeIndex) {
  return {
    frame_index: index,
    frame_type: 'input_tree',
    state_semantics: 'processed_input_tree',
    is_observed_input: true,
    input_tree_index: inputTreeIndex,
    pair_id: null,
    pair_ordinal: null,
    local_step_index: null,
    source_frame_index: null,
    target_frame_index: null,
  };
}

function makeGeneratedFrame(index, targetFrameIndex) {
  return {
    frame_index: index,
    frame_type: 'interpolation_frame',
    state_semantics: 'algorithmic_intermediate',
    is_observed_input: false,
    input_tree_index: null,
    pair_id: 'pair_0_1',
    pair_ordinal: 0,
    local_step_index: index - 1,
    source_frame_index: 0,
    target_frame_index: targetFrameIndex,
  };
}

function makePair(targetFrameIndex) {
  return {
    pair_id: 'pair_0_1',
    pair_ordinal: 0,
    source_input_tree_index: 0,
    target_input_tree_index: 1,
    source_frame_index: 0,
    target_frame_index: targetFrameIndex,
    generated_frame_range: [1, targetFrameIndex - 1],
    solution: {
      affected_subtrees_by_split: {},
      attachment_edges_by_split: {},
    },
  };
}

function makeRunRecord(id, payloadSchemaVersion) {
  return {
    id,
    label: id,
    createdAt: '2026-06-05T00:00:00.000Z',
    payloadSchemaVersion,
  };
}
