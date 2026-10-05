import { getSplitIndices, getSplitKey } from '../../domain/tree/splits.js';
import {
  calculatePositionCenter,
  calculateSafeVisualRadius,
  calculateTreeVisualRadius,
} from '../utils/TreeBoundsUtils.js';
import { STABLE_LABEL_BOUNDS_SIZE_PX } from '../layout/labelRingRadii.js';

/**
 * ComparisonUtils
 *
 * Helper functions for side-by-side tree comparison mode.
 */

/**
 * Calculate spacing offset for the right tree in comparison mode.
 * Uses tree radii in world-space to determine appropriate spacing
 * so that both trees are visible without overlap.
 * @param {number} canvasWidth - Canvas width used for degenerate-layout fallback spacing
 * @param {Object} rightTreeOffset - Current right tree offset {x, y}
 * @param {number} [leftRadius=0] - Left tree radius in world-space units
 * @param {number} [rightRadius=0] - Right tree radius in world-space units
 * @returns {number} Right tree offset in world-space units
 */
function calculateRightOffset(canvasWidth, rightTreeOffset, leftRadius = 0, rightRadius = 0) {
  // Use tree radii if available; fall back to canvas-based estimate at zoom=0
  const effectiveLeftRadius = leftRadius > 0 ? leftRadius : canvasWidth / 4;
  const effectiveRightRadius = rightRadius > 0 ? rightRadius : canvasWidth / 4;
  const gap = Math.max(effectiveLeftRadius, effectiveRightRadius) * 0.3;
  // Ensure a minimum offset so trees never overlap even with tiny/degenerate layouts
  const minOffset = canvasWidth * 0.25;
  return Math.max(minOffset, effectiveLeftRadius + gap + effectiveRightRadius) + rightTreeOffset.x;
}

export function calculateComparisonFrameGeometry({
  leftLayerData,
  rightLayerData,
  canvasWidth,
  rightTreeOffset = { x: 0, y: 0 },
  leftTreeOffsetX = 0,
  leftTreeOffsetY = 0,
}) {
  const leftCenterBase = calculatePositionCenter(leftLayerData.nodes);
  const rightCenterBase = calculatePositionCenter(rightLayerData.nodes);
  // Always count label text, even when labels are hidden: spacing keyed on label visibility
  // would let the trees overlap without an auto-fit (fit state is keyed by tree indices).
  const labelSizePx = STABLE_LABEL_BOUNDS_SIZE_PX;
  const leftRadius = calculateTreeVisualRadius(leftLayerData, leftCenterBase, labelSizePx);
  const rightRadius = calculateTreeVisualRadius(rightLayerData, rightCenterBase, labelSizePx);
  const rightOffset = calculateRightOffset(canvasWidth, rightTreeOffset, leftRadius, rightRadius);
  const rightOffsetY = rightTreeOffset.y;
  const leftCenter = [leftCenterBase[0] + leftTreeOffsetX, leftCenterBase[1] + leftTreeOffsetY];
  const rightCenter = [rightCenterBase[0] + rightOffset, rightCenterBase[1] + rightOffsetY];
  const leftSafeRadius = calculateSafeVisualRadius(
    leftLayerData.nodes,
    leftLayerData.labels,
    leftCenter
  );
  const rightSafeRadius = calculateSafeVisualRadius(
    rightLayerData.nodes,
    rightLayerData.labels,
    rightCenter
  );

  return {
    rightOffset,
    rightOffsetY,
    leftCenter,
    rightCenter,
    leftSafeRadius,
    rightSafeRadius,
  };
}

/**
 * Apply position offset to layer data elements.
 * @param {Object} layerData - Layer data containing nodes, links, extensions, labels
 * @param {number} offsetX - X offset
 * @param {number} offsetY - Y offset
 */
export function applyOffset(layerData, offsetX, offsetY) {
  const shift = (p) => [p[0] + offsetX, p[1] + offsetY, p[2]];

  layerData.nodes.forEach((node) => {
    node.position = shift(node.position);
    node.renderPosition = shift(node.renderPosition);
  });

  [...layerData.links, ...layerData.extensions].forEach((edge) => {
    edge.sourcePosition = shift(edge.sourcePosition);
    edge.targetPosition = shift(edge.targetPosition);
    offsetFlatPath(edge.path, offsetX, offsetY);
  });

  layerData.labels.forEach((label) => {
    label.position = shift(label.position);
  });
}

export function cloneLayerData(layerData) {
  return {
    nodes: cloneLayerElements(layerData.nodes),
    links: cloneLayerElements(layerData.links),
    extensions: cloneLayerElements(layerData.extensions),
    labels: cloneLayerElements(layerData.labels),
  };
}

function cloneLayerElements(elements) {
  return elements.map((element) => cloneLayerElement(element));
}

function cloneLayerElement(element) {
  const clone = { ...element };
  copyVectorField(clone, element, 'position');
  copyVectorField(clone, element, 'renderPosition');
  copyVectorField(clone, element, 'sourcePosition');
  copyVectorField(clone, element, 'targetPosition');
  if (ArrayBuffer.isView(element.path)) {
    clone.path = new element.path.constructor(element.path);
  }
  return clone;
}

function copyVectorField(target, source, field) {
  if (Array.isArray(source[field])) {
    target[field] = [...source[field]];
  }
}

function offsetFlatPath(path, offsetX, offsetY) {
  if (!ArrayBuffer.isView(path)) return;
  for (let i = 0; i < path.length; i += 3) {
    path[i] += offsetX;
    path[i + 1] += offsetY;
  }
}

/**
 * Combine layer data from left and right trees.
 * @param {Object} leftData - Left tree layer data
 * @param {Object} rightData - Right tree layer data
 * @param {Array} connectors - Optional connector paths between trees
 * @returns {Object} Combined layer data
 */
export function combineLayerData(leftData, rightData, connectors = []) {
  return {
    nodes: [...leftData.nodes, ...rightData.nodes],
    links: [...leftData.links, ...rightData.links],
    extensions: [...leftData.extensions, ...rightData.extensions],
    labels: [...leftData.labels, ...rightData.labels],
    connectors,
  };
}

/**
 * Build a quick lookup of split-index keys to positions (prefers label/tip position when available).
 * @param {Array} nodes - Array of node objects
 * @param {Array} labels - Array of label objects
 * @returns {Map} Map of split-index keys to position/metadata
 */
export function buildPositionMap(nodes, labels = []) {
  const positionMap = new Map();
  const labelPositionByLeaf = new Map();

  labels.forEach((label) => {
    const splitKey = getSplitKey(label);
    if (splitKey) {
      labelPositionByLeaf.set(splitKey, label.position);
    }
  });

  nodes.forEach((node) => {
    const splitIndices = getSplitIndices(node);
    const splitKey = getSplitKey(node);
    if (Array.isArray(splitIndices) && splitKey) {
      let position = node.position;

      // For leaf nodes, use label position (tip)
      if (node.isLeaf) {
        const labelPos = labelPositionByLeaf.get(splitKey);
        if (labelPos) {
          position = labelPos;
        }
      }

      positionMap.set(splitKey, {
        id: node.id,
        parentId: node.parentId ?? null,
        position,
        split_indices: splitIndices,
        isLeaf: node.isLeaf,
        name: node.name ? String(node.name) : null,
        depth: node.depth,
      });
    }
  });

  return positionMap;
}
