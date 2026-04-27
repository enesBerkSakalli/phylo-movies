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
  try {
    if (!viewport?.getBounds) return false;

    // Viewport Bounds (Frustum Projection to Z=0 Plane)
    const [viewMinX, viewMinY, viewMaxX, viewMaxY] = viewport.getBounds();

    // Expand viewport bounds by padding for looser culling
    const padX = (viewMaxX - viewMinX) * (paddingFactor - 1) / 2;
    const padY = (viewMaxY - viewMinY) * (paddingFactor - 1) / 2;

    // AABB Intersection Test
    return (
      bounds.minX >= viewMinX - padX &&
      bounds.maxX <= viewMaxX + padX &&
      bounds.minY >= viewMinY - padY &&
      bounds.maxY <= viewMaxY + padY
    );
  } catch {
    return false;
  }
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

  try {
    const sizePx = labelSizePx || (typeof getLabelSize === 'function' ? getLabelSize() : 16);
    // Heuristic: Estimate max text width
    const maxChars = labels.reduce((m, l) => Math.max(m, (l.text || '').length), 0);
    const estCharWidth = 0.6 * sizePx;
    const estLabelWidth = Math.min(2000, maxChars * estCharWidth);
    const estLabelHeight = 1.2 * sizePx;

    return {
      minX: bounds.minX - estLabelWidth,
      maxX: bounds.maxX + estLabelWidth,
      minY: bounds.minY - estLabelHeight,
      maxY: bounds.maxY + estLabelHeight
    };
  } catch {
    return bounds;
  }
}
