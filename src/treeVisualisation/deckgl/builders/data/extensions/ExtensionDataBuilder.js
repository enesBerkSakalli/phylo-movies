import { getExtensionKey } from '../../../../utils/KeyGenerator.js';
import { twoPointFloat32Path } from '../../../utils/pathFormat.js';

/**
 * ExtensionDataBuilder - Generates extension lines for leaf nodes
 * Extensions are radial lines extending from leaves to the outer radius.
 */
export class ExtensionDataBuilder {
  /**
   * Convert layout leaves to Deck.gl extension line data
   * @param {Array} leaves - Normalized layout leaves
   * @param {number} extensionRadius - Outer radius for extensions
   * @returns {Array} Array of extension line objects
   */
  convertExtensions(leaves, extensionRadius) {
    if (!extensionRadius) return [];

    return leaves
      .map(leaf => this._createExtensionData(leaf, extensionRadius))
      .filter(Boolean);
  }

  /**
   * Create single extension data object
   * @private
   */
  _createExtensionData(leaf, extensionRadius) {
    const angle = leaf.angle;
    if (
      !Number.isFinite(leaf.x) ||
      !Number.isFinite(leaf.y) ||
      !Number.isFinite(angle) ||
      !Number.isFinite(extensionRadius)
    ) {
      console.warn('[ExtensionDataBuilder] Skipping extension with invalid layout coordinates:', leaf.split_indices);
      return null;
    }

    const extensionX = Math.cos(angle) * extensionRadius;
    const extensionY = Math.sin(angle) * extensionRadius;

    // Use leaf coordinates as source
    const sourceX = leaf.x;
    const sourceY = leaf.y;
    const splitIndices = leaf.split_indices;
    const extensionKey = getExtensionKey({ split_indices: splitIndices });
    if (!extensionKey) {
      console.warn('[ExtensionDataBuilder] Skipping extension without split_indices:', leaf.name);
      return null;
    }

    return {
      id: extensionKey,
      sourcePosition: [sourceX, sourceY, 0],
      targetPosition: [extensionX, extensionY, 0],
      path: twoPointFloat32Path([sourceX, sourceY, 0], [extensionX, extensionY, 0]),
      name: leaf.name,
      isLeaf: true,
      split_indices: splitIndices,
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
