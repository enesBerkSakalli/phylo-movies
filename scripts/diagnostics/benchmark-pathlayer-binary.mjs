#!/usr/bin/env node
/**
 * Headless benchmark for packing interpolated tree paths into deck.gl PathLayer
 * binary-data shape:
 *
 *   {
 *     length,
 *     startIndices,
 *     attributes: {
 *       getPath: {value: Float32Array, size: 3}
 *     }
 *   }
 *
 * This does NOT render deck.gl in Node. It answers the first binary PathLayer
 * question: "how expensive is it to flatten our per-link/per-extension pooled
 * path buffers into one binary positions buffer per frame?"
 *
 * Usage:
 *   node scripts/diagnostics/benchmark-pathlayer-binary.mjs --file <movie.json> \
 *     [--pairs 6] [--steps 12] [--width 1234] [--height 777]
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

globalThis.PERF_DEBUG = false;

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

const freshLinksPacker = createBinaryPathPacker({ pooled: false });
const freshExtensionsPacker = createBinaryPathPacker({ pooled: false });
const pooledLinksPacker = createBinaryPathPacker({ pooled: true });
const pooledExtensionsPacker = createBinaryPathPacker({ pooled: true });
let frameCount = 0;
let interpolationMs = 0;
let freshPackMs = 0;
let pooledPackMs = 0;
let maxPathValues = 0;
let maxVertexCount = 0;
let maxPathCount = 0;
let sink = null;

for (const { dataFrom, dataTo } of pairInputs) {
  for (let s = 0; s <= stepsPerPair; s += 1) {
    const t = s / stepsPerPair;
    const interpolateStart = performance.now();
    const frame = interpolator.interpolateTreeData(dataFrom, dataTo, t, {
      linkGeometryMode: 'radial-elbow',
    });
    interpolationMs += performance.now() - interpolateStart;

    const freshStart = performance.now();
    const freshLinks = freshLinksPacker.pack(frame.links);
    const freshExtensions = freshExtensionsPacker.pack(frame.extensions);
    freshPackMs += performance.now() - freshStart;

    const pooledStart = performance.now();
    const pooledLinks = pooledLinksPacker.pack(frame.links);
    const pooledExtensions = pooledExtensionsPacker.pack(frame.extensions);
    pooledPackMs += performance.now() - pooledStart;

    maxPathValues = Math.max(
      maxPathValues,
      freshLinks.pathValueCount + freshExtensions.pathValueCount
    );
    maxVertexCount = Math.max(maxVertexCount, freshLinks.vertexCount + freshExtensions.vertexCount);
    maxPathCount = Math.max(maxPathCount, frame.links.length + frame.extensions.length);
    sink = pooledLinks.attributes.getPath.value[0] + pooledExtensions.attributes.getPath.value[0];
    frameCount += 1;
  }
}

void sink;

console.log('\n=== PathLayer binary packing benchmark ===');
console.log(
  JSON.stringify(
    {
      dataset: filePath.split('/').pop(),
      pairsBenchmarked: pairInputs.length,
      framesRun: frameCount,
      maxPathCount,
      maxVertexCount,
      maxPositionsBuffer_MB: round((maxPathValues * Float32Array.BYTES_PER_ELEMENT) / 1048576),
      interpolation_totalMs: round(interpolationMs),
      interpolation_perFrameMs: round(interpolationMs / Math.max(1, frameCount)),
      freshBinaryPack_totalMs: round(freshPackMs),
      freshBinaryPack_perFrameMs: round(freshPackMs / Math.max(1, frameCount)),
      pooledBinaryPack_totalMs: round(pooledPackMs),
      pooledBinaryPack_perFrameMs: round(pooledPackMs / Math.max(1, frameCount)),
      note: 'Packing only; this does not measure deck.gl attribute upload/render time in a browser.',
    },
    null,
    2
  )
);

function createBinaryPathPacker({ pooled = true } = {}) {
  let positions = null;
  let startIndices = null;

  return {
    pack(items = []) {
      let pathValueCount = 0;
      let vertexCount = 0;
      for (const item of items) {
        const path = item?.path;
        const length = path?.length ?? 0;
        pathValueCount += length;
        vertexCount += Math.floor(length / 3);
      }

      if (!pooled || !positions || positions.length !== pathValueCount) {
        positions = new Float32Array(pathValueCount);
      }
      if (!pooled || !startIndices || startIndices.length !== items.length + 1) {
        startIndices = new Uint32Array(items.length + 1);
      }

      let valueOffset = 0;
      let vertexOffset = 0;
      for (let i = 0; i < items.length; i += 1) {
        const path = items[i]?.path;
        const length = path?.length ?? 0;
        startIndices[i] = vertexOffset;
        if (length > 0) {
          positions.set(path, valueOffset);
          valueOffset += length;
          vertexOffset += Math.floor(length / 3);
        }
      }
      startIndices[items.length] = vertexOffset;

      return {
        length: items.length,
        startIndices,
        attributes: {
          getPath: { value: positions, size: 3 },
        },
        pathValueCount,
        vertexCount,
      };
    },
  };
}

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
