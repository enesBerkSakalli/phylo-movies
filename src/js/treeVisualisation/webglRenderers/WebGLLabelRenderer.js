// renderers/WebGLLabelRenderer.js
import * as THREE from 'three';
import { getLabelKey }          from '../utils/KeyGenerator.js';
import { useAppStore, TREE_COLOR_CATEGORIES } from '../../core/store.js';
import {
  getLabelConfiguration,
  interpolateLabelConfiguration
} from '../utils/LabelPositioning.js';

/**
 * WebGLLabelRenderer – drop-in
 * Keeps public API untouched, fixes blurriness, cache leaks and depth occlusion.
 */
export class WebGLLabelRenderer {
  /* static knobs */
  static MAX_TEXTURES = 512;
  static EM_MULT      = 1.0;  // Match SVG em to px conversion more closely
  static getDPR(renderer) {
    if (renderer) return Math.min(renderer.getPixelRatio(), 2);
    if (typeof window === 'undefined') return 1;
    return Math.min(window.devicePixelRatio || 1, 2);
  }

  constructor(scene, colorManager, controller, opts = {}) {
    this.scene         = scene;
    this.colorManager  = colorManager;
    this.controller    = controller;

    /* options */
    this.enableBillboard   = opts.enableBillboard   ?? true;
    this.constantPixelSize = opts.constantPixelSize ?? true;
    this.pixelHeight       = opts.pixelHeight       ?? 64;
    this.minPixelHeight    = opts.minPixelHeight    ?? 32;
    this.maxPixelHeight    = opts.maxPixelHeight    ?? 256;
    this.useMeshPool       = opts.useMeshPool       ?? true;
    this.debug             = opts.debug             ?? false;
    this.crispText         = opts.crispText         ?? false;   // NEW toggle
    this.depthTestLabels   = opts.depthTestLabels   ?? false;   // NEW toggle

    /* groups & storage */
    this.labelGroup = controller?.sceneManager?.getGroup('labels') || scene;
    this.labelMeshes = new Map();
    this._meshPool   = [];

    /* shared */
    this.labelGeometry   = new THREE.PlaneGeometry(1, 1);
    this._textureCache   = new Map();
    this._materialCache  = new Map();

    /* temps */
    this._tempV2  = new THREE.Vector2();
    this._tempV3  = new THREE.Vector3();
    this._tmpQuat = new THREE.Quaternion();

    this._lastPixelHeight = this.pixelHeight;

    this._bindOnBeforeRender();
  }

  /* ───────────────────────── PUBLIC API ───────────────────────── */

  async renderLabels(leaves, radius) {
    if (!Array.isArray(leaves)) return Promise.resolve();

    const { fontSize } = useAppStore.getState();
    const fPx = Math.round(this._convertEmToPx(fontSize || '10em')); // Default to 10em to match readable setting from UI
    const desiredPx = this._clampPixel(fPx * 2.5); // Increased scaling factor
    this._lastPixelHeight = desiredPx;

    /* diff */
    const incoming = new Map(leaves.map(l => [getLabelKey(l), l]));
    [...this.labelMeshes.keys()].forEach(k => { if (!incoming.has(k)) this._removeByKey(k); });

    /* enter / update */
    for (const leaf of leaves) {
      const key  = getLabelKey(leaf);
      const text = leaf?.data?.name ?? '';
      if (!text) continue;

      if (!this.labelMeshes.has(key)) {
        const mesh = this._createLabelMesh(text, leaf, radius, fPx, desiredPx);
        if (mesh) {
          this.labelMeshes.set(key, mesh);
          this.labelGroup.add(mesh);
        }
      } else {
        this._restyleIfNeededExisting(this.labelMeshes.get(key), leaf, text, radius);
        this._applyCfg(this.labelMeshes.get(key), {}, 1);
      }
    }
    return Promise.resolve();
  }

