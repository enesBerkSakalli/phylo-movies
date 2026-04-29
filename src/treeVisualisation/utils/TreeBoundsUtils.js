/**
 * Calculate visual bounds including node radii and estimated label dimensions
 * @param {Array} nodes
 * @param {Array} labels
 */
export function calculateVisualBounds(nodes, labels) {
  if (!nodes?.length) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  // 1. Include Nodes with Radius
  for (const node of nodes) {
    const [x, y] = node.position;
    const r = node.radius || 2; // Default radius if missing

    if (x - r < minX) minX = x - r;
    if (x + r > maxX) maxX = x + r;
    if (y - r < minY) minY = y - r;
    if (y + r > maxY) maxY = y + r;
  }

  // 2. Include Labels
  if (labels && labels.length > 0) {
    const CHAR_WIDTH = 10;
    const FONT_HEIGHT = 16;

    for (const label of labels) {
      const [x, y] = label.position;
      const text = label.text || '';
      const width = text.length * CHAR_WIDTH;

      const rotationRad = label.rotation || 0;
      const anchor = label.textAnchor || 'start';

      // Local X range
      let xStartLocal = 0;
      let xEndLocal = width;
      if (anchor === 'end') {
          xStartLocal = -width;
          xEndLocal = 0;
      }

      // Local Y range (assume centered height)
      const hHalf = FONT_HEIGHT / 2;

      // Corners in local space
      const cornersLocal = [
          [xStartLocal, -hHalf],
          [xEndLocal, -hHalf],
          [xEndLocal, hHalf],
          [xStartLocal, hHalf]
      ];

      // Transform to World
      for (const [lx, ly] of cornersLocal) {
          // Rotate: x' = x cos - y sin, y' = x sin + y cos
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
  }

  return { minX, maxX, minY, maxY };
}

/**
 * Calculate bounds from node positions only
 * @param {Array} nodes
 */
export function calculateNodeBounds(nodes) {
  if (!nodes?.length) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const node of nodes) {
    const [x, y] = node.position;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
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

  for (const node of nodes || []) {
    includePoint(node?.position);
  }

  for (const link of links || []) {
    if (link?.path) {
      includePath(link.path);
    } else {
      includePoint(link?.sourcePosition);
      includePoint(link?.targetPosition);
    }
  }

  return hasPoint ? { minX, maxX, minY, maxY } : { minX: 0, maxX: 0, minY: 0, maxY: 0 };
}

export function calculatePositionCenter(nodes = []) {
  if (!Array.isArray(nodes) || nodes.length === 0) return [0, 0];

  const [sumX, sumY] = nodes.reduce(
    (acc, node) => {
      acc[0] += node.position?.[0] ?? 0;
      acc[1] += node.position?.[1] ?? 0;
      return acc;
    },
    [0, 0]
  );

  return [sumX / nodes.length, sumY / nodes.length];
}

export function calculateMaxPositionRadius(items = [], center = [0, 0]) {
  if (!Array.isArray(items) || items.length === 0) return 0;

  return items.reduce((maxRadius, item) => {
    const position = item?.position || [0, 0];
    const radius = Math.hypot(position[0] - center[0], position[1] - center[1]);
    return radius > maxRadius ? radius : maxRadius;
  }, 0);
}

export function calculateTreeVisualRadius(layerData = {}, center = [0, 0], labelSizePx = 0) {
  const dist = (position) => {
    if (!position) return 0;
    return Math.hypot((position[0] ?? 0) - center[0], (position[1] ?? 0) - center[1]);
  };

  let maxRadius = 0;

  for (const node of layerData.nodes || []) {
    maxRadius = Math.max(maxRadius, dist(node.position));
  }

  for (const label of layerData.labels || []) {
    maxRadius = Math.max(maxRadius, dist(label.position));
  }

  for (const extension of layerData.extensions || []) {
    maxRadius = Math.max(maxRadius, dist(extension.sourcePosition), dist(extension.targetPosition));
  }

  if (labelSizePx > 0 && Array.isArray(layerData.labels) && layerData.labels.length > 0) {
    let longestLabelLength = 0;
    for (const label of layerData.labels) {
      const length = (label.text ?? label.name ?? '').length;
      if (length > longestLabelLength) longestLabelLength = length;
    }
    maxRadius += longestLabelLength * labelSizePx * 0.6;
  }

  return maxRadius;
}

export function calculateSafeVisualRadius(nodes = [], labels = [], center = [0, 0], fontSizePx = 12) {
  const baseRadius = Math.max(
    calculateMaxPositionRadius(nodes, center),
    calculateMaxPositionRadius(labels, center)
  );
  return baseRadius + Math.max(fontSizePx * 1.5, baseRadius * 0.04);
}
