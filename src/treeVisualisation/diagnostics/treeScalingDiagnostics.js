import calculateScales, { getMaxScaleValue } from '../../domain/tree/scaleUtils.js';
import { transformBranchLengths } from '../../domain/tree/branchTransform.js';
import { selectInputFrameIndices, useAppStore } from '../../state/phyloStore/store.js';
import { DEFAULT_BRANCH_TRANSFORMATION } from '../../state/phyloStore/slices/appearance/treeLayout.slice.js';
import { DeckGLTreeLayerDataFactory } from '../deckgl/DeckGLTreeLayerDataFactory.js';
import { calculateReadableLabelRadius, calculateLabelAngleSpan } from '../layout/labelRingRadii.js';
import { TreeLayoutController } from '../TreeLayoutController.js';
import { calculateTaxaVisualScale } from '../utils/visualScale.js';
import {
  calculateBranchBounds,
  calculateLabelBounds,
  mergeBounds,
} from '../utils/TreeBoundsUtils.js';
import { calculateFocusViewport, VIEWPORT_FIT_MODES } from '../viewport/viewportFit.js';

const DEFAULT_WIDTH = 1234;
const DEFAULT_HEIGHT = 777;
const DEFAULT_FONT_SIZE = '1.8em';
const DEFAULT_LABEL_OFFSETS = { DEFAULT: 1, EXTENSION: 1 };

export function createTreeScalingDiagnostics(movieData, options = {}) {
  const treeList = Array.isArray(movieData?.interpolated_trees)
    ? movieData.interpolated_trees
    : Array.isArray(movieData?.treeList)
      ? movieData.treeList
      : [];

  if (treeList.length === 0) {
    throw new Error(
      'Tree scaling diagnostics require movieData.interpolated_trees or movieData.treeList'
    );
  }

  const width = normalizePositiveNumber(options.width, DEFAULT_WIDTH);
  const height = normalizePositiveNumber(options.height, DEFAULT_HEIGHT);
  const fontSize = options.fontSize ?? DEFAULT_FONT_SIZE;
  const labelOffsets = options.labelOffsets ?? DEFAULT_LABEL_OFFSETS;
  const branchTransformation = options.branchTransformation ?? DEFAULT_BRANCH_TRANSFORMATION;
  const layoutAngleDegrees = options.layoutAngleDegrees ?? 360;
  const layoutRotationDegrees = options.layoutRotationDegrees ?? 0;
  const linkGeometryMode = options.linkGeometryMode ?? 'radial-elbow';
  const previousState = useAppStore.getState();

  try {
    useAppStore.setState({
      treeList,
      timelineFrames: normalizeTimelineFrames(movieData?.frames, treeList),
      leafNamesByIndex: deriveLeafNamesByIndex(treeList[0]),
      branchTransformation,
      layoutAngleDegrees,
      layoutRotationDegrees,
      fontSize,
      styleConfig: { labelOffsets },
      labelsVisible: options.labelsVisible ?? true,
      frameIndex: 0,
      playing: false,
    });

    const state = useAppStore.getState();
    const inputFrameIndices = selectInputFrameIndices(state);
    const originalScaleList = calculateScales(treeList, inputFrameIndices);
    const originalMaxGlobalScale = getMaxScaleValue(originalScaleList);
    const transformedTreeList = treeList.map((tree) =>
      branchTransformation === 'none' ? tree : transformBranchLengths(tree, branchTransformation)
    );
    const rawScaleList = calculateScales(transformedTreeList, inputFrameIndices);
    const rawMaxGlobalScale = getMaxScaleValue(rawScaleList);
    const controller = new TreeLayoutController(null);
    controller.resize({ width, height });
    controller.initializeUniformScaling(branchTransformation);

    const dataFactory = new DeckGLTreeLayerDataFactory();
    const treeIndices = normalizeTreeIndices(
      options.treeIndices,
      treeList.length,
      inputFrameIndices
    );
    const trees = treeIndices.map((treeIndex) =>
      analyzeTreeIndex({
        treeIndex,
        treeList,
        transformedTreeList,
        inputFrameIndices,
        originalScaleList,
        originalMaxGlobalScale,
        rawScaleList,
        rawMaxGlobalScale,
        controller,
        dataFactory,
        width,
        height,
        fontSize,
        labelOffsets,
        linkGeometryMode,
      })
    );

    return {
      dataset: {
        fileName: movieData?.file_name ?? options.fileName ?? null,
        treeCount: treeList.length,
        inputFrameIndices,
        sampledTreeIndices: treeIndices,
        width,
        height,
        fontSize,
        labelOffsets,
        branchTransformation,
        layoutAngleDegrees,
        layoutRotationDegrees,
        linkGeometryMode,
      },
      global: {
        originalMaxGlobalScale,
        activeMaxGlobalScale: rawMaxGlobalScale,
        rawMaxGlobalScale,
        maxGlobalScale: controller.maxGlobalScale,
        minVisualBranchLength: 0,
      },
      trees,
    };
  } finally {
    useAppStore.setState(previousState, true);
  }
}

