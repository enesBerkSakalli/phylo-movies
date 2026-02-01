import { getNodeKey, getExtensionKey } from '../utils/KeyGenerator.js';
import { LinkDataBuilder } from './builders/data/links/LinkDataBuilder.js';
import { NodeDataBuilder } from './builders/data/nodes/NodeDataBuilder.js';
import { LabelDataBuilder } from './builders/data/labels/LabelDataBuilder.js';
import { ExtensionDataBuilder } from './builders/data/extensions/ExtensionDataBuilder.js';

export class DeckGLTreeLayerDataFactory {
  constructor() {
    this.arcCache = new Map();
    this.linkDataBuilder = new LinkDataBuilder();
    this.nodeDataBuilder = new NodeDataBuilder();
    this.labelDataBuilder = new LabelDataBuilder();
    this.extensionDataBuilder = new ExtensionDataBuilder();
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

    // Convert each type of data
    const nodes = this.nodeDataBuilder.convertNodes(tree, { canvasWidth, canvasHeight, radiusConfig });
    const links = this.linkDataBuilder.convertLinks(tree);
    const labels = this.labelDataBuilder.convertLabels(tree, labelRadius || extensionRadius);
    // Extensions should reach to labelRadius (where labels start) for visual connection
    const extensions = this.extensionDataBuilder.convertExtensions(tree, labelRadius || extensionRadius);

    return { nodes, links, labels, extensions };
  }
}
