import * as THREE from 'three';

/**
 * Advanced WebGL Camera Controller (JavaScript version)
 * - Orthographic + Isometric (perspective) modes
 * - Smooth panning/zooming with inertia & damping
 * - Mouse, touch, and keyboard input
 * - Optional bounds/limits, focus/fit helpers
 * - Resize handling and event lifecycle management
 */
export class WebGLCameraController {
  constructor(renderer, containerElement, options = {}) {
    // Required refs
    this.renderer = renderer;
    this.containerElement = containerElement || null;
    this.canvasElement = renderer?.domElement ?? null;

    // Options with defaults
    this.cameraMode      = options.cameraMode      ?? 'orthographic';
    this.zoomSpeed       = options.zoomSpeed       ?? 0.1;
    this.panSpeed        = options.panSpeed        ?? 0.5;
    this.minZoom         = options.minZoom         ?? 0.05;
    this.maxZoom         = options.maxZoom         ?? 50;
    this.minZ            = options.minZ            ?? 0.5;
    this.maxZ            = options.maxZ            ?? 5000;
    this.inertia         = THREE.MathUtils.clamp(options.inertia ?? 0.85, 0, 0.99);
    this.damping         = THREE.MathUtils.clamp(options.damping ?? 0.9, 0, 1);
    this.bounds          = options.bounds          ?? null; // THREE.Box2 or null
    this.enableKeyboard  = options.enableKeyboard  ?? true;
    this.enableTouch     = options.enableTouch     ?? true;
    this.onCameraRecreated = options.onCameraRecreated ?? null;

    // State
    this.camera = null;
    this.isPointerDown = false;
    this.lastPointerPos = { x: 0, y: 0 };
    this.panVelocity = new THREE.Vector2();
    this.zoomVelocity = 0;

    this.activeTouches = new Map();
    this.lastPinchDist = 0;

    this.rafId = null;

    // Init
    this.initializeCamera();
    this.bindEventHandlers();
    this.startLoop();
  }

  // ===== Public API =====
  getCamera() { return this.camera; }
  getCameraMode() { return this.cameraMode; }

  switchCameraMode(mode = 'orthographic') {
    if (mode === this.cameraMode) return;
    this.cameraMode = mode;
    this.initializeCamera();
    this.onCameraRecreated?.(this.camera, this.cameraMode);
  }

  toggleCameraMode() {
    const newMode = this.cameraMode === 'orthographic' ? 'isometric' : 'orthographic';
    this.switchCameraMode(newMode);
    return newMode;
  }

  resetCamera() {
    if (!this.camera) return;
    if (this.isOrtho()) {
      this.camera.position.set(0, 0, 10);
      this.camera.zoom = 1;
    } else {
      this.camera.position.set(0, 0, 800);
      this.camera.lookAt(0, 0, 0);
    }
    this.camera.updateProjectionMatrix();
  }

  /** Focus / fit content (world radius or bounding box) */
  focusCameraOnTree(maxRadius = 500) {
    if (!this.camera) return;
    if (this.isOrtho()) {
      const { width, height } = this.getSize();
      const minDim = Math.min(width, height);

      // CRITICAL FIX: Prevent excessive zoom on initial load
      // Ensure minimum radius to avoid division by very small numbers
      const minRadius = 200; // Sensible minimum to prevent extreme zoom levels
      const safeRadius = Math.max(maxRadius, minRadius);

      // Reduced multiplier for better initial framing
      const optimalZoom = minDim / (safeRadius * 2.5);
      const clampedZoom = THREE.MathUtils.clamp(optimalZoom, this.minZoom, this.maxZoom);

      this.camera.position.set(0, 0, 500);
      this.camera.zoom = clampedZoom;
      this.camera.updateProjectionMatrix();
    } else {
      // For perspective camera, also apply safer distance calculation
      const minRadius = 300;
      const safeRadius = Math.max(maxRadius, minRadius);
      const optimalDistance = Math.max(safeRadius * 2.8, 1200);
      const tiltAngle = Math.PI / 4;
      this.camera.position.set(0, -optimalDistance * Math.sin(tiltAngle), optimalDistance * Math.cos(tiltAngle));
      this.camera.lookAt(0, 0, 0);
      this.camera.updateProjectionMatrix();
    }
  }

