// renderers/WebGLLabelRenderer.js
import * as THREE from 'three';
import { getLabelKey } from '../utils/KeyGenerator.js';
import { useAppStore } from '../../core/store.js';
import {
  getLabelConfiguration,
  interpolateLabelConfiguration,
  LABEL_OFFSETS
} from '../utils/LabelPositioning.js';

/**
 * WebGLLabelRenderer
 * -----------------------------------------------------------------------------
 * CanvasTexture-based text labels on planes, with:
 *  - Texture/material caching
 *  - Optional mesh pooling
 *  - Camera-facing billboards + constant pixel-size in world
 *  - Automatic rebuild when font-size / strokeWidth / colors change
 *
 * Public API:
 *   - constructor(scene, colorManager, controller, opts?)
 *   - renderLabels(leaves, labelRadius)
 *   - renderLabelsInterpolated(fromLeaves, toLeaves, fromRadius, toRadius, t)
 *   - clear()
 *   - destroy()
 *   - invalidateStyles()   // force all labels to rebuild textures next frame
 */
export class WebGLLabelRenderer {
  /**
   * @param {THREE.Scene} scene
   * @param {Object} colorManager                    // must expose getNodeColor(node)
   * @param {Object} controller                      // must expose sceneManager.getGroup('labels')
   * @param {Object} opts
   * @param {boolean} [opts.enableBillboard=true]
   * @param {boolean} [opts.constantPixelSize=true]
   * @param {number}  [opts.pixelHeight=64]
   * @param {number}  [opts.minPixelHeight=32]
   * @param {number}  [opts.maxPixelHeight=256]
   * @param {boolean} [opts.useMeshPool=true]
   * @param {boolean} [opts.debug=false]
   */
  constructor(scene, colorManager, controller, opts = {}) {
    this.scene = scene;
    this.colorManager = colorManager;
    this.controller = controller;

    // Options
    this.enableBillboard = opts.enableBillboard ?? true;
    this.constantPixelSize = opts.constantPixelSize ?? true;
    this.pixelHeight = opts.pixelHeight ?? 64;
    this.minPixelHeight = opts.minPixelHeight ?? 32;
    this.maxPixelHeight = opts.maxPixelHeight ?? 256;
    this.useMeshPool = opts.useMeshPool ?? true;
    this.debug = opts.debug ?? false;

    // Groups
    this.labelGroup = this.controller?.sceneManager?.getGroup('labels') || scene;

    // Storage
    this.labelMeshes = new Map(); // key -> Mesh
    this._meshPool = [];

    // Shared geometry
    this.labelGeometry = new THREE.PlaneGeometry(1, 1);

    // Caches
    this._textureCache = new Map(); // text|fontSize|color|bg -> { texture, canvas, width, height }
    this._materialCache = new Map(); // texture.uuid -> material

    // State
    this._lastPixelHeight = this.pixelHeight;
    this._tempV2 = new THREE.Vector2();
    this._tempV3 = new THREE.Vector3();
    this._tmpQuat = new THREE.Quaternion();

    // Label positioning is now handled by the controller

    // Hook per-frame updates
    this._bindOnBeforeRender();
  }

  /* -------------------------------------------------------------------------- */
  /* Public API                                                                  */
  /* -------------------------------------------------------------------------- */

