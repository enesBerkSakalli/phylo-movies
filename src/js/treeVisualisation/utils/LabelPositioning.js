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
 * Get label configuration for a node
 * Provides all necessary positioning data for both SVG and WebGL renderers
 * @param {Object} node - Tree node with angle and radius properties
 * @param {number} labelRadius - The final radius where the label should be positioned
 *                              (can be either node.radius + offset, or a fixed radius)
 * @returns {Object} Complete label configuration
 */
export function getLabelConfiguration(node, labelRadius) {
  // If labelRadius is already the final position, use it directly
  // This supports both: node.radius + offset (SVG) and fixed radius (WebGL)
  const position = {
    x: labelRadius * Math.cos(node.angle),
    y: labelRadius * Math.sin(node.angle)
  };
  const needsFlip = shouldFlipLabel(node.angle);
  
  return {
    position,
    rotation: calculateLabelRotation(node.angle),
    textAnchor: calculateTextAnchor(node.angle),
    needsFlip,
    angleDegrees: (node.angle * 180) / Math.PI
  };
}

/**
 * Interpolate between two label configurations
 * @param {Object} fromNode - Source node
 * @param {Object} toNode - Target node
 * @param {number} fromLabelRadius - Source label radius (final position)
 * @param {number} toLabelRadius - Target label radius (final position)
 * @param {number} t - Interpolation factor [0,1]
 * @returns {Object} Interpolated label configuration
 */
export function interpolateLabelConfiguration(fromNode, toNode, fromLabelRadius, toLabelRadius, t) {
  // Handle angle wrapping for shortest path
  const angleDiff = toNode.angle - fromNode.angle;
  const adjustedAngleDiff = angleDiff > Math.PI ? angleDiff - 2 * Math.PI : 
                           angleDiff < -Math.PI ? angleDiff + 2 * Math.PI : angleDiff;
  
  const interpolatedAngle = fromNode.angle + adjustedAngleDiff * t;
  // For WebGL with fixed radius, fromLabelRadius === toLabelRadius
  // For SVG, they might differ slightly based on tree size
  const interpolatedLabelRadius = fromLabelRadius + (toLabelRadius - fromLabelRadius) * t;
  
  const interpolatedNode = {
    angle: interpolatedAngle,
    radius: 0  // Not used since we pass the final radius directly
  };
  
  return getLabelConfiguration(interpolatedNode, interpolatedLabelRadius);
}

/**
 * Default label offset constants
 */
export const LABEL_OFFSETS = {
  DEFAULT: 30,
  WITH_EXTENSIONS: 60,  // Increased from 40 to 60 for better separation
  EXTENSION: 20
};