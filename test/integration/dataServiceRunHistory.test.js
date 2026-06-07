import { beforeEach, describe, expect, it, vi } from 'vitest';
import { smallExampleMovieData } from '../fixtures/timeline/generatedMovieData.js';

const memoryStore = vi.hoisted(() => new Map());

vi.mock('localforage', () => ({
  default: {
    async getItem(key) {
      return memoryStore.get(key) ?? null;
    },
    async setItem(key, value) {
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
      payloadSchemaVersion: 2,
      windowing: '1500 sites, 1000-site step',
      support: 'SH-aLRT, 1000 replicates',
    });
    expect(runs[0].payloadHash).toMatch(/^[a-f0-9]{64}$/);

    await phyloData.openRun(runs[1].id);
    expect(memoryStore.get('phyloMovieData')).toMatchObject({
      __phyloRunRef: true,
      runId: runs[1].id,
      payloadSchemaVersion: 2,
    });
    expect((await phyloData.get()).dataset_provenance.source_label).toBe('First run');
  });

  it('removes run payloads and clears the active pointer when deleting the open run', async () => {
    const { phyloData } = await import('../../src/services/data/dataService.js');

    await phyloData.set(makePayload('Run to remove'), { label: 'Run to remove' });
    const [run] = await phyloData.listRuns();

    await phyloData.deleteRun(run.id);

    expect(await phyloData.listRuns()).toEqual([]);
    expect(await phyloData.get()).toBeNull();
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

function makeRunRecord(id, payloadSchemaVersion) {
  return {
    id,
    label: id,
    createdAt: '2026-06-05T00:00:00.000Z',
    payloadSchemaVersion,
  };
}