  /**
   * Render labels instantly (no animation)
   * @param {Array} leaves  d3 leaf nodes
   * @param {number} labelRadius world radius to place labels
   */
  async renderLabels(leaves, labelRadius) {
    if (!Array.isArray(leaves)) {
      console.warn('[WebGLLabelRenderer] No leaves array provided');
      return Promise.resolve();
    }

    console.log('[WebGLLabelRenderer] Rendering labels for', leaves.length, 'leaves with radius:', labelRadius);

    const { fontSize: storeFontSize, strokeWidth } = useAppStore.getState();
    const baseFontPx = this._convertEmToPx(storeFontSize || '1.8em');
    const strokeMult = Math.max(0.5, Math.min(2.0, strokeWidth / 3.0));
    const fontSizePx = Math.round(baseFontPx * strokeMult);
    const desiredPixels = this._clampPixel(this.pixelHeight || fontSizePx * 3);
    this._lastPixelHeight = desiredPixels;

    // Use the labelRadius passed from controller directly
    // This radius is already calculated as: initialMaxLeafRadius + LABEL_OFFSETS.WITH_EXTENSIONS
    const calculatedLabelRadius = labelRadius;

    // Debug: Track label radius usage for consistency checking
    if (this.debug || this._lastLabelRadius !== calculatedLabelRadius) {
      console.log('[WebGLLabelRenderer] Using label radius:', {
        radius: calculatedLabelRadius,
        source: 'renderLabels',
        changed: this._lastLabelRadius !== calculatedLabelRadius,
        previousRadius: this._lastLabelRadius
      });
      this._lastLabelRadius = calculatedLabelRadius;
    }

    // Diff set
    const incoming = new Map(leaves.map(l => [getLabelKey(l), l]));
    const toRemove = [];
    this.labelMeshes.forEach((_, key) => { if (!incoming.has(key)) toRemove.push(key); });
    toRemove.forEach(k => this._removeByKey(k));

    for (const leaf of leaves) {
      const key = getLabelKey(leaf);
      const text = leaf?.data?.name || '';
      if (!text) continue;

      let mesh = this.labelMeshes.get(key);
      if (!mesh) {
        mesh = this._createLabelMesh(text, leaf, calculatedLabelRadius, fontSizePx, desiredPixels);
        if (mesh) {
          this.labelMeshes.set(key, mesh);
          this.labelGroup.add(mesh);
          console.log('[WebGLLabelRenderer] Created label mesh for:', text, 'at position:', mesh.position.toArray());
        } else {
          console.error('[WebGLLabelRenderer] Failed to create label mesh for:', text);
        }
      } else {
        // Re-style if needed, always use controller's reference radius
        this._restyleIfNeededExisting(mesh, leaf, text, calculatedLabelRadius);
        // Use the label configuration directly with the passed radius
        const labelConfig = getLabelConfiguration(leaf, calculatedLabelRadius);
        mesh.position.set(labelConfig.position.x, labelConfig.position.y, this._labelZ());
        mesh.rotation.z = labelConfig.rotation;
        mesh.userData.labelConfig = labelConfig;
        this._setOpacity(mesh, 1);
      }
    }

    console.log(`[WebGLLabelRenderer] renderLabels complete: ${this.labelMeshes.size} label meshes in scene`);
    
    // Debug: Check if label group is in scene and visible
    if (this.labelGroup.parent) {
      console.log('[WebGLLabelRenderer] Label group is in scene, visible:', this.labelGroup.visible);
      
      // Check a sample mesh for visibility
      const firstMesh = this.labelMeshes.values().next().value;
      if (firstMesh) {
        console.log('[WebGLLabelRenderer] Sample label mesh visibility:', {
          meshVisible: firstMesh.visible,
          materialVisible: firstMesh.material?.visible,
          materialOpacity: firstMesh.material?.opacity,
          scale: firstMesh.scale.toArray(),
          hasTexture: !!firstMesh.material?.map
        });
      }
    } else {
      console.error('[WebGLLabelRenderer] Label group is NOT in scene!');
    }
    
    // Force visibility
    this.labelGroup.visible = true;
    
    return Promise.resolve();
  }

