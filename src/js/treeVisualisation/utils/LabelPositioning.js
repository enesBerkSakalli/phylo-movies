/**
 * LabelPositioning - Centralized module for calculating label positions and rotations
 * Used by both SVG and WebGL label renderers to ensure consistency
 */

/**
 * Calculate if a label needs to be flipped based on its angle
 * Labels on the left side of the tree (90° < angle < 270°) need to be flipped
 * @param {number} angleRadians - Angle in radians
 * @returns {boolean} True if label should be flipped
 */
export function shouldFlipLabel(angleRadians) {
  const angleDegrees = (angleRadians * 180) / Math.PI;
  return angleDegrees < 270 && angleDegrees > 90;
}

/**
 * Calculate the text anchor alignment based on angle
 * @param {number} angleRadians - Angle in radians
 * @returns {string} "start" or "end"
 */
export function calculateTextAnchor(angleRadians) {
  return shouldFlipLabel(angleRadians) ? "end" : "start";
}


/**
 * Calculate the rotation angle for a label
 * @param {number} angleRadians - Angle in radians
 * @returns {number} Rotation angle in radians
 */
export function calculateLabelRotation(angleRadians) {
  const needsFlip = shouldFlipLabel(angleRadians);
  return angleRadians + (needsFlip ? Math.PI : 0);
}

/**
 * Get label configuration for a node with text positioned exactly at extension tip
 * Text end is positioned exactly at the extension tip, with minimal spacing
 * @param {Object} node - Tree node with angle and radius properties
 * @param {number} extensionTipRadius - The exact radius where extension line ends
 * @param {string} text - The actual label text for dynamic width calculation
 * @param {number} fontSizePx - Font size in pixels for text width calculation
 * @returns {Object} Complete label configuration with precise positioning
 */
export function getLabelConfiguration(node, extensionTipRadius, text = '', fontSizePx = 24) {
  // Calculate text width based on character count and font size
  const charWidth = fontSizePx * 0.4; // Tighter estimate for character width
  const textWidth = text.length * charWidth;

  // Calculate angular spacing factor based on angle clustering
  const angleDegrees = (node.angle * 180) / Math.PI;

  // Calculate angular density factor based on how close neighboring labels are
  // This prevents overlap when labels are close together
  const angularDensity = calculateAngularDensity(node.angle, text.length);

  // Position labels with consistent padding from extension tip
  const needsFlip = shouldFlipLabel(node.angle);

  // Apply consistent small padding to prevent overlap with extension lines
  const padding = 8; // Small consistent padding for all labels
  const finalRadius = extensionTipRadius + padding;

  const position = {
    x: finalRadius * Math.cos(node.angle),
    y: finalRadius * Math.sin(node.angle)
  };

  return {
    position,
    rotation: calculateLabelRotation(node.angle),
    textAnchor: calculateTextAnchor(node.angle),
    needsFlip,
    angleDegrees: (node.angle * 180) / Math.PI,
    extensionTipRadius,
    textWidth,
    textLength: text.length,
    angularDensity
  };
}

/**
 * Calculate angular density factor to prevent label overlap
 * This function estimates how crowded labels are based on angle and text length
 * @param {number} angle - Angle in radians
 * @param {number} textLength - Length of the label text
 * @returns {number} Density factor (1.0 = normal, >1.0 = more spacing needed)
 */
function calculateAngularDensity(angle, textLength) {
  // Skip calculation for short labels
  if (textLength <= 3) return 1.0;

  // Convert to degrees for easier calculation
  const angleDeg = (angle * 180) / Math.PI;

  // Normalize angle to 0-360 range
  const normalizedAngle = ((angleDeg % 360) + 360) % 360;

  // Calculate density based on angle and text length
  // Longer texts need more spacing in crowded areas
  const baseDensity = 1.0;
  const textMultiplier = Math.min(1.5, 1.0 + (textLength * 0.05));

  // Add extra spacing in crowded quadrants
  const quadrantAdjustment = (normalizedAngle > 80 && normalizedAngle < 100) ||
                           (normalizedAngle > 260 && normalizedAngle < 280) ? 1.3 : 1.0;

  return baseDensity * textMultiplier * quadrantAdjustment;
}

