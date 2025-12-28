/**
 * Generic layer factory function
 * Creates a deck.gl layer instance from config and props
 */

// Lightweight perf counters used by tests/scripts; gated by PERF_DEBUG for timings
const perfCounters = {
  layerCreations: 0,
  creationTimes: []
};

/**
 * Create a deck.gl layer from configuration
 * @param {Object} config - Layer config with id, LayerClass, defaultProps
 * @param {Object} props - Instance-specific props
 * @returns {Layer} deck.gl layer instance
 */
export function createLayer(config, props) {
  const perfEnabled = !!(typeof process !== 'undefined' && process?.env?.PERF_DEBUG);
  const start = perfEnabled
    ? (typeof performance !== 'undefined' && performance?.now ? performance.now() : Date.now())
    : null;

  const layer = new config.LayerClass({
    ...config.defaultProps,
    id: config.id,
    ...props
  });

  perfCounters.layerCreations += 1;
  if (perfEnabled && start !== null) {
    const end = typeof performance !== 'undefined' && performance?.now ? performance.now() : Date.now();
    perfCounters.creationTimes.push(Math.max(0, end - start));
  }

  return layer;
}

/**
 * Reset perf counters
 */
export function resetPerf() {
  perfCounters.layerCreations = 0;
  perfCounters.creationTimes = [];
}

/**
 * Get current perf snapshot (copy)
 * @returns {{layerCreations:number, creationTimes:number[]}}
 */
export function getPerfSnapshot() {
  return {
    layerCreations: perfCounters.layerCreations,
    creationTimes: [...perfCounters.creationTimes]
  };
}
