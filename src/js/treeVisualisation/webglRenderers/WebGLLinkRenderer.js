// renderers/WebGLLinkRenderer.js
import * as THREE from 'three';
import { useAppStore } from '../../core/store.js';
import {
  calculateInterpolatedBranchCoordinates,
  calculateBranchCoordinates
} from '../radialTreeGeometry.js';
import { getLinkKey } from '../utils/KeyGenerator.js';
import { TubeGeometryFactory } from './geometry/TubeGeometryFactory.js';
import { WebGLMaterialFactory } from './materials/WebGLMaterialFactory.js';

/* ---------- Tube length and change classification helpers ---------- */

/**
 * Calculate the total length of a tube based on its coordinates
 * Uses Pythagorean theorem for straight segments and arc length for curves
 */
function calculateTubeLength(coordinates) {
  if (!coordinates || !coordinates.movePoint) return 0;

  let totalLength = 0;
  const { movePoint, arcEndPoint, lineEndPoint, arcProperties } = coordinates;

  // If there's an arc, calculate arc length
  if (arcProperties !== null && arcProperties && arcProperties.radius && arcProperties.angleDiff) {
    const arcLength = Math.abs(arcProperties.angleDiff) * arcProperties.radius;
    totalLength += arcLength;

    // Add line segment from arc end to final point if exists
    if (lineEndPoint && arcEndPoint) {
      const dx = lineEndPoint.x - arcEndPoint.x;
      const dy = lineEndPoint.y - arcEndPoint.y;
      const dz = (lineEndPoint.z || 0) - (arcEndPoint.z || 0);
      totalLength += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
  }
  // If no arc (straight line), calculate direct distance
  else if (lineEndPoint) {
    const dx = lineEndPoint.x - movePoint.x;
    const dy = lineEndPoint.y - movePoint.y;
    const dz = (lineEndPoint.z || 0) - (movePoint.z || 0);
    totalLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  return totalLength;
}

/**
 * Calculate tube length from link data by first generating coordinates
 */
function calculateLinkLength(link) {
  const coordinates = calculateBranchCoordinates(link);
  return calculateTubeLength(coordinates);
}

/**
 * Classify edge change based on radius, length, and angle comparison
 * - RETOPO: length changes (branch weight changes - geometry rebuild needed)
 * - REORDER: radius and/or angle changes with same length (repositioning/rotation)
 * - NONE: no changes detected (skip animation)
 */
function classifyEdgeChange(fromLink, toLink, radiusTolerance = 0.01, lengthTolerance = 0.01, angleTolerance = 0.001) {
  // Check for radius changes first (tree growth/shrinkage vs repositioning)
  const fromSourceRadius = fromLink.source.radius;
  const fromTargetRadius = fromLink.target.radius;
  const toSourceRadius = toLink.source.radius;
  const toTargetRadius = toLink.target.radius;

  const sourceRadiusChange = Math.abs(toSourceRadius - fromSourceRadius);
  const targetRadiusChange = Math.abs(toTargetRadius - fromTargetRadius);
  const maxFromRadius = Math.max(fromSourceRadius, fromTargetRadius);

  const relativeRadiusChange = maxFromRadius > 0 ?
    Math.max(sourceRadiusChange, targetRadiusChange) / maxFromRadius : 0;

  // Check for length changes (branch weight changes)
  const fromLength = calculateLinkLength(fromLink);
  const toLength = calculateLinkLength(toLink);

  const lengthDiff = Math.abs(fromLength - toLength);
  const relativeLengthChange = fromLength > 0 ? lengthDiff / fromLength : 0;

  // Significant radius or length changes = topology/weight changes
  if (relativeRadiusChange > radiusTolerance || relativeLengthChange > lengthTolerance) {
    return 'RETOPO'; // Major radius/length change = topology/weight change
  }

  // Check for angle changes
  const sourceAngleChange = Math.abs(toLink.source.angle - fromLink.source.angle);
  const targetAngleChange = Math.abs(toLink.target.angle - fromLink.target.angle);
  const maxAngleChange = Math.max(sourceAngleChange, targetAngleChange);

  // Minor radius/angle changes = reorder phase (repositioning/rotation)
  if (maxAngleChange > angleTolerance) {
    return 'REORDER'; // Rotation with minor repositioning
  }

  return 'NONE'; // No significant changes detected
}

/**
 * WebGLLinkRenderer
 * Renders phylogenetic links (branches) as 3D tubes in Three.js.
 * Handles instant rendering and scrub interpolation.
 * Incremental fix: freeze tube topology (segment counts) during updates.
 */
export class WebGLLinkRenderer {
  constructor(scene, colorManager, opts = {}) {
    this.scene = scene;
    this.colorManager = colorManager;

    const { styleConfig, strokeWidth = 2 } = useAppStore.getState();
    this.styleConfig = styleConfig || {};
    this._strokeWidth = strokeWidth;

    this.linkMeshes = new Map(); // key -> THREE.Mesh
    this.linkGroup = new THREE.Group();
    this.scene.add(this.linkGroup);

    this.geometryFactory = new TubeGeometryFactory({
      useCylinderForPureLines: true, // Enable cylinder optimization for straight lines
      ...opts.geometryOptions
    });
    this.materialFactory = new WebGLMaterialFactory(this.colorManager);

    this._highlightEdges = [];
    this.useMorphing = opts.useMorphing !== false;
    this.cpuFallback = opts.cpuFallback === true;
  }

  /* --------------------------- Public API --------------------------- */

  renderLinksInstant(linksData, highlightEdges = []) {
    this._highlightEdges = highlightEdges;

    const currentKeys = new Set();
    linksData.forEach(link => {
      const key = getLinkKey(link);
      currentKeys.add(key);

      let mesh = this.linkMeshes.get(key);
      if (!mesh) {
        mesh = this._createLinkMesh(link);
        this.linkGroup.add(mesh);
      } else {
        this._updateMeshToLinkState(link, mesh);
      }
    });

    this._removeObsoleteLinks(currentKeys);
  }

  clear() {
    while (this.linkGroup.children.length) {
      const child = this.linkGroup.children[0];
      child.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
      this.linkGroup.remove(child);
    }
    this.linkMeshes.clear();
  }

  handleEnteringLinks(enteringLinks, timeFactor, highlightEdges = []) {
    this._highlightEdges = highlightEdges;
    const radius = this._getRadius();

    enteringLinks.forEach(link => {
      const key = getLinkKey(link);
      let mesh = this._getLinkMesh(key);

      if (!mesh) {
        mesh = this.createAndAddLink(link);
        if (!mesh) {
          console.error(`[WebGLLinkRenderer] Failed to create entering link: ${key}`);
          return;
        }
        mesh.userData.isNewlyCreated = true;
      }

      const coordinates = calculateBranchCoordinates(link);
      let opacity;
      if (mesh.userData.isNewlyCreated) {
        opacity = 0;
        mesh.userData.isNewlyCreated = false;
      } else {
        opacity = timeFactor;
      }

      this._updateMeshGeometry(mesh, coordinates, radius); // no need to freeze on enter
      this._updateMeshMaterial(mesh, link, radius, opacity);
      mesh.userData.link = link;
      mesh.updateMatrix();
    });
  }

  handleUpdatingLinks(updatingLinks, fromLinksMap, toLinksMap, timeFactor, highlightEdges = []) {
    this._highlightEdges = highlightEdges;
    const radius = this._getRadius();

    updatingLinks.forEach(link => {
      const key = getLinkKey(link);
      let mesh = this._getLinkMesh(key);

      if (!mesh) {
        console.warn(`[WebGLLinkRenderer] Missing mesh for updating link: ${key}, creating`);
        mesh = this.createAndAddLink(link);
        if (!mesh) return;
      }

      const fromLink = fromLinksMap.get(key);
      const toLink   = toLinksMap.get(key);
      if (!fromLink || !toLink) {
        console.error(`[WebGLLinkRenderer] Missing from/to data for updating link: ${key}`);
        return;
      }

      // Classify the type of change based on radius, length, and angles
      const changeType = classifyEdgeChange(fromLink, toLink);

      if (changeType === 'REORDER') {
        // Only angles changed - apply rotation-based transformation
        this._applyReorderTransformation(mesh, fromLink, toLink, timeFactor);

        // ...existing code...
      } else if (changeType === 'RETOPO') {
        // Significant radius or length change - rebuild geometry with interpolation

        // Clear any previous transformation state to avoid conflicts
        this._clearTransformationState(mesh);

        const coordinates = calculateInterpolatedBranchCoordinates(
          toLink, timeFactor,
          fromLink.source.angle, fromLink.source.radius,
          fromLink.target.angle, fromLink.target.radius
        );

        // Use fixed segments for topology stability during interpolation
        const segOpts = this._getFixedSegs(mesh, radius);
        this._updateMeshGeometry(mesh, coordinates, radius, segOpts);

        // ...existing code...
      } else {
        // NONE - no significant changes, skip animation
        console.log(`[WebGLLinkRenderer] No changes detected for ${key}, skipping`);
        // Don't update geometry or apply transformations
      }

      this._updateMeshMaterial(mesh, toLink, radius, 1);
      mesh.userData.link = toLink;
      mesh.updateMatrix();
    });
  }

  handleExitingLinks(exitingLinks, timeFactor, highlightEdges = []) {
    this._highlightEdges = highlightEdges;
    const radius = this._getRadius();

    exitingLinks.forEach(link => {
      const key = getLinkKey(link);
      let mesh = this._getLinkMesh(key);

      if (!mesh) {
        console.warn(`[WebGLLinkRenderer] No mesh found for exiting link: ${key}`);
        return;
      }

      const coordinates = calculateBranchCoordinates(link);
      const opacity = 1 - timeFactor;

      if (opacity <= 0) {
        this.removeLinkByKey(key);
      } else {
        this._updateMeshGeometry(mesh, coordinates, radius); // topology stability not needed after exit
        this._updateMeshMaterial(mesh, link, radius, opacity);
        mesh.userData.link = link;
        mesh.updateMatrix();
      }
    });
  }

  destroy() {
    this.clear();
    this.scene?.remove(this.linkGroup);
    this.geometryFactory?.dispose?.();
    this.materialFactory?.destroy?.();

    this.geometryFactory = null;
    this.materialFactory = null;
    this.scene = null;
    this.colorManager = null;
    this.linkGroup = null;
    this.linkMeshes = null;
  }

  /* --------------------------- Internal utils --------------------------- */

  _getLinkMesh(linkKey) {
    return this.linkMeshes.get(linkKey) || null;
  }

  /**
   * Update mesh geometry; allow optional fixed segment overrides.
   */
  _updateMeshGeometry(mesh, coordinates, radius, extraOpts = undefined) {
    const newGeom = this.geometryFactory.createTubeFromCoordinates(coordinates, radius, extraOpts);
    if (!newGeom) {
      console.error('[WebGLLinkRenderer] Failed to create geometry for coordinates:', coordinates);
      return;
    }
    const oldGeom = mesh.geometry;
    mesh.geometry = newGeom;
    if (oldGeom && oldGeom !== newGeom) oldGeom.dispose();
    newGeom.computeBoundingSphere();
  }

  _updateMeshMaterial(mesh, link, radius, opacity = 1) {
    const mat = this._getMaterial(link, radius);
    mat.opacity = opacity;
    mat.transparent = opacity < 1;

    if (mesh.material !== mat) {
      const oldMat = mesh.material;
      mesh.material = mat;
      oldMat?.dispose?.();
    }
  }

  _removeObsoleteLinks(expectedKeys, exitKeys = new Set()) {
    const keysToRemove = [];
    this.linkMeshes.forEach((_, key) => {
      if (!expectedKeys.has(key) && !exitKeys.has(key)) {
        keysToRemove.push(key);
      }
    });
    keysToRemove.forEach(key => this.removeLinkByKey(key));
    return keysToRemove;
  }

  _getRadius() {
    const { strokeWidth = this._strokeWidth } = useAppStore.getState();
    this._strokeWidth = strokeWidth;
    return strokeWidth * 0.5;
  }

  _getMaterial(link, radius) {
    return this.materialFactory.getLinkMaterial(link, this._highlightEdges, radius);
  }

  _createLinkMesh(link) {
    const key = getLinkKey(link);
    const existingMesh = this._getLinkMesh(key);
    if (existingMesh) return existingMesh;

    const radius = this._getRadius();
    const coordinates = calculateBranchCoordinates(link);

    // Debug coordinates and geometry creation (reduced frequency)
    if (Math.random() < 0.01) { // Reduced debug frequency to 1% for production
      const isStraightLine = coordinates.arcProperties === null;
      console.log('[WebGLLinkRenderer] Debug link coordinates:', {
        key,
        isStraightLine,
        movePoint: coordinates.movePoint,
        arcEndPoint: coordinates.arcEndPoint, 
        lineEndPoint: coordinates.lineEndPoint,
        arcProperties: coordinates.arcProperties
      });
    }

    const geometry = this.geometryFactory.createTubeFromCoordinates(coordinates, radius);
    if (!geometry) {
      console.error('[WebGLLinkRenderer] Failed to create geometry for link:', key, coordinates);
      return null;
    }

    const material = this._getMaterial(link, radius);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { linkKey: key, link };
    this.linkMeshes.set(key, mesh);
    return mesh;
  }

  createAndAddLink(link) {
    const mesh = this._createLinkMesh(link);
    if (!mesh) {
      console.error('[WebGLLinkRenderer] Failed to create mesh for link:', getLinkKey(link));
      return null;
    }
    if (!this.linkGroup.children.includes(mesh)) this.linkGroup.add(mesh);
    return mesh;
  }

  removeLink(link) {
    this.removeLinkByKey(getLinkKey(link));
  }

  removeLinkByKey(key) {
    const mesh = this._getLinkMesh(key);
    if (!mesh) return;
    mesh.geometry?.dispose?.();
    mesh.material?.dispose?.();
    this.linkGroup.remove(mesh);
    this.linkMeshes.delete(key);
  }

  _updateMeshToLinkState(link, mesh) {
    if (!mesh) return;

    // Clear any transformation state from previous animations
    this._clearTransformationState(mesh);

    const radius = this._getRadius();
    const coordinates = calculateBranchCoordinates(link);

    this._updateMeshGeometry(mesh, coordinates, radius);
    this._updateMeshMaterial(mesh, link, radius, 1);

    mesh.userData.link = link;
    mesh.updateMatrix();
  }

  _validateCurrentState(currentState, enter, update, exit) {
    const currentKeys = new Set(currentState.map(getLinkKey));
    const enterKeys = new Set(enter.map(getLinkKey));
    const updateKeys = new Set(update.map(getLinkKey));
    const exitKeys = new Set(exit.map(getLinkKey));

    const expected = new Set([...currentKeys, ...enterKeys, ...updateKeys]);
    exitKeys.forEach(k => expected.delete(k));

    const removedKeys = this._removeObsoleteLinks(expected, exitKeys);
    if (removedKeys.length > 0) {
      console.warn(`[WebGLLinkRenderer] Cleaned up ${removedKeys.length} orphaned links:`, removedKeys);
    }

    const shouldExist = new Set([...currentKeys, ...updateKeys]);
    const missing = [];
    shouldExist.forEach(k => {
      if (!this._getLinkMesh(k) && !enterKeys.has(k)) missing.push(k);
    });
    if (missing.length) {
      // This can happen during interpolation transitions - not necessarily an error
      console.warn('[WebGLLinkRenderer] Missing meshes for existing/updating links:', missing);
    }
  }

  /**
   * Clear transformation state to avoid conflicts between REORDER and RETOPO
   */
  _clearTransformationState(mesh) {
    // Reset transform to identity
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(0, 0, 0);
    mesh.scale.set(1, 1, 1);

    // Clear stored transformation data
    delete mesh.userData.originalRotation;
    delete mesh.userData.originalCoordinates;
    delete mesh.userData.originalMatrix;

    mesh.updateMatrixWorld(true);
  }

  /**
   * Apply rotation-based transformation for REORDER changes
   * This applies ONLY rotation around the origin - no position changes
   * to preserve the tube geometry topology
   */
  _applyReorderTransformation(mesh, fromLink, toLink, timeFactor) {
    // Store original rotation if not already stored
    if (!mesh.userData.originalRotation) {
      mesh.userData.originalRotation = mesh.rotation.z || 0;
    }

    // Calculate the average angular difference between from and to states
    const fromAvgAngle = (fromLink.source.angle + fromLink.target.angle) / 2;
    const toAvgAngle = (toLink.source.angle + toLink.target.angle) / 2;

    // Calculate rotation difference, handling wrap-around
    let angleDiff = toAvgAngle - fromAvgAngle;
    if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    // Apply interpolated rotation around Z-axis only
    const currentRotation = mesh.userData.originalRotation + (angleDiff * timeFactor);

    // Reset position to origin and apply only rotation
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(0, 0, currentRotation);
    mesh.updateMatrixWorld(true);
  }

  /**
   * Freezes segment counts for a mesh once per interpolation sequence.
   * Stores fixed segment parameters in mesh.userData.fixedSegs for topology stability.
   * @param {THREE.Mesh} mesh - The mesh to get fixed segments for
   * @param {number} radius - Current radius for segment calculation
   * @returns {Object} Fixed segment parameters for geometry consistency
   * @private
   */
  _getFixedSegs(mesh, radius) {
    if (mesh.userData.fixedSegs) return mesh.userData.fixedSegs;

    // Derive from the current geometry (first frame) to stay visually consistent
    const params = mesh.geometry?.parameters || {};
    const fixed = {
      fixedTubularSegments: params.tubularSegments ?? 64,
      fixedRadialSegments: params.radialSegments ?? 16,
      fixedArcSegments: 32 // reasonable default for our arcs; tweak if needed
    };
    mesh.userData.fixedSegs = fixed; // Cache fixed segments for consistent topology
    return fixed;
  }
}
