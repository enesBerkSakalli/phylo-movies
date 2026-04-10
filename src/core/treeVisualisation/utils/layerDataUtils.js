/**
 * layerDataUtils.js
 * Performance-optimized utilities for layer data manipulation.
 */

/**
 * Tags all elements in layer data with a treeSide property.
 * Uses for-i loops instead of spread+forEach for better performance.
 *
 * @param {Object} layerData - Layer data object with nodes, links, labels, extensions
 * @param {string} side - The side to tag ('left', 'right', 'clipboard')
 */
export function tagTreeSide(layerData, side) {
  if (!layerData) return;

  const arrays = [
    layerData.nodes,
    layerData.links,
    layerData.labels,
    layerData.extensions
  ];

  for (let a = 0; a < arrays.length; a++) {
    const arr = arrays[a];
    if (!arr) continue;
    for (let i = 0, len = arr.length; i < len; i++) {
      arr[i].treeSide = side;
    }
  }
}
