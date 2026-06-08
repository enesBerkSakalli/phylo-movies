import { getSplitKey } from '../../../../../domain/tree/splits.js';
import {
  labelRotation,
  labelTextAnchor,
  positionFromPolar,
  shouldFlipLabel,
} from '../../../../utils/polarGeometry.js';

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
}
