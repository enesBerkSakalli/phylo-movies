import {
  Deck,
  OrthographicView,
  OrbitView,
  LinearInterpolator
} from '@deck.gl/core';
import { easeInOutCubic } from '../../../domain/math/mathUtils.js';
import { VIEW_IDS, DEFAULT_ORTHO_STATE, DEFAULT_ORBIT_STATE } from './viewConstants.js';
import { useAppStore } from '../../../core/store.js';
import { getGroupForTaxon } from '../../../treeColoring/utils/GroupingUtils.js';

/**
 * DeckGLContext - Manages the Deck.gl instance lifecycle
 * Handles initialization, configuration, and cleanup of the Deck.gl WebGL context
 */
export class DeckGLContext {

  // ==========================================================================
  // CONSTRUCTOR
  // ==========================================================================

  constructor(container, options = {}) {
    this.container = container;
    this.deck = null;
    this.canvas = null;
    this._resizeObserver = null;

    this._viewStateListeners = new Set();
    this._layerListeners = new Set();
    this._resizeListeners = new Set();
    this._controllerConfigListeners = new Set();

    // OPTIMIZATION: Throttle view state notifications
    this._viewStateNotifyPending = false;

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
      useDevicePixels: true,
      glOptions: {
        antialias: true,
        preserveDrawingBuffer: true
      },
      onViewStateChange: ({ viewState, viewId }) => this._handleViewStateChange(viewState, viewId, activeId),
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

  _handleViewStateChange(viewState, viewId, activeId) {
    const id = viewId || activeId;
    this.viewStates[id] = { ...this.viewStates[id], ...viewState };
    this.deck.setProps({ viewState: this.viewStates[id] });

    // OPTIMIZATION: Throttle listener notifications to ~60fps
    // This prevents flooding listeners during rapid pan/zoom
    if (!this._viewStateNotifyPending) {
      this._viewStateNotifyPending = true;
      requestAnimationFrame(() => {
        this._viewStateNotifyPending = false;
        this._notifyViewStateListeners(this.viewStates[id]);
      });
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
    if ((info.layer?.id === 'phylo-nodes' || info.layer?.id?.includes('label-dots')) && this._onNodeHover) {
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
    if (isDragging) return 'grabbing';
    if (isHovering) return 'pointer';
    return 'default';
  }

  _getTooltip(info) {
    const obj = info?.object;
    if (!obj) return null;

    // Prioritize explicit label text, fallback to node name
    const taxonName = obj.text || obj?.leaf?.data?.name || obj?.data?.name;
    if (!taxonName) return null;

    // Build tooltip content with all available info
    const taxaGrouping = useAppStore.getState().taxaGrouping;
    const tooltipLines = [taxonName];

    if (taxaGrouping) {
      const taxonInfo = this._getAllTaxonInfo(taxonName, taxaGrouping);

      // Add all available fields
      for (const [key, value] of Object.entries(taxonInfo)) {
        if (value != null) {
          tooltipLines.push(`${key}: ${value}`);
        }
      }
    }

    return {
      html: this._formatTooltipHtml(tooltipLines),
      style: {
        fontSize: '11px',
        padding: '6px 10px',
        backgroundColor: 'rgba(30, 30, 30, 0.95)',
        color: '#fff',
        borderRadius: '6px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        maxWidth: '300px'
      }
    };
  }

  /**
   * Format tooltip lines as styled HTML
   * @param {string[]} lines - Array of lines to display
   * @returns {string} HTML string for tooltip
   */
  _formatTooltipHtml(lines) {
    if (lines.length === 0) return '';

    const [title, ...details] = lines;
    let html = `<div style="font-weight: 600; margin-bottom: ${details.length ? '4px' : '0'}; font-size: 12px;">${title}</div>`;

    if (details.length > 0) {
      html += '<div style="font-size: 10px; opacity: 0.9; line-height: 1.4;">';
      html += details.map(line => {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          const key = line.substring(0, colonIdx);
          const value = line.substring(colonIdx + 1).trim();
          return `<div><span style="opacity: 0.7;">${key}:</span> ${value}</div>`;
        }
        return `<div>${line}</div>`;
      }).join('');
      html += '</div>';
    }

    return html;
  }

  /**
   * Get all available information for a taxon based on current grouping configuration
   * @param {string} taxonName - The taxon name
   * @param {Object} taxaGrouping - The taxa grouping configuration from store
   * @returns {Object} Object with all available info fields
   */
  _getAllTaxonInfo(taxonName, taxaGrouping) {
    if (!taxaGrouping) return {};

    const { mode, separators, strategyType, segmentIndex, useRegex, regexPattern, csvTaxaMap, csvData, csvColumn } = taxaGrouping;
    const info = {};

    if (mode === 'taxa') {
      // Individual taxa mode - no additional group info
      return info;
    }

    if (mode === 'csv') {
      // CSV-based grouping: show all column values for this taxon
      if (csvData?.taxaData) {
        // taxaData is Map or Object: taxon -> {col1: val1, col2: val2, ...}
        let taxonData;
        if (csvData.taxaData instanceof Map) {
          taxonData = csvData.taxaData.get(taxonName);
        } else if (typeof csvData.taxaData === 'object') {
          taxonData = csvData.taxaData[taxonName];
        }

        if (taxonData && typeof taxonData === 'object') {
          // Add all column values
          for (const [colName, value] of Object.entries(taxonData)) {
            info[colName] = value;
          }
        }
      } else if (csvTaxaMap) {
        // Fallback: just show the current column mapping
        let groupValue;
        if (csvTaxaMap instanceof Map) {
          groupValue = csvTaxaMap.get(taxonName);
        } else if (typeof csvTaxaMap === 'object') {
          groupValue = csvTaxaMap[taxonName];
        }
        if (groupValue) {
          info[csvColumn || 'Group'] = groupValue;
        }
      }
      return info;
    }

    if (mode === 'groups') {
      // Pattern-based grouping: compute and show the group
      const options = { segmentIndex, useRegex, regexPattern };
      const groupName = getGroupForTaxon(taxonName, separators, strategyType, options);
      if (groupName) {
        info['Group'] = groupName;
        // Show the strategy used
        if (strategyType) {
          info['Strategy'] = strategyType;
        }
      }
      return info;
    }

    return info;
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
    // Notify listeners (e.g. to update React ref cache)
    this._layerListeners.forEach(listener => listener(layers));

    this.setProps({ layers });
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
    if (this.deck) {
      this.deck.setProps({ controller: config });
    }
  }

  getCursor(isDragging, isHovering) {
    return this._getCursor(isDragging, isHovering);
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

  // ==========================================================================
  // PUBLIC API - Animated Transitions
  // ==========================================================================

  transitionTo({ target, zoom, duration = this._durations.fit, easing = this._defaultEasing, interpolator } = {}) {
    const id = this._activeViewId();
    const clampedZoom = this._clampZoom(id, zoom);
    const transitionInterpolator = interpolator || this._interpolatorFor(id);

    this._applyViewState(
      id,
      { target, zoom: clampedZoom },
      { transitionDuration: duration, transitionEasing: easing, transitionInterpolator }
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

  _clampZoom(viewId, zoom) {
    const viewState = this.viewStates[viewId];
    const minZoom = viewState.minZoom ?? -Infinity;
    const maxZoom = viewState.maxZoom ?? Infinity;
    return Math.max(minZoom, Math.min(maxZoom, zoom));
  }

  _applyViewState(id, patch, transitionProps) {
    const next = { ...this.viewStates[id], ...patch, ...transitionProps };
    this.viewStates[id] = next;
    this.setProps({ viewState: next });
  }

  _setupResizeObserver() {
    try {
      if (!this.container?.node || typeof ResizeObserver === 'undefined') return;

      // Cleanup existing observer to prevent memory leaks or duplicate events
      if (this._resizeObserver) {
        this._resizeObserver.disconnect();
      }

      const element = this.container.node();
      this._resizeObserver = new ResizeObserver(() => {
        this._updateDeckSize(true);
      });
      this._resizeObserver.observe(element);
    } catch (err) {
      console.warn('[DeckGLContext] ResizeObserver unavailable:', err);
    }
  }

  _updateDeckSize(forceRedraw = false) {
    if (!this.container?.node) return;
    const rect = this.container.node().getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));

    const dimensions = { width, height };
    this._resizeListeners.forEach(listener => listener(dimensions));

    if (!this.deck) return;

    // Only push updates when size actually changes
    if (this.deck.props?.width !== width || this.deck.props?.height !== height) {
      this.deck.setProps({ width, height });
      if (forceRedraw) {
        this.deck.redraw(true);
      }
    }
  }


}
