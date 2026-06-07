import { TextLayer } from '@deck.gl/layers';
import { CLIPBOARD_LAYER_ID_PREFIX } from '../deckgl/layers/config/layerConfigs.js';
import { selectInputFrameIndices, useAppStore } from '../../state/phyloStore/store.js';
import { calculateLabelBounds, calculateNodeBounds, mergeBounds } from './TreeBoundsUtils.js';

const EMPTY_CLIPBOARD_OVERLAY = Object.freeze({
  layers: [],
  fitData: null,
  treeIndex: null,
  fitKey: null,
});

/**
 * Get clipboard layers if clipboard is active
 * @param {Object} controller - The DeckGLTreeAnimationController instance
 * @returns {Array} Clipboard layers or empty array
 */
export function getClipboardLayers(controller) {
  return getClipboardOverlay(controller).layers;
}

/**
 * Get clipboard layers plus world-space fit data for the pinned tree overlay.
 * The rendered layers are offset by a modelMatrix, so the viewport fitter needs
 * equivalent CPU-side offset coordinates to include the pinned tree in auto-fit.
 */
export function getClipboardOverlay(controller) {
  const state = useAppStore.getState();
  const { clipboardTreeIndex, treeList } = state;
  if (clipboardTreeIndex === null) return EMPTY_CLIPBOARD_OVERLAY;

  const treeData =
    state.ensureTreeHydrated?.(clipboardTreeIndex) ??
    useAppStore.getState().treeList?.[clipboardTreeIndex] ??
    treeList?.[clipboardTreeIndex] ??
    null;
  if (!treeData) return EMPTY_CLIPBOARD_OVERLAY;

  return createClipboardVisualOverlay(controller, clipboardTreeIndex, treeData);
}

/**
 * Create clipboard tree layers with visual positioning.
 */
function createClipboardVisualOverlay(controller, treeIndex, treeData) {
  const linkGeometryMode = useAppStore.getState().linkGeometryMode || 'radial-elbow';
  const layout = controller.calculateLayout(treeData, {
    treeIndex,
  });

  if (!layout?.layoutTree) {
    console.warn('[DeckGLTreeAnimationController] Clipboard layout not available');
    return EMPTY_CLIPBOARD_OVERLAY;
  }

  const { extensionRadius, labelRadius } = controller._getConsistentRadii(layout);

  const layerData = controller.dataConverter.convertTreeToLayerData(layout, {
    extensionRadius,
    labelRadius,
    treeIndex,
    treeSide: 'clipboard',
    renderMode: 'clipboard',
    linkGeometryMode,
  });

  const state = useAppStore.getState();
  const { clipboardOffsetX = 0, clipboardOffsetY = 0 } = state;
  const inputFrameIndices = selectInputFrameIndices(state);

  const clipboardBounds = mergeBounds(
    calculateNodeBounds(layerData.nodes),
    calculateLabelBounds(layerData.labels)
  );

  const mainTreeBounds = getMainTreeBounds(controller);

  // Position clipboard to the TOP LEFT ABOVE the main tree
  // Combined with dynamic user dragging offsets
  const xOffset = mainTreeBounds.minX - clipboardBounds.minX + clipboardOffsetX;
  const gap = 50;
  const yOffset = mainTreeBounds.minY - clipboardBounds.maxY - gap + clipboardOffsetY;

  const treeLayers = controller.layerManager.createClipboardLayers(layerData, 0, xOffset, yOffset);
  const labelData = createClipboardLabelData(
    treeIndex,
    clipboardBounds,
    inputFrameIndices,
    xOffset,
    yOffset
  );
  const labelLayer = createClipboardLabelLayer(
    treeIndex,
    clipboardBounds,
    inputFrameIndices,
    xOffset,
    yOffset
  );

  return {
    layers: [...treeLayers, labelLayer].filter(Boolean),
    fitData: createOffsetLayerDataForFit(layerData, xOffset, yOffset, labelData),
    treeIndex,
    fitKey: `pinned:${treeIndex}`,
  };
}

/**
 * Get bounds of the currently rendered main tree
 */
