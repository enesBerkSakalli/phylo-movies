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
