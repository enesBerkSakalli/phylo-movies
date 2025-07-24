import * as THREE from 'three';
import { useAppStore } from '../../core/store.js';
import { getNodeKey } from '../utils/KeyGenerator.js';
import { interpolatePolarPosition } from '../radialTreeGeometry.js';


/**
 * WebGLNodeRenderer - Three.js renderer for phylogenetic tree nodes
 *
 * Renders leaf and internal nodes as 3D spheres using Three.js.
 * Integrates with RadialTreeLayout coordinates (x, y) and adds z=0 for 3D positioning.
 */
export class WebGLNodeRenderer {

  /* ===============================
   * CONSTRUCTOR & INITIALIZATION
   * =============================== */

  /**
   * Create a WebGLNodeRenderer instance
   * @param {THREE.Scene} scene - Three.js scene
   * @param {Object} colorManager - Color management system
 * @param {Object} colorManager - Color management system
   */
  constructor(scene, colorManager) {
    this.scene = scene;
    this.colorManager = colorManager;

    // Get style configuration
    const { styleConfig } = useAppStore.getState();
    this.sizeConfig = styleConfig;

    // Three.js object tracking
    this.leafMeshes = new Map(); // nodeKey -> THREE.Mesh
    this.internalMeshes = new Map(); // nodeKey -> THREE.Mesh

    // Shared geometries for performance
    this.leafGeometry = new THREE.SphereGeometry(
      this.getLeafRadius(),
      12, 12 // Higher detail for better appearance
    );
    this.internalGeometry = new THREE.SphereGeometry(
      this.getInternalRadius(),
      8, 8 // Lower detail for internal nodes
    );

    // Group for all node objects
    this.nodeGroup = new THREE.Group();
    this.scene.add(this.nodeGroup);
  }

  /* ===============================
   * CONFIGURATION & UTILITIES
   * =============================== */

  /**
   * Get node mesh from either leaf or internal mesh maps
   * @param {string} nodeKey - Node key to lookup
   * @returns {THREE.Mesh|null} The mesh or null if not found
   * @private
   */
  _getNodeMesh(nodeKey) {
    return this.leafMeshes.get(nodeKey) || this.internalMeshes.get(nodeKey) || null;
  }

  /**
   * Update mesh material properties efficiently
   * @param {THREE.Mesh} mesh - Target mesh
   * @param {number} opacity - Opacity value [0,1]
   * @param {string} [color] - Optional color override
   * @private
   */
  _updateMeshMaterial(mesh, opacity, color = null) {
    mesh.material.opacity = opacity;
    mesh.material.transparent = opacity < 1;

    if (color) {
      const currentColor = mesh.material.color;
      if (currentColor.getHex() !== new THREE.Color(color).getHex()) {
        mesh.material.color.set(color);
      }
    }

    mesh.material.needsUpdate = true;
  }


  /**
   * Remove nodes that are no longer needed based on expected keys
   * @param {Set} expectedKeys - Set of keys that should exist
   * @param {Set} [exitKeys] - Optional set of keys that are exiting (should not be removed yet)
   * @returns {Array} Array of removed node keys
   * @private
   */
  _removeObsoleteNodes(expectedKeys, exitKeys = new Set()) {
    const keysToRemove = [];

    // Check leaf meshes
    this.leafMeshes.forEach((_, key) => {
      if (!expectedKeys.has(key) && !exitKeys.has(key)) {
        keysToRemove.push(key);
      }
    });

    // Check internal meshes
    this.internalMeshes.forEach((_, key) => {
      if (!expectedKeys.has(key) && !exitKeys.has(key)) {
        keysToRemove.push(key);
      }
    });

    // Remove the identified keys
    keysToRemove.forEach(key => {
      this.removeNodeByKey(key);
    });

    return keysToRemove;
  }

  /**
   * Get leaf node radius from style config
   * @returns {number} Leaf radius in world units
   */
  getLeafRadius() {
    // Convert from em to world units (approximate)
    const leafRadius = parseFloat(this.sizeConfig.leafRadius);
    return leafRadius * 10;
  }

  /**
   * Get internal node radius from style config
   * @returns {number} Internal node radius in world units
   */
  getInternalRadius() {
    const internalRadius = parseFloat(this.sizeConfig.internalNodeRadius);
    return internalRadius * 10;
  }

  /**
   * Create material for a node
   * @param {Object} node - Node data
   * @returns {THREE.Material} Three.js material
   */
  getMaterial(node) {
    const color = this.colorManager.getNodeColor(node);

    // Always create fresh material to prevent sharing issues
    return new THREE.MeshLambertMaterial({
      color: color,
      transparent: true,
      opacity: 1
    });
  }

