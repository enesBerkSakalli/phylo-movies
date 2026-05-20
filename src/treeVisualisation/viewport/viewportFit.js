import { calculateBranchBounds, calculateVisualBounds } from '../utils/TreeBoundsUtils.js';
import { applySafeAreaToTarget } from '../spatial/projections.js';
import { expandBoundsForLabels } from '../spatial/bounds.js';
import { normalizeSafeArea } from '../spatial/layout.js';

export const VIEWPORT_LABEL_FIT_PADDING = 1.25;
export const VIEWPORT_BRANCH_FIT_PADDING = 1.12;
export const VIEWPORT_HIGH_DENSITY_NODE_THRESHOLD = 400;
export const VIEWPORT_MEDIUM_DENSITY_NODE_THRESHOLD = 200;
export const VIEWPORT_LOW_DENSITY_NODE_THRESHOLD = 100;
export const VIEWPORT_HIGH_DENSITY_PADDING = 0.15;
export const VIEWPORT_MEDIUM_DENSITY_PADDING = 0.1;
export const VIEWPORT_LOW_DENSITY_PADDING = 0.05;

export function calculateFocusViewport({
  nodes,
  labels,
  links,
  includeLabels = false,
  padding,
  labelSizePx,
  getLabelSize,
  canvasWidth,
  canvasHeight,
  safeArea,
  activeView,
  currentViewState
}) {
  const bounds = includeLabels
    ? calculateVisualBounds(nodes, labels)
    : calculateBranchBounds(nodes, links);
  const densityPadding = calculateDensityPadding(nodes);
  const fitPadding = includeLabels ? VIEWPORT_LABEL_FIT_PADDING : VIEWPORT_BRANCH_FIT_PADDING;
  const effectivePadding = padding ?? (fitPadding + densityPadding);

  const expandedBounds = includeLabels
    ? expandBoundsForLabels(bounds, labels, labelSizePx, getLabelSize)
    : bounds;

  const centerX = (expandedBounds.minX + expandedBounds.maxX) / 2;
  const centerY = (expandedBounds.minY + expandedBounds.maxY) / 2;
  const w = Math.max(1e-6, expandedBounds.maxX - expandedBounds.minX);
  const h = Math.max(1e-6, expandedBounds.maxY - expandedBounds.minY);

  const safe = normalizeSafeArea(safeArea, canvasWidth, canvasHeight);
  const safeWidth = Math.max(1, canvasWidth - safe.left - safe.right);
  const safeHeight = Math.max(1, canvasHeight - safe.top - safe.bottom);
  const zoom = Math.log2(Math.min(safeWidth / (w * effectivePadding), safeHeight / (h * effectivePadding)));

  const target = applySafeAreaToTarget(
    activeView,
    [centerX, centerY, 0],
    zoom,
    safe,
    canvasWidth,
    canvasHeight,
    safeWidth,
    safeHeight,
    currentViewState
  );

  return { target, zoom };
}

function calculateDensityPadding(nodes) {
  const leafCount = nodes.length;
  if (leafCount > VIEWPORT_HIGH_DENSITY_NODE_THRESHOLD) return VIEWPORT_HIGH_DENSITY_PADDING;
  if (leafCount > VIEWPORT_MEDIUM_DENSITY_NODE_THRESHOLD) return VIEWPORT_MEDIUM_DENSITY_PADDING;
  if (leafCount > VIEWPORT_LOW_DENSITY_NODE_THRESHOLD) return VIEWPORT_LOW_DENSITY_PADDING;
  return 0;
}
