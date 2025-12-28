import {
  Deck,
  OrthographicView,
  OrbitView,
  LinearInterpolator
} from '@deck.gl/core';
import { easeInOutCubic } from '../../../domain/math/mathUtils.js';
import { VIEW_IDS, DEFAULT_ORTHO_STATE, DEFAULT_ORBIT_STATE } from './viewConstants.js';

/**
 * DeckManager - Manages the Deck.gl instance lifecycle
 * Handles initialization, configuration, and cleanup of the Deck.gl WebGL context
 */
export class DeckManager {

  // ==========================================================================
  // CONSTRUCTOR
  // ==========================================================================

  constructor(container, options = {}) {
    this.container = container;
    this.deck = null;
    this.canvas = null;
    this._resizeObserver = null;
    this.useExternalDeck = options.useExternalDeck ?? false;
    this._viewStateListeners = new Set();

    // Event callbacks
    this._onWebGLInitialized = null;
    this._onError = null;
    this._onNodeClick = null;
    this._onNodeHover = null;
    this._onDragStart = null;
    this._onDrag = null;
    this._onDragEnd = null;
    this._controllerConfigCallback = null;

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

    // Interpolators for animated transitions (LinearInterpolator for non-geospatial views)
    this.interpolatorOrtho = new LinearInterpolator({ transitionProps: ['target', 'zoom'] });
    this.interpolatorOrbit = new LinearInterpolator({
      transitionProps: ['target', 'zoom', 'rotationOrbit', 'rotationX']
    });

    // Default transition tuning
    this._defaultEasing = easeInOutCubic;
    this._durations = {
      fit: 700
    };
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  initialize() {
    if (this.useExternalDeck) {
      return null;
    }
    this.container.selectAll('*').remove();
    this._createCanvas();

    const activeId = this._activeViewId();
    const initialViewState = this.viewStates[activeId];

    this.deck = new Deck({
      canvas: this.canvas,
      views: [this.views[this.cameraMode]],
      controller: this._getControllerConfig(),
      viewState: initialViewState,
      _backgroundColor: [255, 255, 255, 255],
      onViewStateChange: ({ viewState, viewId }) => this._handleViewStateChange(viewState, viewId, activeId),
      onClick: (info, event) => this._handleClick(info, event),
      onHover: (info, event) => this._handleHover(info, event),
      onDragStart: (info, event) => this._handleDragStart(info, event),
      onDrag: (info, event) => this._handleDrag(info, event),
      onDragEnd: (info, event) => this._handleDragEnd(info, event),
      getCursor: ({ isDragging, isHovering }) => this._getCursor(isDragging, isHovering),
      onWebGLInitialized: (gl) => this._onWebGLInitialized?.(gl),
      onError: (error) => {
        this._onError?.(error);
        console.error('[DeckManager] Deck.gl error:', error);
      }
    });

    // Ensure deck starts with correct dimensions and stays in sync with container resizing
    this._updateDeckSize(true);
    this._setupResizeObserver();

    return this.deck;
  }

  _createCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.container.node().appendChild(this.canvas);
  }

  _getControllerConfig() {
    return {
      doubleClickZoom: false,
      touchZoom: true,
      touchRotate: true,
      scrollZoom: true,
      dragPan: true,
      dragRotate: true,
      keyboard: true
    };
  }

  // ==========================================================================
  // EVENT CALLBACKS (Registration)
  // ==========================================================================

  onWebGLInitialized(callback) {
    this._onWebGLInitialized = callback;
  }

  onError(callback) {
    this._onError = callback;
  }

  onNodeClick(callback) {
    this._onNodeClick = callback;
  }

  onNodeHover(callback) {
    this._onNodeHover = callback;
  }

  onDragStart(callback) {
    this._onDragStart = callback;
  }

  onDrag(callback) {
    this._onDrag = callback;
  }

  onDragEnd(callback) {
    this._onDragEnd = callback;
  }

  onControllerConfigChange(callback) {
    this._controllerConfigCallback = callback;
  }

