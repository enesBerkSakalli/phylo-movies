/**
 * Projections.js
 *
 * Handles coordinate system transformations between World Space (Deck.gl coordinates)
 * and Screen Space (Pixels).
 *
 * Concepts:
 * - Model-View-Projection (MVP) Matrices (handled by Deck.gl Viewport)
 * - Unprojection (Screen -> World)
 * - Fit Area Compensation: Adjusting the look-at target to center content
 *   within the unobstructed sub-rect selected for the current fit.
 */

/**
 * Calculates a new World Space target to center content within a specific fit area,
 * effectively "un-shifting" the camera so the center of the viewport aligns
 * with the visual center of the available space.
 *
 * @param {Object} view - Deck.gl View instance
 * @param {Array} baseTarget - The original [x, y, z] target
 * @param {number} zoom - Target zoom level
 * @param {Object} fitArea - Canvas-local fit area {left, top, width, height}
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {Object} currentViewState - Current Deck.gl view state
 * @returns {Array} Adjusted target [x, y, z]
 */
export function applyFitAreaToTarget(
  view,
  baseTarget,
  zoom,
  fitArea,
  canvasWidth,
  canvasHeight,
  currentViewState
) {
  if (!fitArea) return baseTarget;

  const fitCenterX = fitArea.left + fitArea.width / 2;
  const fitCenterY = fitArea.top + fitArea.height / 2;
  if (fitCenterX === canvasWidth / 2 && fitCenterY === canvasHeight / 2) return baseTarget;

  return applyScreenFitCenterToTarget(
    view,
    baseTarget,
    zoom,
    fitCenterX,
    fitCenterY,
    canvasWidth,
    canvasHeight,
    currentViewState
  );
}

function applyScreenFitCenterToTarget(
  view,
  baseTarget,
  zoom,
  screenCenterX,
  screenCenterY,
  canvasWidth,
  canvasHeight,
  currentViewState
) {
  if (typeof view?.makeViewport !== 'function') return baseTarget;

  // Construct a hypothetical viewport state at the target zoom/center.
  const viewState = { ...currentViewState, target: baseTarget, zoom };
  const viewport = view.makeViewport({ width: canvasWidth, height: canvasHeight, viewState });
  if (typeof viewport?.unproject !== 'function') return baseTarget;

  const fitCenterWorld = viewport.unproject([screenCenterX, screenCenterY]);
  if (!fitCenterWorld) {
    return baseTarget;
  }

  return [
    baseTarget[0] + (baseTarget[0] - fitCenterWorld[0]),
    baseTarget[1] + (baseTarget[1] - fitCenterWorld[1]),
    baseTarget[2] ?? 0,
  ];
}
