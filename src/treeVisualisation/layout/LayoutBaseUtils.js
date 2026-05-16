import { getNodeKey } from '../../domain/tree/splits.js';

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;
const DEFAULT_MARGIN = 40;
const MIN_DIMENSION = 200;
const MIN_RADIUS = 1e-6;

export function initializeLayoutState(layout) {
  layout.containerWidth = 0;
  layout.containerHeight = 0;
  layout.margin = 0;
  layout.scale = 0;
  layout.angleExtent = Math.PI * 2;
  layout.angleOffset = 0;
  layout.preserveRadius = false;
  layout.previousNodeRadii = new Map();
}

export function assignLayoutNodeIds(root) {
  root.each((node) => {
    node.id = getNodeKey({ split_indices: node.data.split_indices });
  });
  return root;
}

export function setAngleExtentDegrees(layout, degrees = 360) {
  layout.angleExtent = (degrees * Math.PI) / 180;
}

export function setAngleExtentRadians(layout, radians = Math.PI * 2) {
  layout.angleExtent = radians;
}

export function setAngleOffsetDegrees(layout, degrees = 0) {
  layout.angleOffset = (degrees * Math.PI) / 180;
}

export function setAngleOffsetRadians(layout, radians = 0) {
  layout.angleOffset = radians;
}

export function setLayoutDimensions(layout, width, height) {
  layout.originalWidth = width;
  layout.originalHeight = height;
  layout.containerWidth = width;
  layout.containerHeight = height;
}

export function setLayoutMargin(layout, margin) {
  layout.margin = margin;
  const baseWidth = layout.originalWidth || layout.containerWidth;
  const baseHeight = layout.originalHeight || layout.containerHeight;
  layout.containerWidth = Math.max(1, baseWidth - layout.margin * 2);
  layout.containerHeight = Math.max(1, baseHeight - layout.margin * 2);
}

export function getMinContainerDimension(width, height) {
  return Math.min(width, height);
}

export function calculateContainerScale(containerWidth, containerHeight, minWindowSize, maxRadius, factor) {
  const isComparison = containerWidth < 600 || containerHeight < 600;
  const adjustedFactor = isComparison ? factor * 0.8 : factor;
  const safeMaxRadius = Math.max(Number(maxRadius) || 0, MIN_RADIUS);
  return minWindowSize / adjustedFactor / safeMaxRadius;
}

export function normalizeLayoutOptions(options = {}) {
  return {
    width: Math.max(options.width || DEFAULT_WIDTH, MIN_DIMENSION),
    height: Math.max(options.height || DEFAULT_HEIGHT, MIN_DIMENSION),
    margin: options.margin || DEFAULT_MARGIN
  };
}

export function normalizeUniformScale(value) {
  const scale = Number(value);
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

export function setRadiusPreservation(layout, preserve) {
  layout.preserveRadius = preserve;
}

export function calculateBranchLengthRadii(layout, node, radius = 0) {
  const data = node.data || {};
  const length = Number(data.length ?? 0) || 0;
  const effectiveLength = node.parent ? length : 0;

  const nodeKey = node.id;
  if (nodeKey && layout.preserveRadius && layout.previousNodeRadii.has(nodeKey)) {
    node.radius = layout.previousNodeRadii.get(nodeKey);
  } else {
    node.radius = effectiveLength + radius;
    if (nodeKey) {
      layout.previousNodeRadii.set(nodeKey, node.radius);
    }
  }

  if (node.children) {
    node.children.forEach((child) => {
      calculateBranchLengthRadii(layout, child, node.radius);
    });
  }
}

export function getMaxRadius(root, options = {}) {
  let maxRadius = 0;
  const nodes = options.leavesOnly ? root.leaves() : root.descendants?.() || [];
  for (const node of nodes) {
    if (node.radius > maxRadius) maxRadius = node.radius;
  }
  return maxRadius;
}

export function scaleRadius(root, scale) {
  root.each((node) => {
    node.radius *= scale;
  });
}

export function generatePolarCoordinates(root, getAngle, angleOffset = 0) {
  const offset = angleOffset || 0;
  root.each((node) => {
    const theta = (getAngle(node) || 0) + offset;
    node.rotatedAngle = theta;
    node.offset = offset;
    node.x = node.radius * Math.cos(theta);
    node.y = node.radius * Math.sin(theta);
  });
}

export function calculateUniformScale(minWindowSize, maxGlobalScale) {
  const safeMaxScale = normalizeUniformScale(maxGlobalScale);
  return minWindowSize / (2.0 * safeMaxScale);
}
