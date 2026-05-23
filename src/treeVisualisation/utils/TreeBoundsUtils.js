import {
  LABEL_BOUNDS_CHAR_WIDTH_RATIO,
  LABEL_BOUNDS_LINE_HEIGHT_RATIO,
  LABEL_BOUNDS_MAX_WIDTH_PX,
  resolveLabelBoundsSize
} from '../spatial/bounds.js';

export function mergeBounds(...boundsList) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let hasBounds = false;

  for (const bounds of boundsList) {
    if (bounds === null) continue;
    hasBounds = true;
    if (bounds.minX < minX) minX = bounds.minX;
    if (bounds.maxX > maxX) maxX = bounds.maxX;
    if (bounds.minY < minY) minY = bounds.minY;
    if (bounds.maxY > maxY) maxY = bounds.maxY;
  }

  return hasBounds ? { minX, maxX, minY, maxY } : { minX: 0, maxX: 0, minY: 0, maxY: 0 };
}

export function calculateNodeBounds(nodes) {
  if (nodes.length === 0) return null;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  for (const node of nodes) {
    const [x, y] = node.position;
    const radius = node.radius || 2;

    if (x - radius < minX) minX = x - radius;
    if (x + radius > maxX) maxX = x + radius;
    if (y - radius < minY) minY = y - radius;
    if (y + radius > maxY) maxY = y + radius;
  }

  return { minX, maxX, minY, maxY };
}

export function calculateLabelBounds(labels, options = {}) {
  if (labels.length === 0) return null;

  const sizePx = resolveLabelBoundsSize(options.labelSizePx, options.getLabelSize);
  const charWidth = LABEL_BOUNDS_CHAR_WIDTH_RATIO * sizePx;
  const fontHeight = LABEL_BOUNDS_LINE_HEIGHT_RATIO * sizePx;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  for (const label of labels) {
    const [x, y] = label.position;
    const text = label.text || '';
    const width = Math.min(LABEL_BOUNDS_MAX_WIDTH_PX, text.length * charWidth);
    const rotationRad = label.rotation || 0;
    const anchor = label.textAnchor || 'start';
    const xStartLocal = anchor === 'end' ? -width : 0;
    const xEndLocal = anchor === 'end' ? 0 : width;
    const halfHeight = fontHeight / 2;
    const cornersLocal = [
      [xStartLocal, -halfHeight],
      [xEndLocal, -halfHeight],
      [xEndLocal, halfHeight],
      [xStartLocal, halfHeight]
    ];

    for (const [lx, ly] of cornersLocal) {
      const rx = lx * Math.cos(rotationRad) - ly * Math.sin(rotationRad);
      const ry = lx * Math.sin(rotationRad) + ly * Math.cos(rotationRad);
      const wx = x + rx;
      const wy = y + ry;

      if (wx < minX) minX = wx;
      if (wx > maxX) maxX = wx;
      if (wy < minY) minY = wy;
      if (wy > maxY) maxY = wy;
    }
  }

  return { minX, maxX, minY, maxY };
}

/**
 * Calculate bounds from node positions plus rendered branch path geometry.
 * @param {Array} nodes
 * @param {Array} links
 */
export function calculateBranchBounds(nodes, links = []) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let hasPoint = false;

  const includePoint = (point) => {
    if (!Array.isArray(point)) return;
    const [x, y] = point;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    hasPoint = true;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };

  const includePath = (path) => {
    if (!path) return;
    if (Array.isArray(path)) {
      if (Array.isArray(path[0])) {
        for (const point of path) includePoint(point);
      }
      return;
    }
    if (ArrayBuffer.isView(path)) {
      for (let i = 0; i < path.length; i += 3) {
        includePoint([path[i], path[i + 1], path[i + 2]]);
      }
    }
  };

  for (const node of nodes) {
    includePoint(node.position);
  }

  for (const link of links) {
    if (link.path) {
      includePath(link.path);
    } else {
      includePoint(link.sourcePosition);
      includePoint(link.targetPosition);
    }
  }

  return hasPoint ? { minX, maxX, minY, maxY } : { minX: 0, maxX: 0, minY: 0, maxY: 0 };
}

export function calculatePositionCenter(nodes) {
  if (nodes.length === 0) return [0, 0];

  const [sumX, sumY] = nodes.reduce(
    (acc, node) => {
      acc[0] += node.position[0];
      acc[1] += node.position[1];
      return acc;
    },
    [0, 0]
  );

  return [sumX / nodes.length, sumY / nodes.length];
}

export function calculateMaxPositionRadius(items, center = [0, 0]) {
  if (items.length === 0) return 0;

  return items.reduce((maxRadius, item) => {
    const position = item.position;
    const radius = Math.hypot(position[0] - center[0], position[1] - center[1]);
    return radius > maxRadius ? radius : maxRadius;
  }, 0);
}

export function calculateTreeVisualRadius(layerData, center = [0, 0], labelSizePx = 0) {
  const dist = (position) => {
    return Math.hypot(position[0] - center[0], position[1] - center[1]);
  };

  let maxRadius = 0;

  for (const node of layerData.nodes) {
    maxRadius = Math.max(maxRadius, dist(node.position));
  }

  for (const label of layerData.labels) {
    maxRadius = Math.max(maxRadius, dist(label.position));
  }

  for (const extension of layerData.extensions) {
    maxRadius = Math.max(maxRadius, dist(extension.sourcePosition), dist(extension.targetPosition));
  }

  if (labelSizePx > 0 && layerData.labels.length > 0) {
    let longestLabelLength = 0;
    for (const label of layerData.labels) {
      const length = (label.text ?? label.name ?? '').length;
      if (length > longestLabelLength) longestLabelLength = length;
    }
    maxRadius += longestLabelLength * labelSizePx * 0.6;
  }

  return maxRadius;
}

export function calculateSafeVisualRadius(nodes, labels, center = [0, 0], fontSizePx = 12) {
  const baseRadius = Math.max(
    calculateMaxPositionRadius(nodes, center),
    calculateMaxPositionRadius(labels, center)
  );
  return baseRadius + Math.max(fontSizePx * 1.5, baseRadius * 0.04);
}
