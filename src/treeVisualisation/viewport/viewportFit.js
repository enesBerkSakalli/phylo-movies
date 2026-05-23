import {
  calculateBranchBounds,
  calculateLabelBounds,
  mergeBounds
} from '../utils/TreeBoundsUtils.js';
import { applyFitAreaToTarget } from '../spatial/projections.js';

export const VIEWPORT_FIT_MODES = Object.freeze({
  BRANCH: 'branch',
  LABELS: 'labels'
});
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
  fitMode = VIEWPORT_FIT_MODES.BRANCH,
  padding,
  labelSizePx,
  getLabelSize,
  canvasWidth,
  canvasHeight,
  fitAreas,
  activeView,
  currentViewState
}) {
  const bounds = calculateFitBoundsForMode({
    fitMode,
    nodes,
    labels,
    links,
    labelSizePx,
    getLabelSize
  });
  const densityPadding = calculateDensityPadding(nodes);
  const fitPadding = fitMode === VIEWPORT_FIT_MODES.LABELS
    ? VIEWPORT_LABEL_FIT_PADDING
    : VIEWPORT_BRANCH_FIT_PADDING;
  const effectivePadding = padding ?? (fitPadding + densityPadding);
  const fitArea = selectFitAreaForBounds(bounds, fitAreas, effectivePadding, canvasWidth, canvasHeight);

  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const w = Math.max(1e-6, bounds.maxX - bounds.minX);
  const h = Math.max(1e-6, bounds.maxY - bounds.minY);

  const fitWidth = Math.max(1, fitArea.width);
  const fitHeight = Math.max(1, fitArea.height);
  const zoom = Math.log2(Math.min(fitWidth / (w * effectivePadding), fitHeight / (h * effectivePadding)));

  const target = applyFitAreaToTarget(
    activeView,
    [centerX, centerY, 0],
    zoom,
    fitArea,
    canvasWidth,
    canvasHeight,
    currentViewState
  );

  return { target, zoom, fitArea };
}

export function calculateFitBoundsForMode({
  fitMode,
  nodes,
  labels,
  links,
  labelSizePx,
  getLabelSize
}) {
  if (fitMode === VIEWPORT_FIT_MODES.BRANCH) {
    return calculateBranchBounds(nodes, links);
  }

  if (fitMode === VIEWPORT_FIT_MODES.LABELS) {
    return mergeBounds(
      calculateBranchBounds(nodes, links),
      calculateLabelBounds(labels, { labelSizePx, getLabelSize })
    );
  }

  throw new Error(`Unknown viewport fit mode: ${fitMode}`);
}

export function selectFitAreaForBounds(bounds, fitAreas, effectivePadding, canvasWidth, canvasHeight) {
  const areas = normalizeFitAreas(fitAreas, canvasWidth, canvasHeight);
  const w = Math.max(1e-6, bounds.maxX - bounds.minX);
  const h = Math.max(1e-6, bounds.maxY - bounds.minY);
  const canvasCenterX = canvasWidth / 2;
  const canvasCenterY = canvasHeight / 2;

  return areas.reduce((best, area) => {
    const scale = Math.min(
      area.width / (w * effectivePadding),
      area.height / (h * effectivePadding)
    );
    const distanceFromCenter = Math.hypot(
      area.left + area.width / 2 - canvasCenterX,
      area.top + area.height / 2 - canvasCenterY
    );
    const scored = {
      area,
      scale,
      areaSize: area.width * area.height,
      distanceFromCenter
    };
    if (!best) return scored;
    if (scored.scale !== best.scale) return scored.scale > best.scale ? scored : best;
    if (scored.areaSize !== best.areaSize) return scored.areaSize > best.areaSize ? scored : best;
    return scored.distanceFromCenter < best.distanceFromCenter ? scored : best;
  }, null).area;
}

function normalizeFitAreas(fitAreas, canvasWidth, canvasHeight) {
  if (!Array.isArray(fitAreas) || fitAreas.length === 0) {
    return [{ left: 0, top: 0, width: canvasWidth, height: canvasHeight }];
  }

  const normalized = fitAreas
    .map((area) => {
      const left = Math.max(0, Math.min(Number(area.left) || 0, canvasWidth));
      const top = Math.max(0, Math.min(Number(area.top) || 0, canvasHeight));
      const right = Math.max(left, Math.min(left + (Number(area.width) || 0), canvasWidth));
      const bottom = Math.max(top, Math.min(top + (Number(area.height) || 0), canvasHeight));

      return {
        left,
        top,
        width: right - left,
        height: bottom - top
      };
    })
    .filter((area) => area.width > 0 && area.height > 0);

  return normalized.length > 0
    ? normalized
    : [{ left: 0, top: 0, width: canvasWidth, height: canvasHeight }];
}

function calculateDensityPadding(nodes) {
  const leafCount = nodes.length;
  if (leafCount > VIEWPORT_HIGH_DENSITY_NODE_THRESHOLD) return VIEWPORT_HIGH_DENSITY_PADDING;
  if (leafCount > VIEWPORT_MEDIUM_DENSITY_NODE_THRESHOLD) return VIEWPORT_MEDIUM_DENSITY_PADDING;
  if (leafCount > VIEWPORT_LOW_DENSITY_NODE_THRESHOLD) return VIEWPORT_LOW_DENSITY_PADDING;
  return 0;
}
