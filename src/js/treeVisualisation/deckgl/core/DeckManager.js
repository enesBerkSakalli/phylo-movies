import {
  Deck,
  OrthographicView,
  OrbitView,
  LinearInterpolator,
  FlyToInterpolator
} from '@deck.gl/core';

const VIEW_IDS = {
  ORTHO: 'ortho',
  ORBIT: 'orbit'
};

const DEFAULT_ORTHO_STATE = {
  id: VIEW_IDS.ORTHO,
  target: [0, 0, 0],
  zoom: 0,
  minZoom: -10,
  maxZoom: 10
};

const DEFAULT_ORBIT_STATE = {
  id: VIEW_IDS.ORBIT,
  target: [0, 0, 0],
  zoom: 0,
  minZoom: -10,
  maxZoom: 10,
  rotationX: 30,
  rotationOrbit: -30
};

/**
 * DeckManager - Manages the Deck.gl instance lifecycle
 * Handles initialization, configuration, and cleanup of the Deck.gl WebGL context
 */
export class DeckManager {
  constructor(container, options = {}) {
    this.container = container;
    this.deck = null;
    this.canvas = null;
    this._onWebGLInitialized = null;
    this._onError = null;
    this._onNodeClick = null;
    this._onNodeHover = null;

    this.cameraMode = 'orthographic'; // 'orthographic' | 'orbit'

    // One view active at a time, but we keep both defined to swap instantly
    this.views = {
      orthographic: new OrthographicView({ id: VIEW_IDS.ORTHO, controller: true }),
      orbit: new OrbitView({ id: VIEW_IDS.ORBIT, fov: 50, near: 0.1, far: 10000, controller: true })
    };

    // Persist last view state per camera so toggling cameras keeps position
    this.viewStates = {
      [VIEW_IDS.ORTHO]: { ...DEFAULT_ORTHO_STATE, ...(options.initialOrthoState || {}) },
      [VIEW_IDS.ORBIT]: { ...DEFAULT_ORBIT_STATE, ...(options.initialOrbitState || {}) }
    };

    // Interpolators to animate changes
    this.interpolatorOrtho = new LinearInterpolator({ transitionProps: ['target', 'zoom'] });
    this.interpolatorOrbit = new LinearInterpolator({
      transitionProps: ['target', 'zoom', 'rotationOrbit', 'rotationX']
    });

    // If you prefer the "fly" feel everywhere, uncomment these two lines:
    // this.interpolatorOrtho = new FlyToInterpolator({ speed: 1.5 });
    // this.interpolatorOrbit = new FlyToInterpolator({ speed: 1.5 });
  }

  /**
   * Initialize the Deck.gl instance with canvas and default settings
   * @returns {Deck} The initialized Deck instance
   */
  initialize() {
    // Clear any existing content and create canvas
    this.container.selectAll('*').remove();

    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.container.node().appendChild(this.canvas);

    // Add debugging for raw click events on canvas
    this.canvas.addEventListener('click', (event) => {
      console.log('[DeckManager] Raw canvas click detected:', event);
    });

    const activeId = this._activeViewId();
    const initialViewState = this.viewStates[activeId];

    // Make viewState controlled from the start to avoid snap-backs
    this.deck = new Deck({
      canvas: this.canvas,
      views: [this.views[this.cameraMode]],
      controller: {
        doubleClickZoom: false,
        touchZoom: true,
        touchRotate: true,
        scrollZoom: true,
        dragPan: true,
        dragRotate: true,
        keyboard: true
      },
      initialViewState,                    // for first layout
      viewState: initialViewState,         // controlled from the beginning
      onViewStateChange: ({ viewState, viewId }) => {
        // Persist current camera state so switching views doesn't lose it
        const id = viewId || activeId;
        this.viewStates[id] = { ...this.viewStates[id], ...viewState };
        // Keep Deck controlled by immediately setting the new state
        this.deck.setProps({ viewState: this.viewStates[id] });
      },
      onClick: (info, event) => {
        console.log('[DeckManager] DECK.GL onClick triggered!', info);
        console.log('[DeckManager] Layer info:', info.layer?.id);
        console.log('[DeckManager] Object info:', info.object);
        console.log('[DeckManager] Has _onNodeClick callback:', !!this._onNodeClick);

        // Always handle node clicks
        if (info.layer?.id === 'phylo-nodes' && this._onNodeClick) {
          console.log('[DeckManager] Node click detected, calling handler');

          // Prevent event bubbling to avoid immediately hiding the context menu
          if (event && event.stopPropagation) {
            event.stopPropagation();
          }
          if (event && event.preventDefault) {
            event.preventDefault();
          }

          this._onNodeClick(info, event);
          return true; // Consume the event
        }

        // Debug: Log why click wasn't handled
        if (info.layer?.id !== 'phylo-nodes') {
          console.log('[DeckManager] Click on layer:', info.layer?.id, 'but not phylo-nodes');
        } else {
          console.log('[DeckManager] Click with no layer info');
        }

        return false; // Let other handlers process
      },
      onHover: (info, event) => {
        // Handle node hover specifically
        if (info.layer?.id === 'phylo-nodes' && this._onNodeHover) {
          this._onNodeHover(info, event);
        }
      },
      getCursor: ({ isDragging, isHovering }) => {
        if (isDragging) {
          return 'grabbing';
        }
        if (isHovering) {
          return 'pointer';
        }
        return 'default';
      },
      onWebGLInitialized: (gl) => {
        if (this._onWebGLInitialized) this._onWebGLInitialized(gl);
        console.log('[DeckManager] WebGL context initialized');
      },
      onError: (error) => {
        if (this._onError) this._onError(error);
        console.error('[DeckManager] Deck.gl error:', error);
      }
    });

    return this.deck;
  }