  /**
   * Unified method to update or create node mesh with efficient property updates
   * @param {Object} node - Node data
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} opacity - Opacity value
   */
  updateOrCreateNodeAtPosition(node, x, y, opacity) {
    const nodeKey = getNodeKey(node);
    let mesh = this._getNodeMesh(nodeKey);

    if (mesh) {
      // Update existing mesh using efficient direct property updates
      mesh.position.set(x, y, 0);

      // Update material properties using helper
      const targetColor = this.colorManager.getNodeColor(node);
      this._updateMeshMaterial(mesh, opacity, targetColor);

      mesh.userData.node = node;
    } else {
      // Create new node mesh
      mesh = this.createNodeMesh(node);
      mesh.position.set(x, y, 0);
      if (opacity < 1) {
        this._updateMeshMaterial(mesh, opacity);
      }
      this.nodeGroup.add(mesh);
    }
  }

  /**
   * Create a Three.js mesh for a node
   * @param {Object} node - Node data with x, y coordinates from RadialTreeLayout
   * @returns {THREE.Mesh} Three.js mesh
   */
  createNodeMesh(node) {
    const nodeKey = getNodeKey(node);
    const isLeaf = !node.children;

    // Check if mesh already exists to prevent Map corruption
    const existingMesh = this._getNodeMesh(nodeKey);
    if (existingMesh) {
      console.error(`[WebGLNodeRenderer] createNodeMesh called for existing key: ${nodeKey}. This should not happen.`);
      return existingMesh;
    }

    const geometry = isLeaf ? this.leafGeometry : this.internalGeometry;
    const material = this.getMaterial(node);

    const mesh = new THREE.Mesh(geometry, material);

    // Use RadialTreeLayout coordinates (x, y) and set z=0
    mesh.position.set(node.x, node.y, 0);

    // Store node data for interaction
    mesh.userData = {
      nodeKey: nodeKey,
      node: node,
      isLeaf: isLeaf
    };

    // Add to appropriate tracking map
    if (isLeaf) {
      this.leafMeshes.set(nodeKey, mesh);
    } else {
      this.internalMeshes.set(nodeKey, mesh);
    }

    // Removed debug log: Created mesh
    return mesh;
  }

  /**
   * Render all nodes (leaves and internal) instantly
   * @param {Array} allNodesData - Array of node data from RadialTreeLayout
   * @param {Function} clickHandler - Optional click handler for interaction
   */
  renderAllNodesInstant(allNodesData) {
    // Use enter/update/exit pattern like WebGLLinkRenderer

    // Build map of current nodes
    const newNodesMap = new Map(allNodesData.map(node => [getNodeKey(node), node]));

    // Remove obsolete nodes using helper
    this._removeObsoleteNodes(new Set(newNodesMap.keys()));

    // Add new nodes (enter) and update existing ones (update)
    allNodesData.forEach(node => {
      // Use the updateOrCreateNodeAtPosition method for consistency
      this.updateOrCreateNodeAtPosition(node, node.x, node.y, 1);
    });

    // TODO: Implement click handler for 3D nodes using raycasting
    // if (clickHandler) {
    //   this.bindClickHandler(clickHandler);
    // }
  }

  /**
   * Render nodes with interpolation between two states
   * @param {Array} nodesFrom - Source nodes
   * @param {Array} nodesTo - Target nodes
   * @param {number} timeFactor - Interpolation factor [0,1]
   * @param {Function} clickHandler - Optional click handler
   */
  renderAllNodesInterpolated(nodesFrom, nodesTo, timeFactor) {
    // Use target-tree-only approach - consistent with other WebGL renderers
    const fromMap = new Map(nodesFrom.map(node => [getNodeKey(node), node]));
    const toMap = new Map(nodesTo.map(node => [getNodeKey(node), node]));

    // Remove nodes that are not in target tree using helper
    this._removeObsoleteNodes(new Set(toMap.keys()));

    // Process only nodes in target tree
    toMap.forEach((toNode, nodeKey) => {
      const fromNode = fromMap.get(nodeKey);
      let x, y, opacity;

      if (fromNode) {
        // Node exists in both trees - interpolate between positions
        x = THREE.MathUtils.lerp(fromNode.x, toNode.x, timeFactor);
        y = THREE.MathUtils.lerp(fromNode.y, toNode.y, timeFactor);
        opacity = 1;
      } else {
        // Node only in target tree - fade in
        x = toNode.x;
        y = toNode.y;
        opacity = timeFactor;
      }

      this.updateOrCreateNodeAtPosition(toNode, x, y, opacity);
    });
  }