  /**
   * Interpolated label rendering
   * @param {Array} fromLeaves
   * @param {Array} toLeaves
   * @param {number} fromRadius
   * @param {number} toRadius
   * @param {number} t [0..1]
   */
  renderLabelsInterpolated(fromLeaves, toLeaves, fromRadius, toRadius, t) {
    const fromMap = new Map(fromLeaves.map(d => [getLabelKey(d), d]));
    const toMap = new Map(toLeaves.map(d => [getLabelKey(d), d]));

    // The controller should always pass the same radius for both trees
    // This ensures labels stay at a fixed distance regardless of tree size
    if (fromRadius !== toRadius && this.debug) {
      console.warn('[WebGLLabelRenderer] Different radii passed - using toRadius for consistency', {
        fromRadius, toRadius,
        difference: Math.abs(fromRadius - toRadius)
      });
    }

    // Use the FIXED radius from controller for consistent positioning
    // Both trees use the same radius to prevent label movement
    const fixedLabelRadius = toRadius; // Use target radius as the reference

    toMap.forEach((toLeaf, key) => {
      const fromLeaf = fromMap.get(key);
      const text = toLeaf?.data?.name || '';
      if (!text) return;

      let labelConfig, opacity, referenceRadius;
      if (fromLeaf) {
        // Use centralized interpolation with the SAME radius for both trees
        // This prevents labels from moving during transitions
        labelConfig = interpolateLabelConfiguration(
          fromLeaf, toLeaf,
          fixedLabelRadius, fixedLabelRadius,  // Same radius for both!
          t
        );
        opacity = 1;
        referenceRadius = fixedLabelRadius;
      } else {
        // Entering label - use fixed radius
        labelConfig = getLabelConfiguration(toLeaf, fixedLabelRadius);
        opacity = t; // fade in
        referenceRadius = fixedLabelRadius;
      }

      // Ensure mesh restyling uses controller's reference radius
      let mesh = this.labelMeshes.get(key);
      if (mesh) {
        this._restyleIfNeededExisting(mesh, toLeaf, text, referenceRadius);
      }
      this._updateOrCreateLabelWithConfig(toLeaf, text, labelConfig, opacity);
    });

    // Handle exiting labels
    fromMap.forEach((_, key) => {
      if (toMap.has(key)) return;

      const mesh = this.labelMeshes.get(key);
      if (mesh) {
        const outOpacity = 1 - t;
        this._setOpacity(mesh, outOpacity);
        // Optionally remove at t=1
        if (t >= 1) this._removeByKey(key);
      }
    });
  }

  /**
   * Force rebuilding textures/materials next frame
   */
  invalidateStyles() {
    // Mark all meshes for restyling
    this.labelMeshes.forEach(mesh => {
      if (mesh?.userData) mesh.userData.styleSig = null;
    });
    // Clear caches so they regenerate with new font sizes/colors
    this._textureCache.forEach(entry => entry.texture.dispose());
    this._materialCache.forEach(mat => mat.dispose());
    this._textureCache.clear();
    this._materialCache.clear();
  }

  clear() {
    console.log('[WebGLLabelRenderer] Clearing labels');
    this.labelMeshes.forEach(mesh => {
      this._disposeMesh(mesh);
      this.labelGroup.remove(mesh);
    });
    this.labelMeshes.clear();

    // Clear caches
    this._materialCache.forEach(m => m.dispose());
    this._textureCache.forEach(e => e.texture.dispose());
    this._materialCache.clear();
    this._textureCache.clear();
    
    // Ensure label group is still in the scene after clearing
    if (!this.labelGroup.parent && this.controller?.sceneManager) {
      console.warn('[WebGLLabelRenderer] Label group was removed from scene, re-adding it');
      const scene = this.controller.sceneManager.scene;
      scene.add(this.labelGroup);
    }
  }

  destroy() {
    this.clear();
    this.labelGeometry?.dispose?.();

    this.scene = null;
    this.colorManager = null;
    this.controller = null;
    this.labelGroup = null;

    this._meshPool = [];
  }

  /* -------------------------------------------------------------------------- */
  /* Internals                                                                  */
  /* -------------------------------------------------------------------------- */

