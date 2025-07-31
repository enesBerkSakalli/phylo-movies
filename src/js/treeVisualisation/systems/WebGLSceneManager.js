// managers/WebGLSceneManager.js
import * as THREE from 'three';
import { WebGLCameraController } from '../webglRenderers/WebGLCameraController.js';

export class WebGLSceneManager {
  /**
   * @param {HTMLElement} container
   * @param {Object} options
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      backgroundColor: 0xffffff, // Default to white background for proper label visibility
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: false,
      powerPreference: 'default',
      failIfMajorPerformanceCaveat: false,
      toneMapping: THREE.NoToneMapping,
      outputColorSpace: THREE.SRGBColorSpace,
      pixelRatioMax: 2,
      ...options
    };

    // Core Three.js components
    this.scene = null;
    this.renderer = null;
    this.cameraController = null;

    // Scene organization
    this.groups = Object.create(null); // links, nodes, extensions, labels
    this.lights = Object.create(null);

    // Callbacks
    this.resizeCallback = null;
    this.cameraChangeCallback = null;
    this.contextLostCallback = null;
    this.contextRestoredCallback = null;

    // Internal state
    this.resizeObserver = null;
    this._resizeQueued = false;
    this._running = false; // render loop flag
    this._rafHandle = null;
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                               */
  /* ------------------------------------------------------------------ */
  initialize(cameraOptions = {}) {
    this.setupScene();
    this.setupRenderer();
    this.setupGroups();
    this.setupLighting();
    this.setupCameraController(cameraOptions);
    this.setupContextHandlers();
    this.setupResizeObserver();
  }

  setupScene() {
    this.scene = new THREE.Scene();
    // Set white background by default for proper label visibility
    this.scene.background = new THREE.Color(this.options.backgroundColor);
  }

  setupRenderer() {
    const rect = this.container.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 600;

    this.renderer = new THREE.WebGLRenderer({
      antialias: this.options.antialias,
      alpha: this.options.alpha,
      preserveDrawingBuffer: this.options.preserveDrawingBuffer,
      powerPreference: this.options.powerPreference,
      failIfMajorPerformanceCaveat: this.options.failIfMajorPerformanceCaveat
    });

    // Color/tone settings
    if ('outputColorSpace' in this.renderer) {
      this.renderer.outputColorSpace = this.options.outputColorSpace;
    } else {
      // older three fallback
      this.renderer.outputEncoding = THREE.sRGBEncoding;
    }
    this.renderer.toneMapping = this.options.toneMapping;

    this.renderer.setSize(width, height);
    this.setPixelRatio(Math.min(window.devicePixelRatio, this.options.pixelRatioMax));

    if (import.meta?.env?.DEV) {
      this.renderer.debug.checkShaderErrors = true;
    }

    this.container.appendChild(this.renderer.domElement);
  }

  setupGroups() {
    // Back → front order
    this.groups = {
      links:      new THREE.Group(),
      nodes:      new THREE.Group(),
      extensions: new THREE.Group(),
      labels:     new THREE.Group()
    };
    for (const g of Object.values(this.groups)) this.scene.add(g);
  }

  setupLighting() {
    // Avoid duplicates
    if (!this.lights.ambient) {
      this.lights.ambient = new THREE.AmbientLight(0xffffff, 0.6);
      this.scene.add(this.lights.ambient);
    }
    if (!this.lights.directional) {
      const dir = new THREE.DirectionalLight(0xffffff, 0.4);
      dir.position.set(100, 100, 100);
      this.lights.directional = dir;
      this.scene.add(dir);
    }
  }

  refreshLighting() {
    // remove old
    if (this.lights.ambient) this.scene.remove(this.lights.ambient);
    if (this.lights.directional) this.scene.remove(this.lights.directional);
    this.lights = {};
    this.setupLighting();
  }

  setupCameraController(cameraOptions = {}) {
    this.cameraController = new WebGLCameraController(this.renderer, this.container, cameraOptions);

    // When camera is recreated (switch mode etc.)
    this.cameraController.onCameraRecreated = (camera, mode) => {
      // Ensure proper background color is set
      this.scene.background = new THREE.Color(this.options.backgroundColor);
      this.setupLighting(); // ensure lights exist
      if (this.cameraChangeCallback) {
        this.cameraChangeCallback(camera, mode);
      }
    };
  }

  setupContextHandlers() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('webglcontextlost', (event) => {
      console.warn('[WebGLSceneManager] WebGL context lost');
      event.preventDefault();
      this._running && this.stop(); // pause loop
      this.contextLostCallback?.();
    });

