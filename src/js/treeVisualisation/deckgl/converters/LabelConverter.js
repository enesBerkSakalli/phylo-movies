import { getLabelKey } from '../../utils/KeyGenerator.js';

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
    const angleDeg = (leaf.angle * 180) / Math.PI;
    const distance = Math.sqrt(leaf.x * leaf.x + leaf.y * leaf.y);

    // Determine label orientation and positioning
    const needsFlip = this._shouldFlipLabel(angleDeg);
    const textAnchor = this._calculateTextAnchor(needsFlip);
    const rotation = this._calculateLabelRotation(angleDeg);
    const position = this._calculateLabelPosition(leaf, labelRadius);

    return {
      id: getLabelKey(leaf),
      position: position,
      text: leaf.data.name || '',
      data: leaf.data,
      angle: leaf.angle,
      distance: distance,
      textAnchor: textAnchor,
      rotation: rotation,
      leaf: leaf // Store leaf reference for coloring
    };
  }

  /**
   * Determine if label should be flipped based on angle
   * @private
   */
  _shouldFlipLabel(angleDeg) {
    // Correctly determine orientation based on SVG/WebGL renderer logic (90° to 270°)
    return angleDeg > 90 && angleDeg < 270;
  }

  /**
   * Calculate text anchor based on label orientation
   * @private
   */
  _calculateTextAnchor(needsFlip) {
    // Set text anchor based on whether the label is flipped
    return needsFlip ? 'start' : 'end';
  }

  /**
   * Calculate label rotation in degrees
   * @private
   */
  _calculateLabelRotation(angleDeg) {
    let finalRotation = 0;

    if (0 < angleDeg) {
      finalRotation = 0 - angleDeg; // Convert to 0-360 range
      if (angleDeg > 90 && angleDeg < 270) {
        finalRotation += 180; // Flip for left side labels
      }
    }

    return finalRotation;
  }

  /**
   * Calculate final label position coordinates
   * @private
   */
  _calculateLabelPosition(leaf, labelRadius) {
    const finalX = labelRadius * Math.cos(leaf.angle);
    const finalY = labelRadius * Math.sin(leaf.angle);
    return [finalX, finalY, 0];
  }
}
