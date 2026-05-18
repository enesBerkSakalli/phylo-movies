/**
 * ViewportManager
 *
 * Handles viewport calculations, camera positioning, bounds checking,
 * and screen space projections for tree visualization.
 */
import { useAppStore } from '../../state/phyloStore/store.js';
import { calculateBranchBounds, calculateVisualBounds } from '../utils/TreeBoundsUtils.js';
import { applySafeAreaToTarget } from '../spatial/projections.js';
import { areBoundsInView, expandBoundsForLabels } from '../spatial/bounds.js';
import { calculateSafeAreaPadding, normalizeSafeArea } from '../spatial/layout.js';

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

export class ViewportManager {

  // ==========================================================================
  // CONSTRUCTOR
  // ==========================================================================

  constructor(controller) {
    this.controller = controller;
  }

  // ==========================================================================
  // COMPARISON OFFSETS
  // ==========================================================================

  getRightTreeOffset() {
    const { rightTreeOffsetX = 0, rightTreeOffsetY = 0 } = useAppStore.getState();
    const x = Number.isFinite(Number(rightTreeOffsetX)) ? Number(rightTreeOffsetX) : 0;
    const y = Number.isFinite(Number(rightTreeOffsetY)) ? Number(rightTreeOffsetY) : 0;
    return { x, y };
  }

  // ==========================================================================
  // BOUNDS CALCULATION
  // ==========================================================================

  areBoundsInView(bounds, paddingFactor = 1.05) {
    const viewport = this.controller.deckContext?.getPrimaryViewport?.();
    return areBoundsInView(bounds, viewport, paddingFactor);
  }

  // ==========================================================================
  // CAMERA FOCUS
  // ==========================================================================

  focusOnTree(nodes, labels, options = {}) {
    const { playing } = useAppStore.getState();
    if (playing && !options.allowDuringPlayback) return;
    const includeLabels = options.includeLabels === true;
    const { width: canvasWidth, height: canvasHeight } = this.controller.deckContext.getCanvasDimensions();
    const safeArea = this.getSafeAreaPadding();
    const getLabelSize = options.getLabelSize ?? this.controller.layerManager.layerStyles.getLabelSize?.bind(
      this.controller.layerManager.layerStyles
    );
    const activeView = this.controller.deckContext.getActiveView();
    const currentViewState = this.controller.deckContext.getViewState();
    const { target, zoom } = calculateFocusViewport({
      nodes,
      labels,
      links: options.links,
      includeLabels,
      padding: options.padding,
      labelSizePx: options.labelSizePx,
      getLabelSize,
      canvasWidth,
      canvasHeight,
      safeArea,
      activeView,
      currentViewState
    });

    this.controller.deckContext.transitionTo({
      target,
      zoom,
      duration: options.duration ?? 550,
      easing: options.easing, // DeckGLContext will use default if undefined
      interpolator: options.interpolator
    });
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  getSafeAreaPadding() {
    return calculateSafeAreaPadding(this.controller.deckContext?.container);
  }

}
