/**
 * Generic layer factory function
 * Creates a deck.gl layer instance from config and props
 */

// Lightweight perf counters used by tests/scripts; gated by PERF_DEBUG for timings
const perfCounters = {
  layerCreations: 0,
  creationTimes: []
};

function isPerfEnabled() {
  // Supports both bundler env and runtime toggles
  const envFlag =
    typeof process !== 'undefined' && process?.env?.PERF_DEBUG;
  const runtimeFlag =
    typeof globalThis !== 'undefined' && globalThis?.PERF_DEBUG;
  return !!(envFlag || runtimeFlag);
}

export function createLayer(config, props = {}) {

  const perfEnabled = isPerfEnabled();
  const start = perfEnabled
    ? (typeof performance !== 'undefined' && performance?.now ? performance.now() : Date.now())
    : null;

  const defaultProps = config.defaultProps || {};

  // ID policy: allow props.id, otherwise config.id
  const id = (props.id ?? config.id);
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('[createLayer] Invalid layer id');
  }

  // Merge nested props that should not be clobbered
  const mergedParameters = {
    ...(defaultProps.parameters || {}),
    ...(props.parameters || {})
  };

  // Merge extensions: concat, de-dup by constructor name
  const defaultExt = Array.isArray(defaultProps.extensions) ? defaultProps.extensions : [];
  const propExt = Array.isArray(props.extensions) ? props.extensions : [];
  const mergedExtensions = [...defaultExt, ...propExt].filter(Boolean);

  // Optional: de-dup extensions by class name to avoid duplicates
  const seen = new Set();
  const dedupedExtensions = mergedExtensions.filter((e) => {
    const key = e?.constructor?.name || String(e);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const mergedUpdateTriggers = {
    ...(defaultProps.updateTriggers || {}),
    ...(props.updateTriggers || {})
  };

  const layerProps = {
    ...defaultProps,
    ...props,
    id,
    parameters: mergedParameters,
    extensions: dedupedExtensions,
    updateTriggers: mergedUpdateTriggers
  };

  const layer = new config.LayerClass(layerProps);

  perfCounters.layerCreations += 1;
  if (perfEnabled && start !== null) {
    const end = typeof performance !== 'undefined' && performance?.now ? performance.now() : Date.now();
    perfCounters.creationTimes.push(Math.max(0, end - start));
  }

  return layer;
}

export function resetPerf() {
  perfCounters.layerCreations = 0;
  perfCounters.creationTimes = [];
}

export function getPerfSnapshot() {
  return {
    layerCreations: perfCounters.layerCreations,
    creationTimes: [...perfCounters.creationTimes]
  };
}
