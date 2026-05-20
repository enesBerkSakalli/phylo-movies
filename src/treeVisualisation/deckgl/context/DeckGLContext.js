import {
  Deck
} from '@deck.gl/core';
import { easeInOutCubic } from '../../../domain/math/mathUtils.js';
import { useAppStore } from '../../../state/phyloStore/store.js';
import { measureFrameStep } from '../../performance/frameInstrumentation.js';
import { createTaxonTooltip } from './tooltipUtils.js';
import {
  createDeckInterpolators,
  createDeckViews,
  createInitialViewStates,
  getActiveViewId,
  getDefaultViewStateFor,
  clampViewZoom
} from './cameraState.js';
import {
  createDeckCanvas,
  getCanvasDimensions,
  getDeckCursor,
  getDefaultControllerConfig,
  isTreeNodeLayer,
  removeChildren
} from './deckContextUtils.js';

/**
 * DeckGLContext - Manages the Deck.gl instance lifecycle
 * Handles initialization, configuration, and cleanup of the Deck.gl WebGL context
 */
export class DeckGLContext {

  // ==========================================================================
  // CONSTRUCTOR
  // ==========================================================================

  constructor(container, options = {}) {
    this.container = container || null;
    this.deck = null;
    this.canvas = null;
    this._resizeObserver = null;

    this._viewStateListeners = new Set();
    this._layerListeners = new Set();
    this._resizeListeners = new Set();

    // OPTIMIZATION: Throttle view state notifications
    this._viewStateNotifyPending = false;
    this._pendingViewStateId = null;

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
    this._controllerConfig = this._getControllerConfig();

    // One view active at a time, but we keep both defined to swap instantly
    this.views = createDeckViews(this._controllerConfig);

    // Persist last view state per camera so toggling cameras keeps position
    this.viewStates = createInitialViewStates(options);

    // Interpolators for animated transitions (LinearInterpolator for non-geospatial views)
    this.interpolators = createDeckInterpolators();

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
    removeChildren(this.container);
    this._createCanvas();

    const activeId = this._activeViewId();
    const initialViewState = this.viewStates[activeId];

    this.deck = new Deck({
      canvas: this.canvas,
      views: [this.views[this.cameraMode]],
      viewState: initialViewState,
      _backgroundColor: [255, 255, 255, 255],
      useDevicePixels: true,
      glOptions: {
        antialias: true,
        preserveDrawingBuffer: true
      },
      onViewStateChange: ({ viewState, viewId }) => this._handleViewStateChange(viewState, viewId),
      onClick: (info, event) => this._handleClick(info, event),
      onHover: (info, event) => this._handleHover(info, event),
      onDragStart: (info, event) => this._handleDragStart(info, event),
      onDrag: (info, event) => this._handleDrag(info, event),
      onDragEnd: (info, event) => this._handleDragEnd(info, event),
      // Simple tooltip so hidden-label dots (and nodes) reveal the name on hover
      getTooltip: (info) => this._getTooltip(info),
      getCursor: ({ isDragging, isHovering }) => this._getCursor(isDragging, isHovering),
      onWebGLInitialized: (gl) => this._onWebGLInitialized?.(gl),
      onError: (error) => {
        this._onError?.(error);
        console.error('[DeckGLContext] Deck.gl error:', error);
      }
    });

    // Ensure deck starts with correct dimensions and stays in sync with container resizing
    this._updateDeckSize(true);
    this._setupResizeObserver();

    return this.deck;
  }

  _createCanvas() {
    this.canvas = createDeckCanvas(this.container);
  }