/**
 * Interpolate between two label configurations
 * @param {Object} fromNode - Source node
 * @param {Object} toNode - Target node
 * @param {number} fromExtensionTip - Source extension tip radius
 * @param {number} toExtensionTip - Target extension tip radius
 * @param {number} t - Interpolation factor [0,1]
 * @param {string} text - The actual label text
 * @param {number} fontSizePx - Font size in pixels
 * @returns {Object} Interpolated label configuration
 */
export function interpolateLabelConfiguration(fromNode, toNode, fromExtensionTip, toExtensionTip, t, text = '', fontSizePx = 24) {
  // Handle angle wrapping for shortest path
  const angleDiff = toNode.angle - fromNode.angle;
  const adjustedAngleDiff = angleDiff > Math.PI ? angleDiff - 2 * Math.PI :
                           angleDiff < -Math.PI ? angleDiff + 2 * Math.PI : angleDiff;

  const interpolatedAngle = fromNode.angle + adjustedAngleDiff * t;
  const interpolatedExtensionTip = fromExtensionTip + (toExtensionTip - fromExtensionTip) * t;

  const interpolatedNode = {
    angle: interpolatedAngle,
    radius: 0  // Not used since we pass the final radius directly
  };

  return getLabelConfiguration(interpolatedNode, interpolatedExtensionTip, text, fontSizePx);
}

/**
 * Calculate dynamic label offset based on text length and font size
 * This prevents label-extension overlap by accounting for actual text dimensions
 * @param {string} text - The label text
 * @param {number} fontSizePx - Font size in pixels
 * @param {number} baseOffset - Base offset (current LABEL_OFFSETS.DEFAULT)
 * @param {number} extensionLength - Length of extension line
 * @returns {number} Dynamic offset that prevents overlap
 */
export function calculateDynamicLabelOffset(text, fontSizePx, baseOffset, extensionLength = 0) {
  if (!text || typeof text !== 'string') return baseOffset;

  // Calculate text width based on character count and font size (minimal multiplier)
  // Average character width is roughly 0.25 * fontSize for minimal spacing
  const avgCharWidth = fontSizePx * 0.2; // Minimal character width
  const textWidth = text.length * avgCharWidth;

  // Add minimal padding and account for extension
  const minPadding = 2; // Minimal 2px padding
  const extensionBuffer = extensionLength > 0 ? extensionLength + 3 : 0; // Minimal +3 buffer

  // Calculate dynamic offset based on text length (reduced scaling)
  const dynamicOffset = Math.max(
    baseOffset + (textWidth * 0.5) + minPadding, // Reduced text width multiplier
    baseOffset + (extensionBuffer * 0.5) // Reduced extension buffer multiplier
  );

  // Cap the offset to prevent excessive spacing (reduced cap)
  const maxOffset = baseOffset * 1.4; // Reduced cap
  return Math.min(dynamicOffset, maxOffset);
}

/**
 * Get label configuration with dynamic offset based on text length
 * @param {Object} node - Tree node with angle and radius properties
 * @param {string} text - The label text
 * @param {number} baseLabelRadius - Base radius without text consideration
 * @param {number} fontSizePx - Font size in pixels
 * @param {number} extensionRadius - Radius where extension ends
 * @returns {Object} Complete label configuration with dynamic positioning
 */
export function getDynamicLabelConfiguration(node, text, baseLabelRadius, fontSizePx, extensionRadius = 0) {
  const extensionLength = Math.max(0, baseLabelRadius - extensionRadius);
  const dynamicOffset = calculateDynamicLabelOffset(text, fontSizePx, 12, extensionLength);

  // Calculate final position with dynamic offset
  const finalLabelRadius = extensionRadius + dynamicOffset;

  return {
    ...getLabelConfiguration(node, finalLabelRadius),
    extensionRadius,
    dynamicOffset,
    textLength: text.length,
    finalLabelRadius
  };
}

/**
 * Default label offset constants
 * These are now base values - actual offsets are calculated dynamically
 */
export const LABEL_OFFSETS = {
  DEFAULT: 20,        // Reduced base offset
  WITH_EXTENSIONS: 40, // Reduced extension offset
  EXTENSION: 5        // Minimal extension line length for direct placement
};