    canvas.addEventListener('webglcontextrestored', () => {
      console.log('[WebGLSceneManager] WebGL context restored');
      // re-create some state if needed
      this.refreshLighting();
      this.contextRestoredCallback?.();
      this.forceRenderOnce(); // draw one frame
      this._running && this.start(); // resume loop if needed
    });
  }

  setupResizeObserver() {
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', () => this._queueResize());
      return;
    }
    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.target === this.container) {
          this._queueResize();
          break;
        }
      }
    });
    this.resizeObserver.observe(this.container);
  }

  /* ------------------------------------------------------------------ */
  /* Resize                                                             */
  /* ------------------------------------------------------------------ */
  _queueResize() {
    if (this._resizeQueued) return;
    this._resizeQueued = true;
    requestAnimationFrame(() => {
      this._resizeQueued = false;
      this.handleResize();
    });
  }

  handleResize() {
    if (!this.renderer) return;
    const rect = this.container.getBoundingClientRect();
    const width  = rect.width  || 1;
    const height = rect.height || 1;

    this.renderer.setSize(width, height);
    this.cameraController?.handleResize(width, height);

    this.resizeCallback?.(width, height);
  }

  setPixelRatio(ratio) {
    this.renderer?.setPixelRatio(ratio);
  }

  /**
   * Get the effective pixel ratio being used for rendering.
   * This should be used by all renderers for consistency.
   * @returns {number} Current pixel ratio
   */
  getEffectivePixelRatio() {
    return this.renderer ? this.renderer.getPixelRatio() : 1;
  }

  /**
   * Get the actual render dimensions (accounting for pixel ratio).
   * @returns {Object} {width, height, pixelRatio, cssWidth, cssHeight}
   */
  getRenderDimensions() {
    if (!this.renderer) return { width: 800, height: 600, pixelRatio: 1, cssWidth: 800, cssHeight: 600 };

    const rect = this.container.getBoundingClientRect();
    const cssWidth = rect.width || 800;
    const cssHeight = rect.height || 600;
    const pixelRatio = this.renderer.getPixelRatio();

    return {
      width: cssWidth * pixelRatio,
      height: cssHeight * pixelRatio,
      pixelRatio,
      cssWidth,
      cssHeight
    };
  }

  /* ------------------------------------------------------------------ */
  /* Scene accessors                                                    */
  /* ------------------------------------------------------------------ */
  getGroup(groupType) {
    return this.groups[groupType];
  }

  getGroupNames() {
    return Object.keys(this.groups);
  }

  clearGroup(groupType, dispose = false) {
    const group = this.groups[groupType];
    if (!group) return;
    if (dispose) {
      group.traverse(obj => this.disposeObject3D(obj));
    }
    group.clear();
  }

  clearAllGroups(dispose = false) {
    Object.values(this.groups).forEach(g => {
      if (dispose) g.traverse(obj => this.disposeObject3D(obj));
      g.clear();
    });
  }

  addToScene(object, groupType = null) {
    if (groupType && this.groups[groupType]) {
      this.groups[groupType].add(object);
    } else {
      this.scene.add(object);
    }
  }

  removeFromScene(object) {
    Object.values(this.groups).forEach(group => group.remove(object));
    this.scene.remove(object);
  }

  disposeObject3D(object) {
    if (object.geometry) object.geometry.dispose?.();
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach(m => m?.dispose?.());
      } else {
        object.material.dispose?.();
      }
    }
    if (object.texture) object.texture.dispose?.();
  }

  /* ------------------------------------------------------------------ */
  /* Camera helpers                                                     */
  /* ------------------------------------------------------------------ */
  getCamera() {
    return this.cameraController?.getCamera();
  }

  getCameraMode() {
    return this.cameraController?.getCameraMode();
  }

  focusCameraOnTree(maxRadius = 500) {
    this.cameraController?.focusCameraOnTree(maxRadius);
  }

  resetCamera() {
    this.cameraController?.resetCamera();
  }

  switchCameraMode(mode) {
    this.cameraController?.switchCameraMode(mode);
  }

  /* ------------------------------------------------------------------ */
  /* Rendering                                                          */
  /* ------------------------------------------------------------------ */
  render() {
    if (!this.renderer || !this.scene) return false;
    this.renderer.render(this.scene, this.getCamera());
    return true;
  }

  /**
   * Optional built-in RAF loop (call start() once).
   * Prefer a central app loop if you have multiple managers.
   */
  start() {
    if (this._running) return;
    this._running = true;

    const loop = () => {
      if (!this._running) return;
      this.render();
      this._rafHandle = requestAnimationFrame(loop);
    };
    this._rafHandle = requestAnimationFrame(loop);
  }

  stop() {
    this._running = false;
    if (this._rafHandle) cancelAnimationFrame(this._rafHandle);
    this._rafHandle = null;
  }

  forceRenderOnce() {
    this.render();
  }

  setBackgroundColor(color = 0xffffff) {
    this.options.backgroundColor = color;
    this.scene.background = new THREE.Color(color);
  }

  /* ------------------------------------------------------------------ */
  /* Callbacks                                                          */
  /* ------------------------------------------------------------------ */
  setResizeCallback(cb)      { this.resizeCallback = cb; }
  setCameraChangeCallback(cb){ this.cameraChangeCallback = cb; }
  setContextLostCallback(cb) { this.contextLostCallback = cb; }
  setContextRestoredCallback(cb){ this.contextRestoredCallback = cb; }

  /* ------------------------------------------------------------------ */
  /* Destroy                                                            */
  /* ------------------------------------------------------------------ */
  destroy() {
    this.stop();

    this.resizeObserver?.disconnect?.();
    this.resizeObserver = null;

    window.removeEventListener?.('resize', this._queueResize);

    // dispose objects in groups
    this.clearAllGroups(true);

    // dispose lights
    Object.values(this.lights).forEach(light => {
      this.scene?.remove(light);
      // they have no geometry/material but safe anyway
    });
    this.lights = {};

    // dispose scene
    this.scene?.traverse?.(obj => this.disposeObject3D(obj));
    this.scene?.clear?.();
    this.scene = null;

    // dispose camera controller
    this.cameraController?.destroy?.();
    this.cameraController = null;

    // dispose renderer
    if (this.renderer) {
      this.renderer.dispose();
      const canvas = this.renderer.domElement;
      if (canvas && canvas.parentNode === this.container) {
        this.container.removeChild(canvas);
      }
      this.renderer = null;
    }

    // clear references
    this.groups = {};
  }
}
