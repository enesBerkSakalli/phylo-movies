import * as THREE from "three";
import { getExtensionKey } from "../utils/KeyGenerator.js";
import { WebGLMaterialFactory } from "./materials/WebGLMaterialFactory.js";
import { createPolarInterpolator } from "../radialTreeGeometry.js";

/**
 * WebGL Extension Renderer - Specialized renderer for tree link extensions using Three.js
 * Creates dashed lines from tree leaf nodes to their extended positions for labels
 * Now supports uniform scaling and branch transformation awareness
 */
export class WebGLExtensionRenderer {

  /**
   * Create a WebGL Extension Renderer instance
   * @param {THREE.Scene} scene - The Three.js scene
   * @param {Object} colorManager - Object with methods for determining extension colors
   * @param {Object} controller - WebGL controller for accessing uniform scaling and transformation state
   */
  constructor(scene, colorManager, controller = null) {
    this.scene = scene;
    this.colorManager = colorManager;
    this.controller = controller; // Added controller reference for uniform scaling

    // Store extension lines by their keys
    this.extensionLines = new Map();

    // Material factory for centralized material management (like other renderers)
    this.materialFactory = new WebGLMaterialFactory();
  }

  /* --------------------------- Helper Methods --------------------------- */

  /**
   * Get transformation-aware extension radius that accounts for uniform scaling and branch transformations
   * @param {number} baseExtensionRadius - Base extension radius
   * @returns {number} Adjusted extension radius
   * @private
   */
  _getTransformationAwareRadius(baseExtensionRadius) {
    if (!this.controller) {
      return baseExtensionRadius; // Fallback if no controller available
    }

    // Use the unified radius calculation system from the main controller
    if (this.controller._getConsistentRadii) {
      const { extensionRadius } = this.controller._getConsistentRadii();
      return extensionRadius;
    }

    // Fallback to legacy method
    return this.controller._calculateUniformAwareRadius ?
      this.controller._calculateUniformAwareRadius(baseExtensionRadius) :
      baseExtensionRadius;
  }

  /**
   * Get extension line from extension lines map
   * @param {string} extensionKey - Extension key to lookup
   * @returns {THREE.Line|null} The extension line or null if not found
   * @private
   */
  _getExtensionLine(extensionKey) {
    return this.extensionLines.get(extensionKey) || null;
  }

  /**
   * Calculate start and end positions for extension line
   * @param {Object} leaf - Leaf node data
   * @param {number} extensionRadius - Extension radius
   * @returns {Object} Object with start and end positions
   * @private
   */
  _calculateExtensionPositions(leaf, extensionRadius) {
    return {
      start: {
        x: leaf.radius * Math.cos(leaf.angle),
        y: leaf.radius * Math.sin(leaf.angle),
        z: 0
      },
      end: {
        x: extensionRadius * Math.cos(leaf.angle),
        y: extensionRadius * Math.sin(leaf.angle),
        z: 0
      }
    };
  }

  /**
   * Update extension line positions efficiently
   * @param {THREE.Line} line - Extension line to update
   * @param {Object} leaf - Leaf node data
   * @param {number} extensionRadius - Extension radius
   * @private
   */
  _updateExtensionLinePositions(line, leaf, extensionRadius) {
    const positions = this._calculateExtensionPositions(leaf, extensionRadius);

    // Update geometry points
    const positionArray = line.geometry.attributes.position.array;
    positionArray[0] = positions.start.x;
    positionArray[1] = positions.start.y;
    positionArray[2] = positions.start.z;
    positionArray[3] = positions.end.x;
    positionArray[4] = positions.end.y;
    positionArray[5] = positions.end.z;

    // Mark geometry as needing update
    line.geometry.attributes.position.needsUpdate = true;

    // Recompute line distances for dashed effect
    line.computeLineDistances();
  }

  /**
   * Remove extensions that are no longer needed based on expected keys
   * @param {Set} expectedKeys - Set of keys that should exist
   * @param {Set} [exitKeys] - Optional set of keys that are exiting (should not be removed yet)
   * @returns {Array} Array of removed extension keys
   * @private
   */
  _removeObsoleteExtensions(expectedKeys, exitKeys = new Set()) {
    const keysToRemove = [];

    // Find orphaned extensions
    this.extensionLines.forEach((_, key) => {
      if (!expectedKeys.has(key) && !exitKeys.has(key)) {
        keysToRemove.push(key);
      }
    });

    // Remove the identified keys
    keysToRemove.forEach(key => {
      const line = this._getExtensionLine(key);
      if (line) {
        if (line.geometry) line.geometry.dispose();
        if (line.material) line.material.dispose();
        this.scene.remove(line);
        this.extensionLines.delete(key);
      }
    });

    return keysToRemove;
  }

