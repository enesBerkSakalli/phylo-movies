import { toSubtreeKey } from '../utils/splitMatching.js';
import { LinkDataBuilder } from './builders/data/links/LinkDataBuilder.js';
import { NodeDataBuilder } from './builders/data/nodes/NodeDataBuilder.js';
import { LabelDataBuilder } from './builders/data/labels/LabelDataBuilder.js';
import { ExtensionDataBuilder } from './builders/data/extensions/ExtensionDataBuilder.js';

export class DeckGLTreeLayerDataFactory {
  constructor() {
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
      radiusConfig = {},
      treeIndex = null,
      treeSide = null,
      renderMode = 'single'
    } = options;

    // Convert each type of data
    const nodes = this.nodeDataBuilder.convertNodes(tree, { canvasWidth, canvasHeight, radiusConfig });
    const links = this.linkDataBuilder.convertLinks(tree);
    const labels = this.labelDataBuilder.convertLabels(tree, labelRadius || extensionRadius);
    // Extensions should reach to labelRadius (where labels start) for visual connection
    const extensions = this.extensionDataBuilder.convertExtensions(tree, labelRadius || extensionRadius);

    const layerData = { nodes, links, labels, extensions };
    applyRenderContext(layerData, { treeIndex, treeSide, renderMode });

    return layerData;
  }
}

function applyRenderContext(layerData, context) {
  const arrays = [layerData.nodes, layerData.links, layerData.labels, layerData.extensions];

  for (const elements of arrays) {
    if (!Array.isArray(elements)) continue;
    for (const element of elements) {
      if (!element) continue;

      if (context.treeIndex !== null && context.treeIndex !== undefined) {
        element.treeIndex = context.treeIndex;
      }
      if (context.treeSide) {
        element.treeSide = context.treeSide;
      }
      if (context.renderMode) {
        element.renderMode = context.renderMode;
      }

      const splitIndices = getElementSplitIndices(element);
      if (Array.isArray(splitIndices) && splitIndices.length > 0) {
        element.split_indices = splitIndices;
        element.splitKey = toSubtreeKey(splitIndices);
      }
    }
  }
}

function getElementSplitIndices(element) {
  return (
    element.split_indices ||
    element.data?.split_indices ||
    element.target?.data?.split_indices ||
    element.leaf?.data?.split_indices ||
    null
  );
}
