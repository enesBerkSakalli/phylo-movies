import { resolveApiUrl } from '../../../services/data/apiConfig';
import { phyloData } from '../../../services/data/dataService.js';

const UPLOAD_START_TIMEOUT_MS = 2 * 60 * 1000;
const STREAM_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const STREAM_CONTRACT_PREFIX = 'Tree processing stream contract error';

/**
 * Electron loading helpers
 */
function getElectronAPI() {
  return typeof window !== 'undefined' ? window.electronAPI : null;
}

export function showElectronLoading(message) {
  const api = getElectronAPI();
  if (api?.showLoading) api.showLoading(message);
}

export function hideElectronLoading() {
  const api = getElectronAPI();
  if (api?.hideLoading) api.hideLoading();
}

export function updateElectronProgress(progress, message) {
  const api = getElectronAPI();
  if (api?.updateProgress) api.updateProgress(progress, message);
}

/**
 * Service to handle tree data streaming and local processing
 */
export async function processMovieData(formData, onProgress, options = {}) {
  const { signal } = options;
  throwIfAborted(signal);

  const body = new FormData();
  if (formData.treesFile) body.append('treeFile', formData.treesFile);
  if (formData.msaFile) body.append('msaFile', formData.msaFile);
  body.append('windowSize', String(formData.windowSize ?? 1));
  body.append('windowStepSize', String(formData.stepSize ?? 1));
  body.append('midpointRooting', formData.midpointRooting ? 'on' : '');
  body.append('treeInferenceEngine', formData.treeInferenceEngine || 'iqtree');
  body.append('iqtreeFastSearch', formData.iqtreeFastSearch ? 'on' : '');
  body.append('iqtreeSupportMode', formData.iqtreeSupportMode || 'none');
  body.append('iqtreeUfbootReplicates', String(formData.iqtreeUfbootReplicates ?? 1000));
  body.append('iqtreeShAlrtReplicates', String(formData.iqtreeShAlrtReplicates ?? 1000));
  body.append('iqtreeBnni', formData.iqtreeBnni ? 'on' : '');
  // Tree inference model options (checkboxes: "on" = enabled)
  body.append('useGtr', formData.useGtr ? 'on' : '');
  body.append('useGamma', formData.useGamma ? 'on' : '');
  body.append('usePseudo', formData.usePseudo ? 'on' : '');
  body.append('noMl', formData.noMl ? 'on' : '');

  const streamUrl = await resolveApiUrl('/treedata/stream');
  const controller = new AbortController();
  const removeUploadAbortListener = addAbortListener(signal, () => controller.abort());
  const uploadTimeoutId = setTimeout(() => controller.abort(), UPLOAD_START_TIMEOUT_MS);
  let resp;
  try {
    resp = await fetch(streamUrl, { method: 'POST', body, signal: controller.signal });
  } catch (error) {
    if (signal?.aborted) {
      throw createAbortError();
    }
    if (error?.name === 'AbortError') {
      throw new Error(
        'The backend accepted the upload but did not start processing within 2 minutes. Check that BranchArchitect is still running, then try again.',
        { cause: error }
      );
    }
    throw error;
  } finally {
    clearTimeout(uploadTimeoutId);
    removeUploadAbortListener();
  }

  throwIfAborted(signal);

  if (!resp.ok) {
    let backendMessage = '';
    try {
      const jd = await resp.json();
      if (jd && jd.error) backendMessage = jd.error;
    } catch {
      try {
        backendMessage = await resp.text();
      } catch {}
    }
    throw new Error(formatUploadFailureMessage(resp.status, resp.statusText, backendMessage));
  }

  const { channel_id } = await resp.json();
  if (!channel_id) {
    throw new Error(
      `${STREAM_CONTRACT_PREFIX}: the backend did not return a progress channel. Restart the BranchArchitect backend and try again.`
    );
  }

  throwIfAborted(signal);

  updateElectronProgress(10, 'Processing tree data...');
  const progressUrl = await resolveApiUrl(`/stream/progress/${channel_id}`);

  return new Promise((resolve, reject) => {
    const eventSource = new EventSource(progressUrl);
    let settled = false;
    let idleTimeoutId = null;
    let removeStreamAbortListener = () => {};

    const closeEventSource = () => {
      if (idleTimeoutId) {
        clearTimeout(idleTimeoutId);
        idleTimeoutId = null;
      }
      removeStreamAbortListener();
      try {
        eventSource.close();
      } catch {}
    };

    const resolveOnce = (value) => {
      if (settled) return;
      settled = true;
      closeEventSource();
      resolve(value);
    };

    const rejectOnce = (error) => {
      if (settled) return;
      settled = true;
      closeEventSource();
      reject(error instanceof Error ? error : new Error(String(error)));
    };

    const refreshIdleTimeout = () => {
      if (settled) return;
      if (idleTimeoutId) clearTimeout(idleTimeoutId);
      idleTimeoutId = setTimeout(() => {
        rejectOnce(
          new Error(
            'Tree processing stopped sending progress for 15 minutes. Check the BranchArchitect backend log, then retry the dataset.'
          )
        );
      }, STREAM_IDLE_TIMEOUT_MS);
    };

    removeStreamAbortListener = addAbortListener(signal, () => {
      rejectOnce(createAbortError());
    });

    refreshIdleTimeout();

    // Live backend contract: metadata, zero or more tree chunks, then complete.
    let streamMetadata = null;
    let streamedTrees = [];
    let expectedTreeTotal = null;

    // High-water mark prevents the progress bar from ever going backward
    let highWaterMark = 10;
    function reportProgress(percent, message) {
      if (settled || signal?.aborted) return;
      const clamped = Math.max(highWaterMark, Math.min(90, percent));
      highWaterMark = clamped;
      onProgress({ percent: clamped, message });
      updateElectronProgress(clamped, message);
    }

    eventSource.addEventListener('progress', (event) => {
      refreshIdleTimeout();
      try {
        const progressData = JSON.parse(event.data);
        const percent = progressData.percent ?? progressData.current ?? 0;
        const message = progressData.message || 'Processing...';
        // Backend 0-100 → frontend 10-90
        const scaledPercent = 10 + percent * 0.8;
        reportProgress(scaledPercent, message);
      } catch (err) {
        console.warn('[SSE] Ignoring malformed progress event from backend:', {
          error: err,
          dataPreview: previewEventData(event.data),
        });
      }
    });

    eventSource.addEventListener('log', (event) => {
      refreshIdleTimeout();
      try {
        const log = JSON.parse(event.data);
        const level = String(log.level || '').toLowerCase();
        if (level === 'warning' || level === 'warn') {
          console.warn(`[Backend] ${log.message}`);
        } else if (level === 'error') {
          console.error(`[Backend] ${log.message}`);
        }
      } catch {}
    });

    eventSource.addEventListener('metadata', (event) => {
      refreshIdleTimeout();
      try {
        const result = JSON.parse(event.data);
        if (!result.metadata || typeof result.metadata !== 'object') {
          rejectOnce(
            new Error(
              `${STREAM_CONTRACT_PREFIX}: metadata event is missing the movie metadata object.`
            )
          );
          return;
        }
        streamMetadata = result.metadata;
        streamedTrees = [];
        expectedTreeTotal = null;
        reportProgress(highWaterMark, 'Streaming trees...');
      } catch (err) {
        rejectOnce(
          new Error(
            `${STREAM_CONTRACT_PREFIX}: metadata event is not valid JSON (${err.message}).`
          )
        );
      }
    });

    eventSource.addEventListener('trees_chunk', (event) => {
      refreshIdleTimeout();
      try {
        if (!streamMetadata) {
          rejectOnce(
            new Error(`${STREAM_CONTRACT_PREFIX}: received a tree chunk before metadata.`)
          );
          return;
        }
        const chunk = JSON.parse(event.data);
        if (!Array.isArray(chunk.trees)) {
          rejectOnce(
            new Error(`${STREAM_CONTRACT_PREFIX}: tree chunk is missing a trees array.`)
          );
          return;
        }
        const startIndex = chunk.start_index;
        const endIndex = chunk.end_index;
        const total = chunk.total;
        if (
          !Number.isInteger(startIndex) ||
          !Number.isInteger(endIndex) ||
          !Number.isInteger(total) ||
          startIndex < 0 ||
          endIndex < startIndex ||
          endIndex > total ||
          total <= 0
        ) {
          rejectOnce(
            new Error(
              `${STREAM_CONTRACT_PREFIX}: tree chunk indexes are invalid (start=${startIndex}, end=${endIndex}, total=${total}).`
            )
          );
          return;
        }
        if (expectedTreeTotal === null) {
          expectedTreeTotal = total;
        } else if (total !== expectedTreeTotal) {
          rejectOnce(
            new Error(
              `${STREAM_CONTRACT_PREFIX}: tree chunk total changed from ${expectedTreeTotal} to ${total}.`
            )
          );
          return;
        }
        if (startIndex !== streamedTrees.length || endIndex !== startIndex + chunk.trees.length) {
          rejectOnce(
            new Error(
              `${STREAM_CONTRACT_PREFIX}: expected next chunk to start at ${streamedTrees.length}, received ${startIndex}.`
            )
          );
          return;
        }
        streamedTrees.push(...chunk.trees);
        // Map chunk progress into remaining space between current high-water and 90
        const chunkRatio = endIndex / total;
        const percent = highWaterMark + chunkRatio * (90 - highWaterMark);
        const message = `Received ${endIndex} / ${total} trees...`;
        reportProgress(percent, message);
      } catch (err) {
        rejectOnce(
          new Error(
            `${STREAM_CONTRACT_PREFIX}: tree chunk event is not valid JSON (${err.message}).`
          )
        );
      }
    });

    eventSource.addEventListener('complete', (event) => {
      refreshIdleTimeout();

      try {
        const completion = JSON.parse(event.data || '{}');
        if (completion.error) {
          rejectOnce(new Error(completion.error));
          return;
        }

        if (!streamMetadata) {
          rejectOnce(
            new Error(`${STREAM_CONTRACT_PREFIX}: completion arrived before metadata.`)
          );
          return;
        }
        if (expectedTreeTotal !== null && expectedTreeTotal !== streamedTrees.length) {
          rejectOnce(
            new Error(
              `${STREAM_CONTRACT_PREFIX}: stream ended after ${streamedTrees.length} trees, expected ${expectedTreeTotal}.`
            )
          );
          return;
        }

        const result = {
          ...streamMetadata,
          interpolated_trees: streamedTrees,
        };
        resolveOnce(result);
        return;
      } catch (err) {
        console.error('[SSE] Failed to parse complete event:', {
          error: err,
          dataPreview: previewEventData(event.data),
        });
        rejectOnce(
          new Error(
            `${STREAM_CONTRACT_PREFIX}: completion event is not valid JSON (${err.message}).`
          )
        );
      }
    });

    eventSource.onerror = (event) => {
      if (settled) return;

      try {
        const error = JSON.parse(event.data);
        rejectOnce(new Error(error.error || 'Tree processing failed on the backend.'));
      } catch {
        if (eventSource.readyState === EventSource.CLOSED) {
          rejectOnce(
            new Error(
              'Lost connection to the tree processing stream before completion. Check that the BranchArchitect backend is still running, then retry.'
            )
          );
        }
      }
    };
  });
}

