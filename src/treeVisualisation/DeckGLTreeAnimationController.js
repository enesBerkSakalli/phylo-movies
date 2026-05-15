import { DeckGLTreeLayerDataFactory } from './deckgl/DeckGLTreeLayerDataFactory.js';
import { DeckGLContext } from './deckgl/context/DeckGLContext.js';
import { LayerManager } from './deckgl/layers/LayerManager.js';
import { TreeInterpolator } from './deckgl/interpolation/TreeInterpolator.js';
import { InterpolationCache } from './deckgl/interpolation/InterpolationCache.js';
import { AnimationRunner } from './systems/AnimationRunner.js';
import { InterpolationRenderer } from './systems/InterpolationRenderer.js';
import { StaticRenderer } from './systems/StaticRenderer.js';
import { WebGLTreeAnimationController } from './WebGLTreeAnimationController.js';
import { selectActiveTreeList, useAppStore } from '../state/phyloStore/store.js';
import { TreeNodeInteractionHandler } from './interaction/TreeNodeInteractionHandler.js';
import { handleDragStart, handleDrag, handleDragEnd, handleContainerResize } from './interaction/InteractionHandlers.js';
import { ViewportManager } from './viewport/ViewportManager.js';
import { getClipboardLayers } from './utils/ClipboardUtils.js';
import { createLayoutCacheKey, getRotationAlignmentExcludeTaxa } from './utils/layoutCacheKey.js';

export class DeckGLTreeAnimationController extends WebGLTreeAnimationController {

  // ==========================================================================
  // CONSTRUCTOR
  // ==========================================================================

  constructor(options = {}) {
    const { animations = true, viewSide = 'single', offset = null } = options || {};
    super(null);
    this.animationsEnabled = animations;
    this.viewSide = viewSide;
    this._destroyed = false;
    this._resetReadyPromise();

    // Core components
    this.dataConverter = new DeckGLTreeLayerDataFactory();
    this.layerManager = new LayerManager();
    this.treeInterpolator = new TreeInterpolator();
    this.interpolationCache = new InterpolationCache({
      calculateLayout: this.calculateLayout.bind(this),
      getConsistentRadii: this._getConsistentRadii.bind(this),
      convertTreeToLayerData: this.dataConverter.convertTreeToLayerData.bind(this.dataConverter),
      getLayoutCacheKey: (treeIndex) => this._createLayoutCacheKey(treeIndex),
      getRotationAlignmentExcludeTaxa: (treeIndex) => this._getRotationAlignmentExcludeTaxa(treeIndex),
      getLinkGeometryMode: () => this._getLinkGeometryMode()
    });

    // --- WORKER INITIALIZATION ---
    this.layoutWorker = new Worker(new URL('./workers/layout.worker.js', import.meta.url), { type: 'module' });
    this.prefetchedLayoutCacheKeys = new Map();
    this._prefetchRequestTokens = new Map();
    this._layoutRequestGeneration = 0;

    this.layoutWorker.onmessage = (event) => {
      const { jobId, requestToken, status, result, error } = event.data;
      const treeIndex = parseInt(jobId, 10);
      const pendingToken = this._prefetchRequestTokens.get(treeIndex);
      if (requestToken !== pendingToken || requestToken !== this._createLayoutRequestToken(treeIndex)) {
        return;
      }

      if (status === 'SUCCESS') {
        this.interpolationCache.setPrecomputedData(treeIndex, result);
      } else {
        console.warn(`[Worker] Layout failed for tree ${jobId}:`, error);
        this.prefetchedLayoutCacheKeys.delete(treeIndex);
        this._prefetchRequestTokens.delete(treeIndex);
      }
    };
    // -----------------------------

    this.currentTreeData = null;
    this.interactionHandler = new TreeNodeInteractionHandler(this, this.viewSide);

    // Track last tree index we auto-fit to
    this._lastFocusedTreeIndex = null;
    this._hasUserViewportInteraction = false;

    // --- PERFORMANCE OPTIMIZATION: Throttle & Debounce ---
    this._lastZoom = null;
    this._pendingRenderRAF = null;
    this._lastRenderTime = 0;
    this._renderDebounceMs = 16; // ~60fps max
    this._lastLayerData = null;

    // Resize clears cache because dimensions affect layout radius/position
    this.setOnResize(() => {
      this.resetInterpolationCaches();
      handleContainerResize(this);
    });

    // Drag state
    this._dragState = null;

    // Comparison mode renderer (owned by LayerManager)
    this.layerManager.setComparisonContext(this);

    // Renderers
    this.interpolationRenderer = new InterpolationRenderer(this);
    this.staticRenderer = new StaticRenderer(this);

    // Animation Runner
    this.animationRunner = new AnimationRunner({
      getState: () => useAppStore.getState(),
      getOrCacheInterpolationData: this._getOrCacheInterpolationData.bind(this),
      renderSingleFrame: this.interpolationRenderer.renderSingleInterpolatedFrame.bind(this.interpolationRenderer),
      renderComparisonFrame: this._renderComparisonFrameForRunner.bind(this),
      setAnimationStage: (stage) => useAppStore.getState().setAnimationStage(stage),
      updateProgress: (progress) => {
        // Manual store update to keep UI in sync without driving logic
        const state = useAppStore.getState();
        const treeList = selectActiveTreeList(state);
        const totalTrees = treeList?.length || 0;
        const currentTreeIndex = Math.min(Math.floor(progress * (totalTrees - 1)), totalTrees - 1);
        const timelineProgress = state.movieTimelineManager?.getTimelineProgressForLinearTreeProgress?.(progress, totalTrees) ?? progress;
        state.setPlayhead({
          animationProgress: progress,
          timelineProgress,
          currentTreeIndex
        });

        // Prefetch next frames
        if (this.animationsEnabled && totalTrees > 0) {
          this._prefetchFrame(currentTreeIndex + 1);
          this._prefetchFrame(currentTreeIndex + 2);
        }
      },
      stopAnimation: () => useAppStore.getState().stop()
    });

    // Viewport manager for camera and screen projections
    this.viewportManager = new ViewportManager(this);
    this.viewportManager.initializeOffsets(offset);

    this.layerManager.layerStyles.setStyleChangeCallback({
      onLayoutChange: () => this._handleStyleChange(),
      onLayerDataChange: () => this._handleLayerDataChange(),
      onPaintChange: () => this._handlePaintChange()
    });

    // NOTE: deckContext is initialized via mount(container)
    this.deckContext = null;
  }


