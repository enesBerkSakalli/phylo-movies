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
 * Projects a set of tree nodes from World Space to Screen Space.
 * Used for positioning HTML overlays (Tooltips, Context Menus).
 *
 * @param {Array} nodes - List of tree nodes with {position: [x, y]}
 * @param {Object} viewport - Deck.gl Viewport instance
 * @param {DOMRect} containerRect - Bounding rect of the canvas container
 * @returns {Object} Map of node keys to screen coordinates {x, y, width, height}
 */
export function projectNodesToScreen(nodes, viewport, containerRect) {
  const positions = {};

  nodes.forEach((node) => {
    const key = Array.isArray(node.data?.split_indices)
      ? node.data.split_indices.join('-')
      : null;
    if (!key) return;
    if (!node.position || !Array.isArray(node.position)) return;
    if (!Number.isFinite(node.position[0]) || !Number.isFinite(node.position[1])) return;

    // Projection: World -> Screen
    const [px, py] = viewport.project(node.position);
    positions[key] = {
      x: px + containerRect.left,
      y: py + containerRect.top,
      width: 0,
      height: 0,
      isLeaf: !node.children || node.children.length === 0
    };
  });

  return positions;
}

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
  try {
    if (!view?.makeViewport) return baseTarget;

    // Construct a hypothetical viewport state at the target zoom/center
    const viewState = { ...currentViewState, target: baseTarget, zoom };
    const viewport = view.makeViewport({ width: canvasWidth, height: canvasHeight, viewState });
    if (!viewport?.unproject) return baseTarget;

    // Calculate Geometrical Center of the Safe Area in Screen Space
    const safeCenterX = safe.left + safeWidth / 2;
    const safeCenterY = safe.top + safeHeight / 2;

    // specific Unprojection: Screen -> World
    const safeWorld = viewport.unproject([safeCenterX, safeCenterY]);
    if (!safeWorld) return baseTarget;

    // Apply the delta to the target
    return [
      baseTarget[0] + (baseTarget[0] - safeWorld[0]),
      baseTarget[1] + (baseTarget[1] - safeWorld[1]),
      baseTarget[2] ?? 0
    ];
  } catch (e) {
    console.warn('[Spatial/Projections] Error applying safe area:', e);
    return baseTarget;
  }
}
