// renderers/WebGLLinkRenderer.js
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { useAppStore } from '../../core/store.js';
import {
  calculateInterpolatedBranchCoordinates,
  calculateBranchCoordinates,
  classifyEdgeChange
} from '../radialTreeGeometry.js';
import { getLinkKey } from '../utils/KeyGenerator.js';

import { PolylineGeometryFactory } from './geometry/PolylineGeometryFactory.js';
import { WebGLMaterialFactory } from './materials/WebGLMaterialFactory.js';

/* ---------- WebGLLinkRenderer (Line2) ---------- */

export class WebGLLinkRenderer {
  constructor(scene, colorManager, opts = {}) {
    this.scene = scene;
    this.colorManager = colorManager;

    const { styleConfig, strokeWidth = 2 } = useAppStore.getState();
    this.styleConfig = styleConfig || {};
    this._strokeWidth = strokeWidth;

    this.linkMeshes = new Map(); // key -> Line2
    this.linkGroup  = new THREE.Group();
    this.scene.add(this.linkGroup);

    this.geometryFactory = new PolylineGeometryFactory({
      sampleStep: opts.sampleStep ?? 4,
      fixedArcSegments: opts.fixedArcSegments ?? undefined,
      cacheGeometries: opts.cacheGeometries ?? true,
    });

    this.materialFactory = new WebGLMaterialFactory();

    this._highlightEdges = [];
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
    // Clear geometry cache
    this.geometryFactory.clearCache();

    while (this.linkGroup.children.length) {
      const child = this.linkGroup.children[0];
      child.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose?.();
      });
      this.linkGroup.remove(child);
    }
    this.linkMeshes.clear();
  }

  handleEnteringLinks(enteringLinks, timeFactor, highlightEdges = []) {
    this._highlightEdges = highlightEdges;
    const strokePx = this._getStrokePx();

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
      const opacity = mesh.userData.isNewlyCreated ? 0 : timeFactor;
      mesh.userData.isNewlyCreated = false;

      this._updateMeshState(mesh, link, coordinates, strokePx, opacity);
    });
  }

  handleUpdatingLinks(updatingLinks, fromLinksMap, toLinksMap, timeFactor, highlightEdges = []) {
    this._highlightEdges = highlightEdges;
    const strokePx = this._getStrokePx();

    updatingLinks.forEach(link => {
      const key  = getLinkKey(link);
      let mesh   = this._getLinkMesh(key);

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

      const changeType = classifyEdgeChange(fromLink, toLink);

      if (changeType === 'REORDER') {
        this._applyReorderTransformation(mesh, fromLink, toLink, timeFactor);
        this._updateLineMaterial(mesh, toLink, strokePx, 1);
      } else if (changeType === 'RETOPO') {
        this._clearTransformationState(mesh);

        const coordinates = calculateInterpolatedBranchCoordinates(
          toLink, timeFactor,
          fromLink.source.angle, fromLink.source.radius,
          fromLink.target.angle, fromLink.target.radius
        );

        this._updateMeshState(mesh, toLink, coordinates, strokePx, 1);
      } else {
        // NONE - just update material
        this._updateLineMaterial(mesh, toLink, strokePx, 1);
      }

      mesh.userData.link = toLink;
      mesh.updateMatrix();
    });
  }

  handleExitingLinks(exitingLinks, timeFactor, highlightEdges = []) {
    this._highlightEdges = highlightEdges;
    const strokePx = this._getStrokePx();

    exitingLinks.forEach(link => {
      const key = getLinkKey(link);
      let mesh = this._getLinkMesh(key);

      if (!mesh) {
        console.warn(`[WebGLLinkRenderer] No mesh found for exiting link: ${key}`);
        return;
      }

      const opacity = 1 - timeFactor;

      if (opacity <= 0) {
        this.removeLinkByKey(key);
      } else {
        const coordinates = calculateBranchCoordinates(link);
        this._updateMeshState(mesh, link, coordinates, strokePx, opacity);
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

  _updateMeshState(mesh, link, coordinates, strokePx, opacity = 1) {
    if (coordinates) {
      this._updateLineGeometry(mesh, coordinates);
    }
    this._updateLineMaterial(mesh, link, strokePx, opacity);
    mesh.userData.link = link;
    mesh.updateMatrix();
  }

  _getLinkMesh(linkKey) {
    return this.linkMeshes.get(linkKey) || null;
  }

  _updateLineGeometry(mesh, coordinates) {
    const norm   = this.geometryFactory.normalizeCoordinates(coordinates);
    const points = this.geometryFactory.generateContinuousPathPoints(norm, this.geometryFactory.defaults);

    // If vertex count changed, rebuild geometry (LineGeometry reallocates anyway)
    const oldAttr = mesh.geometry.attributes.position;
    if (oldAttr && oldAttr.array && oldAttr.array.length !== points.length * 3) {
      const newGeom = this.geometryFactory.createFromPoints(points, undefined, this.geometryFactory.defaults);
      mesh.geometry.dispose();
      mesh.geometry = newGeom;
    } else {
      this.geometryFactory.updateGeometryPositions(mesh.geometry, points);
      // Flag attribute update if present
      const posAttr = mesh.geometry.attributes.position;
      if (posAttr) posAttr.needsUpdate = true;
    }

    mesh.computeLineDistances?.();
  }

  _updateLineMaterial(mesh, link, strokePx, opacity = 1) {
    // ensure stroke > 0
    const widthPx = Math.max(1, strokePx | 0);

    let mat = this.materialFactory.getLinkLineMaterial(link, this._highlightEdges, widthPx);
    if (!mat) {
      console.warn('[WebGLLinkRenderer] Material factory returned null, falling back to basic line');
      mat = this.materialFactory._getBasicLine('#ffffff', widthPx);
    }

    mat.opacity     = opacity;
    mat.transparent = opacity < 1;
    mat.needsUpdate = true; // force uniforms refresh

    if (mesh.material !== mat) {
      mesh.material = mat;
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

  _getStrokePx() {
    const { strokeWidth = this._strokeWidth } = useAppStore.getState();
    this._strokeWidth = strokeWidth;
    return strokeWidth;
  }

  _createLinkMesh(link) {
    const key = getLinkKey(link);
    const existing = this._getLinkMesh(key);
    if (existing) return existing;

    const coords   = calculateBranchCoordinates(link);
    const geometry = this.geometryFactory.createFromCoordinates(coords, this.geometryFactory.defaults, key);

    const strokePx = this._getStrokePx();
    const material = this.materialFactory.getLinkLineMaterial(link, this._highlightEdges, Math.max(1, strokePx));

    const line = new Line2(geometry, material);
    line.computeLineDistances();
    line.userData = { linkKey: key, link };

    this.linkMeshes.set(key, line);
    return line;
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

    // Also remove from geometry cache to prevent memory leaks
    this.geometryFactory.removeFromCache(key);

    mesh.geometry?.dispose?.();
    mesh.material?.dispose?.();
    this.linkGroup.remove(mesh);
    this.linkMeshes.delete(key);
  }

  _updateMeshToLinkState(link, mesh) {
    if (!mesh) return;

    this._clearTransformationState(mesh);

    const coords = calculateBranchCoordinates(link);
    const strokePx = this._getStrokePx();

    this._updateMeshState(mesh, link, coords, strokePx, 1);
  }

  _validateCurrentState(currentState, enter, update, exit) {
    const currentKeys = new Set(currentState.map(getLinkKey));
    const enterKeys   = new Set(enter.map(getLinkKey));
    const updateKeys  = new Set(update.map(getLinkKey));
    const exitKeys    = new Set(exit.map(getLinkKey));

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
      console.warn('[WebGLLinkRenderer] Missing meshes for existing/updating links:', missing);
    }
  }

  _clearTransformationState(mesh) {
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(0, 0, 0);
    mesh.scale.set(1, 1, 1);

    delete mesh.userData.originalRotation;
    delete mesh.userData.originalCoordinates;
    delete mesh.userData.originalMatrix;

    mesh.updateMatrixWorld(true);
  }

  _applyReorderTransformation(mesh, fromLink, toLink, timeFactor) {
    if (!mesh.userData.originalRotation) {
      mesh.userData.originalRotation = mesh.rotation.z || 0;
    }

    const fromAvgAngle = (fromLink.source.angle + fromLink.target.angle) / 2;
    const toAvgAngle   = (toLink.source.angle   + toLink.target.angle)   / 2;

    let angleDiff = toAvgAngle - fromAvgAngle;
    if (angleDiff > Math.PI)  angleDiff -= 2 * Math.PI;
    if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    const currentRotZ = mesh.userData.originalRotation + (angleDiff * timeFactor);
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(0, 0, currentRotZ);
    mesh.updateMatrixWorld(true);
  }
}
