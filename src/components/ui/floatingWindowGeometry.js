const DEFAULT_VIEWPORT = { width: 1024, height: 768 };

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function positiveNumber(value, fallback) {
  const number = finiteNumber(value, fallback);
  return number > 0 ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function getBrowserViewportSize() {
  if (typeof window === 'undefined') return DEFAULT_VIEWPORT;

  return {
    width: positiveNumber(window.innerWidth, DEFAULT_VIEWPORT.width),
    height: positiveNumber(window.innerHeight, DEFAULT_VIEWPORT.height),
  };
}

export function getFloatingWindowViewportInsets() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { left: 0, right: 0, top: 0, bottom: 0 };
  }

  const viewportWidth = positiveNumber(window.innerWidth, DEFAULT_VIEWPORT.width);
  const viewportHeight = positiveNumber(window.innerHeight, DEFAULT_VIEWPORT.height);
  const sidebar = document.querySelector('[data-slot="sidebar-container"]');
  const rect = sidebar?.getBoundingClientRect();
  const playerBar = document.querySelector('.movie-player-bar');
  const playerBarRect = playerBar?.getBoundingClientRect();

  const bottom = playerBarRect &&
    playerBarRect.width > viewportWidth * 0.5 &&
    playerBarRect.height > 0 &&
    playerBarRect.bottom >= viewportHeight - 1
    ? Math.min(viewportHeight, Math.max(0, viewportHeight - playerBarRect.top))
    : 0;

  if (!rect || rect.width <= 0 || rect.height <= 0 || rect.right <= 0 || rect.left >= viewportWidth) {
    return { left: 0, right: 0, top: 0, bottom };
  }

  const left = rect.left <= 0 ? Math.min(viewportWidth, Math.max(0, rect.right)) : 0;
  const right = rect.right >= viewportWidth ? Math.min(viewportWidth, Math.max(0, viewportWidth - rect.left)) : 0;

  return { left, right, top: 0, bottom };
}

export function fitFloatingWindowRect(rect = {}, options = {}) {
  const viewportWidth = positiveNumber(options.viewportWidth, DEFAULT_VIEWPORT.width);
  const viewportHeight = positiveNumber(options.viewportHeight, DEFAULT_VIEWPORT.height);
  const margin = Math.max(0, finiteNumber(options.margin, 24));
  const leftInset = clamp(finiteNumber(options.leftInset, 0), 0, Math.max(0, viewportWidth - 1));
  const rightInset = clamp(finiteNumber(options.rightInset, 0), 0, Math.max(0, viewportWidth - leftInset - 1));
  const topInset = clamp(finiteNumber(options.topInset, 0), 0, Math.max(0, viewportHeight - 1));
  const bottomInset = clamp(finiteNumber(options.bottomInset, 0), 0, Math.max(0, viewportHeight - topInset - 1));
  const minX = leftInset + margin;
  const minY = topInset + margin;
  const maxWidth = Math.max(1, viewportWidth - leftInset - rightInset - margin * 2);
  const maxHeight = Math.max(1, viewportHeight - topInset - bottomInset - margin * 2);
  const minWidth = Math.min(positiveNumber(options.minWidth, 320), maxWidth);
  const minHeight = Math.min(positiveNumber(options.minHeight, 240), maxHeight);
  const width = clamp(positiveNumber(rect.width, minWidth), minWidth, maxWidth);
  const height = clamp(positiveNumber(rect.height, minHeight), minHeight, maxHeight);
  const maxX = Math.max(minX, viewportWidth - rightInset - width - margin);
  const maxY = Math.max(minY, viewportHeight - bottomInset - height - margin);
  const x = clamp(finiteNumber(rect.x, minX), minX, maxX);
  const y = clamp(finiteNumber(rect.y, minY), minY, maxY);

  return { x, y, width, height, minWidth, minHeight };
}

export function toFloatingWindowRect(fittedRect) {
  const { x, y, width, height } = fittedRect;
  return { x, y, width, height };
}

export function hasFloatingWindowRectChanged(rect, fittedRect) {
  return rect.x !== fittedRect.x
    || rect.y !== fittedRect.y
    || rect.width !== fittedRect.width
    || rect.height !== fittedRect.height;
}