  _createLabelMesh(text, leaf, calculatedLabelRadius, fontSizePx, desiredPixels) {
    const key = getLabelKey(leaf);
    if (this.labelMeshes.has(key)) return this.labelMeshes.get(key);

    // Debug: Check if leaf has required properties
    if (!leaf.angle && leaf.angle !== 0) {
      console.error('[WebGLLabelRenderer] Leaf missing angle property:', leaf);
      return null;
    }

    // Use the calculatedLabelRadius directly as the final position
    // The controller has already calculated this as a fixed position for all trees
    const labelConfig = getLabelConfiguration(leaf, calculatedLabelRadius);
    
    console.log('[WebGLLabelRenderer] Label config for', text, ':', {
      angle: leaf.angle,
      radius: calculatedLabelRadius,
      position: labelConfig.position,
      rotation: labelConfig.rotation
    });

    const labelColor = this.colorManager?.getNodeColor?.(leaf) || '#000000';
    const bgColor = 'rgba(255,255,255,0.8)';

    const texBundle = this._getOrCreateTexture(text, fontSizePx, labelColor, bgColor, labelConfig);
    const material = this._getOrCreateMaterial(texBundle.texture);

    const mesh = this._getMeshFromPool() || new THREE.Mesh(this.labelGeometry, material);
    mesh.material = material;
    mesh.visible = true; // Ensure mesh is visible (might be false if from pool)

    const styleSig = `${fontSizePx}|${labelColor}|${bgColor}|${desiredPixels}|${labelConfig.textAnchor}`;

    mesh.userData = {
      nodeKey: key,
      text,
      texture: texBundle.texture,
      canvasWidth: texBundle.width,
      canvasHeight: texBundle.height,
      desiredPixels,
      styleSig,
      labelConfig,
      calculatedLabelRadius: calculatedLabelRadius  // Store calculated label radius
    };

    // Apply positioning and rotation using label configuration
    mesh.position.set(labelConfig.position.x, labelConfig.position.y, this._labelZ());
    mesh.rotation.z = labelConfig.rotation;
    this._scaleMesh(mesh, texBundle.width, texBundle.height);
    this._setOpacity(mesh, 1);
    
    // Ensure visibility
    mesh.visible = true;

    if (this.debug) {
      console.debug(`[WebGLLabelRenderer] Created label '${text}'`, {
        pos: mesh.position.toArray(),
        scale: mesh.scale.toArray(),
        rotation: mesh.rotation.z,
        textAnchor: labelConfig.textAnchor
      });
    }
    return mesh;
  }

  _updateOrCreateLabel(leaf, text, radius, opacity) {
    const key = getLabelKey(leaf);
    let mesh = this.labelMeshes.get(key);

    if (!mesh) {
      // Create with current store settings
      const { fontSize: storeFontSize, strokeWidth } = useAppStore.getState();
      const baseFontPx = this._convertEmToPx(storeFontSize || '1.8em');
      const strokeMult = Math.max(0.5, Math.min(2.0, strokeWidth / 3.0));
      const fontSizePx = Math.round(baseFontPx * strokeMult);
      const desiredPixels = this._clampPixel(this.pixelHeight || fontSizePx * 3);

      mesh = this._createLabelMesh(text, leaf, radius, fontSizePx, desiredPixels);
      this.labelGroup.add(mesh);
      this.labelMeshes.set(key, mesh);
    } else {
      // Ensure style still matches
      this._restyleIfNeededExisting(mesh, leaf, text);
      this._positionMesh(mesh, leaf, radius + LABEL_OFFSETS.WITH_EXTENSIONS);
    }

    this._setOpacity(mesh, opacity);
  }