  /**
   * Get material for extension line using factory pattern
   * @param {Object} leaf - The leaf node data
   * @returns {THREE.LineDashedMaterial} Material for extension line
   * @private
   */
  _getExtensionMaterial(leaf) {
    // Create fresh dashed material for each extension (following consistent pattern)
    const color = this.colorManager?.getNodeColor?.(leaf) || '#999999';
    return new THREE.LineDashedMaterial({
      color: parseInt(color.replace('#', '0x')),
      linewidth: 1,
      scale: 1,
      dashSize: 3,
      gapSize: 3
    });
  }

  /**
   * Creates a dashed line extension from leaf node to extended position
   * @param {Object} leaf - The leaf node data
   * @param {number} extensionRadius - Radius for extension end position
   * @returns {THREE.Line} The extension line
   * @private
   */
  _createExtensionLine(leaf, extensionRadius) {
    const extensionKey = getExtensionKey(leaf);

    // Check if extension already exists to prevent duplicate creation
    const existingLine = this._getExtensionLine(extensionKey);
    if (existingLine) {
      console.error(`[WebGLExtensionRenderer] createExtensionLine called for existing key: ${extensionKey}. This should not happen.`);
      return existingLine;
    }

    // Calculate positions using helper
    const positions = this._calculateExtensionPositions(leaf, extensionRadius);

    // Create line geometry
    const points = [
      new THREE.Vector3(positions.start.x, positions.start.y, positions.start.z),
      new THREE.Vector3(positions.end.x, positions.end.y, positions.end.z)
    ];

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    // Create line with fresh material (following factory pattern)
    const material = this._getExtensionMaterial(leaf);
    const line = new THREE.Line(geometry, material);

    // Compute line distances for dashed effect
    line.computeLineDistances();

    return line;
  }

  /**
   * Renders extensions for leaf nodes in WebGL with transformation and uniform scaling awareness
   * @param {Array} leafData - Array of leaf data from tree
   * @param {number} extensionRadius - Base radius for extension end positions
   * @returns {Promise} Promise that resolves when extensions are created
   */
  async renderExtensions(leafData, extensionRadius = 500) {
    // Use the unified radius calculation system from the main controller
    const adjustedExtensionRadius = extensionRadius;

    // Use enter/update/exit pattern like WebGLLinkRenderer
    // Build map of current extensions
    const newExtensionsMap = new Map(leafData.map(leaf => [getExtensionKey(leaf), leaf]));

    // Remove obsolete extensions using helper
    this._removeObsoleteExtensions(new Set(newExtensionsMap.keys()));

    // Add new extensions (enter) and update existing ones (update)
    for (const leaf of leafData) {
      const key = getExtensionKey(leaf);
      const existingLine = this._getExtensionLine(key);

      if (!existingLine) {
        // Enter: Create new extension line with adjusted radius
        const extensionLine = this._createExtensionLine(leaf, adjustedExtensionRadius);
        this.extensionLines.set(key, extensionLine);
        this.scene.add(extensionLine);
      } else {
        // Update: Update existing extension positions with adjusted radius
        this._updateExtensionLinePositions(existingLine, leaf, adjustedExtensionRadius);
      }
    }

    return Promise.resolve();
  }



  /**
   * Renders extensions with interpolation between two tree states
   * Now supports transformation-aware radius calculation during animation
   * @param {Array} fromLeafData - Array of leaf nodes from source tree
   * @param {Array} toLeafData - Array of leaf nodes from target tree
   * @param {number} fromExtensionRadius - Base extension radius for source tree
   * @param {number} toExtensionRadius - Base extension radius for target tree
   * @param {number} timeFactor - Interpolation factor [0,1]
   */
  renderExtensionsInterpolated(fromLeafData, toLeafData, fromExtensionRadius, toExtensionRadius, timeFactor) {
    // Apply transformation-aware radius calculation to both radii
    const adjustedFromRadius = this._getTransformationAwareRadius(fromExtensionRadius);
    const adjustedToRadius = this._getTransformationAwareRadius(toExtensionRadius);

    // Use target-tree-only approach - consistent with other WebGL renderers
    const fromMap = new Map(fromLeafData.map(d => [getExtensionKey(d), d]));
    const toMap = new Map(toLeafData.map(d => [getExtensionKey(d), d]));

    // Remove extensions that are not in target tree using helper
    this._removeObsoleteExtensions(new Set(toMap.keys()));

    // Interpolate extension radius using adjusted values
    const interpolatedExtensionRadius = adjustedFromRadius + (adjustedToRadius - adjustedFromRadius) * timeFactor;

    // Process only extensions in target tree
    toMap.forEach((toLeaf, extensionKey) => {
      const fromLeaf = fromMap.get(extensionKey);
      let finalLeaf, radius;

      if (fromLeaf) {
        // Extension exists in both trees - interpolate between positions
        finalLeaf = this.interpolateLeaf(toLeaf, fromLeaf, timeFactor);
        radius = interpolatedExtensionRadius;
      } else {
        // Extension only in target tree - fade in with adjusted radius
        finalLeaf = toLeaf;
        radius = adjustedToRadius;
      }

      if (finalLeaf) {
        this.updateOrCreateExtensionLine(finalLeaf, radius);
      }
    });
  }

