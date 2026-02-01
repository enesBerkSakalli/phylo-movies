/**
 * LayoutCompositor.js
 *
 * Handles interference between the HTML UI layer and the WebGL Canvas layer.
 *
 * Concepts:
 * - Compositing: combining multiple visual layers.
 * - Safe Area: The region of the canvas not obscured by UI.
 * - DOM Intersections: Calculating overlap between 2D DOMRects.
 */

/**
 * Scans the DOM for specific UI elements that float over the canvas
 * and calculates the "Safe Padding" needed to avoid them.
 *
 * @param {HTMLElement} webglContainerNode
 * @returns {Object|null} Padding {top, right, bottom, left} or null
 */
export function calculateSafeAreaPadding(webglContainerNode) {
  if (typeof document === 'undefined') return null;
  if (!webglContainerNode?.getBoundingClientRect) return null;

  const canvasRect = webglContainerNode.getBoundingClientRect();
  if (!canvasRect?.width || !canvasRect?.height) return null;

  const selectors = ['.movie-player-bar', '#top-scale-bar-container'];
  const padding = { top: 0, right: 0, bottom: 0, left: 0 };
  const edgeThreshold = 24;

  selectors.forEach((selector) => {
    const el = document.querySelector(selector);
    if (!el?.getBoundingClientRect) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    // Intersection Overlap Logic
    const overlapX = Math.max(0, Math.min(rect.right, canvasRect.right) - Math.max(rect.left, canvasRect.left));
    const overlapY = Math.max(0, Math.min(rect.bottom, canvasRect.bottom) - Math.max(rect.top, canvasRect.top));
    if (overlapX <= 0 || overlapY <= 0) return;

    // Heuristic: Only consider an element as a "bar" (top/bottom/side) if it covers > 50% of the edge.
    const isHorizontalBar = rect.width > canvasRect.width * 0.5;
    const isVerticalBar = rect.height > canvasRect.height * 0.5;

    if (isHorizontalBar) {
      if (rect.top <= canvasRect.top + edgeThreshold) {
        padding.top = Math.max(padding.top, Math.min(rect.bottom - canvasRect.top, canvasRect.height));
      }
      if (rect.bottom >= canvasRect.bottom - edgeThreshold) {
        padding.bottom = Math.max(padding.bottom, Math.min(canvasRect.bottom - rect.top, canvasRect.height));
      }
    }

    if (isVerticalBar) {
      if (rect.left <= canvasRect.left + edgeThreshold) {
        padding.left = Math.max(padding.left, Math.min(rect.right - canvasRect.left, canvasRect.width));
      }
      if (rect.right >= canvasRect.right - edgeThreshold) {
        padding.right = Math.max(padding.right, Math.min(canvasRect.right - rect.left, canvasRect.width));
      }
    }
  });

  if (!padding.top && !padding.right && !padding.bottom && !padding.left) return null;

  const extraPadding = 20;
  return {
    top: padding.top ? padding.top + extraPadding : 0,
    right: padding.right ? padding.right + extraPadding : 0,
    bottom: padding.bottom ? padding.bottom + extraPadding : 0,
    left: padding.left ? padding.left + extraPadding : 0
  };
}

/**
 * Normalizes specific pixel padding values against logical canvas limits.
 *
 * @param {Object} safeArea
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @returns {Object} Normalized padding
 */
export function normalizeSafeArea(safeArea, canvasWidth, canvasHeight) {
  const clamp = (value, max) => Math.max(0, Math.min(Number.isFinite(value) ? value : 0, max));
  if (!safeArea) return { top: 0, right: 0, bottom: 0, left: 0 };
  let top = clamp(safeArea.top, canvasHeight);
  let right = clamp(safeArea.right, canvasWidth);
  let bottom = clamp(safeArea.bottom, canvasHeight);
  let left = clamp(safeArea.left, canvasWidth);

  // Prevent UI from consuming more than 60% of vehicle area
  const minVisibleFraction = 0.4;
  const maxTotalX = canvasWidth * (1 - minVisibleFraction);
  const maxTotalY = canvasHeight * (1 - minVisibleFraction);

  if (left + right > maxTotalX) {
    const scale = maxTotalX / Math.max(1, left + right);
    left *= scale;
    right *= scale;
  }

  if (top + bottom > maxTotalY) {
    const scale = maxTotalY / Math.max(1, top + bottom);
    top *= scale;
    bottom *= scale;
  }

  return { top, right, bottom, left };
}