  _getControllerConfig() {
    return this._controllerConfig || getDefaultControllerConfig();
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

  onResize(callback) {
    if (typeof callback === 'function') {
      this._resizeListeners.add(callback);
    }
  }

  removeResizeListener(callback) {
    this._resizeListeners.delete(callback);
  }

  startResizeObserver() {
    this._updateDeckSize(true);
    this._setupResizeObserver();
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

  _handleViewStateChange(viewState, viewId) {
    const id = viewId || this._activeViewId();
    this.viewStates[id] = { ...this.viewStates[id], ...viewState };
    this.deck.setProps({ viewState: this.viewStates[id] });
    this._pendingViewStateId = id;

    // OPTIMIZATION: Throttle listener notifications to ~60fps
    // This prevents flooding listeners during rapid pan/zoom
    if (!this._viewStateNotifyPending) {
      this._viewStateNotifyPending = true;
      requestAnimationFrame(() => {
        this._viewStateNotifyPending = false;
        const notifyId = this._pendingViewStateId || this._activeViewId();
        this._pendingViewStateId = null;
        this._notifyViewStateListeners(this.viewStates[notifyId]);
      });
    }
  }

  _handleClick(info, event) {
    if (isTreeNodeLayer(info.layer?.id) && this._onNodeClick) {
      event?.stopPropagation?.();
      event?.preventDefault?.();
      this._onNodeClick(info, event);
      return true;
    }
    return false;
  }

  _handleHover(info, event) {
    const layerId = info.layer?.id;
    if ((isTreeNodeLayer(layerId) || layerId?.includes('label-dots')) && this._onNodeHover) {
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
        console.warn('[DeckGLContext] viewState listener failed:', err);
      }
    });
  }

  _getCursor(isDragging, isHovering) {
    return getDeckCursor(isDragging, isHovering);
  }

  _getTooltip(info) {
    const taxaGrouping = useAppStore.getState().taxaGrouping;
    return createTaxonTooltip(info, taxaGrouping);
  }

  // ==========================================================================
  // PUBLIC API - Deck Properties
  // ==========================================================================

  setProps(props) {
    if (!this.deck) {
      console.warn('[DeckGLContext] Deck not initialized, cannot set props');
      return;
    }
    this.deck.setProps(props);
  }

  setLayers(layers) {
    return measureFrameStep('deckContext.setLayers', () => {
      // Notify listeners (e.g. to update React ref cache)
      this._layerListeners.forEach(listener => listener(layers));

      this.setProps({ layers });
    });
  }

  addLayerListener(listener) {
    this._layerListeners.add(listener);
  }

  removeLayerListener(listener) {
    this._layerListeners.delete(listener);
  }

  getControllerConfig() {
    return this._getControllerConfig();
  }

  setControllerConfig(config) {
    if (this._controllerConfigCallback) {
      this._controllerConfigCallback(config);
    }
    this._controllerConfig = config;
    this.views = createDeckViews(config);
    if (this.deck) {
      this.deck.setProps({ views: [this.views[this.cameraMode]] });
    }
  }

  getCursor(isDragging, isHovering) {
    return this._getCursor(isDragging, isHovering);
  }

  getCanvasDimensions() {
    return getCanvasDimensions(this.canvas, this.container);
  }

  // ==========================================================================
  // PUBLIC API - Camera Mode
  // ==========================================================================

  getActiveView() {
    return this.views[this.cameraMode];
  }

  setCameraMode(mode, { preserveTarget = true } = {}) {
    if (mode !== 'orthographic' && mode !== 'orbit') {
      console.warn(`[DeckGLContext] Invalid camera mode: ${mode}. Must be 'orthographic' or 'orbit'.`);
      return;
    }
    if (mode === this.cameraMode) return;

    const fromId = this._activeViewId();
    this.cameraMode = mode;
    const toId = this._activeViewId();

    if (preserveTarget) {
      this.viewStates[toId].target = [...(this.viewStates[fromId].target || [0, 0, 0])];
    }

    this.setProps({
      views: [this.views[this.cameraMode]],
      viewState: this.viewStates[toId]
    });
  }

  // ==========================================================================
  // PUBLIC API - View State
  // ==========================================================================

  getViewState() {
    const id = this._activeViewId();
    return { ...this.viewStates[id] };
  }

  getPrimaryViewport() {
    const view = this.getActiveView();
    const viewState = this.getViewState();
    const { width, height } = this.getCanvasDimensions();

    try {
      if (view?.makeViewport) {
        return view.makeViewport({ width, height, viewState });
      }
    } catch {
      return null;
    }

    return null;
  }

