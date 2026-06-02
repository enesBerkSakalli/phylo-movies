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
      payloadSchemaVersion: 1,
      windowing: '1500 sites, 1000-site step',
      support: 'SH-aLRT, 1000 replicates',
    });
    expect(runs[0].payloadHash).toMatch(/^[a-f0-9]{64}$/);

    await phyloData.openRun(runs[1].id);
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
        { label: 'Stability scores', value: 'SH-aLRT, 1000 replicates' },
      ],
    },
  };
}