function analyzeTreeIndex({
  treeIndex,
  treeList,
  transformedTreeList,
  inputFrameIndices,
  originalScaleList,
  originalMaxGlobalScale,
  rawScaleList,
  rawMaxGlobalScale,
  controller,
  dataFactory,
  width,
  height,
  fontSize,
  labelOffsets,
  linkGeometryMode,
}) {
  const layout = controller.calculateLayout(treeList[treeIndex], { treeIndex });
  const radii = controller._getConsistentRadii(layout);
  const layerData = dataFactory.convertTreeToLayerData(layout, {
    ...radii,
    treeIndex,
    treeSide: 'left',
    renderMode: 'diagnostic',
    linkGeometryMode,
  });
  const leafCount = layout.leaves.length;
  const angleSpanRadians = calculateLabelAngleSpan(layout.leaves);
  const extensionOffset = normalizeFiniteNumber(
    labelOffsets?.EXTENSION,
    DEFAULT_LABEL_OFFSETS.EXTENSION
  );
  const labelOffset = normalizeFiniteNumber(labelOffsets?.DEFAULT, DEFAULT_LABEL_OFFSETS.DEFAULT);
  const compactExtensionRadius = layout.max_radius + extensionOffset;
  const compactLabelRadius = compactExtensionRadius + labelOffset;
  const readableLabelRadius = calculateReadableLabelRadius({
    labelCount: leafCount,
    fontSize,
    angleSpanRadians,
  });
  const getLabelSize = () => estimateRenderedLabelSize(fontSize, leafCount);

  const branchOnlyBounds = calculateBranchBounds(layerData.nodes, layerData.links);
  const branchWithExtensionsBounds = calculateBranchBounds(layerData.nodes, [
    ...layerData.links,
    ...layerData.extensions,
  ]);
  const labelBounds = calculateLabelBounds(layerData.labels, { getLabelSize });
  const autoVisibleBounds = mergeBounds(branchWithExtensionsBounds, labelBounds);

  const viewportInputs = {
    nodes: layerData.nodes,
    labels: layerData.labels,
    canvasWidth: width,
    canvasHeight: height,
    fitAreas: null,
    activeView: null,
    currentViewState: { target: [0, 0, 0], zoom: 0 },
    getLabelSize,
  };
  const branchOnlyFit = calculateFocusViewport({
    ...viewportInputs,
    labels: [],
    links: layerData.links,
    fitMode: VIEWPORT_FIT_MODES.BRANCH,
  });
  const branchWithExtensionsFit = calculateFocusViewport({
    ...viewportInputs,
    labels: [],
    links: [...layerData.links, ...layerData.extensions],
    fitMode: VIEWPORT_FIT_MODES.BRANCH,
  });
  const autoVisibleFit = calculateFocusViewport({
    ...viewportInputs,
    links: [...layerData.links, ...layerData.extensions],
    fitMode: VIEWPORT_FIT_MODES.AUTO_VISIBLE,
  });

  const originalRootToTipMax = getScaleForTree(originalScaleList, treeList, treeIndex);
  const rawRootToTipMax = getScaleForTree(rawScaleList, transformedTreeList, treeIndex);
  const flooredRootToTipMax = rawRootToTipMax;

  return {
    treeIndex,
    isInputFrame: inputFrameIndices.includes(treeIndex),
    branchGeometry: {
      originalRootToTipMax,
      activeRootToTipMax: rawRootToTipMax,
      rawRootToTipMax,
      flooredRootToTipMax,
      rawToGlobalRatio:
        rawMaxGlobalScale > 0 && Number.isFinite(rawRootToTipMax)
          ? rawRootToTipMax / rawMaxGlobalScale
          : null,
      originalToGlobalRatio:
        originalMaxGlobalScale > 0 && Number.isFinite(originalRootToTipMax)
          ? originalRootToTipMax / originalMaxGlobalScale
          : null,
      activeToOriginalRootTipRatio: safeRatio(rawRootToTipMax, originalRootToTipMax),
      maxRadius: layout.max_radius,
      uniformScale: layout.uniformScale ?? null,
      readableScale: layout.scale ?? null,
      nodeCount: layerData.nodes.length,
      linkCount: layerData.links.length,
    },
    labelRing: {
      leafCount,
      fontSize,
      visualScale: calculateTaxaVisualScale(leafCount),
      angleSpanRadians,
      compactExtensionRadius,
      compactLabelRadius,
      readableLabelRadius,
      extensionRadius: radii.extensionRadius,
      labelRadius: radii.labelRadius,
      extensionInflation: safeRatio(radii.extensionRadius, compactExtensionRadius),
      labelInflation: safeRatio(radii.labelRadius, compactLabelRadius),
      labelCount: layerData.labels.length,
      extensionCount: layerData.extensions.length,
    },
    viewport: {
      branchOnlyBounds: summarizeBounds(branchOnlyBounds),
      branchWithExtensionsBounds: summarizeBounds(branchWithExtensionsBounds),
      labelBounds: summarizeBounds(labelBounds),
      autoVisibleBounds: summarizeBounds(autoVisibleBounds),
      branchOnlyZoom: branchOnlyFit.zoom,
      branchWithExtensionsZoom: branchWithExtensionsFit.zoom,
      autoVisibleZoom: autoVisibleFit.zoom,
      extensionZoomDelta: branchWithExtensionsFit.zoom - branchOnlyFit.zoom,
      autoVisibleZoomDelta: autoVisibleFit.zoom - branchOnlyFit.zoom,
      branchOnlyTarget: branchOnlyFit.target,
      branchWithExtensionsTarget: branchWithExtensionsFit.target,
      autoVisibleTarget: autoVisibleFit.target,
    },
  };
}