  _resetReadyPromise() {
    this.ready = false;
    this._resolveReady = null;
    this.readyPromise = new Promise((resolve) => {
      this._resolveReady = resolve;
    });
  }

  _configureDeckContextCallbacks() {
    this.deckContext.onWebGLInitialized((gl) => {
      this._markReady();
    });

    this.deckContext.onError((error) => console.error('[DeckGL Controller] Deck.gl error:', error));

    // Use arrow functions to be safe about 'this' and member existence
    this.deckContext.onNodeClick((info, event) => {
      if (this.interactionHandler) {
        this.interactionHandler.handleNodeClick(info, event, this.deckContext.canvas);
      }
    });

    this.deckContext.onDragStart((info, event) => {
      const handledTreeDrag = handleDragStart(this, info);
      if (!handledTreeDrag) {
        this._hasUserViewportInteraction = true;
      }
      return handledTreeDrag;
    });
    this.deckContext.onDrag((info, event) => handleDrag(this, info));
    this.deckContext.onDragEnd((info, event) => handleDragEnd(this));

    this.deckContext.onResize((dimensions) => {
      this.resize(dimensions);
    });

    // Rerender when camera moves to update dynamic halo scaling (outlineWidth depends on zoom)
    // OPTIMIZATION: Throttle to avoid redundant renders during pan/zoom
    this.deckContext.addViewStateListener((viewState) => this._handleViewStateChange(viewState));
  }

