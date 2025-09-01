import { getNodeKey, getLabelKey } from '../utils/KeyGenerator.js';
import { LinkConverter } from './converters/LinkConverter.js';
import { NodeConverter } from './converters/NodeConverter.js';
import { LabelConverter } from './converters/LabelConverter.js';

export class DeckGLDataAdapter {
  constructor() {
    this.arcCache = new Map();
    this.linkConverter = new LinkConverter();
    this.nodeConverter = new NodeConverter();
    this.labelConverter = new LabelConverter();
  }

  /**
   * Convert D3 hierarchy tree to Deck.gl layer data format
   * Uses the same geometry approach as PolylineGeometryFactory and WebGLLinkRenderer
   * Matches the same data structure as WebGL renderers
   */
  convertTreeToLayerData(tree, options = {}) {
    const {
      extensionRadius = null,
      labelRadius = null
    } = options;

    // Calculate adaptive node radii based on tree geometry
    const adaptiveRadii = this._calculateAdaptiveNodeRadii(tree, options);

    // Convert each type of data
    const nodes = this.nodeConverter.convertNodes(tree, adaptiveRadii);
    const links = this.linkConverter.convertLinks(tree);
    const labels = this.labelConverter.convertLabels(tree, labelRadius || extensionRadius);
    const extensions = this._convertExtensions(tree, extensionRadius);

    return { nodes, links, labels, extensions };
  }

  /**
   * Convert extension lines from tree leaves
   * @private
   */
  _convertExtensions(tree, extensionRadius) {
    return tree.leaves()
      .map(leaf => this._createExtensionData(leaf, extensionRadius))
      .filter(Boolean);
  }

  /**
   * Create extension line data from leaf node
   * @private
   */
  _createExtensionData(leaf, extensionRadius) {
    const extensionX = Math.cos(leaf.angle) * extensionRadius;
    const extensionY = Math.sin(leaf.angle) * extensionRadius;

    return {
      id: `ext-${getLabelKey(leaf)}`,
      sourcePosition: [leaf.x, leaf.y, 0],
      targetPosition: [extensionX, extensionY, 0],
      path: [[leaf.x, leaf.y, 0], [extensionX, extensionY, 0]],
      leaf: leaf, // Store leaf reference for coloring
      // Provide polar metadata so PathInterpolator can perform
      // polar-aware interpolation for extension paths
      polarData: {
        source: {
          angle: leaf.angle,
          radius: leaf.radius
        },
        target: {
          angle: leaf.angle,
          radius: extensionRadius
        }
      }
    };
  }

  /**
   * Calculate adaptive node radii based on tree geometry and density
   * Uses multiple factors: local density, tree depth, viewport size, and node importance
   * @private
   */
  _calculateAdaptiveNodeRadii(tree, options = {}) {
    const nodes = tree.descendants();
    const radiiMap = new Map();

    // Configuration
    const config = {
      baseRadius: 2,
      minRadius: 0.5,
      maxRadius: 8,
      densityWeight: 0.6,
      depthWeight: 0.3,
      importanceWeight: 0.4,
      leafBonus: 0.2,
      ...options.radiusConfig
    };

    // Calculate tree statistics
    const stats = this._calculateTreeStats(nodes);

    // Calculate density for each node
    const densityMap = this._calculateNodeDensities(nodes, stats);

    // Calculate importance scores
    const importanceMap = this._calculateNodeImportance(nodes, stats);

    // Assign adaptive radii
    nodes.forEach(node => {
      const nodeKey = getNodeKey(node);
      const density = densityMap.get(nodeKey) || 0;
      const importance = importanceMap.get(nodeKey) || 0;

      // Start with base radius
      let radius = config.baseRadius;

      // Adjust for density (higher density = smaller nodes)
      const densityFactor = 1 - (density * config.densityWeight);
      radius *= Math.max(0.3, densityFactor);

      // Adjust for depth (deeper nodes slightly smaller)
      const maxDepth = stats.maxDepth;
      const depthFactor = 1 - ((node.depth / maxDepth) * config.depthWeight);
      radius *= Math.max(0.5, depthFactor);

      // Adjust for importance (more important nodes larger)
      const importanceFactor = 1 + (importance * config.importanceWeight);
      radius *= importanceFactor;

      // Leaf nodes get a small bonus for visibility
      if (!node.children) {
        radius *= (1 + config.leafBonus);
      }

      // Clamp to min/max bounds
      radius = Math.max(config.minRadius, Math.min(config.maxRadius, radius));

      radiiMap.set(nodeKey, radius);
    });

    return radiiMap;
  }

  /**
   * Calculate overall tree statistics for adaptive sizing
   * @private
   */
  _calculateTreeStats(nodes) {
    const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    let maxDepth = 0;
    let leafCount = 0;

    nodes.forEach(node => {
      if (!isNaN(node.x) && !isNaN(node.y)) {
        bounds.minX = Math.min(bounds.minX, node.x);
        bounds.maxX = Math.max(bounds.maxX, node.x);
        bounds.minY = Math.min(bounds.minY, node.y);
        bounds.maxY = Math.max(bounds.maxY, node.y);
      }
      maxDepth = Math.max(maxDepth, node.depth);
      if (!node.children) leafCount++;
    });

    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const area = width * height;

    return {
      bounds,
      width,
      height,
      area,
      maxDepth,
      leafCount,
      totalNodes: nodes.length,
      avgNodesPerArea: area > 0 ? nodes.length / area : 0
    };
  }

  /**
   * Calculate local density around each node
   * @private
   */
  _calculateNodeDensities(nodes, stats) {
    const densityMap = new Map();
    const searchRadius = Math.min(stats.width, stats.height) * 0.1; // 10% of tree size

    nodes.forEach(node => {
      if (isNaN(node.x) || isNaN(node.y)) {
        densityMap.set(getNodeKey(node), 0);
        return;
      }

      // Count nearby nodes
      let nearbyCount = 0;
      nodes.forEach(otherNode => {
        if (node === otherNode || isNaN(otherNode.x) || isNaN(otherNode.y)) return;

        const dx = node.x - otherNode.x;
        const dy = node.y - otherNode.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= searchRadius) {
          nearbyCount++;
        }
      });

      // Normalize density (0-1 scale)
      const maxPossibleNearby = Math.min(nodes.length - 1, 20); // Cap at 20 for performance
      const density = nearbyCount / maxPossibleNearby;

      densityMap.set(getNodeKey(node), density);
    });

    return densityMap;
  }

  /**
   * Calculate node importance based on structural properties
   * @private
   */
  _calculateNodeImportance(nodes, stats) {
    const importanceMap = new Map();

    nodes.forEach(node => {
      let importance = 0;

      // Root node is important
      if (!node.parent) {
        importance += 0.5;
      }

      // Nodes with many children are important
      if (node.children) {
        const childrenCount = node.children.length;
        importance += Math.min(0.4, childrenCount * 0.1);
      }

      // Branch points (internal nodes) are more important than leaves
      if (node.children && node.children.length > 1) {
        importance += 0.3;
      }

      // Nodes at certain depths might be more important (e.g., major taxonomic groups)
      const relativeDepth = node.depth / stats.maxDepth;
      if (relativeDepth > 0.2 && relativeDepth < 0.8) {
        // Middle levels are often more important taxonomically
        importance += 0.2;
      }

      // Clamp importance to 0-1 range
      importance = Math.max(0, Math.min(1, importance));

      importanceMap.set(getNodeKey(node), importance);
    });

    return importanceMap;
  }
}
