import { getExtensionKey } from '../../../../utils/KeyGenerator.js';

/**
 * ExtensionDataBuilder - Generates extension lines for leaf nodes
 * Extensions are radial lines extending from leaves to the outer radius.
 */
export class ExtensionDataBuilder {
  /**
   * Convert tree leaves to Deck.gl extension line data
   * @param {Object} tree - D3 hierarchy root
   * @param {number} extensionRadius - Outer radius for extensions
   * @returns {Array} Array of extension line objects
   */
  convertExtensions(tree, extensionRadius) {
    if (!extensionRadius) return [];

    return tree.leaves()
      .map(leaf => this._createExtensionData(leaf, extensionRadius))
      .filter(Boolean);
  }

  /**
   * Create single extension data object
   * @private
   */
  _createExtensionData(leaf, extensionRadius) {
    const angle = leaf.rotatedAngle != null ? leaf.rotatedAngle : leaf.angle;
    const extensionX = Math.cos(angle) * extensionRadius;
    const extensionY = Math.sin(angle) * extensionRadius;

    // Use leaf coordinates as source
    const sourceX = leaf.x || 0;
    const sourceY = leaf.y || 0;

    return {
      id: getExtensionKey(leaf),
      sourcePosition: [sourceX, sourceY, 0],
      targetPosition: [extensionX, extensionY, 0],
      path: [[sourceX, sourceY, 0], [extensionX, extensionY, 0]],
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
}
