/**
 * ViewportManager
 *
 * Handles viewport calculations, camera positioning, bounds checking,
 * and screen space projections for tree visualization.
 */
export class ViewportManager {
  constructor(controller) {
    this.controller = controller;
  }

  /**
   * Get current view offset from store.
   * @returns {Object} {x, y} offset values
   */
  getViewOffset() {
    const { viewOffsetX = 0, viewOffsetY = 0 } = this.controller._getState();
    const x = Number.isFinite(Number(viewOffsetX)) ? Number(viewOffsetX) : 0;
    const y = Number.isFinite(Number(viewOffsetY)) ? Number(viewOffsetY) : 0;
    return { x, y };
  }

  /**
   * Check if bounds are within current viewport.
   * @param {Object} bounds - {minX, maxX, minY, maxY}
   * @param {number} paddingFactor - Padding multiplier
   * @returns {boolean} True if bounds are in view
   */
  areBoundsInView(bounds, paddingFactor = 1.05) {
    try {
      const viewState = this.controller.deckManager?.getViewState?.();
      if (!viewState) return false;
      const { width, height } = this.controller.deckManager.getCanvasDimensions();
      const zoom = Number.isFinite(viewState.zoom) ? viewState.zoom : 0;
      const scale = 2 ** zoom;
      const halfW = (width / scale) / 2;
      const halfH = (height / scale) / 2;
      const cx = Array.isArray(viewState.target) ? viewState.target[0] ?? 0 : 0;
      const cy = Array.isArray(viewState.target) ? viewState.target[1] ?? 0 : 0;

      const viewMinX = cx - halfW * paddingFactor;
      const viewMaxX = cx + halfW * paddingFactor;
      const viewMinY = cy - halfH * paddingFactor;
      const viewMaxY = cy + halfH * paddingFactor;

      return (
        bounds.minX >= viewMinX &&
        bounds.maxX <= viewMaxX &&
        bounds.minY >= viewMinY &&
        bounds.maxY <= viewMaxY
      );
    } catch (_) {
      return false;
    }
  }

  /**
   * Calculate bounds from node and label positions.
   * @param {Array} nodes - Node elements
   * @param {Array} labels - Label elements
   * @returns {Object} bounds {minX, maxX, minY, maxY}
   */
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

  /**
   * Focus camera on tree elements by fitting bounds.
   * @param {Array} nodes - Node elements
   * @param {Array} labels - Label elements
   * @param {Object} options - Fit options {padding, duration}
  */
  focusOnTree(nodes, labels, options = {}) {
    const bounds = this.calculateBounds(nodes, labels);

    // Increase padding for dense trees to reduce overlap of thick strokes/labels
    const leafCount = Array.isArray(nodes) ? nodes.length : 0;
    const densityPadding = leafCount > 400 ? 1.4
      : leafCount > 200 ? 1.3
      : leafCount > 100 ? 1.2
      : 0;

    this.controller.deckManager.fitToBounds(bounds, {
      padding: options.padding ?? (1.25 + densityPadding),
      duration: options.duration ?? 550,
      labels,
      getLabelSize: this.controller.layerManager.layerStyles.getLabelSize?.bind(
        this.controller.layerManager.layerStyles
      )
    });
  }

  /**
   * Project node positions into screen space for overlay rendering.
   * @param {Array} nodes - Node elements to project
   */
  updateScreenPositions(nodes, sideOverride = null) {
    if (!this.controller.deckManager?.deck || !nodes) return;

    try {
      const viewport = this.controller.deckManager.deck.getViewports()[0];
      if (!viewport) return;
      const containerRect = this.controller.webglContainer.node().getBoundingClientRect();
      const { setScreenPositions } = this.controller._getState();

      const positions = {};
      nodes.forEach((node) => {
        const key = Array.isArray(node.data?.split_indices)
          ? node.data.split_indices.join('-')
          : null;
        if (!key) return;
        const [px, py] = viewport.project(node.position);
        positions[key] = {
          x: px + containerRect.left,
          y: py + containerRect.top,
          width: 0,
          height: 0,
          isLeaf: !node.children || node.children.length === 0
        };
      });

      if (typeof setScreenPositions === 'function') {
        const side = sideOverride || this.controller.viewSide || 'single';
        setScreenPositions(side, positions);
      }
    } catch (e) {
      console.warn('[ViewportManager] Failed to project screen positions:', e);
    }
  }

  /**
   * Initialize view offsets from configuration.
   * @param {Object} offset - {x, y} offset values
   */
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
}
