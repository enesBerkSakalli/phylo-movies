/**
 * ViewportManager
 *
 * Handles viewport calculations, camera positioning, bounds checking,
 * and screen space projections for tree visualization.
 */
import { useAppStore } from '../../core/store.js';
import { calculateVisualBounds } from '../utils/TreeBoundsUtils.js';

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
    try {
      const viewport = this.controller.deckManager?.deck?.getViewports?.()?.[0];
      if (!viewport?.getBounds) return false;

      const [viewMinX, viewMinY, viewMaxX, viewMaxY] = viewport.getBounds();
      const padX = (viewMaxX - viewMinX) * (paddingFactor - 1) / 2;
      const padY = (viewMaxY - viewMinY) * (paddingFactor - 1) / 2;

      return (
        bounds.minX >= viewMinX - padX &&
        bounds.maxX <= viewMaxX + padX &&
        bounds.minY >= viewMinY - padY &&
        bounds.maxY <= viewMaxY + padY
      );
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // CAMERA FOCUS
  // ==========================================================================

  focusOnTree(nodes, labels, options = {}) {
    const { playing } = useAppStore.getState();
    if (playing && !options.allowDuringPlayback) return;
    const bounds = calculateVisualBounds(nodes, labels);
    const densityPadding = this._calculateDensityPadding(nodes);
    const safeArea = this.getSafeAreaPadding();
    const padding = options.padding ?? (1.25 + densityPadding);



    this.controller.deckManager.fitToBounds(bounds, {
      padding,
      duration: options.duration ?? 550,
      // labels: do not pass labels, as input bounds already account for them via calculateVisualBounds
      getLabelSize: this.controller.layerManager.layerStyles.getLabelSize?.bind(
        this.controller.layerManager.layerStyles
      ),
      safeArea
    });
  }

  getSafeAreaPadding() {
    if (typeof document === 'undefined') return null;
    const container = this.controller.webglContainer?.node?.();
    if (!container?.getBoundingClientRect) return null;
    const canvasRect = container.getBoundingClientRect();
    if (!canvasRect?.width || !canvasRect?.height) return null;

    const selectors = ['.movie-player-bar', '#top-scale-bar-container'];
    const padding = { top: 0, right: 0, bottom: 0, left: 0 };
    const edgeThreshold = 24;

    selectors.forEach((selector) => {
      const el = document.querySelector(selector);
      if (!el?.getBoundingClientRect) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const overlapX = Math.max(0, Math.min(rect.right, canvasRect.right) - Math.max(rect.left, canvasRect.left));
      const overlapY = Math.max(0, Math.min(rect.bottom, canvasRect.bottom) - Math.max(rect.top, canvasRect.top));
      if (overlapX <= 0 || overlapY <= 0) return;

      // Heuristic: Only consider an element as a "bar" (top/bottom/side) if it covers > 50% of the edge.
      // Small corner overlays (like scale bars or legends) shouldn't shift the entire viewport.
      const isHorizontalBar = rect.width > canvasRect.width * 0.5;
      const isVerticalBar = rect.height > canvasRect.height * 0.5;

      if (isHorizontalBar) {
        if (rect.top <= canvasRect.top + edgeThreshold) {
          padding.top = Math.max(padding.top, Math.min(rect.bottom - canvasRect.top, canvasRect.height));
        }
        if (rect.bottom >= canvasRect.bottom - edgeThreshold) {
          padding.bottom = Math.max(padding.bottom, Math.min(canvasRect.bottom - rect.top, canvasRect.height));
        }
      }

      if (isVerticalBar) {
        if (rect.left <= canvasRect.left + edgeThreshold) {
          padding.left = Math.max(padding.left, Math.min(rect.right - canvasRect.left, canvasRect.width));
        }
        if (rect.right >= canvasRect.right - edgeThreshold) {
          padding.right = Math.max(padding.right, Math.min(canvasRect.right - rect.left, canvasRect.width));
        }
      }
    });

    if (!padding.top && !padding.right && !padding.bottom && !padding.left) return null;

    const extraPadding = 20;
    return {
      top: padding.top ? padding.top + extraPadding : 0,
      right: padding.right ? padding.right + extraPadding : 0,
      bottom: padding.bottom ? padding.bottom + extraPadding : 0,
      left: padding.left ? padding.left + extraPadding : 0
    };
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
    if (!this.controller.deckManager?.deck || !nodes) return;

    const setScreenPositions = useAppStore.getState().setScreenPositions;
    if (typeof setScreenPositions !== 'function') return;

    try {
      const viewport = this.controller.deckManager.deck.getViewports()[0];
      if (!viewport) return;

      const containerRect = this.controller.webglContainer.node().getBoundingClientRect();
      const positions = this._projectNodesToScreen(nodes, viewport, containerRect);

      const side = sideOverride || this.controller.viewSide || 'single';
      setScreenPositions(side, positions);
    } catch (e) {
      console.warn('[ViewportManager] Failed to project screen positions:', e);
    }
  }

  _projectNodesToScreen(nodes, viewport, containerRect) {
    const positions = {};

    nodes.forEach((node) => {
      const key = Array.isArray(node.data?.split_indices)
        ? node.data.split_indices.join('-')
        : null;
      if (!key) return;
      if (!node.position || !Array.isArray(node.position)) return;
      if (!Number.isFinite(node.position[0]) || !Number.isFinite(node.position[1])) return;

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
}