  /**
   * Set a callback for when WebGL is initialized
   * @param {Function} callback - Function to call with gl context
   */
  onWebGLInitialized(callback) {
    this._onWebGLInitialized = callback;
  }

  /**
   * Set a callback for error handling
   * @param {Function} callback - Function to call on error
   */
  onError(callback) {
    this._onError = callback;
  }

  /**
   * Set a callback for node click events
   * @param {Function} callback - Function to call when a node is clicked
   */
  onNodeClick(callback) {
    this._onNodeClick = callback;
  }

  /**
   * Set a callback for node hover events
   * @param {Function} callback - Function to call when a node is hovered
   */
  onNodeHover(callback) {
    this._onNodeHover = callback;
  }

  /**
   * Update Deck.gl properties
   * @param {Object} props - Properties to update
   */
  setProps(props) {
    if (!this.deck) {
      console.warn('[DeckManager] Deck not initialized, cannot set props');
      return;
    }
    this.deck.setProps(props);
  }

  /**
   * Set layers on the deck instance
   * @param {Array} layers - Array of Deck.gl layers
   */
  setLayers(layers) {
    this.setProps({ layers });
  }

  /**
   * Get the current Deck instance
   * @returns {Deck|null} The Deck instance or null if not initialized
   */
  getDeck() {
    return this.deck;
  }

  /**
   * Get the current camera mode.
   * @returns {string} The current camera mode ('orthographic' or 'orbit')
   */
  getCameraMode() {
    return this.cameraMode;
  }


  /**
   * Switch the camera mode between 'orthographic' and 'orbit'.
   * Preserves the target (center) by default.
   * @param {string} mode - The target camera mode.
   */
  setCameraMode(mode, { preserveTarget = true } = {}) {
    if (mode !== 'orthographic' && mode !== 'orbit') {
      console.warn(`[DeckManager] Invalid camera mode: ${mode}. Must be 'orthographic' or 'orbit'.`);
      return;
    }
    if (mode === this.cameraMode) return;

    const fromId = this._activeViewId();
    this.cameraMode = mode;
    const toId = this._activeViewId();

    if (preserveTarget) {
      this.viewStates[toId].target = [...(this.viewStates[fromId].target || [0, 0, 0])];
    }

    // Swap the View and apply the saved view state for that camera
    this.setProps({
      views: [this.views[this.cameraMode]],
      viewState: this.viewStates[toId]
    });

    console.log(`[DeckManager] Switching camera mode to: ${this.cameraMode}`);
  }

  /**
   * Get canvas dimensions with fallbacks
   * @returns {Object} Object with width and height
   */
  getCanvasDimensions() {
    if (this.canvas) {
      const w = this.canvas.clientWidth || this.canvas.width || 800;
      const h = this.canvas.clientHeight || this.canvas.height || 600;
      return { width: w, height: h };
    }
    return { width: 800, height: 600 };
  }