function formatUploadFailureMessage(status, statusText, backendMessage) {
  const statusLabel = `${status}${statusText ? ` ${statusText}` : ''}`;
  const detail = String(backendMessage || '').trim();
  const suffix = detail ? ` Backend response: ${detail}` : '';
  if ([502, 503, 504].includes(status)) {
    return `The frontend could not reach the BranchArchitect backend (${statusLabel}). Start or restart the backend with ./start.sh, confirm http://127.0.0.1:5002/health reports ready, then try again.${suffix}`;
  }
  return `The backend rejected the dataset upload (${statusLabel}). Check the selected files and tree-inference settings, then try again.${suffix}`;
}

function previewEventData(data) {
  if (typeof data !== 'string') return data;
  return data.length > 240 ? `${data.slice(0, 240)}...` : data;
}

function createAbortError() {
  const error = new Error('Processing cancelled');
  error.name = 'AbortError';
  return error;
}

function throwIfAborted(signal) {
  if (signal?.aborted) {
    throw createAbortError();
  }
}

function addAbortListener(signal, onAbort) {
  if (!signal || typeof onAbort !== 'function') return () => {};
  if (signal.aborted) {
    onAbort();
    return () => {};
  }
  signal.addEventListener('abort', onAbort, { once: true });
  return () => signal.removeEventListener('abort', onAbort);
}

