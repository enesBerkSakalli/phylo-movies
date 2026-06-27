import { getSplitKey } from '../../../../../domain/tree/splits.js';
import {
  labelRotation,
  labelTextAnchor,
  normalizeDirection3,
  normalizePosition3,
  positionFromPolar,
  shouldFlipLabel,
} from '../../../../utils/polarGeometry.js';
import { LAYOUT_PROJECTION_MODES } from '../../../../layout/hyperbolicProjection.js';

/**
 * LabelDataBuilder - Generates label data for tree leaves
 * Manages label positioning, rotation, and text anchors for radial layout.
 */
export class LabelDataBuilder {
  /**
   * Convert layout leaves to Deck.gl label data
   * @param {Array} leaves - Normalized layout leaves
   * @param {number} extensionRadius - Radius where labels should be placed
   * @returns {Array} Array of label objects
   */
  convertLabels(leaves, extensionRadius) {
    if (!extensionRadius) return [];

    return leaves.map((leaf) => this._createLabelData(leaf, extensionRadius)).filter(Boolean);
  }

  /**
   * Create single label data object
   * @private
   */
  _createLabelData(leaf, labelRadius) {
    if (leaf.projectionMode === LAYOUT_PROJECTION_MODES.WALRUS_3D) {
      return this._createWalrus3dLabelData(leaf, labelRadius);
    }

    const angleRad = leaf.angle;
    if (
      !Number.isFinite(leaf.x) ||
      !Number.isFinite(leaf.y) ||
      !Number.isFinite(angleRad) ||
      !Number.isFinite(labelRadius)
    ) {
      console.warn(
        '[LabelDataBuilder] Skipping label with invalid layout coordinates:',
        leaf.split_indices
      );
      return null;
    }

    const distance = Math.sqrt(leaf.x * leaf.x + leaf.y * leaf.y);

    const needsFlip = shouldFlipLabel(angleRad);
    const textAnchor = labelTextAnchor(needsFlip);
    const rotation = labelRotation(angleRad, needsFlip);
    const position = positionFromPolar(labelRadius, angleRad);
    const splitIndices = leaf.split_indices;
    const splitKey = leaf.splitKey || getSplitKey({ split_indices: splitIndices });
    const labelKey = splitKey ? `label-${splitKey}` : null;
    if (!labelKey) {
      console.warn('[LabelDataBuilder] Skipping label without split_indices:', leaf.name);
      return null;
    }

    return {
      id: labelKey,
      position: position,
      text: leaf.name,
      name: leaf.name,
      isLeaf: true,
      split_indices: splitIndices,
      splitKey,
      angle: angleRad,
      distance: distance,
      polarPosition: labelRadius,
      textAnchor: textAnchor,
      rotation: rotation, // in RADIANS
    };
  }

  _createWalrus3dLabelData(leaf, labelRadius) {
    const leafPosition = normalizePosition3(leaf.position);
    if (!leafPosition || !Number.isFinite(labelRadius)) {
      console.warn(
        '[LabelDataBuilder] Skipping 3D label with invalid layout coordinates:',
        leaf.split_indices
      );
      return null;
    }

    const distance = Math.hypot(leafPosition[0], leafPosition[1], leafPosition[2]);
    const direction = normalizeDirection3(leaf.h3Direction, leafPosition);
    const offset = Math.max(0, labelRadius - distance);
    const position = [
      leafPosition[0] + direction[0] * offset,
      leafPosition[1] + direction[1] * offset,
      leafPosition[2] + direction[2] * offset,
    ];
    const splitIndices = leaf.split_indices;
    const splitKey = leaf.splitKey || getSplitKey({ split_indices: splitIndices });
    const labelKey = splitKey ? `label-${splitKey}` : null;
    if (!labelKey) {
      console.warn('[LabelDataBuilder] Skipping 3D label without split_indices:', leaf.name);
      return null;
    }

    return {
      id: labelKey,
      position,
      text: leaf.name,
      name: leaf.name,
      isLeaf: true,
      split_indices: splitIndices,
      splitKey,
      angle: Number.isFinite(leaf.angle) ? leaf.angle : Math.atan2(position[1], position[0]),
      distance,
      polarPosition: Math.hypot(position[0], position[1], position[2]),
      projectionMode: leaf.projectionMode,
      h3Direction: direction,
      textAnchor: 'middle',
      rotation: 0,
    };
  }
}
