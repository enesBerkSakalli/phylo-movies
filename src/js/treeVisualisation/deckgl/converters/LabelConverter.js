import { getLabelKey } from '../../utils/KeyGenerator.js';
import { LABEL_MARGIN } from './converterConstants.js';

/**
 * Handles conversion of D3 hierarchy labels to Deck.gl layer format
 * Manages label positioning, rotation, and text anchor calculations for radial trees
 */
export class LabelConverter {
  constructor() {
    // Label converter doesn't need instance state currently
  }

  /**
   * Convert labels from tree leaves to Deck.gl format
   */
  convertLabels(tree, extensionRadius) {
    return tree.leaves().map(leaf => this.createLabelData(leaf, extensionRadius));
  }

  /**
   * Create label data object from leaf node
   */
  createLabelData(leaf, labelRadius) {
    const angleRad = leaf.rotatedAngle != null ? leaf.rotatedAngle : (leaf.angle || 0);
    const distance = Math.sqrt(leaf.x * leaf.x + leaf.y * leaf.y);

    // Determine label orientation and positioning using radians
    const needsFlip = this._shouldFlipLabel(angleRad);
    const textAnchor = this._calculateTextAnchor(needsFlip);
    const rotation = this._calculateLabelRotation(angleRad);
    const position = this._calculateLabelPosition(angleRad, labelRadius);

    // We expose polarRadius so interpolation can follow the arc.
    const adjustedRadius = labelRadius + LABEL_MARGIN;

    return {
      id: getLabelKey(leaf),
      position: position,
      text: leaf.data.name || '',
      data: leaf.data,
      angle: angleRad,
      distance: distance,
      polarRadius: adjustedRadius,
      textAnchor: textAnchor,
      rotation: rotation, // Stored in RADIANS
      leaf: leaf // Store leaf reference for coloring
    };
  }

  /**
   * Determine if label should be flipped based on angle in radians
   * @private
   */
  _shouldFlipLabel(angleRad) {
    // 90° to 270° in radians is PI/2 to 1.5*PI
    return angleRad > Math.PI / 2 && angleRad < Math.PI * 1.5;
  }

  /**
   * Calculate text anchor based on label orientation
   * @private
   */
  _calculateTextAnchor(needsFlip) {
    // Set text anchor based on whether the label is flipped
    // When flipped (left side), use 'end'; when not flipped (right side), use 'start'
    return needsFlip ? 'end' : 'start';
  }

  /**
   * Calculate label rotation in radians, preserving the original visual logic.
   * @private
   */
  _calculateLabelRotation(angleRad) {
    // The original logic was `0 - angleDeg`. This translates to `0 - angleRad`.
    let finalRotation = 0 - angleRad;

    if (this._shouldFlipLabel(angleRad)) {
      // The original flip was `+= 180`. This translates to `+= Math.PI`.
      finalRotation += Math.PI;
    }

    return finalRotation;
  }

  /**
   * Calculate final label position coordinates with margin
   * @private
   */
  _calculateLabelPosition(angleRad, labelRadius) {
    const adjustedRadius = labelRadius + LABEL_MARGIN;

    const finalX = adjustedRadius * Math.cos(angleRad);
    const finalY = adjustedRadius * Math.sin(angleRad);
    return [finalX, finalY, 0];
  }
}
