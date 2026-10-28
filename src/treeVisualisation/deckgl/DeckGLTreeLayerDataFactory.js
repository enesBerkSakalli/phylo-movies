import { getSplitIndices, toSubtreeKey } from '../../domain/tree/splits.js';
import { LinkDataBuilder } from './builders/data/links/LinkDataBuilder.js';
import { NodeDataBuilder } from './builders/data/nodes/NodeDataBuilder.js';
import { LabelDataBuilder } from './builders/data/labels/LabelDataBuilder.js';
import { ExtensionDataBuilder } from './builders/data/extensions/ExtensionDataBuilder.js';
import { LAYOUT_PROJECTION_MODES } from '../layout/hyperbolicProjection/index.js';

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
      radiusConfig = {},
      treeIndex = null,
      treeSide = null,
      renderMode = 'single',
      linkGeometryMode = 'radial-elbow',
    } = options;

    // Convert each type of data
    const nodes = this.nodeDataBuilder.convertNodes(layout.nodes, {
      canvasWidth: layout.width,
      canvasHeight: layout.height,
      radiusConfig,
    });
    const usesStraightLinks =
      layout?.projectionMode === LAYOUT_PROJECTION_MODES.WALRUS_3D ||
      layout?.projectionMode === LAYOUT_PROJECTION_MODES.UNROOTED;
    const effectiveLinkGeometryMode = usesStraightLinks
      ? 'straight'
      : layout?.projectionMode === LAYOUT_PROJECTION_MODES.RECTANGULAR
        ? 'rectangular-elbow'
        : linkGeometryMode;
    const links = this.linkDataBuilder.convertLinks(layout.links, {
      linkGeometryMode: effectiveLinkGeometryMode,
    });
    const projectionMode = layout?.projectionMode;
    // Hidden labels leave nothing for a ring (extensions, label dots) to connect
    // to; the leaf nodes already mark the tips. 3D and comparison keep the ring.
    const dropLabels =
      layout?.labelsVisible === false &&
      projectionMode !== LAYOUT_PROJECTION_MODES.WALRUS_3D &&
      renderMode !== 'comparison';
    // Unrooted and rectangular labels sit just beyond their leaf, so no ring.
    const dropExtensions =
      dropLabels ||
      projectionMode === LAYOUT_PROJECTION_MODES.UNROOTED ||
      projectionMode === LAYOUT_PROJECTION_MODES.RECTANGULAR;
    const labels = dropLabels
      ? []
      : renderMode === 'comparison'
        ? // Comparison connectors anchor on the label ring; keep its world-space gap.
          this.labelDataBuilder
            .convertLabels(
              layout.leaves,
              labelRadius || extensionRadius,
              labelRadius && extensionRadius ? labelRadius - extensionRadius : 0
            )
            .map((label) => ({ ...label, pixelOffset: undefined }))
        : // Labels start where the guide line ends (tips for unrooted/rectangular);
          // the gap to the text is a pixel offset, so it stays constant when zooming.
          this.labelDataBuilder.convertLabels(layout.leaves, extensionRadius || labelRadius, 0);
    const extensions = dropExtensions
      ? []
      : this.extensionDataBuilder.convertExtensions(layout.leaves, extensionRadius || labelRadius);

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
        if (!element.splitKey) {
          element.splitKey = toSubtreeKey(splitIndices);
        }
      }
    }
  }
}
