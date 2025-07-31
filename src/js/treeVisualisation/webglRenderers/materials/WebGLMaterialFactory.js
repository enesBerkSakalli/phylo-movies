// materials/WebGLMaterialFactory.js
import * as THREE from 'three';
import { LineMaterial }        from 'three/examples/jsm/lines/LineMaterial.js';
import { LineDashedMaterial }  from 'three';          // native in r163
import { useAppStore, TREE_COLOR_CATEGORIES } from '../../../core/store.js';

export class WebGLMaterialFactory {
  #cache = new Map();

  /*───────────────────────────────────────────────────────────────────────*/
  /* PUBLIC                                                               */
  /*───────────────────────────────────────────────────────────────────────*/
  /**
   * Returns a fancy line material.
   *
   * @param link            – domain object
   * @param highlightEdges  – array for colourManager
   * @param strokePx        – base width in CSS px
   * @param style           – 'solid' | 'gradient' | 'dashed' | 'glow'
   * @param opts            – extra params for the underlying material
   */
  getLinkLineMaterial(
    link,
    highlightEdges = [],
    strokePx       = 2,
    style          = 'solid',
    opts           = {}
  ) {
    /* 1️⃣  pick a colour (or fall back) */
    const cm       = useAppStore.getState().getColorManager?.();
    const colorHex = cm
      ? cm.getBranchColorWithHighlights(link, highlightEdges) ?? TREE_COLOR_CATEGORIES.defaultColor
      : TREE_COLOR_CATEGORIES.defaultColor;

    /* 2️⃣  build cache-key */
    const key = [
      style, colorHex, strokePx,
      this.#hashHighlights(highlightEdges)
    ].join('_');

    /* 3️⃣  reuse or create */
    if (!this.#cache.has(key)) {
      const mat = this.#make(style, colorHex, strokePx, opts);
      this.#cache.set(key, mat);
    }
    return this.#cache.get(key);
  }

  /** Call on renderer resize */
  updateLineResolutions(w, h) {
    const dpr = this.#dpr();
    for (const m of this.#cache.values()) {
      m.resolution?.set(w * dpr, h * dpr);   // only LineMaterial has `.resolution`
    }
  }

  clearCache() {
    for (const m of this.#cache.values()) m.dispose?.();
    this.#cache.clear();
  }
  destroy() { this.clearCache(); }

  /*───────────────────────────────────────────────────────────────────────*/
  /* INTERNAL                                                             */
  /*───────────────────────────────────────────────────────────────────────*/
  #make(style, colorHex, strokePx, opts) {
    switch (style) {
      case 'gradient': return this.#gradientMat(colorHex, strokePx, opts);
      case 'dashed'  : return this.#dashedMat (colorHex, strokePx, opts);
      case 'glow'    : return this.#glowMat   (colorHex, strokePx, opts);
      default        : return this.#solidMat  (colorHex, strokePx, opts);
    }
  }

  /* — SOLID — */
  #solidMat(colorHex, strokePx, opts) {
    return this.#lineMaterial({ colorHex, strokePx, vertexColors: false, ...opts });
  }

  /* — GRADIENT — */
  #gradientMat(colorHex, strokePx, opts) {
    // colour per-vertex ⇒ vertexColors: true
    return this.#lineMaterial({ colorHex, strokePx, vertexColors: true, ...opts });
  }

  /* — DASHED — */
  #dashedMat(colorHex, strokePx, {
    dashSize = 3, gapSize = 1, scale = 1, ...rest } = {}) {

    const mat = new LineDashedMaterial({
      color      : new THREE.Color(colorHex),
      linewidth  : strokePx,                // NB: ≤ 1 px on most GPUs
      dashSize, gapSize, scale,
      transparent: true,
      ...rest
    });

    // Every frame: mat.dashOffset -= delta * speed;
    return mat;
  }

  /* — GLOW (two-pass hack) — */
  #glowMat(colorHex, strokePx, opts) {
    // First build a LineMaterial but with additive blend & low alpha
    return this.#lineMaterial({
      colorHex,
      strokePx : strokePx * 4,              // fatter halo
      blending : THREE.AdditiveBlending,
      opacity  : 0.35,
      transparent: true,
      depthWrite: false,
      ...opts
    });
  }

  /* — shared builder — */
  #lineMaterial({ colorHex, strokePx, ...rest }) {
    const mat = new LineMaterial({
      color        : new THREE.Color(colorHex),
      linewidth    : strokePx,
      transparent  : true,
      depthTest    : true,
      depthWrite   : true,
      ...rest
    });

    const { w, h } = this.#viewport();
    mat.resolution.set(w, h);
    return mat;
  }

  /* — utils — */
  #viewport() {
    const w = typeof window !== 'undefined' ? window.innerWidth  : 1920;
    const h = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const d = this.#dpr();
    return { w: w * d, h: h * d };
  }
  #dpr() { return typeof window !== 'undefined'
      ? Math.min(2, window.devicePixelRatio || 1) : 1; }

  #hashHighlights(a = []) {
    return a.length
      ? [...a].map(e => (Array.isArray(e) ? e.join(',') : e)).sort().join('|')
      : 'none';
  }
}
