import { getNodeKey, getExtensionKey } from '../utils/KeyGenerator.js';
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
      labelRadius = null,
      // Optional canvas dimensions to adapt node radii
      canvasWidth = null,
      canvasHeight = null,
      radiusConfig = {}
    } = options;

    // Calculate simplified adaptive node radii based on canvas size
    const adaptiveRadii = this._calculateAdaptiveNodeRadii(tree, { canvasWidth, canvasHeight, radiusConfig });

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
    const angle = leaf.rotatedAngle != null ? leaf.rotatedAngle : leaf.angle;
    const extensionX = Math.cos(angle) * extensionRadius;
    const extensionY = Math.sin(angle) * extensionRadius;

    return {
      id: getExtensionKey(leaf),
      sourcePosition: [leaf.x, leaf.y, 0],
      targetPosition: [extensionX, extensionY, 0],
      path: [[leaf.x, leaf.y, 0], [extensionX, extensionY, 0]],
      leaf: leaf, // Store leaf reference for coloring
      // Provide polar metadata so PathInterpolator can perform
      // polar-aware interpolation for extension paths
      polarData: {
        source: {
          angle,
          radius: leaf.radius
        },
        target: {
          angle,
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
      ratio: 0.5,
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
      const radiusPx = internalPx;
      radiiMap.set(nodeKey, radiusPx);
    });

    return radiiMap;
  }




}