  /**
   * Update or create label with complete label configuration
   * @param {Object} leaf - Tree leaf node
   * @param {string} text - Label text
   * @param {Object} labelConfig - Complete label configuration from LabelPositioning.js
   * @param {number} opacity - Label opacity [0,1]
   */
  _updateOrCreateLabelWithConfig(leaf, text, labelConfig, opacity) {
    const key = getLabelKey(leaf);
    let mesh = this.labelMeshes.get(key);

    if (!mesh) {
      const { fontSize: storeFontSize, strokeWidth } = useAppStore.getState();
      const baseFontPx = this._convertEmToPx(storeFontSize || '1.8em');
      const strokeMult = Math.max(0.5, Math.min(2.0, strokeWidth / 3.0));
      const fontSizePx = Math.round(baseFontPx * strokeMult);
      const desiredPixels = this._clampPixel(this.pixelHeight || fontSizePx * 3);

      const labelColor = this.colorManager?.getNodeColor?.(leaf) || '#000000';
      const bgColor = 'rgba(255,255,255,0.8)';

      const texBundle = this._getOrCreateTexture(text, fontSizePx, labelColor, bgColor, labelConfig);
      const material = this._getOrCreateMaterial(texBundle.texture);

      mesh = this._getMeshFromPool() || new THREE.Mesh(this.labelGeometry, material);
      mesh.material = material;
      mesh.visible = true; // Ensure mesh is visible (might be false if from pool)

      const styleSig = `${fontSizePx}|${labelColor}|${bgColor}|${desiredPixels}|${labelConfig.textAnchor}`;

      mesh.userData = {
        nodeKey: key,
        text,
        texture: texBundle.texture,
        canvasWidth: texBundle.width,
        canvasHeight: texBundle.height,
        desiredPixels,
        styleSig,
        labelConfig
      };

      this._scaleMesh(mesh, texBundle.width, texBundle.height);
      mesh.visible = true; // Ensure visibility
      this.labelGroup.add(mesh);
      this.labelMeshes.set(key, mesh);
    }

    // Update position and rotation using label configuration
    mesh.position.set(labelConfig.position.x, labelConfig.position.y, this._labelZ());
    mesh.rotation.z = labelConfig.rotation;
    mesh.userData.labelConfig = labelConfig;

    this._setOpacity(mesh, opacity);
  }

  /**
   * Restyle an existing mesh if font/color/bg/desiredPixels changed.
   */
  _restyleIfNeeded(mesh, leaf, text, fontSizePx, desiredPixels, calculatedLabelRadius) {
    // Use the radius passed from controller directly
    const labelConfig = getLabelConfiguration(leaf, calculatedLabelRadius);

    const labelColor = this.colorManager?.getNodeColor?.(leaf) || '#000000';
    const bgColor = 'rgba(255,255,255,0.8)';
    const sig = `${fontSizePx}|${labelColor}|${bgColor}|${desiredPixels}|${labelConfig.textAnchor}`;
    if (mesh.userData.styleSig === sig) return;

    const texBundle = this._getOrCreateTexture(text, fontSizePx, labelColor, bgColor, labelConfig);
    const material = this._getOrCreateMaterial(texBundle.texture);
    mesh.material = material;

    mesh.userData.texture = texBundle.texture;
    mesh.userData.canvasWidth = texBundle.width;
    mesh.userData.canvasHeight = texBundle.height;
    mesh.userData.desiredPixels = desiredPixels;
    mesh.userData.styleSig = sig;
    mesh.userData.labelConfig = labelConfig;

    // Rescale plane to new pixel size; onBeforeRender will adjust world scale.
    this._scaleMesh(mesh, texBundle.width, texBundle.height);
  }

