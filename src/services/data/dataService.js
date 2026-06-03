import localforage from 'localforage';
import { validatePhyloMovieData } from '../../domain/backend/phyloMovieSchema.ts';

/**
 * Unified data service for PhyloMovies
 * Consolidates data storage and retrieval operations to eliminate duplication
 */

// Storage keys
const STORAGE_KEYS = {
  PHYLO_DATA: 'phyloMovieData',
  PHYLO_RUN_INDEX: 'phyloMovieRuns',
};
const RUN_DATA_PREFIX = 'phyloMovieRun:';
const MAX_STORED_RUNS = 8;
const RUN_PAYLOAD_SCHEMA_VERSION = 1;

/**
 * Generic storage operations
 */
const storage = {
  async get(key) {
    try {
      return await localforage.getItem(key);
    } catch (error) {
      console.error(`[DataService] Failed to read "${key}" from browser storage:`, error);
      return null;
    }
  },

  async set(key, value) {
    try {
      await localforage.setItem(key, value);
    } catch (error) {
      // Handle IndexedDB quota/memory errors
      if (error.name === 'DataCloneError' || error.message?.includes('out of memory')) {
        console.error(
          `[DataService] Dataset is too large for IndexedDB storage. Trees: ${value?.interpolated_trees?.length || 'unknown'}`
        );
        throw new Error(
          `Dataset is too large for browser storage. Try fewer input trees, a larger MSA step size, or a smaller selected range.`,
          { cause: error }
        );
      }
      console.error(`[DataService] Failed to store "${key}" in browser storage:`, error);
      throw error;
    }
  },

  async remove(key) {
    try {
      await localforage.removeItem(key);
    } catch (error) {
      console.error(`[DataService] Failed to remove "${key}" from browser storage:`, error);
    }
  },
};

/**
 * PhyloMovie data operations
 */
export const phyloData = {
  async get() {
    const data = await storage.get(STORAGE_KEYS.PHYLO_DATA);

    if (!data) {
      console.warn('[DataService] No saved phyloMovieData found in browser storage.');
      return null;
    }

    try {
      if (isRunReference(data)) {
        const runData = await storage.get(runDataKey(data.runId));
        if (!runData) {
          await this.remove();
          return null;
        }
        return this.validate(runData);
      }
      return this.validate(data);
    } catch (error) {
      await this.remove();
      throw error;
    }
  },

  async set(data, options = {}) {
    const validatedBackendData = validatePhyloMovieData(data, { hydrateTrees: false });
    const run = await createRunRecord(validatedBackendData, options);

    try {
      await storeRunPayload(run.id, validatedBackendData);
      await addRunToIndex(run);
      await storage.set(STORAGE_KEYS.PHYLO_DATA, { __phyloRunRef: true, runId: run.id });
    } catch (error) {
      await storage.remove(runDataKey(run.id));
      await storage.set(STORAGE_KEYS.PHYLO_DATA, validatedBackendData);
      console.warn('[DataService] Saved current run without adding it to run history:', error);
    }

    return validatedBackendData;
  },

  async remove() {
    await storage.remove(STORAGE_KEYS.PHYLO_DATA);
  },

  async listRuns() {
    return normalizeRunIndex(await storage.get(STORAGE_KEYS.PHYLO_RUN_INDEX));
  },

  async openRun(runId) {
    const runData = await storage.get(runDataKey(runId));
    if (!runData) {
      await removeRunFromIndex(runId);
      throw new Error('Saved run data is no longer available.');
    }

    const validatedBackendData = validatePhyloMovieData(runData, { hydrateTrees: false });
    await storage.set(STORAGE_KEYS.PHYLO_DATA, { __phyloRunRef: true, runId });
    return validatedBackendData;
  },

  async deleteRun(runId) {
    await storage.remove(runDataKey(runId));
    await removeRunFromIndex(runId);

    const activeData = await storage.get(STORAGE_KEYS.PHYLO_DATA);
    if (isRunReference(activeData) && activeData.runId === runId) {
      await storage.remove(STORAGE_KEYS.PHYLO_DATA);
    }
  },

  validate(data, options = { hydrateTrees: false }) {
    return validatePhyloMovieData(data, options);
  },
};

