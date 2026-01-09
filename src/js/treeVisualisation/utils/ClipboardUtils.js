import { TextLayer } from '@deck.gl/layers';
import { CLIPBOARD_LAYER_ID_PREFIX } from '../deckgl/layers/layerConfigs.js';

/**
 * Create clipboard label TextLayer
 * @param {number} treeIndex - Tree index for label text
 * @param {Object} bounds - Visual bounds of clipboard tree {minX, maxX, minY, maxY}
 * @param {Array} fullTreeIndices - Array of full tree indices from store for anchor detection
 * @param {number} xOffset - X offset for clipboard position
 * @param {number} yOffset - Y offset for clipboard position
 * @returns {TextLayer|null} Label layer or null
 */
export function createClipboardLabelLayer(treeIndex, bounds, fullTreeIndices = [], xOffset = 0, yOffset = 0) {
  if (!bounds) return null;

  // Position label above the tree VISUAL bounds
  const minY = bounds.minY;
  const avgX = (bounds.minX + bounds.maxX) / 2;

  let labelText = `Tree #${treeIndex + 1}`;
  // Check if it's an anchor tree
  const anchorIndex = fullTreeIndices.indexOf(treeIndex);
  if (anchorIndex >= 0) {
      labelText = `Anchor Tree #${anchorIndex + 1}`; // 1-based index for user
  }

  return new TextLayer({
    id: `${CLIPBOARD_LAYER_ID_PREFIX}-tree-label`,
    data: [{
      text: labelText,
      // Place well above the visual top (minY).
      // Visual bounds include label extent, so this should be safe.
      // Add extra padding (e.g. 50px) to separate from top-most tree label.
      position: [avgX + xOffset, minY + yOffset - 50, 0],
      treeSide: 'clipboard'
    }],
    pickable: true,
    getText: d => d.text,
    getPosition: d => d.position,
    getSize: 16,
    getColor: [0, 0, 0, 255], // Black
    fontFamily: 'sans-serif',
    fontWeight: 'bold',
    getTextAnchor: 'middle',
    getAlignmentBaseline: 'bottom'
  });
}
