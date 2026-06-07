#!/usr/bin/env node
/**
 * Headless allocation/GC-pressure benchmark for the interpolation hot path.
 *
 * Complements benchmark-frame-steps.mjs (which measures CPU time). This one
 * answers: "how much garbage does each interpolated frame allocate, and how
 * much GC pause does that cause?" — the question behind the per-frame object
 * spreads / Float32Array path allocations in the link/extension interpolators.
 *
 * Must run with --expose-gc so we can force a clean baseline and read GC events:
 *   node --expose-gc scripts/diagnostics/benchmark-frame-allocation.mjs \
 *     --file <movie.json> [--pairs 6] [--steps 12]
 *
 * For real GC pause times, add --trace-gc (the perf_hooks 'gc' PerformanceObserver
 * does not reliably emit in all Node versions, so trace-gc is the source of truth
 * for pause durations):
 *   node --expose-gc --trace-gc scripts/diagnostics/benchmark-frame-allocation.mjs ...
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance, PerformanceObserver } from 'node:perf_hooks';

if (typeof globalThis.gc !== 'function') {
  console.error(
    'Run with: node --expose-gc scripts/diagnostics/benchmark-frame-allocation.mjs ...'
  );
  process.exit(1);
}

globalThis.PERF_DEBUG = false; // measure allocation, not instrumentation overhead

const { useAppStore } = await import('../../src/state/phyloStore/store.js');
const { hydrateMovieTreeAtIndex } = await import('../../src/domain/backend/treeHydration.js');
const { TreeLayoutController } =
  await import('../../src/treeVisualisation/TreeLayoutController.js');
const { TreeInterpolator } =
  await import('../../src/treeVisualisation/deckgl/interpolation/TreeInterpolator.js');
const { InterpolationCache } =
  await import('../../src/treeVisualisation/deckgl/interpolation/InterpolationCache.js');
const { DeckGLTreeLayerDataFactory } =
  await import('../../src/treeVisualisation/deckgl/DeckGLTreeLayerDataFactory.js');

const args = parseArgs(process.argv.slice(2));
const filePath = resolve(
  args.file ?? 'publication_data/precomputed/all_trees_24_source-24_taxa24_sites14190.movie.json'
);
const width = args.width ?? 1234;
const height = args.height ?? 777;
const stepsPerPair = args.steps ?? 12;
const maxPairs = args.pairs ?? 6;

// --- GC observer ---
let gcCount = 0;
let gcTotalMs = 0;
let gcMaxMs = 0;
const gcObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    gcCount += 1;
    gcTotalMs += entry.duration;
    gcMaxMs = Math.max(gcMaxMs, entry.duration);
  }
});
gcObserver.observe({ entryTypes: ['gc'] });

console.log(`Loading ${filePath} ...`);
const movieData = JSON.parse(readFileSync(filePath, 'utf8'));
const treeList = movieData.interpolated_trees;
const frames = movieData.frames;
const inputIndices = frames
  .filter((f) => f.frame_type === 'input_tree' || f.is_observed_input === true)
  .map((f) => f.frame_index);

if (inputIndices.length < 2) {
  throw new Error('Need at least two input-tree frames to benchmark interpolation.');
}

const hydrated = new Map();
for (const idx of inputIndices) hydrated.set(idx, hydrateMovieTreeAtIndex(movieData, idx));

const liveTreeList = new Array(treeList.length);
for (const [idx, tree] of hydrated) liveTreeList[idx] = tree;
useAppStore.setState({
  treeList: liveTreeList,
  timelineFrames: frames,
  branchTransformation: 'none',
  layoutAngleDegrees: 360,
  layoutRotationDegrees: 0,
  styleConfig: { labelOffsets: { DEFAULT: 20, EXTENSION: 5 } },
  frameIndex: 0,
  playing: false,
});

const controller = new TreeLayoutController(null);
controller.resize({ width, height });
controller.initializeUniformScaling('none');

const dataFactory = new DeckGLTreeLayerDataFactory();
const interpolator = new TreeInterpolator();
const interpolationCache = new InterpolationCache({
  calculateLayout: (treeData, opts) => controller.calculateLayout(treeData, opts),
  getConsistentRadii: (layout) => controller._getConsistentRadii(layout),
  convertTreeToLayerData: dataFactory.convertTreeToLayerData.bind(dataFactory),
  getLayoutCacheKey: (treeIndex) =>
    controller._getLayoutResultCacheKey({
      state: useAppStore.getState(),
      treeList: useAppStore.getState().treeList,
      treeData: useAppStore.getState().treeList[treeIndex],
      treeIndex,
    }),
  getLinkGeometryMode: () => 'radial-elbow',
});

// Pre-build layout inputs for each pair so layout cost is excluded from the
// allocation measurement (we want per-frame interpolation garbage only).
const pairInputs = [];
for (let i = 0; i + 1 < inputIndices.length && pairInputs.length < maxPairs; i += 1) {
  const fromIdx = inputIndices[i];
  const toIdx = inputIndices[i + 1];
  const { dataFrom, dataTo } = interpolationCache.buildInterpolationInputs(
    hydrated.get(fromIdx),
    hydrated.get(toIdx),
    fromIdx,
    toIdx
  );
  if (dataFrom && dataTo) pairInputs.push({ dataFrom, dataTo });
}

const linkCount = pairInputs[0]?.dataFrom?.links?.length ?? 0;
const extCount = pairInputs[0]?.dataFrom?.extensions?.length ?? 0;
const nodeCount = pairInputs[0]?.dataFrom?.nodes?.length ?? 0;

// --- Allocation measurement ---
// Force a clean baseline, then run many frames WITHOUT triggering manual GC so
// heapUsed growth reflects retained+garbage allocation. We hold no references
// to results (overwrite each loop) so almost all is garbage.
globalThis.gc();
const heapBefore = process.memoryUsage().heapUsed;
gcCount = 0;
gcTotalMs = 0;
gcMaxMs = 0;

let frameCount = 0;
const wallStart = performance.now();
let sink = null;
for (const { dataFrom, dataTo } of pairInputs) {
  for (let s = 0; s <= stepsPerPair; s += 1) {
    const t = s / stepsPerPair;
    sink = interpolator.interpolateTreeData(dataFrom, dataTo, t, {
      linkGeometryMode: 'radial-elbow',
    });
    frameCount += 1;
  }
}
const wallMs = performance.now() - wallStart;
const heapAfter = process.memoryUsage().heapUsed;
void sink;

// Net retained after a forced GC tells us how much is true garbage vs retained.
globalThis.gc();
const heapAfterGc = process.memoryUsage().heapUsed;

const grossGrowth = heapAfter - heapBefore;
const retained = heapAfterGc - heapBefore;

console.log('\n=== Allocation / GC pressure (interpolation only) ===');
console.log(
  JSON.stringify(
    {
      dataset: filePath.split('/').pop(),
      nodes: nodeCount,
      links: linkCount,
      extensions: extCount,
      framesRun: frameCount,
      wallMs: round(wallMs),
      perFrameMs: round(wallMs / Math.max(1, frameCount)),
      heapGrowthDuringRun_MB: round(grossGrowth / 1048576),
      retainedAfterGc_MB: round(retained / 1048576),
      estGarbagePerFrame_KB: round(
        Math.max(0, grossGrowth - retained) / 1024 / Math.max(1, frameCount)
      ),
      gcObserverEvents: gcCount,
      gcObserverTotalMs: round(gcTotalMs),
      gcObserverNote:
        gcCount === 0
          ? 'perf_hooks gc observer did not emit; use --trace-gc for real pause times'
          : 'ok',
    },
    null,
    2
  )
);

gcObserver.disconnect();

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--file') parsed.file = argv[++i];
    else if (a === '--width') parsed.width = Number(argv[++i]);
    else if (a === '--height') parsed.height = Number(argv[++i]);
    else if (a === '--steps') parsed.steps = Number(argv[++i]);
    else if (a === '--pairs') parsed.pairs = Number(argv[++i]);
    else if (!parsed.file) parsed.file = a;
  }
  return parsed;
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}
