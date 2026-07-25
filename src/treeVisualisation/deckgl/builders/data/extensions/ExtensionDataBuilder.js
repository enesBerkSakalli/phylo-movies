import { getSplitKey } from '../../../../../domain/tree/splits.js';
import {
  normalizeDirection3,
  normalizePosition3,
} from '../../../../utils/polarGeometry.js';
import { twoPointFloat32Path } from '../../../utils/pathFormat.js';
import { LAYOUT_PROJECTION_MODES } from '../../../../layout/hyperbolicProjection/index.js';

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

    return leaves.map((leaf) => this._createExtensionData(leaf, extensionRadius)).filter(Boolean);
  }

  /**
   * Create single extension data object
   * @private
   */
  _createExtensionData(leaf, extensionRadius) {
    if (leaf.projectionMode === LAYOUT_PROJECTION_MODES.WALRUS_3D) {
      return this._createWalrus3dExtensionData(leaf, extensionRadius);
    }

    const angle = leaf.angle;
    if (
      !Number.isFinite(leaf.x) ||
      !Number.isFinite(leaf.y) ||
      !Number.isFinite(angle) ||
      !Number.isFinite(extensionRadius)
    ) {
      console.warn(
        '[ExtensionDataBuilder] Skipping extension with invalid layout coordinates:',
        leaf.split_indices
      );
      return null;
    }

    const extensionX = Math.cos(angle) * extensionRadius;
    const extensionY = Math.sin(angle) * extensionRadius;

    // Use leaf coordinates as source
    const sourceX = leaf.x;
    const sourceY = leaf.y;
    const splitIndices = leaf.split_indices;
    const splitKey = leaf.splitKey || getSplitKey({ split_indices: splitIndices });
    const extensionKey = splitKey ? `ext-${splitKey}` : null;
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
      splitKey,
      // Provide polar metadata so PathInterpolator can perform
      // polar-aware interpolation for extension paths
      polarData: {
        source: {
          angle,
          radius: leaf.radius,
        },
        target: {
          angle,
          radius: extensionRadius,
        },
      },
    };
  }

  _createWalrus3dExtensionData(leaf, extensionRadius) {
    const sourcePosition = normalizePosition3(leaf.position);
    if (!sourcePosition || !Number.isFinite(extensionRadius)) {
      console.warn(
        '[ExtensionDataBuilder] Skipping 3D extension with invalid layout coordinates:',
        leaf.split_indices
      );
      return null;
    }

    const sourceDistance = Math.hypot(sourcePosition[0], sourcePosition[1], sourcePosition[2]);
    const direction = normalizeDirection3(leaf.h3Direction, sourcePosition);
    const offset = Math.max(0, extensionRadius - sourceDistance);
    const targetPosition = [
      sourcePosition[0] + direction[0] * offset,
      sourcePosition[1] + direction[1] * offset,
      sourcePosition[2] + direction[2] * offset,
    ];
    const splitIndices = leaf.split_indices;
    const splitKey = leaf.splitKey || getSplitKey({ split_indices: splitIndices });
    const extensionKey = splitKey ? `ext-${splitKey}` : null;
    if (!extensionKey) {
      console.warn(
        '[ExtensionDataBuilder] Skipping 3D extension without split_indices:',
        leaf.name
      );
      return null;
    }

    return {
      id: extensionKey,
      sourcePosition,
      targetPosition,
      path: twoPointFloat32Path(sourcePosition, targetPosition),
      name: leaf.name,
      isLeaf: true,
      split_indices: splitIndices,
      splitKey,
      projectionMode: leaf.projectionMode,
      h3Direction: direction,
      polarData: {
        source: {
          angle: Number.isFinite(leaf.angle)
            ? leaf.angle
            : Math.atan2(sourcePosition[1], sourcePosition[0]),
          radius: leaf.radius,
        },
        target: {
          angle: Number.isFinite(leaf.angle)
            ? leaf.angle
            : Math.atan2(targetPosition[1], targetPosition[0]),
          radius: extensionRadius,
        },
      },
    };
  }
}