  handleResize(width, height) {
    if (!this.camera) return;
    if (this.isOrtho()) {
      this.camera.left = width / -2;
      this.camera.right = width / 2;
      this.camera.top = height / 2;
      this.camera.bottom = height / -2;
      this.camera.updateProjectionMatrix();
    } else {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }

  destroy() {
    if (this.canvasElement) {
      this.canvasElement.removeEventListener('mousedown', this.onMouseDown);
      this.canvasElement.removeEventListener('mousemove', this.onMouseMove);
      this.canvasElement.removeEventListener('mouseup', this.onMouseUp);
      this.canvasElement.removeEventListener('wheel', this.onWheel, { passive: false });
      this.canvasElement.removeEventListener('touchstart', this.onTouchStart, { passive: false });
      this.canvasElement.removeEventListener('touchmove', this.onTouchMove, { passive: false });
      this.canvasElement.removeEventListener('touchend', this.onTouchEnd);
      this.canvasElement.removeEventListener('contextmenu', this.preventContextMenu);
    }
    document.removeEventListener('keydown', this.onKeyDown);
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.camera = null;
  }

  // ===== Internal helpers =====
  isOrtho() {
    return !!this.camera && this.camera.isOrthographicCamera;
  }

  getSize() {
    let width = 800, height = 600;
    if (this.containerElement && typeof this.containerElement.getBoundingClientRect === 'function') {
      const rect = this.containerElement.getBoundingClientRect();
      width = rect.width || width;
      height = rect.height || height;
    }
    return { width, height };
  }

  initializeCamera() {
    const { width, height } = this.getSize();
    if (this.cameraMode === 'orthographic') {
      const cam = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, -1000, 1000);
      cam.zoom = 1;
      cam.position.set(0, 0, 500);
      cam.lookAt(0, 0, 0);
      this.camera = cam;
    } else {
      const cam = new THREE.PerspectiveCamera(45, width / height, 0.01, 5000);
      const distance = 1200;
      const tiltAngle = Math.PI / 4;
      cam.position.set(0, -distance * Math.sin(tiltAngle), distance * Math.cos(tiltAngle));
      cam.lookAt(0, 0, 0);
      this.camera = cam;
    }
    this.camera.updateProjectionMatrix();
  }

  bindEventHandlers() {
    if (this.canvasElement) {
      this.canvasElement.addEventListener('mousedown', this.onMouseDown);
      this.canvasElement.addEventListener('mousemove', this.onMouseMove);
      this.canvasElement.addEventListener('mouseup', this.onMouseUp);
      this.canvasElement.addEventListener('wheel', this.onWheel, { passive: false });
      this.canvasElement.addEventListener('contextmenu', this.preventContextMenu);

      if (this.enableTouch) {
        this.canvasElement.addEventListener('touchstart', this.onTouchStart, { passive: false });
        this.canvasElement.addEventListener('touchmove', this.onTouchMove, { passive: false });
        this.canvasElement.addEventListener('touchend', this.onTouchEnd);
      }
    }
    if (this.enableKeyboard) {
      document.addEventListener('keydown', this.onKeyDown);
    }
  }

  // ----- Mouse -----
  onMouseDown = (e) => {
    e.preventDefault();
    this.isPointerDown = true;
    this.lastPointerPos = { x: e.clientX, y: e.clientY };
    if (this.canvasElement) this.canvasElement.style.cursor = 'move';
  };

  onMouseMove = (e) => {
    if (!this.isPointerDown || !this.camera) return;
    e.preventDefault();
    const dx = e.clientX - this.lastPointerPos.x;
    const dy = e.clientY - this.lastPointerPos.y;
    this.lastPointerPos = { x: e.clientX, y: e.clientY };
    this.addPanDelta(dx, dy);
  };

  onMouseUp = (e) => {
    e.preventDefault();
    this.isPointerDown = false;
    if (this.canvasElement) this.canvasElement.style.cursor = 'default';
  };

  onWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY * this.zoomSpeed * -0.01; // invert for natural feel
    this.zoomVelocity += delta;
  };

  preventContextMenu = (e) => e.preventDefault();

  // ----- Touch -----
  onTouchStart = (e) => {
    if (!this.camera) return;
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      this.activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
    }
    if (this.activeTouches.size === 2) {
      this.lastPinchDist = this.getTouchDistance();
    }
  };

  onTouchMove = (e) => {
    if (!this.camera) return;
    e.preventDefault();
    const prevPositions = new Map(this.activeTouches);
    for (const t of Array.from(e.changedTouches)) {
      this.activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
    }

    if (this.activeTouches.size === 1) {
      const id = this.activeTouches.keys().next().value;
      const prev = prevPositions.get(id);
      const current = this.activeTouches.get(id);
      if (prev && current) this.addPanDelta(current.x - prev.x, current.y - prev.y);
    } else if (this.activeTouches.size === 2) {
      const dist = this.getTouchDistance();
      const delta = (dist - this.lastPinchDist) * this.zoomSpeed * 0.005;
      this.zoomVelocity += delta;
      this.lastPinchDist = dist;
    }
  };

  onTouchEnd = (e) => {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      this.activeTouches.delete(t.identifier);
    }
  };

  getTouchDistance() {
    const pts = Array.from(this.activeTouches.values());
    if (pts.length < 2) return 0;
    const dx = pts[0].x - pts[1].x;
    const dy = pts[0].y - pts[1].y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ----- Keyboard -----
  onKeyDown = (e) => {
    if (!this.camera) return;
    switch (e.key.toLowerCase()) {
      case 'r':
        this.resetCamera();
        break;
      case 'v':
        e.preventDefault();
        const newMode = this.toggleCameraMode();
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('webgl-camera-mode-changed', { detail: { mode: newMode } }));
        }
        break;
      case 'w': this.addPanDelta(0, -20, true); break;
      case 's': this.addPanDelta(0, 20, true); break;
      case 'a': this.addPanDelta(-20, 0, true); break;
      case 'd': this.addPanDelta(20, 0, true); break;
      case 'q': this.zoomVelocity += 0.2; break;
      case 'e': this.zoomVelocity -= 0.2; break;
    }
  };

  // ----- Movement helpers -----
  addPanDelta(dx, dy, immediate = false) {
    const scale = this.panSpeed;
    if (immediate) {
      this.applyPan(dx * scale, dy * scale);
    } else {
      this.panVelocity.x += dx * scale;
      this.panVelocity.y += dy * scale;
    }
  }

  applyPan(dx, dy) {
    if (!this.camera) return;
    if (this.isOrtho()) {
      this.camera.position.x -= dx;
      this.camera.position.y += dy;
      this.clampToBounds();
    } else {
      this.camera.position.x -= dx;
      this.camera.position.y += dy;
    }
  }

  applyZoom(delta) {
    if (!this.camera) return;
    if (this.isOrtho()) {
      this.camera.zoom = THREE.MathUtils.clamp(this.camera.zoom + delta, this.minZoom, this.maxZoom);
      this.camera.updateProjectionMatrix();
    } else {
      this.camera.position.z = THREE.MathUtils.clamp(this.camera.position.z - delta * 100, this.minZ, this.maxZ);
    }
  }

  clampToBounds() {
    if (!this.bounds || !this.camera || !this.isOrtho()) return;
    const cam = this.camera;
    const halfW = (cam.right - cam.left) / (2 * cam.zoom);
    const halfH = (cam.top - cam.bottom) / (2 * cam.zoom);

    const minX = this.bounds.min.x + halfW;
    const maxX = this.bounds.max.x - halfW;
    const minY = this.bounds.min.y + halfH;
    const maxY = this.bounds.max.y - halfH;

    cam.position.x = THREE.MathUtils.clamp(cam.position.x, minX, maxX);
    cam.position.y = THREE.MathUtils.clamp(cam.position.y, minY, maxY);
  }

  // ----- RAF update -----
  startLoop() {
    const update = () => {
      if (this.panVelocity.lengthSq() > 0.0001) {
        this.applyPan(this.panVelocity.x, this.panVelocity.y);
        this.panVelocity.multiplyScalar(this.inertia);
      } else {
        this.panVelocity.set(0, 0);
      }

      if (Math.abs(this.zoomVelocity) > 0.0001) {
        this.applyZoom(this.zoomVelocity);
        this.zoomVelocity *= this.damping;
      } else {
        this.zoomVelocity = 0;
      }

      this.rafId = requestAnimationFrame(update);
    };
    this.rafId = requestAnimationFrame(update);
  }
}
