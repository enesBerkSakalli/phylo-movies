import { fitFloatingWindowRect } from '../ui/floatingWindowGeometry.js';

export const MSA_WINDOW_BOUNDS = {
  minWidth: 420,
  minHeight: 220,
  margin: 12,
};

// Until the user resizes it, the window is sized from the tree canvas so the
// tree stays the primary view.
const DEFAULT_WIDTH_RATIO = 0.55;
const DEFAULT_MAX_WIDTH_PX = 720;
const DEFAULT_HEIGHT_RATIO = 0.4;

// Below this viewport width the sidebar is an off-canvas sheet and the
// alignment becomes a full-width sheet at the top of the canvas, leaving the
// bottom for the Transition Inspector sheet.
const MSA_SHEET_BREAKPOINT_PX = 768;
const MSA_SHEET_HEIGHT_RATIO = 0.45;

// Non-finite x/y (the store default) anchors the window to the bottom-right of
// the canvas area; fitFloatingWindowRect clamps this to the furthest position.
const ANCHOR_FAR_EDGE = Number.MAX_SAFE_INTEGER;

export function isMsaSheetLayout(viewport) {
  return viewport.width < MSA_SHEET_BREAKPOINT_PX;
}

/**
 * Place the MSA window inside the tree canvas area so it never covers the
 * sidebar or the movie player bar it is synced to.
 * @param {{x: number, y: number, width: number, height: number}} rect - Stored window rect
 * @param {{width: number, height: number}} viewport - Browser viewport size
 * @param {{left: number, top: number, right: number, bottom: number} | null} canvasRect -
 *   Bounding rect of the tree canvas area, or null when it is not mounted
 */
export function placeMsaWindowRect(rect, viewport, canvasRect) {
  const insets = canvasRect
    ? {
        leftInset: canvasRect.left,
        topInset: canvasRect.top,
        rightInset: viewport.width - canvasRect.right,
        bottomInset: viewport.height - canvasRect.bottom,
      }
    : {};
  const bounds = {
    ...MSA_WINDOW_BOUNDS,
    ...insets,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
  };

  if (isMsaSheetLayout(viewport)) {
    const areaHeight = canvasRect ? canvasRect.bottom - canvasRect.top : viewport.height;
    return fitFloatingWindowRect(
      {
        x: 0,
        y: 0,
        width: viewport.width,
        height: Math.round(areaHeight * MSA_SHEET_HEIGHT_RATIO),
      },
      bounds
    );
  }

  const areaWidth = canvasRect ? canvasRect.right - canvasRect.left : viewport.width;
  const areaHeight = canvasRect ? canvasRect.bottom - canvasRect.top : viewport.height;

  return fitFloatingWindowRect(
    {
      x: Number.isFinite(rect?.x) ? rect.x : ANCHOR_FAR_EDGE,
      y: Number.isFinite(rect?.y) ? rect.y : ANCHOR_FAR_EDGE,
      width: Number.isFinite(rect?.width)
        ? rect.width
        : Math.min(DEFAULT_MAX_WIDTH_PX, Math.round(areaWidth * DEFAULT_WIDTH_RATIO)),
      height: Number.isFinite(rect?.height)
        ? rect.height
        : Math.round(areaHeight * DEFAULT_HEIGHT_RATIO),
    },
    bounds
  );
}
