#!/usr/bin/env node
/**
 * Headless per-frame hot-path benchmark.
 *
 * Measures the real animation hot path on a precomputed movie payload WITHOUT a
 * browser or WebGL: tree hydration, layout (TreeLayoutController), and
 * TreeInterpolator.interpolateTreeData across a range of `t` values.
 *
 * It reuses the same instrumentation the live app uses (frameInstrumentation),
 * so step names match what `window.__PHYLO_FRAME_PERF__.getSnapshot()` reports.
 *
 * This is a diagnostic/measurement tool, not a release gate. It exists to put
 * real numbers behind per-frame cost questions (e.g. "is hydration or
 * interpolation the bottleneck?") before changing any code.
 *
 * Usage:
 *   node scripts/diagnostics/benchmark-frame-steps.mjs --file <movie.json> \
 *     [--pairs 8] [--steps 12] [--width 1234] [--height 777]
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

globalThis.PERF_DEBUG = true;

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
const perf = await import('../../src/treeVisualisation/performance/frameInstrumentation.js');

const args = parseArgs(process.argv.slice(2));
const filePath = resolve(
  args.file ?? 'publication_data/precomputed/all_trees_24_source-24_taxa24_sites14190.movie.json'
);
const width = args.width ?? 1234;
const height = args.height ?? 777;
const stepsPerPair = args.steps ?? 12;
const maxPairs = args.pairs ?? 8;

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

// --- Hydration cost (measured separately, on the input-tree endpoints) ---
perf.resetFramePerf();
const hydrateStart = performance.now();
const hydrated = new Map();
for (const idx of inputIndices) {
  perf.measureFrameStep('benchmark.hydrateInputTree', () => {
    hydrated.set(idx, hydrateMovieTreeAtIndex(movieData, idx));
  });
}
const hydrateTotal = performance.now() - hydrateStart;

// Populate the store treeList with the hydrated input trees BEFORE scaling.
// Uniform scaling reads input-frame indices, so those slots must be hydrated.
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

// Wire the same InterpolationCache the live controller uses, so layout->layerData
// conversion (the real per-transition cost) is faithfully reproduced.
const interpolationCache = new InterpolationCache({
  calculateLayout: (treeData, opts) => controller.calculateLayout(treeData, opts),
  getConsistentRadii: (layout) => controller._getConsistentRadii(layout),
  convertTreeToLayerData: dataFactory.convertTreeToLayerData.bind(dataFactory),
  getLayoutCacheKey: (treeIndex) =>
    controller._getLayoutResultCacheKey
      ? controller._getLayoutResultCacheKey({
          state: useAppStore.getState(),
          treeList: useAppStore.getState().treeList,
          treeData: useAppStore.getState().treeList[treeIndex],
          treeIndex,
        })
      : null,
  getLinkGeometryMode: () => 'radial-elbow',
});

// --- Layout + interpolation cost across consecutive input-tree pairs ---
const pairs = [];
for (let i = 0; i + 1 < inputIndices.length && pairs.length < maxPairs; i += 1) {
  pairs.push([inputIndices[i], inputIndices[i + 1]]);
}

let frameCount = 0;
const interpStart = performance.now();
for (const [fromIdx, toIdx] of pairs) {
  const { dataFrom, dataTo } = interpolationCache.buildInterpolationInputs(
    hydrated.get(fromIdx),
    hydrated.get(toIdx),
    fromIdx,
    toIdx
  );
  if (!dataFrom || !dataTo) continue;

  for (let s = 0; s <= stepsPerPair; s += 1) {
    const t = s / stepsPerPair;
    interpolator.interpolateTreeData(dataFrom, dataTo, t, { linkGeometryMode: 'radial-elbow' });
    frameCount += 1;
  }
}
const interpTotal = performance.now() - interpStart;

const snapshot = perf.getFramePerfSnapshot();

const leafCount = countLeaves(hydrated.get(inputIndices[0]));
console.log('\n=== Frame-step benchmark ===');
console.log(
  JSON.stringify(
    {
      dataset: filePath.split('/').pop(),
      taxaLeafCount: leafCount,
      totalTrees: treeList.length,
      inputTreeFrames: inputIndices.length,
      pairsBenchmarked: pairs.length,
      interpolationFramesRun: frameCount,
      hydrateInputTrees_totalMs: round(hydrateTotal),
      hydratePerInputTree_ms: round(hydrateTotal / inputIndices.length),
      interpolation_wallMs: round(interpTotal),
      interpolationPerFrame_ms: round(interpTotal / Math.max(1, frameCount)),
    },
    null,
    2
  )
);

console.log('\nInstrumented step timings (averageMs over count):');
console.table(
  Object.fromEntries(
    Object.entries(snapshot).map(([name, c]) => [
      name,
      {
        count: c.count,
        avgMs: round(c.averageMs),
        maxMs: round(c.maxMs),
        totalMs: round(c.totalMs),
      },
    ])
  )
);

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

function countLeaves(node) {
  if (!node || typeof node !== 'object') return 0;
  const children = Array.isArray(node.children) ? node.children : [];
  if (children.length === 0) return 1;
  return children.reduce((sum, c) => sum + countLeaves(c), 0);
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}