  /**
   * Same, but fontSizePx/desiredPixels not precomputed (used in interpolated path).
   */
  _restyleIfNeededExisting(mesh, leaf, text, calculatedLabelRadius) {
    const { fontSize: storeFontSize, strokeWidth } = useAppStore.getState();
    const baseFontPx = this._convertEmToPx(storeFontSize || '1.8em');
    const strokeMult = Math.max(0.5, Math.min(2.0, strokeWidth / 3.0));
    const fontSizePx = Math.round(baseFontPx * strokeMult);
    const desiredPixels = this._clampPixel(this.pixelHeight || fontSizePx * 3);

    // Use the radius passed from controller directly (if provided)
    const labelRadius = calculatedLabelRadius || mesh.userData?.calculatedLabelRadius || (leaf.radius + LABEL_OFFSETS.WITH_EXTENSIONS);
    const labelConfig = getLabelConfiguration(leaf, labelRadius);

    const labelColor = this.colorManager?.getNodeColor?.(leaf) || '#000000';
    const bgColor = 'rgba(255,255,255,0.8)';
    const sig = `${fontSizePx}|${labelColor}|${bgColor}|${desiredPixels}|${labelConfig.textAnchor}`;
    if (mesh.userData.styleSig === sig) return;

    const texBundle = this._getOrCreateTexture(text, fontSizePx, labelColor, bgColor, labelConfig);
    const material = this._getOrCreateMaterial(texBundle.texture);

    mesh.material = material;
    mesh.userData.texture = texBundle.texture;
    mesh.userData.canvasWidth = texBundle.width;
    mesh.userData.canvasHeight = texBundle.height;
    mesh.userData.desiredPixels = desiredPixels;
    mesh.userData.styleSig = sig;
    mesh.userData.labelConfig = labelConfig;

    this._scaleMesh(mesh, texBundle.width, texBundle.height);
  }

  _positionMesh(mesh, leaf, labelOffset) {
    // Use centralized positioning logic from LabelPositioning.js
    // The labelOffset should already include the leaf radius + offset
    const config = getLabelConfiguration(leaf, labelOffset);

    // Apply position
    mesh.position.set(config.position.x, config.position.y, this._labelZ());

    // Apply rotation for readability (flip text when on left side)
    mesh.rotation.z = config.rotation;

    // Store config for texture anchor updates
    mesh.userData.labelConfig = config;
  }

  _scaleMesh(mesh, pxWidth, pxHeight) {
    // initial scale; real pixel-to-world fit done each frame if constantPixelSize
    mesh.scale.set(pxWidth, pxHeight, 1);
  }

  _setOpacity(mesh, opacity) {
    mesh.material.opacity = opacity;
    mesh.material.transparent = opacity < 1 || mesh.material.transparent;
  }

  _interpolateAngle(a0, a1, t) {
    let d = a1 - a0;
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    return a0 + d * t;
  }

  _labelZ() { return 0.001; }

  /* ---------------------- Texture / Material Cache ---------------------- */

  _getOrCreateTexture(text, fontSizePx, color, bg, labelConfig = null) {
    const textAnchor = labelConfig?.textAnchor || 'start';
    const key = `${text}|${fontSizePx}|${color}|${bg}|${textAnchor}`;
    let entry = this._textureCache.get(key);
    if (entry) return entry;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const border = 2;
    const font = `${fontSizePx}px bold sans-serif`;
    ctx.font = font;
    const textWidth = ctx.measureText(text).width;

    const width = Math.ceil(textWidth + border * 2);
    const height = Math.ceil(fontSizePx + border * 2);

    canvas.width = width;
    canvas.height = height;

    ctx.font = font;
    ctx.textBaseline = 'middle';

    // Set text alignment based on label configuration
    ctx.textAlign = textAnchor === 'end' ? 'right' : 'left';

    // Fill background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Draw text with proper alignment
    ctx.fillStyle = color;
    const textX = textAnchor === 'end' ? width - border : border;
    ctx.fillText(text, textX, height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    if ('colorSpace' in texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
    } else {
      texture.encoding = THREE.sRGBEncoding; // older Three
    }

    entry = { texture, canvas, width, height, labelConfig };
    this._textureCache.set(key, entry);
    return entry;
  }

  _getOrCreateMaterial(texture) {
    let mat = this._materialCache.get(texture.uuid);
    if (mat) return mat;

    mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      toneMapped: false
    });

