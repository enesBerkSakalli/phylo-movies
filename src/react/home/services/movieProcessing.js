import { resolveApiUrl } from "@/js/services/data/apiConfig";

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
export async function processMovieData(formData, onProgress) {
  const body = new FormData();
  if (formData.treesFile) body.append('treeFile', formData.treesFile);
  if (formData.orderFile) body.append('orderFile', formData.orderFile);
  if (formData.msaFile) body.append('msaFile', formData.msaFile);
  body.append('windowSize', String(formData.windowSize ?? 1));
  body.append('windowStepSize', String(formData.stepSize ?? 1));
  body.append('midpointRooting', formData.midpointRooting ? 'on' : '');
  // Tree inference model options (checkboxes: "on" = enabled)
  body.append('useGtr', formData.useGtr ? 'on' : '');
  body.append('useGamma', formData.useGamma ? 'on' : '');
  body.append('usePseudo', formData.usePseudo ? 'on' : '');
  body.append('noMl', formData.noMl ? 'on' : '');

  const streamUrl = await resolveApiUrl('/treedata/stream');
  const resp = await fetch(streamUrl, { method: 'POST', body });
  if (!resp.ok) {
    let errorMsg = 'Upload failed!';
    try {
      const jd = await resp.json();
      if (jd && jd.error) errorMsg = jd.error;
    } catch {
      try { errorMsg = await resp.text(); } catch { }
    }
    throw new Error(errorMsg);
  }

  const { channel_id } = await resp.json();
  if (!channel_id) {
    throw new Error('No channel_id returned from server');
  }

  updateElectronProgress(10, 'Processing tree data...');

  return new Promise(async (resolve, reject) => {
    const progressUrl = await resolveApiUrl(`/stream/progress/${channel_id}`);
    let eventSource = new EventSource(progressUrl);

    // For chunked streaming (large datasets ≥ 500 trees)
    let chunkedMetadata = null;
    let chunkedTrees = [];

    eventSource.addEventListener('progress', (event) => {
      try {
        const progressData = JSON.parse(event.data);
        const percent = progressData.percent ?? progressData.current ?? 0;
        const message = progressData.message || 'Processing...';
        const scaledPercent = Math.min(90, 10 + percent * 0.8);
        onProgress({ percent: scaledPercent, message });
        updateElectronProgress(scaledPercent, message);
      } catch (err) {
        console.warn('[SSE] Failed to parse progress:', err);
      }
    });

    eventSource.addEventListener('log', (event) => {
      try {
        const log = JSON.parse(event.data);
        console.log(`[Backend] ${log.level}: ${log.message}`);
      } catch { }
    });

    // Handle metadata event for large datasets (chunked mode)
    eventSource.addEventListener('metadata', (event) => {
      try {
        const result = JSON.parse(event.data);
        chunkedMetadata = result.metadata;
        chunkedTrees = []; // Reset trees array for incoming chunks
        console.log(`[SSE] Received metadata for ${chunkedMetadata.tree_count} trees (chunked mode)`);
        onProgress({ percent: 50, message: `Streaming ${chunkedMetadata.tree_count} trees...` });
        updateElectronProgress(50, `Streaming ${chunkedMetadata.tree_count} trees...`);
      } catch (err) {
        console.warn('[SSE] Failed to parse metadata:', err);
      }
    });

    // Handle tree chunks for large datasets
    eventSource.addEventListener('trees_chunk', (event) => {
      try {
        const chunk = JSON.parse(event.data);
        chunkedTrees.push(...chunk.trees);
        const percent = 50 + Math.floor((chunk.end_index / chunk.total) * 40);
        const message = `Received ${chunk.end_index} / ${chunk.total} trees...`;
        onProgress({ percent, message });
        updateElectronProgress(percent, message);
        console.log(`[SSE] Received trees chunk: ${chunk.start_index}-${chunk.end_index} of ${chunk.total}`);
      } catch (err) {
        console.warn('[SSE] Failed to parse trees_chunk:', err);
      }
    });

    eventSource.addEventListener('complete', (event) => {
      eventSource.close();

      console.log('[SSE] Complete event received:', {
        hasData: !!event.data,
        dataLength: event.data?.length,
        dataPreview: event.data?.substring(0, 100),
        chunkedMetadata: !!chunkedMetadata,
        chunkedTreesCount: chunkedTrees.length,
      });

      // First check if we have accumulated chunked data (large dataset mode)
      // This takes priority regardless of what the complete event contains
      if (chunkedMetadata) {
        const result = {
          ...chunkedMetadata,
          interpolated_trees: chunkedTrees,
        };
        console.log(`[SSE] Assembled chunked data: ${chunkedTrees.length} trees`);
        resolve(result);
        return;
      }

      // Also check if we accumulated trees without metadata (edge case)
      if (chunkedTrees.length > 0) {
        console.warn('[SSE] Trees received without metadata, attempting to resolve with trees only');
        resolve({ interpolated_trees: chunkedTrees });
        return;
      }

      // Small dataset mode: complete event should contain everything
      if (!event.data || event.data.trim() === '') {
        reject(new Error('Complete event received with no data'));
        return;
      }

      try {
        const data = JSON.parse(event.data);

        if (data.error) {
          reject(new Error(data.error));
        } else if (data.data) {
          resolve(data.data);
        } else {
          reject(new Error('No data in complete event'));
        }
      } catch (err) {
        console.error('[SSE] Failed to parse complete event:', event.data?.substring(0, 200));
        reject(new Error('Failed to parse completion data: ' + err.message));
      }
    });

    eventSource.addEventListener('error', (event) => {
      try {
        const error = JSON.parse(event.data);
        eventSource.close();
        reject(new Error(error.error || 'Processing failed'));
      } catch {
        if (eventSource.readyState === EventSource.CLOSED) {
          reject(new Error('Connection to server lost'));
        }
      }
    });

    eventSource.onerror = () => {
      if (eventSource.readyState === EventSource.CLOSED) {
        reject(new Error('SSE connection closed unexpectedly'));
      }
    };
  });
}

/**
 * Handles saving the processed data and MSA workflow
 */
export async function finalizeMovieData(data, formData, onProgress) {
  if (formData.treesFile && formData.treesFile.name) {
    data.file_name = formData.treesFile.name;
  }

  onProgress({ percent: 92, message: 'Saving data locally...' });
  updateElectronProgress(92, 'Saving data locally...');

  try {
    const localforage = (await import('localforage')).default || (await import('localforage'));
    await localforage.setItem('phyloMovieData', data);
  } catch (storageError) {
    // Handle IndexedDB quota/memory errors with user-friendly message
    if (storageError.name === 'DataCloneError' || storageError.message?.includes('out of memory')) {
      const treeCount = data?.interpolated_trees?.length || 'unknown';
      throw new Error(`Dataset too large for browser storage (${treeCount} trees). Try reducing window size or number of input trees.`);
    }
    throw storageError;
  }

  onProgress({ percent: 95, message: 'Processing MSA data...' });
  updateElectronProgress(95, 'Processing MSA data...');

  try {
    const { workflows } = await import('@/js/services/data/dataService.js');
    const fd = new FormData();
    if (formData.msaFile) fd.append('msaFile', formData.msaFile);
    await workflows.handleMSADataSaving(fd, data);
  } catch (err) {
    console.error('[MovieService] MSA workflow error:', err);
  }

  onProgress({ percent: 100, message: 'Complete!' });
  updateElectronProgress(100, 'Complete!');
}
