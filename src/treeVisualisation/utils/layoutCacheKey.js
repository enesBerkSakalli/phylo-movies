import {
  selectActiveTreeList,
  selectFileName,
  selectFullTreeIndices
} from '../../state/phyloStore/selectors/treeSelectors.js';

const datasetIds = new WeakMap();
let nextDatasetId = 1;

function resolveTreeList(state, treeList) {
  return treeList || selectActiveTreeList(state);
}

function getReferenceId(value) {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
    return 'none';
  }

  if (!datasetIds.has(value)) {
    datasetIds.set(value, nextDatasetId++);
  }

  return String(datasetIds.get(value));
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizedOffsets(state) {
  const offsets = state?.styleConfig?.labelOffsets || {};
  return {
    label: finiteNumber(offsets.DEFAULT, 20),
    extension: finiteNumber(offsets.EXTENSION, 5)
  };
}

function normalizedOptionalNumber(value) {
  if (value === null || value === undefined) {
    return 'none';
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : 'none';
}

function normalizedTaxaList(value) {
  if (!Array.isArray(value)) return [];

  return Array.from(new Set(value.flat(Infinity)
    .map((item) => Number(item))
    .filter(Number.isFinite)))
    .sort((a, b) => a - b);
}

export function getRotationAlignmentExcludeTaxa(state = {}, treeIndex = 'none') {
  if (!Number.isInteger(treeIndex)) return [];

  let trackingIndex = treeIndex;
  const ownTracking = state?.subtreeTracking?.[treeIndex];
  if ((!Array.isArray(ownTracking) || ownTracking.length === 0) &&
      typeof state?.transitionResolver?.getSourceTreeIndex === 'function') {
    const sourceIndex = state.transitionResolver.getSourceTreeIndex(treeIndex);
    if (Number.isInteger(sourceIndex) && Array.isArray(state?.subtreeTracking?.[sourceIndex])) {
      trackingIndex = sourceIndex;
    }
  }

  return normalizedTaxaList(state?.subtreeTracking?.[trackingIndex]);
}

export function getDatasetCacheId(state = {}, treeList = null) {
  const resolvedTreeList = resolveTreeList(state, treeList);
  const fileName = selectFileName(state) || 'dataset';
  const treeCount = Array.isArray(resolvedTreeList) ? resolvedTreeList.length : 0;
  const referenceId = getReferenceId(resolvedTreeList);
  if (Number.isInteger(state?.datasetVersion)) {
    return `${fileName}:${treeCount}:v${state.datasetVersion}:r${referenceId}`;
  }

  return `${fileName}:${treeCount}:r${referenceId}`;
}

export function createUniformScalingCacheKey({
  state = {},
  treeList = null,
  branchTransformation = state?.branchTransformation ?? 'none'
} = {}) {
  const resolvedTreeList = resolveTreeList(state, treeList);
  const fullTreeIndices = selectFullTreeIndices(state);
  return [
    `dataset=${getDatasetCacheId(state, resolvedTreeList)}`,
    `branch=${branchTransformation}`,
    `full=${Array.isArray(fullTreeIndices) ? fullTreeIndices.join(',') : ''}`
  ].join('|');
}

export function createTransformCacheKey({
  state = {},
  treeList = null,
  branchTransformation = state?.branchTransformation ?? 'none'
} = {}) {
  const resolvedTreeList = resolveTreeList(state, treeList);
  return [
    `dataset=${getDatasetCacheId(state, resolvedTreeList)}`,
    `branch=${branchTransformation}`
  ].join('|');
}

export function createLayoutCacheKey({
  state = {},
  treeList = null,
  treeIndex = 'none',
  width = 0,
  height = 0,
  maxGlobalScale = null,
  rotationAlignmentExcludeTaxa = null
} = {}) {
  const resolvedTreeList = resolveTreeList(state, treeList);
  const offsets = normalizedOffsets(state);
  const scale = normalizedOptionalNumber(maxGlobalScale);
  const alignmentExcludeTaxa = Array.isArray(rotationAlignmentExcludeTaxa)
    ? normalizedTaxaList(rotationAlignmentExcludeTaxa)
    : getRotationAlignmentExcludeTaxa(state, treeIndex);

  return [
    `dataset=${getDatasetCacheId(state, resolvedTreeList)}`,
    `tree=${treeIndex}`,
    `branch=${state?.branchTransformation ?? 'none'}`,
    `linkGeometry=${state?.linkGeometryMode ?? 'radial-elbow'}`,
    `width=${finiteNumber(width, 0)}`,
    `height=${finiteNumber(height, 0)}`,
    `angle=${finiteNumber(state?.layoutAngleDegrees, 360)}`,
    `rotation=${finiteNumber(state?.layoutRotationDegrees, 0)}`,
    `labelOffset=${offsets.label}`,
    `extensionOffset=${offsets.extension}`,
    `rotationAlignmentExcludeTaxa=${alignmentExcludeTaxa.length ? alignmentExcludeTaxa.join(',') : 'none'}`,
    `maxGlobalScale=${scale}`
  ].join('|');
}