  addViewStateListener(listener) {
    if (typeof listener === 'function') {
      this._viewStateListeners.add(listener);
    }
  }

  removeViewStateListener(listener) {
    if (listener && this._viewStateListeners.has(listener)) {
      this._viewStateListeners.delete(listener);
    }
  }

  // ==========================================================================
  // EVENT HANDLERS (Internal)
  // ==========================================================================

  _handleViewStateChange(viewState, viewId, activeId) {
    const id = viewId || activeId;
    this.viewStates[id] = { ...this.viewStates[id], ...viewState };
    if (this.useExternalDeck) {
      this._notifyViewStateListeners(this.viewStates[id]);
    } else {
      this.deck.setProps({ viewState: this.viewStates[id] });
    }
  }

  _handleClick(info, event) {
    if (info.layer?.id === 'phylo-nodes' && this._onNodeClick) {
      event?.stopPropagation?.();
      event?.preventDefault?.();
      this._onNodeClick(info, event);
      return true;
    }
    return false;
  }

  _handleHover(info, event) {
    if (info.layer?.id === 'phylo-nodes' && this._onNodeHover) {
      this._onNodeHover(info, event);
    }
  }

  _handleDragStart(info, event) {
    if (this._onDragStart) {
      return this._onDragStart(info, event);
    }
    return false;
  }

  _handleDrag(info, event) {
    if (this._onDrag) {
      return this._onDrag(info, event);
    }
    return false;
  }

  _handleDragEnd(info, event) {
    if (this._onDragEnd) {
      return this._onDragEnd(info, event);
    }
    return false;
  }

  _notifyViewStateListeners(viewState) {
    this._viewStateListeners.forEach((listener) => {
      try {
        listener(viewState);
      } catch (err) {
        console.warn('[DeckManager] viewState listener failed:', err);
      }
    });
  }

  _getCursor(isDragging, isHovering) {
    if (isDragging) return 'grabbing';
    if (isHovering) return 'pointer';
    return 'default';
  }

  // ==========================================================================
  // PUBLIC API - Deck Properties
  // ==========================================================================

  setProps(props) {
    if (this.useExternalDeck) {
      // In React mode, we don't directly set props on the deck
      // Layers are managed via React state, other props via callbacks
      console.warn('[DeckManager] setProps called in external deck mode - use React state instead');
      return;
    }
    if (!this.deck) {
      console.warn('[DeckManager] Deck not initialized, cannot set props');
      return;
    }
    this.deck.setProps(props);
  }

  setLayers(layers) {
    // In React mode, layers should be set via _reactLayerUpdater, not here
    if (this.useExternalDeck) {
      console.warn('[DeckManager] setLayers called in external deck mode - use React layer updater instead');
      return;
    }
    this.setProps({ layers });
  }

  getControllerConfig() {
    return this._getControllerConfig();
  }

  setControllerConfig(config) {
    if (this._controllerConfigCallback) {
      this._controllerConfigCallback(config);
    } else if (!this.useExternalDeck && this.deck) {
      this.deck.setProps({ controller: config });
    }
  }

  getCursor(isDragging, isHovering) {
    return this._getCursor(isDragging, isHovering);
  }

  attachExternalDeck(deckInstance) {
    this.deck = deckInstance;
    this.canvas = deckInstance?.canvas || null;
  }

  getCanvasDimensions() {
    if (this.canvas) {
      const w = this.canvas.clientWidth || this.canvas.width || 800;
      const h = this.canvas.clientHeight || this.canvas.height || 600;
      return { width: w, height: h };
    }
    const node = this.container?.node?.();
    if (node) {
      const rect = node.getBoundingClientRect();
      return { width: rect.width || 800, height: rect.height || 600 };
    }
    return { width: 800, height: 600 };
  }

  // ==========================================================================
  // PUBLIC API - Camera Mode
  // ==========================================================================

  getActiveView() {
    return this.views[this.cameraMode];
  }

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