  /**
   * Update node meshes for scrubbing/interpolation (wrapper for unified method)
   * @param {Array} allNodes - All nodes that need processing
   * @param {Map} fromNodesMap - Source nodes mapped by key
   * @param {Map} toNodesMap - Target nodes mapped by key
   * @param {number} timeFactor - Interpolation factor [0,1]
   */
  updateNodeMeshes(allNodes, fromNodesMap, toNodesMap, timeFactor) {
    allNodes.forEach(node => {
      const nodeKey = getNodeKey(node);
      const fromNode = fromNodesMap.get(nodeKey);
      const toNode = toNodesMap.get(nodeKey);

      let x, y, opacity = 1;

      // Handle different interpolation cases
      if (fromNode && toNode) {
        // Interpolate position in polar coordinates
        const { x: px, y: py } = interpolatePolarPosition(fromNode, toNode, timeFactor);
        x = px;
        y = py;
        opacity = 1;
      } else if (!fromNode && toNode) {
        // ENTER: Node is being added. Appear at final position with fade-in
        x = toNode.x;
        y = toNode.y;
        opacity = timeFactor;
      } else if (fromNode && !toNode) {
        // EXIT: Node is being removed. Keep position but fade out
        x = fromNode.x;
        y = fromNode.y;
        opacity = 1 - timeFactor;
      } else {
        console.warn(`[WebGLNodeRenderer] Unexpected case for node: ${nodeKey}`);
        return;
      }

      // Debug log for interpolation
      // console.log(`[WebGLNodeRenderer] Interpolated node ${nodeKey}: x=${x}, y=${y}, opacity=${opacity}`);

      // Use unified update method (handles creation if needed)
      this.updateOrCreateNodeAtPosition(toNode || fromNode, x, y, opacity);
    });
  }


  /**
   * Clear all nodes from the scene
   */
  clear() {
    // Remove all meshes from the group
    while (this.nodeGroup.children.length > 0) {
      this.nodeGroup.remove(this.nodeGroup.children[0]);
    }

    // Clear tracking maps
    this.leafMeshes.clear();
    this.internalMeshes.clear();
  }




  /**
   * Remove a node by its key
   * @param {string} nodeKey - The node key to remove
   * @private
   */
  removeNodeByKey(nodeKey) {
    const mesh = this._getNodeMesh(nodeKey);

    if (!mesh) {
      console.warn(`[WebGLNodeRenderer] Attempted to remove non-existent node: ${nodeKey}`);
      return;
    }

    this.nodeGroup.remove(mesh);
    this.leafMeshes.delete(nodeKey);
    this.internalMeshes.delete(nodeKey);

    // Clean disposal like WebGLLinkRenderer - materials are always disposable now
    if (mesh.material) {
      mesh.material.dispose();
    }
  }

  /**
   * Create and add a node to scene
   * @param {Object} node - Node to create
   * @returns {THREE.Mesh} Created mesh
   * @private
   */
  createAndAddNode(node) {
    const nodeKey = getNodeKey(node);

    // Ensure only one element per key - check for duplicates
    const existingMesh = this._getNodeMesh(nodeKey);
    if (existingMesh) {
      console.warn(`[WebGLNodeRenderer] Duplicate creation attempt for node: ${nodeKey}. Returning existing mesh.`);
      return existingMesh;
    }

    const mesh = this.createNodeMesh(node);
    this.nodeGroup.add(mesh);
    return mesh;
  }

  /**
   * Validate current state against animation expectations and cleanup orphaned meshes
   * @param {Array} currentState - Current tree nodes
   * @param {Array} enter - Nodes entering
   * @param {Array} update - Nodes updating
   * @param {Array} exit - Nodes exiting
   * @private
   */
  _validateCurrentState(currentState, enter, update, exit) {
    // Create sets of expected node keys
    const currentKeys = new Set(currentState.map(node => getNodeKey(node)));
    const enterKeys = new Set(enter.map(node => getNodeKey(node)));
    const updateKeys = new Set(update.map(node => getNodeKey(node)));
    const exitKeys = new Set(exit.map(node => getNodeKey(node)));

    // All expected keys after this animation completes
    const expectedFinalKeys = new Set([...currentKeys, ...enterKeys, ...updateKeys]);
    expectedFinalKeys.forEach(key => exitKeys.has(key) && expectedFinalKeys.delete(key));

    // Clean up orphaned meshes using helper
    const removedKeys = this._removeObsoleteNodes(expectedFinalKeys, exitKeys);
    if (removedKeys.length > 0) {
      console.warn(`[WebGLNodeRenderer] Cleaned up ${removedKeys.length} orphaned meshes:`, removedKeys);
    }

    // Validate that meshes exist for all current + update nodes (they should have been created previously)
    const shouldExistKeys = new Set([...currentKeys, ...updateKeys]);
    const missingMeshes = [];
    shouldExistKeys.forEach(nodeKey => {
      if (!this._getNodeMesh(nodeKey) && !enterKeys.has(nodeKey)) {
        missingMeshes.push(nodeKey);
      }
    });

    if (missingMeshes.length > 0) {
      // This can happen during interpolation transitions - not necessarily an error
      console.warn(`[WebGLNodeRenderer] Missing meshes for existing/updating nodes:`, missingMeshes);
    }
  }