function isRunReference(value) {
  return value && value.__phyloRunRef === true && typeof value.runId === 'string';
}

function runDataKey(runId) {
  return `${RUN_DATA_PREFIX}${runId}`;
}

async function storeRunPayload(runId, data) {
  try {
    await storage.set(runDataKey(runId), data);
  } catch (error) {
    const runs = normalizeRunIndex(await storage.get(STORAGE_KEYS.PHYLO_RUN_INDEX));
    for (const staleRun of runs.slice().reverse()) {
      await storage.remove(runDataKey(staleRun.id));
      await removeRunFromIndex(staleRun.id);
      try {
        await storage.set(runDataKey(runId), data);
        return;
      } catch {}
    }
    throw error;
  }
}

async function addRunToIndex(run) {
  const existingRuns = normalizeRunIndex(await storage.get(STORAGE_KEYS.PHYLO_RUN_INDEX));
  const nextRuns = [run, ...existingRuns.filter((candidate) => candidate.id !== run.id)].slice(
    0,
    MAX_STORED_RUNS
  );
  const removedRuns = existingRuns.filter(
    (candidate) => !nextRuns.some((nextRun) => nextRun.id === candidate.id)
  );

  await storage.set(STORAGE_KEYS.PHYLO_RUN_INDEX, nextRuns);
  await Promise.all(removedRuns.map((removedRun) => storage.remove(runDataKey(removedRun.id))));
}

async function removeRunFromIndex(runId) {
  const existingRuns = normalizeRunIndex(await storage.get(STORAGE_KEYS.PHYLO_RUN_INDEX));
  await storage.set(
    STORAGE_KEYS.PHYLO_RUN_INDEX,
    existingRuns.filter((run) => run.id !== runId)
  );
}

function normalizeRunIndex(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (run) =>
      run &&
      typeof run.id === 'string' &&
      typeof run.label === 'string' &&
      typeof run.createdAt === 'string'
  );
}

async function createRunRecord(data, options = {}) {
  const provenance = data?.dataset_provenance || {};
  const label = options.label || provenance.source_label || data?.file_name || 'Processed run';
  const settings = Array.isArray(provenance.settings) ? provenance.settings : [];
  const windowing = settings.find((setting) => setting?.label === 'Windowing')?.value ?? null;
  const support =
    settings.find((setting) => ['Branch support', 'Support labels'].includes(setting?.label))
      ?.value ?? null;
  const frameCount = Array.isArray(data?.frames) ? data.frames.length : null;
  const interpolatedTreeCount = Array.isArray(data?.interpolated_trees)
    ? data.interpolated_trees.length
    : null;

  return {
    id: createRunId(),
    label,
    sourceType: provenance.source_type || 'Processed dataset',
    createdAt: new Date().toISOString(),
    fileName: data?.file_name || null,
    treeCount: countInputTrees(data),
    frameCount,
    interpolatedTreeCount,
    payloadSchemaVersion: RUN_PAYLOAD_SCHEMA_VERSION,
    payloadHash: await createPayloadHash(data),
    windowing,
    support,
  };
}

async function createPayloadHash(data) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || typeof TextEncoder === 'undefined') return null;

  const bytes = new TextEncoder().encode(JSON.stringify(data));
  const digest = await subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function countInputTrees(data) {
  if (Array.isArray(data?.frames)) {
    const inputFrameCount = data.frames.filter(
      (frame) => frame?.frame_type === 'input_tree' || frame?.is_observed_input === true
    ).length;
    if (inputFrameCount > 0) return inputFrameCount;
  }
  if (Array.isArray(data?.pairs)) return data.pairs.length + 1;
  return Array.isArray(data?.interpolated_trees) ? data.interpolated_trees.length : null;
}

function createRunId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
