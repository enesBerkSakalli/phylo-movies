import localforage from 'localforage';
import {
  validatePhyloMovieData,
  validatePhyloMovieMetadata,
} from '../../domain/backend/phyloMovieSchema.ts';
import {
  isBinaryMoviePayload,
  parseBinaryMoviePayload,
} from '../../domain/backend/binaryPayload.ts';
import { createBinaryTreeSource } from '../../domain/backend/treeSource.js';

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
const RUN_PAYLOAD_SCHEMA_VERSION = 2;
const RUN_TREE_CHUNK_SIZE = 128;
const TRANSPORT_VALIDATION_OPTIONS = Object.freeze({ hydrateTrees: false });
const STALE_RUN_MESSAGE =
  'Saved run was created with an older movie update pattern. Reprocess the dataset before visualizing it again.';
let volatilePhyloData = null;

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
          `[DataService] Dataset is too large for IndexedDB storage. Trees: ${storedTreeCount(value)}`
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
    if (volatilePhyloData) {
      return this.validate(volatilePhyloData, TRANSPORT_VALIDATION_OPTIONS);
    }

    const data = await storage.get(STORAGE_KEYS.PHYLO_DATA);

    if (!data) {
      console.warn('[DataService] No saved phyloMovieData found in browser storage.');
      return null;
    }

    try {
      if (isRunReference(data)) {
        const run = await getRunRecord(data.runId);
        if (!isCompatibleRunRecord(run)) {
          await discardRun(data.runId);
          await this.remove();
          console.warn(`[DataService] ${STALE_RUN_MESSAGE}`);
          return null;
        }

        const runData = await readRunPayload(data.runId);
        if (!runData) {
          await discardRun(data.runId);
          return null;
        }
        try {
          return this.validate(runData, TRANSPORT_VALIDATION_OPTIONS);
        } catch (error) {
          await discardRun(data.runId);
          throw error;
        }
      }

      if (isInlinePayload(data)) {
        if (!isCompatibleInlinePayload(data)) {
          await this.remove();
          console.warn(`[DataService] ${STALE_RUN_MESSAGE}`);
          return null;
        }
        return this.validate(data.data);
      }

      await this.remove();
      console.warn(`[DataService] ${STALE_RUN_MESSAGE}`);
      return null;
    } catch (error) {
      await this.remove();
      throw error;
    }
  },

  async set(data, options = {}) {
    // readMoviePayload already validated what it returns, so re-running the
    // contract over four million nodes here would be pure waste.
    const validatedBackendData = options.validated
      ? data
      : validatePhyloMovieData(data, TRANSPORT_VALIDATION_OPTIONS);

    // A payload backed by a PMB1 container has no interpolated_trees array to
    // chunk into IndexedDB. Persisting the ArrayBuffer is worth doing, but it is
    // its own change; until then the run stays in memory for the session rather
    // than being written out as an empty tree list.
    if (validatedBackendData.treeSource) {
      volatilePhyloData = validatedBackendData;
      await storage.remove(STORAGE_KEYS.PHYLO_DATA);
      return validatedBackendData;
    }

    const run = await createRunRecord(validatedBackendData, options);

    try {
      await storeRunPayload(run, validatedBackendData);
      await addRunToIndex(run);
      await storage.set(STORAGE_KEYS.PHYLO_DATA, createRunReference(run.id));
      volatilePhyloData = null;
    } catch (error) {
      await removeRunPayload(run);
      if (isLargeStorageError(error)) {
        volatilePhyloData = validatedBackendData;
        await storage.remove(STORAGE_KEYS.PHYLO_DATA);
        console.warn(
          '[DataService] Dataset is too large for browser storage; keeping it in memory for this session only:',
          error
        );
        return validatedBackendData;
      }

      await storage.set(STORAGE_KEYS.PHYLO_DATA, createInlinePayload(validatedBackendData));
      volatilePhyloData = null;
      console.warn('[DataService] Saved current run without adding it to run history:', error);
    }

    return validatedBackendData;
  },

  async remove() {
    volatilePhyloData = null;
    await storage.remove(STORAGE_KEYS.PHYLO_DATA);
  },

  async listRuns() {
    return pruneIncompatibleRuns(await getRunIndex());
  },

  async openRun(runId) {
    const run = await getRunRecord(runId);
    if (!isCompatibleRunRecord(run)) {
      await discardRun(runId);
      throw new Error(STALE_RUN_MESSAGE);
    }

    const runData = await readRunPayload(runId);
    if (!runData) {
      await discardRun(runId);
      throw new Error('Saved run data is no longer available.');
    }

    let validatedBackendData;
    try {
      validatedBackendData = validatePhyloMovieData(runData, TRANSPORT_VALIDATION_OPTIONS);
    } catch (error) {
      await discardRun(runId);
      throw error;
    }
    await storage.set(STORAGE_KEYS.PHYLO_DATA, createRunReference(runId));
    volatilePhyloData = null;
    return validatedBackendData;
  },

  async deleteRun(runId) {
    const run = await getRunRecord(runId);
    await removeRunPayload(run ?? runId);
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

/**
 * Read a fetched movie payload in whichever encoding it arrived in.
 *
 * A PMB1 container is recognised by its leading magic rather than by the URL,
 * so the caller does not have to know which encoding it asked for. Its trees
 * stay in the ArrayBuffer as typed-array views and are expanded one at a time,
 * where the JSON path parses every node up front.
 *
 * Both encodings run the same contract checks; only the tree count reaches
 * validation differently, from the container header rather than from the length
 * of an array.
 */
export function readMoviePayload(buffer) {
  if (!isBinaryMoviePayload(buffer)) {
    return validatePhyloMovieData(JSON.parse(new TextDecoder().decode(buffer)), {
      hydrateTrees: false,
    });
  }

  const binaryPayload = parseBinaryMoviePayload(buffer);
  const metadata = validatePhyloMovieMetadata(binaryPayload.metadata, binaryPayload.treeCount);
  return {
    ...metadata,
    treeSource: createBinaryTreeSource(binaryPayload, metadata),
  };
}

function isRunReference(value) {
  return value && value.__phyloRunRef === true && typeof value.runId === 'string';
}

function createRunReference(runId) {
  return {
    __phyloRunRef: true,
    runId,
    payloadSchemaVersion: RUN_PAYLOAD_SCHEMA_VERSION,
  };
}

function isInlinePayload(value) {
  return value && value.__phyloInlinePayload === true && typeof value === 'object';
}

function createInlinePayload(data) {
  return {
    __phyloInlinePayload: true,
    payloadSchemaVersion: RUN_PAYLOAD_SCHEMA_VERSION,
    data,
  };
}

function isCompatibleInlinePayload(value) {
  return value?.payloadSchemaVersion === RUN_PAYLOAD_SCHEMA_VERSION;
}

function isCompatibleRunRecord(run) {
  return run?.payloadSchemaVersion === RUN_PAYLOAD_SCHEMA_VERSION;
}

function runDataKey(runId) {
  return `${RUN_DATA_PREFIX}${runId}`;
}

function runTreeChunkKey(runId, chunkIndex) {
  return `${runDataKey(runId)}:trees:${chunkIndex}`;
}

async function getRunIndex() {
  return normalizeRunIndex(await storage.get(STORAGE_KEYS.PHYLO_RUN_INDEX));
}

async function getRunRecord(runId) {
  const runs = await getRunIndex();
  return runs.find((run) => run.id === runId) ?? null;
}

async function pruneIncompatibleRuns(runs) {
  const compatibleRuns = runs.filter(isCompatibleRunRecord);
  const incompatibleRuns = runs.filter((run) => !isCompatibleRunRecord(run));

  if (incompatibleRuns.length > 0) {
    await storage.set(STORAGE_KEYS.PHYLO_RUN_INDEX, compatibleRuns);
    await Promise.all(incompatibleRuns.map((run) => removeRunPayload(run)));
  }

  return compatibleRuns;
}

async function discardRun(runId) {
  const run = await getRunRecord(runId);
  await removeRunPayload(run ?? runId);
  await removeRunFromIndex(runId);

  const activeData = await storage.get(STORAGE_KEYS.PHYLO_DATA);
  if (isRunReference(activeData) && activeData.runId === runId) {
    await storage.remove(STORAGE_KEYS.PHYLO_DATA);
  }
}

async function storeRunPayload(run, data) {
  try {
    await writeRunPayload(run, data);
  } catch (error) {
    const runs = normalizeRunIndex(await storage.get(STORAGE_KEYS.PHYLO_RUN_INDEX));
    for (const staleRun of runs.slice().reverse()) {
      await removeRunPayload(staleRun);
      await removeRunFromIndex(staleRun.id);
      try {
        await writeRunPayload(run, data);
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
  await Promise.all(removedRuns.map((removedRun) => removeRunPayload(removedRun)));
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
    treeChunkCount: getTreeChunkCount(data),
    payloadSchemaVersion: RUN_PAYLOAD_SCHEMA_VERSION,
    payloadHash: await createPayloadHash(data),
    windowing,
    support,
  };
}

async function writeRunPayload(run, data) {
  await removeRunPayload(run);

  const trees = Array.isArray(data?.interpolated_trees) ? data.interpolated_trees : [];
  const { interpolated_trees: _interpolatedTrees, ...metadata } = data;
  const envelope = {
    __phyloChunkedPayload: true,
    payloadSchemaVersion: RUN_PAYLOAD_SCHEMA_VERSION,
    treeCount: trees.length,
    treeChunkCount: getTreeChunkCount(data),
    treeChunkSize: RUN_TREE_CHUNK_SIZE,
    metadata,
  };

  try {
    await storage.set(runDataKey(run.id), envelope);
    for (let chunkIndex = 0; chunkIndex < envelope.treeChunkCount; chunkIndex += 1) {
      const start = chunkIndex * RUN_TREE_CHUNK_SIZE;
      await storage.set(
        runTreeChunkKey(run.id, chunkIndex),
        trees.slice(start, start + RUN_TREE_CHUNK_SIZE)
      );
    }
  } catch (error) {
    await removeRunPayload(run);
    throw error;
  }
}

async function readRunPayload(runId) {
  const runData = await storage.get(runDataKey(runId));
  if (!isChunkedRunPayload(runData)) return runData;

  const trees = new Array(runData.treeCount);
  let offset = 0;
  for (let chunkIndex = 0; chunkIndex < runData.treeChunkCount; chunkIndex += 1) {
    const chunk = await storage.get(runTreeChunkKey(runId, chunkIndex));
    if (!Array.isArray(chunk)) return null;
    if (offset + chunk.length > runData.treeCount) return null;

    for (let treeIndex = 0; treeIndex < chunk.length; treeIndex += 1) {
      trees[offset + treeIndex] = chunk[treeIndex];
    }
    offset += chunk.length;
  }

  if (offset !== runData.treeCount) return null;

  return {
    ...runData.metadata,
    interpolated_trees: trees,
  };
}

async function removeRunPayload(runOrId) {
  const run = typeof runOrId === 'string' ? { id: runOrId } : runOrId;
  if (!run?.id) return;

  const chunkCount = await getStoredTreeChunkCount(run);
  await storage.remove(runDataKey(run.id));
  await Promise.all(
    Array.from({ length: chunkCount }, (_value, chunkIndex) =>
      storage.remove(runTreeChunkKey(run.id, chunkIndex))
    )
  );
}

async function getStoredTreeChunkCount(run) {
  if (Number.isInteger(run.treeChunkCount)) return run.treeChunkCount;

  const runData = await storage.get(runDataKey(run.id));
  return isChunkedRunPayload(runData) ? runData.treeChunkCount : 0;
}

function isChunkedRunPayload(value) {
  return (
    value?.__phyloChunkedPayload === true &&
    value.payloadSchemaVersion === RUN_PAYLOAD_SCHEMA_VERSION &&
    Number.isInteger(value.treeCount) &&
    Number.isInteger(value.treeChunkCount) &&
    value.metadata &&
    typeof value.metadata === 'object'
  );
}

function getTreeChunkCount(data) {
  const treeCount = Array.isArray(data?.interpolated_trees) ? data.interpolated_trees.length : 0;
  return Math.ceil(treeCount / RUN_TREE_CHUNK_SIZE);
}

async function createPayloadHash(data) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || typeof TextEncoder === 'undefined') return null;

  const bytes = new TextEncoder().encode(JSON.stringify(createPayloadHashSummary(data)));
  const digest = await subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function createPayloadHashSummary(data) {
  return {
    fileName: data?.file_name || null,
    treeCount: countInputTrees(data),
    frameCount: Array.isArray(data?.frames) ? data.frames.length : null,
    interpolatedTreeCount: Array.isArray(data?.interpolated_trees)
      ? data.interpolated_trees.length
      : null,
    pairCount: Array.isArray(data?.pairs) ? data.pairs.length : null,
    temporalEventCount: Array.isArray(data?.temporal_events) ? data.temporal_events.length : null,
    annotationDefinitionCount: Array.isArray(data?.annotation_definitions)
      ? data.annotation_definitions.length
      : null,
    treeNameDefinitionCount: Array.isArray(data?.tree_name_definitions)
      ? data.tree_name_definitions.length
      : null,
    splitDefinitionCount: Array.isArray(data?.split_definitions)
      ? data.split_definitions.length
      : null,
    provenance: data?.dataset_provenance ?? null,
  };
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

function storedTreeCount(value) {
  return value?.interpolated_trees?.length || value?.data?.interpolated_trees?.length || 'unknown';
}

function isLargeStorageError(error) {
  return (
    error?.name === 'DataCloneError' ||
    error?.name === 'QuotaExceededError' ||
    error?.cause?.name === 'DataCloneError' ||
    error?.cause?.name === 'QuotaExceededError' ||
    error?.message?.includes('out of memory') ||
    error?.cause?.message?.includes('out of memory') ||
    error?.message?.includes('too large for browser storage')
  );
}