  /**
   * Helper to interpolate leaf properties
   * @private
   */
  interpolateLeaf(toLeaf, fromLeaf, timeFactor) {
    // Use shared polar interpolation logic for consistency
    // Import helpers from radialTreeGeometry.js
    // (Assume import at top: import { createPolarInterpolator } from "../radialTreeGeometry.js";)
    const fromAngle = fromLeaf.angle;
    const fromRadius = fromLeaf.radius;
    const toAngle = toLeaf.angle;
    const toRadius = toLeaf.radius;

    // Use the shared polar interpolator
    const polarInterpolator = createPolarInterpolator(fromAngle, fromRadius, toAngle, toRadius);
    const { angle, radius } = polarInterpolator(timeFactor);

    return {
      ...toLeaf,
      angle,
      radius
    };
  }

  /**
   * Updates existing extension line or creates new one if it doesn't exist
   * @private
   */
  updateOrCreateExtensionLine(leaf, extensionRadius) {
    const key = getExtensionKey(leaf);
    let extensionLine = this._getExtensionLine(key);

    if (extensionLine) {
      // Update existing extension line positions using helper
      this._updateExtensionLinePositions(extensionLine, leaf, extensionRadius);
      // No opacity updates needed for extensions
    } else {
      // Create new extension line
      extensionLine = this._createExtensionLine(leaf, extensionRadius);
      this.extensionLines.set(key, extensionLine);
      this.scene.add(extensionLine);
    }
  }


  /**
   * Clears all extensions from the scene
   */
  clear() {
    for (const [, extensionLine] of this.extensionLines) {
      // Remove from scene
      this.scene.remove(extensionLine);

      // Dispose of geometry and material
      if (extensionLine.geometry) {
        extensionLine.geometry.dispose();
      }
      if (extensionLine.material) {
        extensionLine.material.dispose();
      }
    }

    // Clear the map
    this.extensionLines.clear();
  }


  /**
   * Validate current state against animation expectations and cleanup orphaned meshes
   * @param {Array} currentState - Current tree leaves
   * @param {Array} enter - Leaves entering
   * @param {Array} update - Leaves updating
   * @param {Array} exit - Leaves exiting
   * @private
   */
  _validateCurrentState(currentState, enter, update, exit) {
    // Create sets of expected extension keys
    const currentKeys = new Set(currentState.map(leaf => getExtensionKey(leaf)));
    const enterKeys = new Set(enter.map(leaf => getExtensionKey(leaf)));
    const updateKeys = new Set(update.map(leaf => getExtensionKey(leaf)));
    const exitKeys = new Set(exit.map(leaf => getExtensionKey(leaf)));

    // All expected keys after this animation completes
    const expectedFinalKeys = new Set([...currentKeys, ...enterKeys]);
    expectedFinalKeys.forEach(key => exitKeys.has(key) && expectedFinalKeys.delete(key));

    // Clean up orphaned extensions using helper
    const removedKeys = this._removeObsoleteExtensions(expectedFinalKeys, exitKeys);
    if (removedKeys.length > 0) {
      console.warn(`[WebGLExtensionRenderer] Cleaned up ${removedKeys.length} orphaned extensions:`, removedKeys);
    }

    // Validate that extensions exist for all current + update leaves (they should have been created previously)
    const shouldExistKeys = new Set([...currentKeys, ...updateKeys]);
    const missingExtensions = [];
    shouldExistKeys.forEach(extensionKey => {
      if (!this._getExtensionLine(extensionKey) && !enterKeys.has(extensionKey)) {
        missingExtensions.push(extensionKey);
      }
    });

    if (missingExtensions.length > 0) {
      console.error(`[WebGLExtensionRenderer] Missing extensions for existing/updating leaves:`, missingExtensions);
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.clear();
    this.materialFactory.destroy();
    this.materialFactory = null;
    this.scene = null;
    this.colorManager = null;
  }
}
