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

export const SAFE_AREA_UI_SELECTORS = Object.freeze([
  '.movie-player-bar',
  '#top-scale-bar-container'
]);
export const SAFE_AREA_EDGE_THRESHOLD_PX = 24;
export const SAFE_AREA_EXTRA_PADDING_PX = 20;
export const SAFE_AREA_MIN_VISIBLE_FRACTION = 0.4;
export const SAFE_AREA_BAR_COVERAGE_FRACTION = 0.5;

function createEmptySafeAreaPadding() {
  return { top: 0, right: 0, bottom: 0, left: 0 };
}

function hasSafeAreaPadding(padding) {
  return Boolean(padding.top || padding.right || padding.bottom || padding.left);
}

function mergeSafeAreaPadding(target, next) {
  target.top = Math.max(target.top, next.top);
  target.right = Math.max(target.right, next.right);
  target.bottom = Math.max(target.bottom, next.bottom);
  target.left = Math.max(target.left, next.left);
}

function clampSafeAreaValue(value, max) {
  return Math.max(0, Math.min(Number.isFinite(value) ? value : 0, max));
}

export function calculateRectOverlap(rect, bounds) {
  return {
    x: Math.max(0, Math.min(rect.right, bounds.right) - Math.max(rect.left, bounds.left)),
    y: Math.max(0, Math.min(rect.bottom, bounds.bottom) - Math.max(rect.top, bounds.top))
  };
}

export function classifySafeAreaBar(rect, canvasRect) {
  return {
    horizontal: rect.width > canvasRect.width * SAFE_AREA_BAR_COVERAGE_FRACTION,
    vertical: rect.height > canvasRect.height * SAFE_AREA_BAR_COVERAGE_FRACTION
  };
}

export function calculateSafeAreaPaddingForRect(rect, canvasRect) {
  const padding = createEmptySafeAreaPadding();
  const overlap = calculateRectOverlap(rect, canvasRect);
  if (overlap.x <= 0 || overlap.y <= 0) return padding;

  const { horizontal, vertical } = classifySafeAreaBar(rect, canvasRect);

  if (horizontal) {
    if (rect.top <= canvasRect.top + SAFE_AREA_EDGE_THRESHOLD_PX) {
      padding.top = Math.min(rect.bottom - canvasRect.top, canvasRect.height);
    }
    if (rect.bottom >= canvasRect.bottom - SAFE_AREA_EDGE_THRESHOLD_PX) {
      padding.bottom = Math.min(canvasRect.bottom - rect.top, canvasRect.height);
    }
  }

  if (vertical) {
    if (rect.left <= canvasRect.left + SAFE_AREA_EDGE_THRESHOLD_PX) {
      padding.left = Math.min(rect.right - canvasRect.left, canvasRect.width);
    }
    if (rect.right >= canvasRect.right - SAFE_AREA_EDGE_THRESHOLD_PX) {
      padding.right = Math.min(canvasRect.right - rect.left, canvasRect.width);
    }
  }

  return padding;
}

export function clampSafeAreaPadding(safeArea, canvasWidth, canvasHeight) {
  if (!safeArea) return createEmptySafeAreaPadding();

  return {
    top: clampSafeAreaValue(safeArea.top, canvasHeight),
    right: clampSafeAreaValue(safeArea.right, canvasWidth),
    bottom: clampSafeAreaValue(safeArea.bottom, canvasHeight),
    left: clampSafeAreaValue(safeArea.left, canvasWidth)
  };
}

function scaleOpposingPadding(first, second, maxTotal) {
  if (first + second <= maxTotal) return [first, second];

  const scale = maxTotal / Math.max(1, first + second);
  return [first * scale, second * scale];
}

export function scaleSafeAreaToMinimumVisibleViewport(padding, canvasWidth, canvasHeight) {
  const maxTotalX = canvasWidth * (1 - SAFE_AREA_MIN_VISIBLE_FRACTION);
  const maxTotalY = canvasHeight * (1 - SAFE_AREA_MIN_VISIBLE_FRACTION);
  const [left, right] = scaleOpposingPadding(padding.left, padding.right, maxTotalX);
  const [top, bottom] = scaleOpposingPadding(padding.top, padding.bottom, maxTotalY);

  return { top, right, bottom, left };
}

/**
 * Scans the DOM for specific UI elements that float over the canvas
 * and calculates the "Safe Padding" needed to avoid them.
 *
 * @param {HTMLElement} containerElement
 * @returns {Object|null} Padding {top, right, bottom, left} or null
 */
export function calculateSafeAreaPadding(containerElement) {
  if (typeof document === 'undefined') return null;
  if (!containerElement?.getBoundingClientRect) return null;

  const canvasRect = containerElement.getBoundingClientRect();
  if (!canvasRect?.width || !canvasRect?.height) return null;

  const padding = createEmptySafeAreaPadding();

  SAFE_AREA_UI_SELECTORS.forEach((selector) => {
    const el = document.querySelector(selector);
    if (!el?.getBoundingClientRect) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    mergeSafeAreaPadding(padding, calculateSafeAreaPaddingForRect(rect, canvasRect));
  });

  if (!hasSafeAreaPadding(padding)) return null;

  return {
    top: padding.top ? padding.top + SAFE_AREA_EXTRA_PADDING_PX : 0,
    right: padding.right ? padding.right + SAFE_AREA_EXTRA_PADDING_PX : 0,
    bottom: padding.bottom ? padding.bottom + SAFE_AREA_EXTRA_PADDING_PX : 0,
    left: padding.left ? padding.left + SAFE_AREA_EXTRA_PADDING_PX : 0
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
  return scaleSafeAreaToMinimumVisibleViewport(
    clampSafeAreaPadding(safeArea, canvasWidth, canvasHeight),
    canvasWidth,
    canvasHeight
  );
}