function getScaleForTree(scaleList, treeList, treeIndex) {
  const scaleEntry = scaleList.find((entry) => entry.index === treeIndex);
  if (Number.isFinite(scaleEntry?.value)) return scaleEntry.value;

  return calculateScales(treeList, [treeIndex])[0]?.value ?? null;
}

function normalizeTimelineFrames(frames, treeList) {
  if (Array.isArray(frames) && frames.length > 0) return frames;
  return treeList.map((_tree, index) => ({
    frame_index: index,
    frame_type: 'input_tree',
    is_observed_input: true,
  }));
}

function normalizeTreeIndices(treeIndices, treeCount, inputFrameIndices) {
  const requested =
    Array.isArray(treeIndices) && treeIndices.length > 0
      ? treeIndices
      : defaultTreeIndices(treeCount, inputFrameIndices);
  return [...new Set(requested)]
    .map((index) => Number(index))
    .filter((index) => Number.isInteger(index) && index >= 0 && index < treeCount);
}

function defaultTreeIndices(treeCount, inputFrameIndices) {
  const first = 0;
  const last = Math.max(0, treeCount - 1);
  const inputFirst = inputFrameIndices[0] ?? first;
  const inputSecond = inputFrameIndices.find((index) => index !== inputFirst);
  const midpoint = Math.floor(last / 2);
  return [first, inputFirst, inputSecond, midpoint, last].filter(Number.isInteger);
}

function deriveLeafNamesByIndex(tree) {
  const namesByIndex = [];
  visitLeaves(tree, (leaf) => {
    const splitIndices = Array.isArray(leaf?.split_indices) ? leaf.split_indices : [];
    if (splitIndices.length === 1 && Number.isInteger(splitIndices[0])) {
      namesByIndex[splitIndices[0]] =
        typeof leaf.name === 'string' ? leaf.name : String(splitIndices[0]);
    }
  });
  return namesByIndex;
}

function visitLeaves(node, callback) {
  if (!node || typeof node !== 'object') return;
  const children = Array.isArray(node.children) ? node.children : [];
  if (children.length === 0) {
    callback(node);
    return;
  }
  children.forEach((child) => visitLeaves(child, callback));
}

function estimateRenderedLabelSize(fontSize, labelCount) {
  const numericFontSize = typeof fontSize === 'string' ? parseFloat(fontSize) : Number(fontSize);
  const baseSize = numericFontSize * 12 || 24;
  return baseSize * calculateTaxaVisualScale(labelCount);
}

function summarizeBounds(bounds) {
  if (!bounds) return null;
  const width = Math.max(0, bounds.maxX - bounds.minX);
  const height = Math.max(0, bounds.maxY - bounds.minY);
  return {
    minX: bounds.minX,
    maxX: bounds.maxX,
    minY: bounds.minY,
    maxY: bounds.maxY,
    width,
    height,
    radius: Math.hypot(width, height) / 2,
  };
}

function normalizePositiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function normalizeFiniteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function safeRatio(numerator, denominator) {
  const top = Number(numerator);
  const bottom = Number(denominator);
  if (!Number.isFinite(top) || !Number.isFinite(bottom) || bottom === 0) return null;
  return top / bottom;
}
