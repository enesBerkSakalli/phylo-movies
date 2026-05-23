/**
 * LayoutCompositor.js
 *
 * Handles interference between the HTML UI layer and the WebGL Canvas layer.
 *
 * Concepts:
 * - Compositing: combining multiple visual layers.
 * - Fit Area: A canvas sub-rectangle not obscured by UI.
 * - DOM Intersections: Calculating overlap between 2D DOMRects.
 */

export const VIEWPORT_FIT_OBSTRUCTION_SELECTORS = Object.freeze([
  '.movie-player-bar',
  '#top-scale-bar-container',
  '[role="group"][aria-label="Tree viewport controls"]',
  '[role="group"][aria-label="Canvas capture controls"]',
  '[role="complementary"][aria-label="Comparison Panel"]',
  '.phylo-hud',
  '.phylo-hud-restore',
  '[aria-label="Transition Inspector"]'
]);
export const VIEWPORT_FIT_OBSTRUCTION_PADDING_PX = 20;

function clampFitAreaValue(value, max) {
  return Math.max(0, Math.min(Number.isFinite(value) ? value : 0, max));
}

export function calculateRectOverlap(rect, bounds) {
  return {
    x: Math.max(0, Math.min(rect.right, bounds.right) - Math.max(rect.left, bounds.left)),
    y: Math.max(0, Math.min(rect.bottom, bounds.bottom) - Math.max(rect.top, bounds.top))
  };
}

function rectanglesIntersect(a, b) {
  return Math.min(a.left + a.width, b.left + b.width) > Math.max(a.left, b.left)
    && Math.min(a.top + a.height, b.top + b.height) > Math.max(a.top, b.top);
}

function clampLocalRect(rect, canvasWidth, canvasHeight) {
  const left = clampFitAreaValue(rect.left, canvasWidth);
  const top = clampFitAreaValue(rect.top, canvasHeight);
  const right = clampFitAreaValue(rect.left + rect.width, canvasWidth);
  const bottom = clampFitAreaValue(rect.top + rect.height, canvasHeight);

  return {
    left,
    top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top)
  };
}

function toExpandedCanvasLocalRect(rect, canvasRect, padding = VIEWPORT_FIT_OBSTRUCTION_PADDING_PX) {
  return clampLocalRect({
    left: rect.left - canvasRect.left - padding,
    top: rect.top - canvasRect.top - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2
  }, canvasRect.width, canvasRect.height);
}

function normalizeRectEdges(values) {
  return [...new Set(values.map((value) => Math.round(value)))].sort((a, b) => a - b);
}

export function calculateUnobstructedFitAreas(canvasWidth, canvasHeight, obstructions = []) {
  const canvasArea = { left: 0, top: 0, width: canvasWidth, height: canvasHeight };
  const blockingRects = obstructions
    .map((rect) => clampLocalRect(rect, canvasWidth, canvasHeight))
    .filter((rect) => rect.width > 0 && rect.height > 0);

  if (blockingRects.length === 0) return [canvasArea];

  const xEdges = normalizeRectEdges([
    0,
    canvasWidth,
    ...blockingRects.flatMap((rect) => [rect.left, rect.left + rect.width])
  ]);
  const yEdges = normalizeRectEdges([
    0,
    canvasHeight,
    ...blockingRects.flatMap((rect) => [rect.top, rect.top + rect.height])
  ]);
  const candidates = [];

  for (let leftIndex = 0; leftIndex < xEdges.length - 1; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < xEdges.length; rightIndex += 1) {
      for (let topIndex = 0; topIndex < yEdges.length - 1; topIndex += 1) {
        for (let bottomIndex = topIndex + 1; bottomIndex < yEdges.length; bottomIndex += 1) {
          const candidate = {
            left: xEdges[leftIndex],
            top: yEdges[topIndex],
            width: xEdges[rightIndex] - xEdges[leftIndex],
            height: yEdges[bottomIndex] - yEdges[topIndex]
          };
          if (candidate.width <= 0 || candidate.height <= 0) continue;
          if (blockingRects.some((rect) => rectanglesIntersect(candidate, rect))) continue;
          candidates.push(candidate);
        }
      }
    }
  }

  return candidates.sort((a, b) => (b.width * b.height) - (a.width * a.height));
}

export function calculateViewportFitAreas(containerElement) {
  if (typeof document === 'undefined') return null;
  if (!containerElement?.getBoundingClientRect) return null;

  const canvasRect = containerElement.getBoundingClientRect();
  if (!canvasRect?.width || !canvasRect?.height) return null;

  const elements = new Set();
  VIEWPORT_FIT_OBSTRUCTION_SELECTORS.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => elements.add(element));
  });

  const obstructions = [...elements].flatMap((element) => {
    if (!element?.getBoundingClientRect) return [];
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return [];
    const overlap = calculateRectOverlap(rect, canvasRect);
    if (overlap.x <= 0 || overlap.y <= 0) return [];
    return [toExpandedCanvasLocalRect(rect, canvasRect)];
  });

  return calculateUnobstructedFitAreas(canvasRect.width, canvasRect.height, obstructions);
}