  _handleViewStateChange({ zoom } = {}) {
    // Skip layer rebuilds if animation is running (AnimationRunner handles its own renders).
    if (this.animationRunner.isRunning) return;

    // Skip if zoom hasn't changed significantly (avoid pan-only redundant renders).
    const zoomDelta = this._lastZoom !== null ? Math.abs(zoom - this._lastZoom) : Infinity;
    if (zoomDelta < 0.01) return; // Threshold: ~1% zoom change

    this._lastZoom = zoom;
    this._hasUserViewportInteraction = true;
    this._scheduleRender();
  }

  /**
   * PERFORMANCE: Debounced render scheduling
   * Batches rapid view state changes into a single render per frame
   */
  _scheduleRender() {
    if (this._pendingRenderRAF) return; // Already scheduled

    const now = performance.now();
    const elapsed = now - this._lastRenderTime;

    // If enough time has passed, render immediately
    if (elapsed >= this._renderDebounceMs) {
      this._lastRenderTime = now;
      this.renderAllElements();
      return;
    }

    // Otherwise, schedule for next frame
    this._pendingRenderRAF = requestAnimationFrame(() => {
      this._pendingRenderRAF = null;
      this._lastRenderTime = performance.now();
      this.renderAllElements();
    });
  }

  _markReady() {
    this.ready = true;
    if (typeof this._resolveReady === 'function') {
      this._resolveReady();
      this._resolveReady = null;
    }
  }

  mount(containerElement) {
    if (this._destroyed) return;

    // If we are already mounted to the SAME container, do nothing.
    // If we are mounted to a DIFFERENT container, unmount first (though React cleanup should have handled this).
    if (this.deckContext) {
      const existingNode = this.webglContainer || null;

      if (existingNode === containerElement) {
        return;
      }
      console.warn('[DeckGLTreeAnimationController] Remounting to new container');
      this.unmount();
    }

    this.webglContainer = containerElement;

    // Create DeckGLContext attached to this container
    this.deckContext = new DeckGLContext(containerElement);
    this.deckContext.initialize();

    this._configureDeckContextCallbacks();
    this.resize(this.deckContext.getCanvasDimensions());
    this._markReady();

    // Initial render
    this.renderAllElements();
  }

  unmount() {
    if (this._destroyed) return;

    this.deckContext?.destroy();
    this.deckContext = null;
    this._resetReadyPromise();
  }



  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  setCameraMode(mode) {
    this.deckContext.setCameraMode(mode, { preserveTarget: true });
    this.renderAllElements();
  }

  fitTreeToViewport(options = {}) {
    const nodes = this._lastLayerData?.nodes;
    if (!Array.isArray(nodes) || nodes.length === 0 || !this.viewportManager) return;
    const links = [
      ...(this._lastLayerData.links || []),
      ...(this._lastLayerData.connectors || [])
    ];

    this.viewportManager.focusOnTree(nodes, this._lastLayerData.labels, {
      includeLabels: options.includeLabels !== false,
      duration: options.duration ?? 350,
      padding: options.padding,
      links
    });
  }

  zoomIn() {
    this._hasUserViewportInteraction = true;
    this.deckContext?.zoomBy?.(0.5);
  }

  zoomOut() {
    this._hasUserViewportInteraction = true;
    this.deckContext?.zoomBy?.(-0.5);
  }

  resetTreeView() {
    this._hasUserViewportInteraction = true;
    this.deckContext?.resetView?.();
  }

  startAnimation() {
    if (!this.animationsEnabled) return;
    const { play } = useAppStore.getState();
    play();
    this.animationRunner.start();
  }

  stopAnimation() {
    this.animationRunner.stop();
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;

    super.destroy();
    this.animationRunner.stop();
    // Cancel any pending debounced render
    if (this._pendingRenderRAF) {
      cancelAnimationFrame(this._pendingRenderRAF);
      this._pendingRenderRAF = null;
    }
    this.deckContext?.destroy();
    this.deckContext = null;
    this.layerManager?.destroy();
    this.layerManager = null;
    this.layoutWorker?.terminate();
    this.layoutWorker = null;
    this.prefetchedLayoutCacheKeys?.clear();
    this._prefetchRequestTokens?.clear();
  }