  // ==========================================================================
  // PUBLIC API - Animated Transitions
  // ==========================================================================

  transitionTo({ target, zoom, duration = this._durations.fit, easing = this._defaultEasing, interpolator } = {}) {
    const id = this._activeViewId();
    const currentViewState = this.viewStates[id];
    const clampedZoom = this._clampZoom(id, zoom ?? currentViewState.zoom);
    const transitionInterpolator = interpolator || this._interpolatorFor(id);
    const patch = { zoom: clampedZoom };
    if (target !== undefined) {
      patch.target = target;
    }

    this._applyViewState(
      id,
      patch,
      { transitionDuration: duration, transitionEasing: easing, transitionInterpolator }
    );
  }

  zoomBy(delta, { duration = 180, easing = this._defaultEasing } = {}) {
    const id = this._activeViewId();
    const currentViewState = this.viewStates[id];
    const currentZoom = Number.isFinite(currentViewState.zoom) ? currentViewState.zoom : 0;

    this.transitionTo({
      zoom: currentZoom + delta,
      duration,
      easing,
      interpolator: this._interpolatorFor(id)
    });
  }

  resetView({ duration = 250, easing = this._defaultEasing } = {}) {
    const id = this._activeViewId();
    const defaultState = this._defaultViewStateFor(id);

    this._applyViewState(
      id,
      defaultState,
      {
        transitionDuration: duration,
        transitionEasing: easing,
        transitionInterpolator: this._interpolatorFor(id)
      }
    );
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  destroy() {
    // Only finalize deck if we own it (not external/React-managed)
    if (this.deck) {
      this.deck.finalize();
    }
    this.deck = null;

    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }

    // Safety check: verify parentNode exists and canvas is actually its child
    try {
      if (this.canvas && this.canvas.parentNode && this.canvas.parentNode.contains(this.canvas)) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
    } catch (e) {
      console.warn('[DeckGLContext] Failed to remove canvas:', e);
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
    this._viewStateNotifyPending = false;
    this._pendingViewStateId = null;
    this._viewStateListeners.clear();
    this._layerListeners.clear();
    this._resizeListeners.clear();
  }

  // ==========================================================================
  // INTERNAL HELPERS
  // ==========================================================================

  _activeViewId() {
    return getActiveViewId(this.cameraMode);
  }

  _interpolatorFor(id) {
    return id === getActiveViewId('orthographic') ? this.interpolators.orthographic : this.interpolators.orbit;
  }

  _defaultViewStateFor(id) {
    return getDefaultViewStateFor(id);
  }

  _clampZoom(viewId, zoom) {
    return clampViewZoom(this.viewStates[viewId], zoom);
  }

  _applyViewState(id, patch, transitionProps) {
    const next = { ...this.viewStates[id], ...patch, ...transitionProps };
    this.viewStates[id] = next;
    this.setProps({ viewState: next });
  }

  _setupResizeObserver() {
    try {
      if (!this.container || typeof ResizeObserver === 'undefined') return;

      // Cleanup existing observer to prevent memory leaks or duplicate events
      if (this._resizeObserver) {
        this._resizeObserver.disconnect();
      }

      this._resizeObserver = new ResizeObserver(() => {
        this._updateDeckSize(true);
      });
      this._resizeObserver.observe(this.container);
    } catch (err) {
      console.warn('[DeckGLContext] ResizeObserver unavailable:', err);
    }
  }

  _updateDeckSize(forceRedraw = false) {
    if (!this.container) return;
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));

    const dimensions = { width, height };
    this._resizeListeners.forEach(listener => listener(dimensions));

    if (!this.deck) return;

    // Only push updates when size actually changes
    if (this.deck.props?.width !== width || this.deck.props?.height !== height) {
      this.deck.setProps?.({ width, height });
      if (forceRedraw && typeof this.deck.redraw === 'function') {
        this.deck.redraw(true);
      }
    }
  }


}
