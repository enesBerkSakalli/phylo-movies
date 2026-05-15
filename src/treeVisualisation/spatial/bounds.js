/**
 * Bounds.js
 *
 * Handles Axis-Aligned Bounding Box (AABB) logic and Frustum checks.
 *
 * Concepts:
 * - AABB (Axis-Aligned Bounding Box): defined by minX, minY, maxX, maxY.
 * - Intersection Testing: Checking if two boxes overlap.
 * - Frustum Culling: Checking if an object is within the camera's view.
 */

export const LABEL_BOUNDS_CHAR_WIDTH_RATIO = 0.6;
export const LABEL_BOUNDS_LINE_HEIGHT_RATIO = 1.2;
export const LABEL_BOUNDS_MAX_WIDTH_PX = 2000;
export const LABEL_BOUNDS_DEFAULT_SIZE_PX = 16;

export function resolveLabelBoundsSize(labelSizePx, getLabelSize) {
  return labelSizePx || (typeof getLabelSize === 'function' ? getLabelSize() : LABEL_BOUNDS_DEFAULT_SIZE_PX);
}

export function estimateLabelBoundsPadding(labels, sizePx) {
  const maxChars = labels.reduce((m, l) => Math.max(m, (l.text || '').length), 0);
  const estimatedCharWidth = LABEL_BOUNDS_CHAR_WIDTH_RATIO * sizePx;

  return {
    width: Math.min(LABEL_BOUNDS_MAX_WIDTH_PX, maxChars * estimatedCharWidth),
    height: LABEL_BOUNDS_LINE_HEIGHT_RATIO * sizePx
  };
}

export function calculateViewportBoundsPadding(viewBounds, paddingFactor) {
  const [viewMinX, viewMinY, viewMaxX, viewMaxY] = viewBounds;

  return {
    x: (viewMaxX - viewMinX) * (paddingFactor - 1) / 2,
    y: (viewMaxY - viewMinY) * (paddingFactor - 1) / 2
  };
}

/**
 * Checks if a bounding box is within the current Viewport.
 * Uses a relaxed intersection test (paddingFactor) to prevent aggressive culling
 * immediately at screen edges.
 *
 * @param {Object} bounds - {minX, maxX, minY, maxY}
 * @param {Object} viewport - Deck.gl Viewport
 * @param {number} paddingFactor - Multiplier for viewport size (default 1.05)
 * @returns {boolean}
 */
export function areBoundsInView(bounds, viewport, paddingFactor = 1.05) {
  if (typeof viewport?.getBounds !== 'function') return false;

  // Viewport Bounds (Frustum Projection to Z=0 Plane)
  const viewBounds = viewport.getBounds();
  const [viewMinX, viewMinY, viewMaxX, viewMaxY] = viewBounds;
  const { x: padX, y: padY } = calculateViewportBoundsPadding(viewBounds, paddingFactor);

  // AABB Intersection Test
  return (
    bounds.minX >= viewMinX - padX &&
    bounds.maxX <= viewMaxX + padX &&
    bounds.minY >= viewMinY - padY &&
    bounds.maxY <= viewMaxY + padY
  );
}

/**
 * Expands a bounding box to account for text labels.
 * Since text size isn't known in World Units directly without knowing the zoom,
 * this uses a heuristic estimate based on pixel size.
 *
 * @param {Object} bounds
 * @param {Array} labels - List of label objects
 * @param {number} labelSizePx - Fallback size in pixels
 * @param {Function} getLabelSize - Function to retrieve dynamic label size
 * @returns {Object} Expanded bounds
 */
export function expandBoundsForLabels(bounds, labels, labelSizePx, getLabelSize) {
  if (!labels || !labels.length) return bounds;

  const sizePx = resolveLabelBoundsSize(labelSizePx, getLabelSize);
  const { width, height } = estimateLabelBoundsPadding(labels, sizePx);

  return {
    minX: bounds.minX - width,
    maxX: bounds.maxX + width,
    minY: bounds.minY - height,
    maxY: bounds.maxY + height
  };
}