  resetInterpolationCaches() {
    this.interpolationCache?.reset();
    this.treeInterpolator?.resetCaches?.();
    this.clearLayoutCache?.();
    this.prefetchedLayoutCacheKeys?.clear();
    this._prefetchRequestTokens?.clear();
    this._layoutRequestGeneration += 1;
  }

  // ==========================================================================
  // WORKER PREFETCHING
  // ==========================================================================

  _prefetchFrame(treeIndex) {
    const state = useAppStore.getState();
    const treeList = selectActiveTreeList(state);

    // Bounds check
    if (!treeList || !treeList[treeIndex]) return;

    const treeData = treeList[treeIndex];
    const { branchTransformation, layoutAngleDegrees, layoutRotationDegrees, styleConfig } = state;
    const offsets = styleConfig?.labelOffsets || { DEFAULT: 20, EXTENSION: 5 };
    const linkGeometryMode = this._getLinkGeometryMode(state);

    // Ensure uniform scaling is initialized before dispatching to worker
    this.initializeUniformScaling(branchTransformation);
    const layoutCacheKey = this._createLayoutCacheKey(treeIndex, state);
    const rotationAlignmentExcludeTaxa = this._getRotationAlignmentExcludeTaxa(treeIndex, state);
    if (this.prefetchedLayoutCacheKeys.get(treeIndex) === layoutCacheKey) return;

    this.prefetchedLayoutCacheKeys.set(treeIndex, layoutCacheKey);
    const requestToken = this._createLayoutRequestToken(treeIndex, state);
    this._prefetchRequestTokens.set(treeIndex, requestToken);

    const payload = {
      jobId: String(treeIndex),
      requestToken,
      command: 'CALCULATE_LAYOUT', // Must match worker
      data: {
        treeData,
        options: {
          width: this.width,
          height: this.height,
          margin: 60,
          branchTransformation,
          layoutAngleDegrees,
          layoutRotationDegrees,
          labelOffsets: offsets,
          rotationAlignmentExcludeTaxa,
          treeIndex,
          treeSide: 'left',
          renderMode: 'animation',
          linkGeometryMode,
          layoutCacheKey,
          maxGlobalScale: this.maxGlobalScale // Pass global scale for consistent sizing
        }
      }
    };

    this.layoutWorker.postMessage(payload);
  }

  _createLayoutCacheKey(treeIndex, state = useAppStore.getState()) {
    const treeList = selectActiveTreeList(state);
    return createLayoutCacheKey({
      state,
      treeList,
      treeIndex,
      width: this.width,
      height: this.height,
      maxGlobalScale: this.maxGlobalScale
    });
  }

  _getRotationAlignmentExcludeTaxa(treeIndex, state = useAppStore.getState()) {
    return getRotationAlignmentExcludeTaxa(state, treeIndex);
  }

  _getLinkGeometryMode(state = useAppStore.getState()) {
    return state?.linkGeometryMode === 'straight' ? 'straight' : 'radial-elbow';
  }

  _createLayoutRequestToken(treeIndex, state = useAppStore.getState()) {
    return `${this._layoutRequestGeneration}|${this._createLayoutCacheKey(treeIndex, state)}`;
  }

  // RENDERING - STATIC
  // ==========================================================================

  async renderAllElements(options = {}) {
    return this.staticRenderer.renderAllElements(options);
  }

  // ==========================================================================
  // Delegated to InterpolationRenderer
  async renderComparisonAwareScrubFrame(fromTreeData, toTreeData, timeFactor, options = {}) {
    return this.interpolationRenderer.renderComparisonAwareScrubFrame(
      fromTreeData,
      toTreeData,
      timeFactor,
      options
    );
  }

  async renderProgress(progress) {
    return this.interpolationRenderer.renderProgress(progress);
  }

  async renderTimelineProgress(progress) {
    return this.interpolationRenderer.renderTimelineProgress(progress);
  }

  // ==========================================================================
  // ANIMATION LOOP (Delegated to AnimationRunner)
  // ==========================================================================

