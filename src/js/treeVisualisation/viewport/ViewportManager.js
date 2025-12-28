/**
 * ViewportManager
 *
 * Handles viewport calculations, camera positioning, bounds checking,
 * and screen space projections for tree visualization.
 */
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
    const { viewOffsetX = 0, viewOffsetY = 0 } = this.controller._getState();
    const x = Number.isFinite(Number(viewOffsetX)) ? Number(viewOffsetX) : 0;
    const y = Number.isFinite(Number(viewOffsetY)) ? Number(viewOffsetY) : 0;
    return { x, y };
  }

  initializeOffsets(offset) {
    if (!offset) return;
    const { setViewOffsetX, setViewOffsetY } = this.controller._getState();
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

  calculateBounds(nodes, labels) {
    const allElements = [...nodes, ...(labels || [])];
    return allElements.reduce((acc, el) => {
      const [x, y] = el.position;
      acc.minX = Math.min(acc.minX, x);
      acc.maxX = Math.max(acc.maxX, x);
      acc.minY = Math.min(acc.minY, y);
      acc.maxY = Math.max(acc.maxY, y);
      return acc;
    }, {
      minX: Infinity, maxX: -Infinity,
      minY: Infinity, maxY: -Infinity,
    });
  }

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
    const bounds = this.calculateBounds(nodes, labels);
    const densityPadding = this._calculateDensityPadding(nodes);

    this.controller.deckManager.fitToBounds(bounds, {
      padding: options.padding ?? (1.05 + densityPadding),
      duration: options.duration ?? 550,
      labels,
      getLabelSize: this.controller.layerManager.layerStyles.getLabelSize?.bind(
        this.controller.layerManager.layerStyles
      )
    });
  }

  _calculateDensityPadding(nodes) {
    // Reduced padding logic: DeckManager already expands bounds for labels.
    // We only need slight extra breathing room for very dense trees.
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

    const setScreenPositions = this.controller._getState?.().setScreenPositions;
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
