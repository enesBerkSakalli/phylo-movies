export class LayoutWorkerManager {
  constructor(interpolationCache) {
    this.interpolationCache = interpolationCache;
    this.requestedFrames = new Set();
    
    // Initialize the worker
    this.worker = new Worker(new URL('./layout.worker.js', import.meta.url), { type: 'module' });
    
    // Handle incoming results
    this.worker.onmessage = (event) => {
      const { jobId, status, result, error } = event.data;
      const treeIndex = parseInt(jobId, 10);

      if (status === 'SUCCESS') {
        this.interpolationCache.setPrecomputedData(treeIndex, result);
      } else {
        console.warn(`[Worker] Layout failed for tree ${jobId}:`, error);
        this.requestedFrames.delete(treeIndex); // Allow retry on failure
      }
    };
  }

  prefetchFrame(treeIndex, treeData, layoutOptions) {
    if (!treeData) return;
    
    // Deduplication check
    if (this.requestedFrames.has(treeIndex)) return;

    this.requestedFrames.add(treeIndex);

    const payload = {
      jobId: String(treeIndex),
      command: 'CALCULATE_LAYOUT', 
      data: {
        treeData,
        options: layoutOptions
      }
    };

    this.worker.postMessage(payload);
  }

  reset() {
    this.requestedFrames.clear();
  }

  destroy() {
    this.worker.terminate();
    this.requestedFrames.clear();
  }
}