  // Exposed for AnimationRunner
  async _renderComparisonFrameForRunner(fromTree, toTree, easedT, options) {
    const { fromTreeIndex, rightTreeIndex, rightTree } = options;

    const interpolatedData = this._buildInterpolatedData(fromTree, toTree, easedT, options);
    await this.layerManager.renderComparisonAnimated({
      interpolatedData,
      rightTree,
      rightIndex: rightTreeIndex,
      leftIndex: fromTreeIndex
    });
  }

  // ==========================================================================
  // INTERPOLATION DATA
  // ==========================================================================

  _buildInterpolatedData(fromTreeData, toTreeData, t, options = {}) {
    const { fromTreeIndex, toTreeIndex } = options;
    const { dataFrom, dataTo, transitionChangeModel } = this.interpolationCache.buildInterpolationInputs(
      fromTreeData,
      toTreeData,
      fromTreeIndex,
      toTreeIndex
    );

    if (!dataFrom || !dataTo) {
      console.warn('[DeckGLTreeAnimationController] Layout calculation failed in _buildInterpolatedData, returning empty substitute');
      return { nodes: [], links: [], labels: [], extensions: [] };
    }

    const interpolatedData = this.treeInterpolator.interpolateTreeData(dataFrom, dataTo, t, {
      transitionChangeModel,
      rawTimeFactor: options.rawTimeFactor,
      linkGeometryMode: this._getLinkGeometryMode()
    });

    // --- Adaptive Visual Scaling ---
    // Interpolate max_radius from cached metadata
    const rFrom = Number(dataFrom.max_radius);
    const rTo = Number(dataTo.max_radius);
    const currentMaxRadius = Number.isFinite(interpolatedData.max_radius)
      ? interpolatedData.max_radius
      : (Number.isFinite(rFrom) && Number.isFinite(rTo) ? rFrom + (rTo - rFrom) * t : 300);

    // Calculate metricScale: min(1.0, currentMaxRadius / idealRadius)
    // Ideal radius is roughly half the screen dimension (e.g. 300-400px)
    // We use a safe default of 300px if width is missing
    const idealRadius = Math.min(this.width || 800, this.height || 600) / 2.5;

    // Pass scale to layers (clamped to 1.0 max, and 0.05 min to prevent invisibility)
    interpolatedData.metricScale = Math.max(0.05, Math.min(1.0, currentMaxRadius / idealRadius));

    return interpolatedData;
  }

  _getOrCacheInterpolationData(fromTreeData, toTreeData, fromTreeIndex, toTreeIndex) {
    const { dataFrom, dataTo, transitionChangeModel } = this.interpolationCache.getOrCacheInterpolationData(
      fromTreeData,
      toTreeData,
      fromTreeIndex,
      toTreeIndex
    );

    if (!dataFrom || !dataTo) {
      console.warn('[DeckGLTreeAnimationController] Layout calculation failed, skipping frame');
      return { dataFrom: null, dataTo: null, transitionChangeModel: null };
    }

    return { dataFrom, dataTo, transitionChangeModel };
  }

  // ==========================================================================
  // LAYER MANAGEMENT
  // ==========================================================================

  _updateLayersEfficiently(interpolatedFrameData) {
    // Inject current zoom level for dynamic label halo scaling
    if (interpolatedFrameData) {
      interpolatedFrameData.zoom = this.deckContext?.getViewState()?.zoom;
    }
    this._lastLayerData = interpolatedFrameData || null;
    const layers = this.layerManager.updateLayersWithData(interpolatedFrameData);

    // Add clipboard layers if clipboard is active
    const clipboardLayers = getClipboardLayers(this);
    const combinedLayers = clipboardLayers.length > 0 ? [...layers, ...clipboardLayers] : layers;
    this.deckContext.setLayers(combinedLayers);
  }

  _handleStyleChange() {
    this.resetInterpolationCaches();
    this.renderAllElements();
  }

  _handleLayerDataChange() {
    if (this.animationRunner?.isRunning) {
      this.deckContext?.deck?.redraw(true);
      return;
    }
    this.renderAllElements();
  }

  _handlePaintChange() {
    if (this.animationRunner?.isRunning) {
      return;
    }
    this.renderAllElements();
  }
}