function getMainTreeBounds(controller) {
  const layerData = controller._lastLayerData;
  if (Array.isArray(layerData?.nodes) && layerData.nodes.length > 0) {
    return mergeBounds(
      calculateNodeBounds(layerData.nodes),
      calculateLabelBounds(layerData.labels)
    );
  }

  return { minX: -500, maxX: 500, minY: -500, maxY: 500 };
}

/**
 * Create clipboard label TextLayer
 * @param {number} treeIndex - Tree index for label text
 * @param {Object} bounds - Rendered clipboard content bounds {minX, maxX, minY, maxY}
 * @param {Array} inputFrameIndices - Array of input frame indices from store for input-tree detection
 * @param {number} xOffset - X offset for clipboard position
 * @param {number} yOffset - Y offset for clipboard position
 * @returns {TextLayer|null} Label layer or null
 */
export function createClipboardLabelLayer(
  treeIndex,
  bounds,
  inputFrameIndices = [],
  xOffset = 0,
  yOffset = 0
) {
  if (!bounds) return null;
  const labelData = createClipboardLabelData(
    treeIndex,
    bounds,
    inputFrameIndices,
    xOffset,
    yOffset
  );

  return new TextLayer({
    id: `${CLIPBOARD_LAYER_ID_PREFIX}-tree-label`,
    data: [labelData],
    pickable: true,
    getText: (d) => d.text,
    getPosition: (d) => d.position,
    getSize: 16,
    getColor: [0, 0, 0, 255], // Black
    fontFamily: 'sans-serif',
    fontWeight: 'bold',
    getTextAnchor: 'middle',
    getAlignmentBaseline: 'bottom',
  });
}

function createClipboardLabelData(
  treeIndex,
  bounds,
  inputFrameIndices = [],
  xOffset = 0,
  yOffset = 0
) {
  const minY = bounds.minY;
  const avgX = (bounds.minX + bounds.maxX) / 2;
  const inputTreeOrdinal = inputFrameIndices.indexOf(treeIndex);
  const text =
    inputTreeOrdinal >= 0 ? `Input tree ${inputTreeOrdinal + 1}` : `Tree #${treeIndex + 1}`;

  return {
    text,
    position: [avgX + xOffset, minY + yOffset - 50, 0],
    treeSide: 'clipboard',
  };
}

function createOffsetLayerDataForFit(layerData, offsetX, offsetY, labelData = null) {
  return {
    nodes: (layerData.nodes || []).map((node) => ({
      ...node,
      position: offsetPoint(node.position, offsetX, offsetY),
      renderPosition: offsetPoint(node.renderPosition, offsetX, offsetY),
    })),
    links: (layerData.links || []).map((link) => ({
      ...link,
      sourcePosition: offsetPoint(link.sourcePosition, offsetX, offsetY),
      targetPosition: offsetPoint(link.targetPosition, offsetX, offsetY),
      path: offsetPath(link.path, offsetX, offsetY),
    })),
    labels: (layerData.labels || [])
      .map((label) => ({
        ...label,
        position: offsetPoint(label.position, offsetX, offsetY),
      }))
      .concat(labelData ? [labelData] : []),
    extensions: (layerData.extensions || []).map((extension) => ({
      ...extension,
      sourcePosition: offsetPoint(extension.sourcePosition, offsetX, offsetY),
      targetPosition: offsetPoint(extension.targetPosition, offsetX, offsetY),
      path: offsetPath(extension.path, offsetX, offsetY),
    })),
    connectors: [],
  };
}

function offsetPoint(point, offsetX, offsetY) {
  if (!Array.isArray(point)) return point;
  return [point[0] + offsetX, point[1] + offsetY, point[2] ?? 0];
}

function offsetPath(path, offsetX, offsetY) {
  if (!path) return path;

  if (ArrayBuffer.isView(path)) {
    const nextPath = new path.constructor(path);
    for (let index = 0; index < nextPath.length; index += 3) {
      nextPath[index] += offsetX;
      nextPath[index + 1] += offsetY;
    }
    return nextPath;
  }

  if (Array.isArray(path)) {
    return path.map((point) =>
      Array.isArray(point) ? offsetPoint(point, offsetX, offsetY) : point
    );
  }

  return path;
}