    if (this.useExternalDeck) {
      this._notifyViewStateListeners(this.viewStates[toId]);
    } else {
      this.setProps({
        views: [this.views[this.cameraMode]],
        viewState: this.viewStates[toId]
      });
    }
  }

  // ==========================================================================
  // PUBLIC API - View State
  // ==========================================================================

  getViewState() {
    const id = this._activeViewId();
    return { ...this.viewStates[id] };
  }

  // ==========================================================================
  // PUBLIC API - Animated Transitions
  // ==========================================================================

  fitToBounds(bounds, { padding = 1.2, duration = this._durations.fit, easing = this._defaultEasing, interpolator, labels = null, labelSizePx = null, getLabelSize = null } = {}) {
    const id = this._activeViewId();
    const { width: canvasWidth, height: canvasHeight } = this.getCanvasDimensions();

    // Expand bounds to account for label glyph size
    const expandedBounds = this._expandBoundsForLabels(bounds, labels, labelSizePx, getLabelSize);

    const centerX = (expandedBounds.minX + expandedBounds.maxX) / 2;
    const centerY = (expandedBounds.minY + expandedBounds.maxY) / 2;
    const w = Math.max(1e-6, expandedBounds.maxX - expandedBounds.minX);
    const h = Math.max(1e-6, expandedBounds.maxY - expandedBounds.minY);

    let zoom = Math.log2(Math.min(canvasWidth / (w * padding), canvasHeight / (h * padding)));
    zoom = this._clampZoom(id, zoom);

    const transitionInterpolator = interpolator || this._interpolatorFor(id);
    this._applyViewState(
      id,
      { target: [centerX, centerY, 0], zoom },
      { transitionDuration: duration, transitionEasing: easing, transitionInterpolator }
    );
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  destroy() {
    // Only finalize deck if we own it (not external/React-managed)
    if (this.deck && !this.useExternalDeck) {
      this.deck.finalize();
    }
    this.deck = null;

    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this.canvas && this.canvas.parentNode && !this.useExternalDeck) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.canvas = null;
    this._onWebGLInitialized = null;
    this._onError = null;
    this._onNodeClick = null;
    this._onNodeHover = null;
    this._onDragStart = null;
    this._onDrag = null;
    this._onDragEnd = null;
    this._controllerConfigCallback = null;
    this._viewStateListeners.clear();
  }

  // ==========================================================================
  // INTERNAL HELPERS
  // ==========================================================================

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
    if (this.useExternalDeck) {
      this._notifyViewStateListeners(next);
    } else {
      this.setProps({ viewState: next });
    }
  }

  _setupResizeObserver() {
    try {
      if (!this.container?.node || typeof ResizeObserver === 'undefined') return;
      const element = this.container.node();

      this._resizeObserver = new ResizeObserver(() => {
        this._updateDeckSize(true);
      });
      this._resizeObserver.observe(element);
    } catch (err) {
      console.warn('[DeckManager] ResizeObserver unavailable:', err);
    }
  }

  _updateDeckSize(forceRedraw = false) {
    if (!this.deck || !this.container?.node) return;
    const rect = this.container.node().getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));

    // Only push updates when size actually changes
    if (this.deck.props?.width !== width || this.deck.props?.height !== height) {
      this.deck.setProps({ width, height });
      if (forceRedraw) {
        this.deck.redraw(true);
      }
    }
  }

  _expandBoundsForLabels(bounds, labels, labelSizePx, getLabelSize) {
    if (!labels || !labels.length) return bounds;

    try {
      const sizePx = labelSizePx || (typeof getLabelSize === 'function' ? getLabelSize() : 16);
      const maxChars = labels.reduce((m, l) => Math.max(m, (l.text || '').length), 0);
      const estCharWidth = 0.6 * sizePx;
      const estLabelWidth = Math.min(2000, maxChars * estCharWidth);
      const estLabelHeight = 1.2 * sizePx;

      return {
        minX: bounds.minX - estLabelWidth,
        maxX: bounds.maxX + estLabelWidth,
        minY: bounds.minY - estLabelHeight,
        maxY: bounds.maxY + estLabelHeight
      };
    } catch {
      return bounds;
    }
  }
}
