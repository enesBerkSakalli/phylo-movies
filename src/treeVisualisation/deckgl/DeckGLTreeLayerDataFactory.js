import { getSplitIndices, toSubtreeKey } from '../utils/splitMatching.js';
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
   * Convert normalized layout data to Deck.gl layer data format.
   */
  convertTreeToLayerData(layout, options = {}) {
    const {
      extensionRadius = null,
      labelRadius = null,
      // Optional canvas dimensions to adapt node radii
      canvasWidth = null,
      canvasHeight = null,
      radiusConfig = {},
      treeIndex = null,
      treeSide = null,
      renderMode = 'single',
      linkGeometryMode = 'radial-elbow'
    } = options;

    // Convert each type of data
    const nodes = this.nodeDataBuilder.convertNodes(layout.nodes, { canvasWidth, canvasHeight, radiusConfig });
    const links = this.linkDataBuilder.convertLinks(layout.links, { linkGeometryMode });
    const labels = this.labelDataBuilder.convertLabels(layout.leaves, labelRadius || extensionRadius);
    const extensions = this.extensionDataBuilder.convertExtensions(layout.leaves, extensionRadius || labelRadius);

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

      const splitIndices = getSplitIndices(element);
      if (Array.isArray(splitIndices) && splitIndices.length > 0) {
        element.split_indices = splitIndices;
        element.splitKey = toSubtreeKey(splitIndices);
      }
    }
  }
}
