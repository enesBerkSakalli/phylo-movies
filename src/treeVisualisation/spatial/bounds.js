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
  if (labelSizePx !== undefined && labelSizePx !== null) return labelSizePx;
  return typeof getLabelSize === 'function' ? getLabelSize() : LABEL_BOUNDS_DEFAULT_SIZE_PX;
}

export function calculateViewportBoundsPadding(viewBounds, paddingFactor) {
  const [viewMinX, viewMinY, viewMaxX, viewMaxY] = viewBounds;

  return {
    x: (viewMaxX - viewMinX) * (paddingFactor - 1) / 2,
    y: (viewMaxY - viewMinY) * (paddingFactor - 1) / 2
  };
}

export function isBoundsInsidePaddedViewport(bounds, viewBounds, padding) {
  const [viewMinX, viewMinY, viewMaxX, viewMaxY] = viewBounds;

  return (
    bounds.minX >= viewMinX - padding.x &&
    bounds.maxX <= viewMaxX + padding.x &&
    bounds.minY >= viewMinY - padding.y &&
    bounds.maxY <= viewMaxY + padding.y
  );
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
  const padding = calculateViewportBoundsPadding(viewBounds, paddingFactor);

  return isBoundsInsidePaddedViewport(bounds, viewBounds, padding);
}