    this._materialCache.set(texture.uuid, mat);
    return mat;
  }

  /* ------------------------------ Pooling -------------------------------- */

  _getMeshFromPool() {
    return this.useMeshPool && this._meshPool.length ? this._meshPool.pop() : null;
  }

  _disposeMesh(mesh) {
    if (this.useMeshPool) {
      mesh.visible = false;
      mesh.userData = {};
      this._meshPool.push(mesh);
      return;
    }
    // Full dispose (only if you truly want to delete it)
    // NOTE: do NOT dispose shared geometry/material if pooling
    if (mesh.material?.map) mesh.material.map.dispose?.();
    mesh.material?.dispose?.();
  }

  _removeByKey(key) {
    const mesh = this.labelMeshes.get(key);
    if (!mesh) return;
    this._disposeMesh(mesh);
    this.labelGroup.remove(mesh);
    this.labelMeshes.delete(key);
  }

  /* ------------------------- Per-frame billboard ------------------------- */

  _bindOnBeforeRender() {
    const self = this;
    this.labelGroup.onBeforeRender = function (renderer, _scene, camera) {
      if (!self.enableBillboard && !self.constantPixelSize) return;

      renderer.getSize(self._tempV2);
      const canvasHeight = self._tempV2.y;

      let vFOV;
      if (camera.isPerspectiveCamera) {
        vFOV = THREE.MathUtils.degToRad(camera.fov);
      }

      let orthoWorldPerPixel = 1;
      if (camera.isOrthographicCamera) {
        const worldHeight = (camera.top - camera.bottom) / camera.zoom;
        orthoWorldPerPixel = worldHeight / canvasHeight;
      }

      self._tmpQuat.copy(camera.quaternion);

      self.labelMeshes.forEach(mesh => {
        if (self.enableBillboard) {
          mesh.quaternion.copy(self._tmpQuat);
        }

        if (self.constantPixelSize) {
          const desired = mesh.userData.desiredPixels ?? self._lastPixelHeight;

          let worldPerPx;
          if (camera.isOrthographicCamera) {
            worldPerPx = orthoWorldPerPixel;
          } else {
            const dist = camera.position.distanceTo(mesh.getWorldPosition(self._tempV3));
            const worldHeight = 2 * Math.tan(vFOV / 2) * dist;
            worldPerPx = worldHeight / canvasHeight;
          }

          const targetWorldH = desired * worldPerPx;
          const w = mesh.userData.canvasWidth;
          const h = mesh.userData.canvasHeight;
          const aspect = w / h;
          mesh.scale.set(targetWorldH * aspect, targetWorldH, 1);
        }
      });
    };
  }

  /* ----------------------------- Utilities ------------------------------- */

  _convertEmToPx(emSize) {
    if (!emSize) return 24;
    const num = parseFloat(String(emSize).replace('em', ''));
    if (Number.isNaN(num) || num <= 0) return 24;
    return Math.round(num * 16 * 0.8);
  }

  _clampPixel(px) {
    return Math.max(this.minPixelHeight, Math.min(this.maxPixelHeight, px));
  }

  /* ------------------------------ Validation & Debug ---------------------------------- */

  /**
   * Validates current state against animation expectations and cleans up orphaned meshes.
   * Called by WebGLTreeAnimationController during interpolation validation.
   * @param {Array} currentState - Current tree leaves
   * @param {Array} enter - Leaves entering
   * @param {Array} update - Leaves updating  
   * @param {Array} exit - Leaves exiting
   * @private
   */
  _validateCurrentState(currentState, enter, update, exit) {
    // Note: Label validation is simpler than other renderers since labels
    // are managed per-leaf and don't have complex lifecycle requirements
    const expectedCount = currentState.length + enter.length - exit.length;
    const actualCount = this.labelMeshes.size;
    
    if (Math.abs(actualCount - expectedCount) > 1) {
      console.warn(`[WebGLLabelRenderer] Label count mismatch: expected ~${expectedCount}, actual ${actualCount}`);
    }
  }

  /**
   * Debug method for logging label state.
   * @private
   */
  _logState() {
    if (!this.debug) return;
    console.table(Array.from(this.labelMeshes.values()).map(m => ({
      text: m.userData.text,
      pos: m.position.toArray().map(v => +v.toFixed(2)).join(','),
      scale: m.scale.toArray().map(v => +v.toFixed(2)).join(','),
      opacity: m.material.opacity
    })));
  }
}
