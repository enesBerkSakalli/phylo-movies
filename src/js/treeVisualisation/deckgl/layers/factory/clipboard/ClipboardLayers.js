import { createClipboardLabelLayer } from '../../../../utils/ClipboardUtils.js';

/**
 * Creates Deck.gl layers for the clipboard tree.
 *
 * @param {Object} params - Parameters for clipboard layer creation
 * @param {Object} params.layerData - Transformed tree data (nodes, links, etc.)
 * @param {Object} params.clipboardBounds - Visual bounds of the clipboard tree
 * @param {Array} params.fullTreeIndices - Indices of anchor trees
 * @param {number} params.treeIndex - Index of the tree on clipboard
 * @param {number} params.xOffset - X offset applied to the layout
 * @param {number} params.yOffset - Y offset applied to the layout
 * @param {Object} params.layerManager - Instance of LayerManager to delegate tree layer creation
 * @returns {Array} List of Deck.gl layers for the clipboard
 */
export function createClipboardLayers({
  layerData,
  clipboardBounds,
  fullTreeIndices,
  treeIndex,
  xOffset,
  yOffset,
  layerManager
}) {
  // Use layerManager to create the base tree layers (nodes, links, etc.)
  // Z-offset is 0 because offsets are already baked into the data by ComparisonModeRenderer logic
  // WAIT: DeckGLTreeAnimationController._createClipboardLayers passes 0 as zOffset.
  const treeLayers = layerManager.createClipboardLayers(layerData, 0, xOffset, yOffset);

  // Add the floating label
  const labelLayer = createClipboardLabelLayer(
    treeIndex,
    clipboardBounds,
    fullTreeIndices,
    xOffset,
    yOffset
  );

  return [...treeLayers, labelLayer].filter(Boolean);
}
