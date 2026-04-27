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
    if (
      !Number.isFinite(leaf?.x) ||
      !Number.isFinite(leaf?.y) ||
      !Number.isFinite(angle) ||
      !Number.isFinite(extensionRadius)
    ) {
      console.warn('[ExtensionDataBuilder] Skipping extension with invalid layout coordinates:', leaf?.data?.split_indices);
      return null;
    }

    const extensionX = Math.cos(angle) * extensionRadius;
    const extensionY = Math.sin(angle) * extensionRadius;

    // Use leaf coordinates as source
    const sourceX = leaf.x;
    const sourceY = leaf.y;
    const extensionKey = getExtensionKey(leaf);
    if (!extensionKey) {
      console.warn('[ExtensionDataBuilder] Skipping extension without split_indices:', leaf?.data?.name);
      return null;
    }

    return {
      id: extensionKey,
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
