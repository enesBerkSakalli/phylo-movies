/**
 * NodeGeometryBuilder - Calculates visual properties for nodes
 * Handles size, radius, and geometry logic separable from data conversion
 */
export class NodeGeometryBuilder {
  /**
   * Calculate node dot sizes for visual display based on canvas dimensions
   * @param {Array} nodes - Normalized layout nodes
   * @param {Object} options - Canvas and radius configuration
   * @returns {Map<string, number>} Map of node IDs to radius pixels
   */
  calculateNodeDotSizes(nodes, options) {
    const radiiMap = new Map();

    const { canvasWidth, canvasHeight, radiusConfig = {} } = options;
    const shortSide = Math.max(1, Math.min(canvasWidth, canvasHeight));

    // Configuration with sensible defaults
    const config = {
      // Uniform leaf size in pixels, derived from canvas size
      // Shorter side * factor, clamped to a readable range
      leafSizeFactor: 0.01, // 1% of short side
      leafMinPx: 1,
      leafMaxPx: 7,
      // Internal nodes are intentionally smaller so dense clades do not mask short branches.
      internalSizeRatio: 0.6,
      internalMinPx: 1,
      internalMaxPx: 5,
      ...radiusConfig,
    };
    const legacyRatio = Number(radiusConfig.ratio);
    const configuredInternalRatio = Number(radiusConfig.internalSizeRatio);
    const internalSizeRatio =
      Number.isFinite(configuredInternalRatio) && configuredInternalRatio > 0
        ? configuredInternalRatio
        : Number.isFinite(legacyRatio) && legacyRatio > 0
          ? legacyRatio
          : config.internalSizeRatio;

    // Compute final uniform sizes
    const baseLeafPx = Math.max(
      config.leafMinPx,
      Math.min(config.leafMaxPx, Math.round(shortSide * config.leafSizeFactor))
    );

    const internalPx = Math.max(
      config.internalMinPx,
      Math.min(config.internalMaxPx, Math.round(baseLeafPx * internalSizeRatio))
    );

    // Assign fixed radii: leaves same size, internal smaller
    nodes.forEach((node) => {
      const nodeKey = node.id;
      if (!nodeKey) return;
      const isLeaf = node.isLeaf === true;
      const radiusPx = isLeaf ? baseLeafPx : internalPx;
      radiiMap.set(nodeKey, radiusPx);
    });

    return radiiMap;
  }
}
