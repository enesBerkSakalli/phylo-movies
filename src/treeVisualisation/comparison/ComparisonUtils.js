import { getSplitIndices } from '../../domain/tree/splits.js';
import {
  calculatePositionCenter,
  calculateSafeVisualRadius,
  calculateTreeVisualRadius
} from '../utils/TreeBoundsUtils.js';

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
export function calculateRightOffset(canvasWidth, rightTreeOffset, leftRadius = 0, rightRadius = 0) {
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
  fontSize = '2.6em'
}) {
  const leftCenterBase = calculatePositionCenter(leftLayerData.nodes);
  const rightCenterBase = calculatePositionCenter(rightLayerData.nodes);
  const labelSizePx = parseFloat(fontSize) * 12 || 24;
  const leftRadius = calculateTreeVisualRadius(leftLayerData, leftCenterBase, labelSizePx);
  const rightRadius = calculateTreeVisualRadius(rightLayerData, rightCenterBase, labelSizePx);
  const rightOffset = calculateRightOffset(canvasWidth, rightTreeOffset, leftRadius, rightRadius);
  const rightOffsetY = rightTreeOffset.y;
  const leftCenter = [leftCenterBase[0] + leftTreeOffsetX, leftCenterBase[1] + leftTreeOffsetY];
  const rightCenter = [rightCenterBase[0] + rightOffset, rightCenterBase[1] + rightOffsetY];
  const leftSafeRadius = calculateSafeVisualRadius(leftLayerData.nodes, leftLayerData.labels, leftCenter);
  const rightSafeRadius = calculateSafeVisualRadius(rightLayerData.nodes, rightLayerData.labels, rightCenter);

  return {
    leftCenterBase,
    rightCenterBase,
    labelSizePx,
    leftRadius,
    rightRadius,
    rightOffset,
    rightOffsetY,
    leftCenter,
    rightCenter,
    leftSafeRadius,
    rightSafeRadius
  };
}

/**
 * Apply position offset to layer data elements.
 * @param {Object} layerData - Layer data containing nodes, links, extensions, labels
 * @param {number} offsetX - X offset
 * @param {number} offsetY - Y offset
 */
export function applyOffset(layerData, offsetX, offsetY) {
  layerData.nodes.forEach(node => {
    node.position = [node.position[0] + offsetX, node.position[1] + offsetY, node.position[2]];
    node.renderPosition = [
      node.renderPosition[0] + offsetX,
      node.renderPosition[1] + offsetY,
      node.renderPosition[2]
    ];
  });

  layerData.links.forEach(link => {
    link.sourcePosition = [link.sourcePosition[0] + offsetX, link.sourcePosition[1] + offsetY, link.sourcePosition[2]];
    link.targetPosition = [link.targetPosition[0] + offsetX, link.targetPosition[1] + offsetY, link.targetPosition[2]];

    if (link.path) {
      offsetFlatPath(link.path, offsetX, offsetY);
    }
  });

  layerData.extensions.forEach(ext => {
    ext.sourcePosition = [ext.sourcePosition[0] + offsetX, ext.sourcePosition[1] + offsetY, ext.sourcePosition[2]];
    ext.targetPosition = [ext.targetPosition[0] + offsetX, ext.targetPosition[1] + offsetY, ext.targetPosition[2]];

    if (ext.path) {
      offsetFlatPath(ext.path, offsetX, offsetY);
    }
  });

  layerData.labels.forEach(label => {
    label.position = [label.position[0] + offsetX, label.position[1] + offsetY, label.position[2]];
  });
}

export function cloneLayerData(layerData) {
  return {
    nodes: cloneLayerElements(layerData.nodes),
    links: cloneLayerElements(layerData.links),
    extensions: cloneLayerElements(layerData.extensions),
    labels: cloneLayerElements(layerData.labels),
    connectors: cloneLayerElements(layerData.connectors)
  };
}

function cloneLayerElements(elements = []) {
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
  } else if (Array.isArray(element.path)) {
    clone.path = element.path.map((point) => Array.isArray(point) ? [...point] : point);
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
    connectors
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

  labels.forEach(label => {
    const splitIndices = getSplitIndices(label);
    if (Array.isArray(splitIndices) && splitIndices.length > 0) {
      labelPositionByLeaf.set(splitIndices.join('-'), label.position);
    }
  });

  nodes.forEach(node => {
    const splitIndices = getSplitIndices(node);
    if (Array.isArray(splitIndices) && splitIndices.length > 0) {
      const key = splitIndices.join('-');
      let position = node.position;

      // For leaf nodes, use label position (tip)
      if (node.isLeaf) {
        const labelPos = labelPositionByLeaf.get(key);
        if (labelPos) {
          position = labelPos;
        }
      }

      positionMap.set(key, {
        id: node.id,
        parentId: node.parentId ?? null,
        position,
        split_indices: splitIndices,
        isLeaf: node.isLeaf,
        name: node.name ? String(node.name) : null,
        depth: node.depth
      });
    }
  });

  return positionMap;
}
