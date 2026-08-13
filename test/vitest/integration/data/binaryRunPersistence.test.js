import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const memoryStore = vi.hoisted(() => new Map());

vi.mock('localforage', () => ({
  default: {
    async getItem(key) {
      return memoryStore.get(key) ?? null;
    },
    async setItem(key, value) {
      // structuredClone is what IndexedDB actually applies, so a payload that
      // is not cloneable fails here exactly as it would in the browser.
      memoryStore.set(key, structuredClone(value));
    },
    async removeItem(key) {
      memoryStore.delete(key);
    },
  },
}));

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const fixture = readFileSync(path.join(repoRoot, 'test/fixtures/binary/movie_payload.pmb'));
const binaryBuffer = () =>
  fixture.buffer.slice(fixture.byteOffset, fixture.byteOffset + fixture.byteLength);

describe('PMB1 run persistence', () => {
  beforeEach(() => memoryStore.clear());

  it('stores a binary run as its bytes, under one key and with no tree chunks', async () => {
    const { phyloData, readMoviePayload } =
      await import('../../../../src/services/data/dataService.js');

    await phyloData.set(readMoviePayload(binaryBuffer()), { label: 'Binary run' });

    const [run] = await phyloData.listRuns();
    expect(run.label).toBe('Binary run');
    expect(run.interpolatedTreeCount).toBe(3);
    expect(run.treeChunkCount).toBe(0);

    const stored = memoryStore.get(`phyloMovieRun:${run.id}`);
    expect(stored.__phyloBinaryPayload).toBe(true);
    expect(stored.binarySource).toBeInstanceOf(ArrayBuffer);
    expect(memoryStore.has(`phyloMovieRun:${run.id}:trees:0`)).toBe(false);
  });

  it('reopens a stored binary run into a working tree source', async () => {
    const { phyloData, readMoviePayload } =
      await import('../../../../src/services/data/dataService.js');

    const original = readMoviePayload(binaryBuffer());
    await phyloData.set(original, { label: 'Binary run' });
    const [run] = await phyloData.listRuns();

    const reopened = await phyloData.openRun(run.id);
    expect(reopened.treeSource.treeCount).toBe(3);
    expect(reopened.file_name).toBe(original.file_name);
    expect(reopened.frames).toEqual(original.frames);
    for (const index of [0, 1, 2]) {
      expect(reopened.treeSource.hydrateAt(index)).toEqual(original.treeSource.hydrateAt(index));
    }
  });

  it('returns the same run from get() after it was stored', async () => {
    const { phyloData, readMoviePayload } =
      await import('../../../../src/services/data/dataService.js');

    const original = readMoviePayload(binaryBuffer());
    await phyloData.set(original, { label: 'Binary run' });

    const fetched = await phyloData.get();
    expect(fetched.treeSource.treeCount).toBe(3);
    expect(fetched.treeSource.hydrateAt(0)).toEqual(original.treeSource.hydrateAt(0));
  });

  it('drops a stored binary run whose container no longer validates', async () => {
    const { phyloData, readMoviePayload } =
      await import('../../../../src/services/data/dataService.js');

    await phyloData.set(readMoviePayload(binaryBuffer()), { label: 'Binary run' });
    const [run] = await phyloData.listRuns();

    const corrupted = memoryStore.get(`phyloMovieRun:${run.id}`);
    new Uint8Array(corrupted.binarySource)[1] = 0;
    memoryStore.set(`phyloMovieRun:${run.id}`, corrupted);

    await expect(phyloData.openRun(run.id)).rejects.toThrow(/not a PMB1 container/);
  });
});