  /**
   * Handle entering nodes - create new meshes with fade-in animation
   * @param {Array} enteringNodes - Nodes that need to be created
   * @param {Map} toNodesMap - Target tree nodes map
   * @param {number} timeFactor - Animation progress [0,1]
   */
  handleEnteringNodes(enteringNodes, toNodesMap, timeFactor) {
    enteringNodes.forEach(node => {
      const nodeKey = getNodeKey(node);
      let mesh = this._getNodeMesh(nodeKey);

      if (!mesh) {
        // Create new mesh for entering node
        mesh = this.createAndAddNode(node);
        if (!mesh) {
          console.error(`[WebGLNodeRenderer] Failed to create entering node: ${nodeKey}`);
          return;
        }
      }

      // ENTER: fade in from transparent to opaque at target position
      const opacity = timeFactor; // Fade in: 0 → 1
      this.updateOrCreateNodeAtPosition(node, node.x, node.y, opacity);
    });
  }

  /**
   * Handle updating nodes - interpolate existing meshes between positions
   * @param {Array} updatingNodes - Nodes that need position updates
   * @param {Map} fromNodesMap - Source tree nodes map
   * @param {Map} toNodesMap - Target tree nodes map
   * @param {number} timeFactor - Animation progress [0,1]
   */
  handleUpdatingNodes(updatingNodes, fromNodesMap, toNodesMap, timeFactor) {
    updatingNodes.forEach(node => {
      const nodeKey = getNodeKey(node);
      let mesh = this._getNodeMesh(nodeKey);

      if (!mesh) {
        // Should not happen if diffing is correct, but handle gracefully
        console.warn(`[WebGLNodeRenderer] Missing mesh for updating node: ${nodeKey}, creating`);
        mesh = this.createAndAddNode(node);
        if (!mesh) return;
      }

      const fromNode = fromNodesMap.get(nodeKey);
      const toNode = toNodesMap.get(nodeKey);

      if (!fromNode || !toNode) {
        console.error(`[WebGLNodeRenderer] Missing from/to data for updating node: ${nodeKey}`);
        return;
      }

      // UPDATE: interpolate between positions using polar coordinates
      const { x, y } = interpolatePolarPosition(fromNode, toNode, timeFactor);
      const opacity = 1; // Always fully opaque during updates

      this.updateOrCreateNodeAtPosition(toNode, x, y, opacity);
    });
  }

  /**
   * Handle exiting nodes - fade out and remove meshes
   * @param {Array} exitingNodes - Nodes that need to be removed
   * @param {Map} fromNodesMap - Source tree nodes map
   * @param {number} timeFactor - Animation progress [0,1]
   */
  handleExitingNodes(exitingNodes, fromNodesMap, timeFactor) {
    exitingNodes.forEach(node => {
      const nodeKey = getNodeKey(node);
      let mesh = this._getNodeMesh(nodeKey);

      if (!mesh) {
        // Node already removed or never existed
        console.warn(`[WebGLNodeRenderer] No mesh found for exiting node: ${nodeKey}`);
        return;
      }

      // EXIT: fade out from opaque to transparent at current position
      const opacity = 1 - timeFactor; // Fade out: 1 → 0

      if (opacity <= 0) {
        // Fully faded out - remove the mesh
        this.removeNodeByKey(nodeKey);
      } else {
        // Still fading - update with reduced opacity at current position
        this.updateOrCreateNodeAtPosition(node, node.x, node.y, opacity);
      }
    });
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.clear();
    this.scene.remove(this.nodeGroup);
    this.leafGeometry.dispose();
    this.internalGeometry.dispose();
    // No material cache to dispose - materials are disposed individually
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.colorManager = null;
    this.nodeGroup = null;
    this.leafMeshes = null;
    this.internalMeshes = null;
  }
}
