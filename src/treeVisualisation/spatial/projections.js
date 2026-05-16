/**
 * Projections.js
 *
 * Handles coordinate system transformations between World Space (Deck.gl coordinates)
 * and Screen Space (Pixels).
 *
 * Concepts:
 * - Model-View-Projection (MVP) Matrices (handled by Deck.gl Viewport)
 * - Unprojection (Screen -> World)
 * - Safe Area Compensation: Adjusting the look-at target to center content
 *   within a specific sub-rect of the screen.
 */

/**
 * Calculates a new World Space target to center content within a specific Safe Area.
 * effectively "un-shifting" the camera so the center of the viewport aligns
 * with the visual center of the available space.
 *
 * @param {Object} view - Deck.gl View instance
 * @param {Array} baseTarget - The original [x, y, z] target
 * @param {number} zoom - Target zoom level
 * @param {Object} safe - Normalized safe area {top, right, bottom, left}
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {number} safeWidth
 * @param {number} safeHeight
 * @param {Object} currentViewState - Current Deck.gl view state
 * @returns {Array} Adjusted target [x, y, z]
 */
export function applySafeAreaToTarget(view, baseTarget, zoom, safe, canvasWidth, canvasHeight, safeWidth, safeHeight, currentViewState) {
  if (!safe || (!safe.top && !safe.right && !safe.bottom && !safe.left)) {
    return baseTarget;
  }

  if (typeof view?.makeViewport !== 'function') return baseTarget;

  // Construct a hypothetical viewport state at the target zoom/center.
  const viewState = { ...currentViewState, target: baseTarget, zoom };
  const viewport = view.makeViewport({ width: canvasWidth, height: canvasHeight, viewState });
  if (typeof viewport?.unproject !== 'function') return baseTarget;

  // Calculate geometrical center of the safe area in screen space.
  const safeCenterX = safe.left + safeWidth / 2;
  const safeCenterY = safe.top + safeHeight / 2;

  const safeWorld = viewport.unproject([safeCenterX, safeCenterY]);
  if (!safeWorld) {
    return baseTarget;
  }

  return [
    baseTarget[0] + (baseTarget[0] - safeWorld[0]),
    baseTarget[1] + (baseTarget[1] - safeWorld[1]),
    baseTarget[2] ?? 0
  ];
}
