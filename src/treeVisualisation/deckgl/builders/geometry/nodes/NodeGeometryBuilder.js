import { getNodeKey } from '../../../../utils/KeyGenerator.js';

/**
 * NodeGeometryBuilder - Calculates visual properties for nodes
 * Handles size, radius, and geometry logic separable from data conversion
 */
export class NodeGeometryBuilder {
  /**
   * Calculate node dot sizes for visual display based on canvas dimensions
   * @param {Object} tree - D3 hierarchy root
   * @param {Object} options - Canvas and radius configuration
   * @returns {Map<string, number>} Map of node IDs to radius pixels
   */
  calculateNodeDotSizes(tree, options = {}) {
    const nodes = tree.descendants();
    const radiiMap = new Map();

    // Extract canvas dimensions (fallbacks if not provided)
    const { canvasWidth, canvasHeight, radiusConfig = {} } = options;
    const w = Number.isFinite(canvasWidth) ? canvasWidth : 800;
    const h = Number.isFinite(canvasHeight) ? canvasHeight : 600;
    const shortSide = Math.max(1, Math.min(w, h));

    // Configuration with sensible defaults
    const config = {
      // Uniform leaf size in pixels, derived from canvas size
      // Shorter side * factor, clamped to a readable range
      leafSizeFactor: 0.01, // 1% of short side
      leafMinPx: 1,
      leafMaxPx: 7,
      // Internal nodes are a fixed ratio smaller than leaves
      ratio: 1.0,
      ...radiusConfig
    };

    // Compute final uniform sizes
    const baseLeafPx = Math.max(
      config.leafMinPx,
      Math.min(config.leafMaxPx, Math.round(shortSide * config.leafSizeFactor))
    );

    const internalPx = Math.max(1, Math.round(baseLeafPx * config.ratio));

    // Assign fixed radii: leaves same size, internal smaller
    nodes.forEach(node => {
      const nodeKey = getNodeKey(node);
      const isLeaf = !node.children;
      const radiusPx = isLeaf ? baseLeafPx : internalPx;
      radiiMap.set(nodeKey, radiusPx);
    });

    return radiiMap;
  }
}
