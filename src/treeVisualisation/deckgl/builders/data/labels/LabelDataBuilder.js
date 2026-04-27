import { getLabelKey } from '../../../../utils/KeyGenerator.js';

/**
 * LabelDataBuilder - Generates label data for tree leaves
 * Manages label positioning, rotation, and text anchors for radial layout.
 */
export class LabelDataBuilder {
  /**
   * Convert tree leaves to Deck.gl label data
   * @param {Object} tree - D3 hierarchy root
   * @param {number} extensionRadius - Radius where labels should be placed
   * @returns {Array} Array of label objects
   */
  convertLabels(tree, extensionRadius) {
    if (!extensionRadius) return [];

    return tree.leaves()
      .map(leaf => this._createLabelData(leaf, extensionRadius))
      .filter(Boolean);
  }

  /**
   * Create single label data object
   * @private
   */
  _createLabelData(leaf, labelRadius) {
    const angleRad = leaf.rotatedAngle != null ? leaf.rotatedAngle : (leaf.angle || 0);
    if (
      !Number.isFinite(leaf?.x) ||
      !Number.isFinite(leaf?.y) ||
      !Number.isFinite(angleRad) ||
      !Number.isFinite(labelRadius)
    ) {
      console.warn('[LabelDataBuilder] Skipping label with invalid layout coordinates:', leaf?.data?.split_indices);
      return null;
    }

    const distance = Math.sqrt(leaf.x * leaf.x + leaf.y * leaf.y);

    const needsFlip = this._shouldFlipLabel(angleRad);
    const textAnchor = this._calculateTextAnchor(needsFlip);
    const rotation = this._calculateLabelRotation(angleRad);
    const position = this._calculateLabelPosition(angleRad, labelRadius);
    const labelKey = getLabelKey(leaf);
    if (!labelKey) {
      console.warn('[LabelDataBuilder] Skipping label without split_indices:', leaf?.data?.name);
      return null;
    }

    return {
      id: labelKey,
      position: position,
      text: leaf.data.name || '',
      data: leaf.data,
      angle: angleRad,
      distance: distance,
      polarPosition: labelRadius,
      textAnchor: textAnchor,
      rotation: rotation, // in RADIANS
      leaf: leaf // Store leaf reference for coloring
    };
  }

  /**
   * Check if label should be flipped based on angle
   * @private
   */
  _shouldFlipLabel(angleRad) {
    // Flip if on left side (90° to 270°)
    return angleRad > Math.PI / 2 && angleRad < Math.PI * 1.5;
  }

  /**
   * Calculate text anchor position
   * @private
   */
  _calculateTextAnchor(needsFlip) {
    return needsFlip ? 'end' : 'start';
  }

  /**
   * Calculate label rotation in radians
   * @private
   */
  _calculateLabelRotation(angleRad) {
    let finalRotation = 0 - angleRad;
    if (this._shouldFlipLabel(angleRad)) {
      finalRotation += Math.PI;
    }
    return finalRotation;
  }

  /**
   * Calculate final label Cartesian position
   * @private
   */
  _calculateLabelPosition(angleRad, labelRadius) {
    const x = labelRadius * Math.cos(angleRad);
    const y = labelRadius * Math.sin(angleRad);
    return [x, y, 0];
  }
}