/**
 * Handles saving the processed data
 */
export async function finalizeMovieData(data, formData, onProgress) {
  if (formData.treesFile && formData.treesFile.name) {
    data.file_name = formData.treesFile.name;
  }
  data.dataset_provenance =
    formData.datasetProvenance ?? data.dataset_provenance ?? createDatasetProvenance(formData);

  onProgress({ percent: 92, message: 'Saving data locally...' });
  updateElectronProgress(92, 'Saving data locally...');

  try {
    await phyloData.set(data);
  } catch (storageError) {
    // Handle IndexedDB quota/memory errors with user-friendly message
    if (storageError.name === 'DataCloneError' || storageError.message?.includes('out of memory')) {
      const treeCount = data?.interpolated_trees?.length || 'unknown';
      throw new Error(
        `Dataset too large for browser storage (${treeCount} trees). Try reducing window size or number of input trees.`,
        { cause: storageError }
      );
    }
    throw storageError;
  }

  onProgress({ percent: 100, message: 'Complete!' });
  updateElectronProgress(100, 'Complete!');
}

function createDatasetProvenance(formData) {
  const hasTrees = !!formData.treesFile;
  const hasMsa = !!formData.msaFile;
  const treeFileName = formData.treesFile?.name;
  const msaFileName = formData.msaFile?.name;
  const settings = [
    { label: 'Input trees', value: treeFileName || 'Generated from MSA' },
    ...(hasMsa ? [{ label: 'Alignment', value: msaFileName || 'Uploaded MSA' }] : []),
    ...(hasMsa
      ? [
          {
            label: 'Windowing',
            value: `${formData.windowSize ?? 1} sites, ${formData.stepSize ?? 1}-site step`,
          },
        ]
      : []),
    {
      label: 'Rooting',
      value: formData.midpointRooting ? 'Midpoint rooting' : 'Input rooting preserved',
    },
  ];

  if (hasMsa && !hasTrees) {
    const engine = formData.treeInferenceEngine === 'fasttree' ? 'FastTree 2' : 'IQ-TREE';
    const model = `${formData.useGtr ? 'GTR' : 'JC'}${formData.useGamma ? '+G' : ''}`;
    settings.push({ label: 'Tree inference', value: `${engine}, ${model}` });
    if (formData.treeInferenceEngine === 'iqtree') {
      settings.push({
        label: 'IQ-TREE search',
        value: formData.iqtreeFastSearch ? 'Fast search' : 'Default search',
      });
      settings.push({
        label: 'Branch support',
        value: getIqTreeSupportSetting(formData),
      });
    } else {
      settings.push({
        label: 'FastTree flags',
        value:
          [formData.usePseudo ? '-pseudo' : null, formData.noMl ? '-noml' : null]
            .filter(Boolean)
            .join(', ') || 'Default',
      });
    }
  }

  return {
    source_type:
      hasTrees && hasMsa
        ? 'Uploaded trees with MSA context'
        : hasTrees
          ? 'Uploaded tree series'
          : 'MSA-derived tree sequence',
    source_label: treeFileName || msaFileName || 'Uploaded dataset',
    tree_source: hasTrees
      ? `Input tree file: ${treeFileName || 'uploaded tree file'}`
      : `Trees inferred from uploaded MSA: ${msaFileName || 'uploaded alignment'}`,
    ...(hasMsa ? { alignment_source: msaFileName || 'Uploaded MSA' } : {}),
    settings,
  };
}

function getIqTreeSupportSetting(formData) {
  switch (formData.iqtreeSupportMode) {
    case 'ufboot':
      return `UFBoot, ${formData.iqtreeUfbootReplicates ?? 1000} replicates`;
    case 'sh_alrt':
      return `SH-aLRT, ${formData.iqtreeShAlrtReplicates ?? 1000} replicates`;
    case 'sh_alrt_ufboot':
      return `SH-aLRT ${formData.iqtreeShAlrtReplicates ?? 1000} + UFBoot ${formData.iqtreeUfbootReplicates ?? 1000}`;
    default:
      return 'None';
  }
}
