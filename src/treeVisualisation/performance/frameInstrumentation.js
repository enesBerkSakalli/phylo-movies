const framePerfCounters = new Map();

function isFramePerfEnabled() {
  const envFlag = typeof process !== 'undefined' && process?.env?.PERF_DEBUG;
  const runtimeFlag = typeof globalThis !== 'undefined' && globalThis?.PERF_DEBUG;
  return !!(envFlag || runtimeFlag);
}

function now() {
  return typeof performance !== 'undefined' && performance?.now ? performance.now() : Date.now();
}

function recordFrameTiming(name, durationMs) {
  const previous = framePerfCounters.get(name) || {
    count: 0,
    totalMs: 0,
    minMs: Number.POSITIVE_INFINITY,
    maxMs: 0,
    lastMs: 0,
  };
  const duration = Math.max(0, durationMs);
  framePerfCounters.set(name, {
    count: previous.count + 1,
    totalMs: previous.totalMs + duration,
    minMs: Math.min(previous.minMs, duration),
    maxMs: Math.max(previous.maxMs, duration),
    lastMs: duration,
  });
}

export function measureFrameStep(name, callback) {
  if (!isFramePerfEnabled()) {
    return callback();
  }

  const start = now();
  try {
    return callback();
  } finally {
    recordFrameTiming(name, now() - start);
  }
}

export async function measureFrameStepAsync(name, callback) {
  if (!isFramePerfEnabled()) {
    return await callback();
  }

  const start = now();
  try {
    return await callback();
  } finally {
    recordFrameTiming(name, now() - start);
  }
}

export function resetFramePerf() {
  framePerfCounters.clear();
}

export function getFramePerfSnapshot() {
  const snapshot = {};
  for (const [name, counter] of framePerfCounters) {
    snapshot[name] = {
      count: counter.count,
      totalMs: counter.totalMs,
      minMs: counter.count > 0 ? counter.minMs : 0,
      maxMs: counter.maxMs,
      lastMs: counter.lastMs,
      averageMs: counter.count > 0 ? counter.totalMs / counter.count : 0,
    };
  }
  return snapshot;
}

export function installFramePerfGlobal() {
  if (typeof globalThis === 'undefined') return;
  globalThis.__PHYLO_FRAME_PERF__ = {
    getSnapshot: getFramePerfSnapshot,
    reset: resetFramePerf,
  };
}

installFramePerfGlobal();