  renderLabelsInterpolated(fromLeaves, toLeaves, _fromR, toR, t) {
    const from = new Map(fromLeaves.map(l => [getLabelKey(l), l]));
    const to   = new Map(toLeaves  .map(l => [getLabelKey(l), l]));
    const r    = this._getStableRadius(toR);

    const { fontSize } = useAppStore.getState();
    const fPx = Math.round(this._convertEmToPx(fontSize || '10em')); // Default to 10em to match readable setting from UI

    /* exits & fade-outs */
    from.forEach((_, k) => {
      if (to.has(k)) return;
      const mesh = this.labelMeshes.get(k);
      if (mesh) {
        this._setOpacity(mesh, 1 - t);
        if (t >= 1) this._removeByKey(k);
      }
    });

    /* enters + updates */
    to.forEach((toLeaf, k) => {
      const text = toLeaf?.data?.name ?? '';
      if (!text) return;

      const fromLeaf = from.get(k);

      // For interpolation, we'll calculate position directly like SVG does
      // instead of using complex configuration objects
      const op  = fromLeaf ? 1 : t;
      let mesh  = this.labelMeshes.get(k);
      if (!mesh) {
        mesh = this._createLabelMesh(text, toLeaf, r, fPx, this._clampPixel(fPx*2.5));
        this.labelGroup.add(mesh);
        this.labelMeshes.set(k, mesh);
      } else {
        this._restyleIfNeededExisting(mesh, toLeaf, text, r);
      }

      // Apply interpolated position directly
      if (fromLeaf) {
        // Interpolate angle and position
        const angleDiff = toLeaf.angle - fromLeaf.angle;
        const adjustedAngleDiff = angleDiff > Math.PI ? angleDiff - 2 * Math.PI :
                                 angleDiff < -Math.PI ? angleDiff + 2 * Math.PI : angleDiff;
        const interpolatedAngle = fromLeaf.angle + adjustedAngleDiff * t;

        // Add consistent padding to match _applyCfg method
        const padding = 30; // Same padding as in _applyCfg
        const paddedRadius = r + padding;

        const x = paddedRadius * Math.cos(interpolatedAngle);
        const y = paddedRadius * Math.sin(interpolatedAngle);
        mesh.position.set(x, y, this._labelZ());

        // Interpolate rotation
        const angleDeg = (interpolatedAngle * 180) / Math.PI;
        const needsFlip = angleDeg < 270 && angleDeg > 90;
        mesh.rotation.z = interpolatedAngle + (needsFlip ? Math.PI : 0);
      } else {
        // New label, use direct positioning
        this._applyCfg(mesh, {}, op);
      }

      this._setOpacity(mesh, op);
    });
  }

  async updateLabelStyles() {
    // Invalidate style caches to force recreation with new font size
    this.invalidateStyles();

    // Re-render all existing labels with new styles
    const { fontSize } = useAppStore.getState();
    const fPx = Math.round(this._convertEmToPx(fontSize || '10em')); // Default to 10em to match readable setting from UI

    this.labelMeshes.forEach((mesh, key) => {
      const leaf = mesh.userData.originalLeaf; // We need to store this
      const text = mesh.userData.text;
      const radius = mesh.userData.radius; // We need to store this

      if (leaf && text && radius !== undefined) {
        this._restyleIfNeededExisting(mesh, leaf, text, radius);
      }
    });

    return Promise.resolve();
  }

  invalidateStyles() {
    this.labelMeshes.forEach(m => (m.userData.styleSig = null));
    this._materialCache.forEach(m => m.dispose());
    this._textureCache.forEach(e => e.texture.dispose());
    this._materialCache.clear();
    this._textureCache.clear();
  }

  clear() {
    this.labelMeshes.forEach(m => { this._disposeMesh(m); this.labelGroup.remove(m); });
    this.labelMeshes.clear();
    this.invalidateStyles();
  }

  destroy() {
    this.clear();
    this.labelGeometry.dispose();
    Object.assign(this, { scene:null, colorManager:null, controller:null, labelGroup:null, _meshPool:[] });
  }

  /* ────────────────────────── INTERNALS ────────────────────────── */

  _getStableRadius(base) {
    const c = this.controller;
    if (c?.getConsistentLabelRadius) return c.getConsistentLabelRadius();
    if (c?._getConsistentRadii)     return c._getConsistentRadii().labelRadius;
    if (c?._calculateUniformAwareRadius) return c._calculateUniformAwareRadius(base);
    return base;
  }

  _getScaleFactor() {
    // Return a reasonable scale factor for world space
    // This converts pixel dimensions to world units appropriately
    // Increased significantly for better visibility
    return 0.15;
  }

