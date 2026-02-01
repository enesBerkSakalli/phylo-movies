/**
 * ViewportManager
 *
 * Handles viewport calculations, camera positioning, bounds checking,
 * and screen space projections for tree visualization.
 */
import { useAppStore } from '../../core/store.js';
import { calculateVisualBounds } from '../utils/TreeBoundsUtils.js';
import { projectNodesToScreen, applySafeAreaToTarget } from '../spatial/projections.js';
import { areBoundsInView, expandBoundsForLabels } from '../spatial/bounds.js';
import { calculateSafeAreaPadding, normalizeSafeArea } from '../spatial/layout.js';

export class ViewportManager {

  // ==========================================================================
  // CONSTRUCTOR
  // ==========================================================================

  constructor(controller) {
    this.controller = controller;
  }

  // ==========================================================================
  // VIEW OFFSET
  // ==========================================================================

  getViewOffset() {
    const { viewOffsetX = 0, viewOffsetY = 0 } = useAppStore.getState();
    const x = Number.isFinite(Number(viewOffsetX)) ? Number(viewOffsetX) : 0;
    const y = Number.isFinite(Number(viewOffsetY)) ? Number(viewOffsetY) : 0;
    return { x, y };
  }

  initializeOffsets(offset) {
    if (!offset) return;
    const { setViewOffsetX, setViewOffsetY } = useAppStore.getState();
    if (typeof setViewOffsetX === 'function' && offset.x !== undefined) {
      setViewOffsetX(offset.x);
    }
    if (typeof setViewOffsetY === 'function' && offset.y !== undefined) {
      setViewOffsetY(offset.y);
    }
  }

  // ==========================================================================
  // BOUNDS CALCULATION
  // ==========================================================================

  areBoundsInView(bounds, paddingFactor = 1.05) {
    const viewport = this.controller.deckContext?.deck?.getViewports?.()?.[0];
    return areBoundsInView(bounds, viewport, paddingFactor);
  }

  // ==========================================================================
  // CAMERA FOCUS
  // ==========================================================================

  focusOnTree(nodes, labels, options = {}) {
    const { playing } = useAppStore.getState();
    if (playing && !options.allowDuringPlayback) return;
    const bounds = calculateVisualBounds(nodes, labels);
    const { width: canvasWidth, height: canvasHeight } = this.controller.deckContext.getCanvasDimensions();
    const densityPadding = this._calculateDensityPadding(nodes);
    const safeArea = this.getSafeAreaPadding();
    const padding = options.padding ?? (1.25 + densityPadding);
    const labelSizePx = options.labelSizePx;
    const getLabelSize = options.getLabelSize ?? this.controller.layerManager.layerStyles.getLabelSize?.bind(
      this.controller.layerManager.layerStyles
    );

    // 1. Expand bounds for labels
    const expandedBounds = expandBoundsForLabels(bounds, labels, labelSizePx, getLabelSize);

    // 2. Calculate Center & Dimensions
    const centerX = (expandedBounds.minX + expandedBounds.maxX) / 2;
    const centerY = (expandedBounds.minY + expandedBounds.maxY) / 2;
    const w = Math.max(1e-6, expandedBounds.maxX - expandedBounds.minX);
    const h = Math.max(1e-6, expandedBounds.maxY - expandedBounds.minY);

    // 3. Normalize Safe Area
    const safe = normalizeSafeArea(safeArea, canvasWidth, canvasHeight);
    const safeWidth = Math.max(1, canvasWidth - safe.left - safe.right);
    const safeHeight = Math.max(1, canvasHeight - safe.top - safe.bottom);

    // 4. Calculate Zoom (log2 scale)
    // Note: Clamping happens in DeckGLContext.transitionTo
    const zoom = Math.log2(Math.min(safeWidth / (w * padding), safeHeight / (h * padding)));

    // 5. Apply Safe Area offset to Target
    // We need the active view to properly unproject the safe center
    const activeView = this.controller.deckContext.getActiveView();
    const currentViewState = this.controller.deckContext.getViewState();

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

    // 6. Execute Transition
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
    return calculateSafeAreaPadding(this.controller.webglContainer?.node?.());
  }

  _calculateDensityPadding(nodes) {
    // Density-based padding to ensure readability for dense trees.
    // Base padding is applied in focusOnTree.
    const leafCount = Array.isArray(nodes) ? nodes.length : 0;
    if (leafCount > 400) return 0.15;
    if (leafCount > 200) return 0.1;
    if (leafCount > 100) return 0.05;
    return 0;
  }

  // ==========================================================================
  // SCREEN PROJECTION
  // ==========================================================================

  updateScreenPositions(nodes, sideOverride = null) {
    if (!this.controller.deckContext?.deck || !nodes) return;

    const setScreenPositions = useAppStore.getState().setScreenPositions;
    if (typeof setScreenPositions !== 'function') return;

    try {
      const viewport = this.controller.deckContext.deck.getViewports()[0];
      if (!viewport) return;

      const containerRect = this.controller.webglContainer.node().getBoundingClientRect();
      const positions = projectNodesToScreen(nodes, viewport, containerRect);

      const side = sideOverride || this.controller.viewSide || 'single';
      setScreenPositions(side, positions);
    } catch (e) {
      console.warn('[ViewportManager] Failed to projection screen positions:', e);
    }
  }
}