  /**
   * Programmatic motion helpers
   */
  panTo(target = [0, 0, 0], { duration = 600, easing, interpolator } = {}) {
    const id = this._activeViewId();
    const transitionInterpolator = interpolator || this._interpolatorFor(id);
    this._applyViewState(id, { target }, { transitionDuration: duration, transitionEasing: easing, transitionInterpolator });
  }

  zoomTo(zoom, { duration = 500, easing, interpolator } = {}) {
    const id = this._activeViewId();
    const clamped = this._clampZoom(id, zoom);
    const transitionInterpolator = interpolator || this._interpolatorFor(id);
    this._applyViewState(id, { zoom: clamped }, { transitionDuration: duration, transitionEasing: easing, transitionInterpolator });
  }

  zoomBy(delta, opts = {}) {
    const id = this._activeViewId();
    const current = this.viewStates[id].zoom ?? 0;
    this.zoomTo(current + delta, opts);
  }

  orbitRotateTo({ rotationOrbit, rotationX }, { duration = 500, easing, interpolator } = {}) {
    const id = this._activeViewId();
    if (id !== VIEW_IDS.ORBIT) return;
    const patch = {};
    if (rotationOrbit !== undefined) patch.rotationOrbit = rotationOrbit;
    if (rotationX !== undefined) patch.rotationX = rotationX;
    const transitionInterpolator = interpolator || this._interpolatorFor(id);
    this._applyViewState(id, patch, { transitionDuration: duration, transitionEasing: easing, transitionInterpolator });
  }

  fitToBounds(bounds, { padding = 1.2, duration = 600, easing, interpolator } = {}) {
    // bounds: {minX, minY, maxX, maxY}
    const id = this._activeViewId();
    const { width: canvasWidth, height: canvasHeight } = this.getCanvasDimensions();

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const w = Math.max(1e-6, bounds.maxX - bounds.minX);
    const h = Math.max(1e-6, bounds.maxY - bounds.minY);

    let zoom = Math.log2(Math.min(canvasWidth / (w * padding), canvasHeight / (h * padding)));
    zoom = this._clampZoom(id, zoom);

    const transitionInterpolator = interpolator || this._interpolatorFor(id);
    this._applyViewState(
      id,
      { target: [centerX, centerY, 0], zoom },
      { transitionDuration: duration, transitionEasing: easing, transitionInterpolator }
    );
  }

  flyTo(patch, { duration = 800, easing, interpolator } = {}) {
    const id = this._activeViewId();
    const transitionInterpolator = interpolator || this._interpolatorFor(id);
    this._applyViewState(id, patch, { transitionDuration: duration, transitionEasing: easing, transitionInterpolator });
  }

  /**
   * Get current view state for the active view
   * @returns {Object} Current view state
   */
  getViewState() {
    const id = this._activeViewId();
    return { ...this.viewStates[id] };
  }

  /**
   * Set view state for the active view
   * @param {Object} viewState - New view state to apply
   */
  setViewState(viewState) {
    const id = this._activeViewId();
    this.viewStates[id] = { ...this.viewStates[id], ...viewState };
    if (this.deck) {
      this.deck.setProps({ viewState: this.viewStates[id] });
    }
  }

  /**
   * Get the container element
   * @returns {HTMLElement} Container element
   */
  getContainer() {
    return this.container;
  }

  /**
   * Clean up and destroy the Deck.gl instance
   */
  destroy() {
    if (this.deck) {
      this.deck.finalize();
      this.deck = null;
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
      this.canvas = null;
    }
    this._onWebGLInitialized = null;
    this._onError = null;
    this._onNodeClick = null;
    this._onNodeHover = null;
  }

  // ---- Internal helpers ----

  _activeViewId() {
    return this.cameraMode === 'orthographic' ? VIEW_IDS.ORTHO : VIEW_IDS.ORBIT;
  }

  _interpolatorFor(id) {
    return id === VIEW_IDS.ORTHO ? this.interpolatorOrtho : this.interpolatorOrbit;
  }

  _clampZoom(id, z) {
    const vs = this.viewStates[id];
    const minZ = vs.minZoom ?? -Infinity;
    const maxZ = vs.maxZoom ?? Infinity;
    return Math.max(minZ, Math.min(maxZ, z));
  }

  _applyViewState(id, patch, transitionProps) {
    const next = { ...this.viewStates[id], ...patch, ...transitionProps };
    this.viewStates[id] = next;
    this.setProps({ viewState: next });
  }

}