  _createLabelMesh(text, leaf, radius, fPx, desiredPx) {
    const key = getLabelKey(leaf);
    if (this.labelMeshes.has(key)) return this.labelMeshes.get(key);

    // Use simple text anchor calculation matching SVG behavior
    const textAnchor = leaf.angle > Math.PI ? 'end' : 'start';
    const color = this.colorManager?.getNodeColor?.(leaf) || TREE_COLOR_CATEGORIES.defaultColor;
    const tex   = this._getOrCreateTexture(text, fPx, color, 'transparent', { textAnchor });
    const mat   = this._getOrCreateMaterial(tex.texture);

    const mesh  = this._getMeshFromPool() || new THREE.Mesh(this.labelGeometry, mat);
    mesh.material   = mat;
    mesh.visible    = true;

    mesh.userData = {
      nodeKey   : key,
      text,
      texture   : tex.texture,
      canvasWidth : tex.width,
      canvasHeight: tex.height,
      desiredPixels: desiredPx + 4,          // account for border
      styleSig  : `${fPx}|${color}|transparent|${desiredPx}|${textAnchor}`,
      originalLeaf: leaf,  // Store original leaf data for style updates
      radius: radius       // Store radius for style updates
    };

    this._applyCfg(mesh, {}, 1);
    // Apply proper scaling - labels should be sized appropriately for the world space
    const scaleFactor = this._getScaleFactor();
    this._scaleMesh(mesh, tex.width * scaleFactor, tex.height * scaleFactor);
    return mesh;
  }

  _restyleIfNeededExisting(mesh, leaf, text, radius) {
    const { fontSize } = useAppStore.getState();
    const fPx = Math.round(this._convertEmToPx(fontSize || '10em')); // Default to 10em to match readable setting from UI
    const desired = this._clampPixel(fPx * 2.5); // Increased scaling to match main render method

    // Use simple text anchor calculation matching SVG behavior
    const textAnchor = leaf.angle > Math.PI ? 'end' : 'start';
    const clr   = this.colorManager?.getNodeColor?.(leaf) || TREE_COLOR_CATEGORIES.defaultColor;
    const sig   = `${fPx}|${clr}|transparent|${desired}|${textAnchor}`;
    if (mesh.userData.styleSig === sig) return;

    const tex   = this._getOrCreateTexture(text, fPx, clr, 'transparent', { textAnchor });
    const mat   = this._getOrCreateMaterial(tex.texture);

    /* purge old cache entry */
    this._materialCache.delete(mesh.material.map.uuid);
    mesh.material.map.dispose();
    mesh.material.dispose();

    mesh.material = mat;
    Object.assign(mesh.userData, {
      texture: tex.texture,
      canvasWidth: tex.width,
      canvasHeight: tex.height,
      desiredPixels: desired + 4,
      styleSig: sig
    });
    const scaleFactor = this._getScaleFactor();
    this._scaleMesh(mesh, tex.width * scaleFactor, tex.height * scaleFactor);
  }

  _applyCfg(mesh, cfg, opacity) {
    // Position labels following the same approach as SVG's orientText()
    // Use the stored radius and leaf data for consistent positioning
    const leaf = mesh.userData.originalLeaf;
    const radius = mesh.userData.radius;

    if (leaf && radius !== undefined) {
      // Add appropriate padding to avoid overlap with extension lines
      const padding = 0.3; // Padding in world units for better separation
      const paddedRadius = radius + padding;

      // Position at padded radius distance along leaf angle
      const x = paddedRadius * Math.cos(leaf.angle);
      const y = paddedRadius * Math.sin(leaf.angle);
      mesh.position.set(x, y, this._labelZ());

      // Apply rotation for proper text orientation (matching SVG behavior)
      const angleDeg = (leaf.angle * 180) / Math.PI;
      const needsFlip = angleDeg < 270 && angleDeg > 90;
      mesh.rotation.z = leaf.angle + (needsFlip ? Math.PI : 0);
    } else {
      // Fallback to configuration position if no leaf data
      mesh.position.set(cfg.position.x, cfg.position.y, this._labelZ());
      mesh.rotation.z = cfg.rotation;
    }

    this._setOpacity(mesh, opacity);
  }

  /* ---------- texture & material ---------- */

  _getOrCreateTexture(text, fPx, color, bg, cfg={}) {
    const anchor = cfg.textAnchor || 'start';
    const key = `${text}|${fPx}|${color}|${bg}|${anchor}`;
    if (this._textureCache.has(key)) return this._textureCache.get(key);

    /* LRU trim */
    if (this._textureCache.size >= WebGLLabelRenderer.MAX_TEXTURES) {
      const oldest = this._textureCache.keys().next().value;
      this._textureCache.get(oldest).texture.dispose();
      this._textureCache.delete(oldest);
    }

    const renderer = this.scene?.userData?.controller?.sceneManager?.renderer;
    const dpr = WebGLLabelRenderer.getDPR(renderer);
    const border = 4;
    const font = `${fPx}px bold sans-serif`;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = font;
    const w = Math.ceil(ctx.measureText(text).width);
    const h = Math.ceil(fPx * 1.2);  // Use font size for height instead of width of 'M'

    const cssW = w + border*2;
    const cssH = h + border*2;
    canvas.width  = cssW * dpr;
    canvas.height = cssH * dpr;

    ctx.scale(dpr,dpr);
    ctx.font = font;
    ctx.textBaseline='middle';
    ctx.textAlign = anchor==='end' ? 'right' : 'left';

    if (bg !== 'transparent') { ctx.fillStyle=bg; ctx.fillRect(0,0,cssW,cssH); }

    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(0,0,0,0.35)';  // subtle shadow
    ctx.shadowBlur  = 2*dpr;
    const x = anchor==='end' ? cssW-border : border;
    ctx.fillText(text,x,cssH/2);

    // Debug: log texture creation
    if (this.debug) {
      console.log(`Created texture for "${text}": ${cssW}x${cssH}, color: ${color}`);
    }

    const tex = new THREE.CanvasTexture(canvas);
    const filt = this.crispText ? THREE.NearestFilter : THREE.LinearFilter;
    tex.minFilter = tex.magFilter = filt;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    ('colorSpace' in tex) ? tex.colorSpace=THREE.SRGBColorSpace : tex.encoding=THREE.sRGBEncoding;

    const entry = { texture:tex, width:cssW, height:cssH };
    this._textureCache.set(key,entry);
    return entry;
  }

  _getOrCreateMaterial(texture) {
    let m = this._materialCache.get(texture.uuid);
    if (m) return m;
    m = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1,  // Add alpha test to improve rendering
      depthTest : this.depthTestLabels,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor:-1,
      polygonOffsetUnits :-1,
      toneMapped:false,
      side: THREE.DoubleSide  // Ensure labels are visible from both sides
    });
    this._materialCache.set(texture.uuid, m);
    return m;
  }

  /* ---------- pool helpers ---------- */

  _getMeshFromPool(){ return this.useMeshPool && this._meshPool.length ? this._meshPool.pop() : null; }
  _disposeMesh(mesh){
    if (this.useMeshPool){ mesh.visible=false; mesh.userData={}; this._meshPool.push(mesh); return; }
    this._materialCache.delete(mesh.material.map.uuid);
    mesh.material.map.dispose(); mesh.material.dispose();
  }
  _removeByKey(k){ const m=this.labelMeshes.get(k); if(!m)return; this._disposeMesh(m); this.labelGroup.remove(m); this.labelMeshes.delete(k); }

  /* ---------- per-frame DPR & billboard ---------- */

  _bindOnBeforeRender(){
    this.labelGroup.onBeforeRender = (_renderer, _s, cam)=>{
      if(!this.enableBillboard) return; // Only do billboarding

      this._tmpQuat.copy(cam.quaternion);

      this.labelMeshes.forEach(m=>{
        if(this.enableBillboard) m.quaternion.copy(this._tmpQuat);
        // The constantPixelSize logic is removed as it was causing scaling issues.
        // The initial scaling in _createLabelMesh and _restyleIfNeededExisting is now sufficient.
      });
    };
  }

  /* ---------- misc ---------- */

  _scaleMesh(m,w,h){ m.scale.set(w,h,1); }
  _setOpacity(m,o){ m.material.opacity=o; m.material.transparent=o<1; }
  _labelZ(){ return 0.01; } // Increased z-offset to prevent overlap with tree elements
  _convertEmToPx(em){ const n=parseFloat(String(em||'').replace(/[^\d.]/g,'')); return Number.isFinite(n)&&n>0?Math.round(n*16*WebGLLabelRenderer.EM_MULT):24; }
  _clampPixel(px){ return Math.max(this.minPixelHeight,Math.min(this.maxPixelHeight,px)); }
}
