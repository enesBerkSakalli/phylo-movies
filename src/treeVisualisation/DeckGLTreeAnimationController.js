import { DeckGLTreeLayerDataFactory } from './deckgl/DeckGLTreeLayerDataFactory.js';
import { DeckGLContext } from './deckgl/context/DeckGLContext.js';
import { LayerManager } from './deckgl/layers/LayerManager.js';
import { TreeInterpolator } from './deckgl/interpolation/TreeInterpolator.js';
import { InterpolationCache } from './deckgl/interpolation/InterpolationCache.js';
import { AnimationRunner } from './systems/AnimationRunner.js';
import { InterpolationRenderer } from './systems/InterpolationRenderer.js';
import { createPlaybackProgressSynchronizer } from './systems/PlaybackProgressSynchronizer.js';
import { StaticRenderer } from './systems/StaticRenderer.js';
import { TreeLayoutController } from './TreeLayoutController.js';
import { selectActiveTreeList, useAppStore } from '../state/phyloStore/store.js';
import { TreeNodeInteractionHandler } from './interaction/TreeNodeInteractionHandler.js';
import {
  handleDragStart,
  handleDrag,
  handleDragEnd,
  handleContainerResize,
} from './interaction/InteractionHandlers.js';
import { ViewportManager } from './viewport/ViewportManager.js';
import { VIEWPORT_FIT_MODES } from './viewport/viewportFit.js';
import { getClipboardLayers } from './utils/ClipboardUtils.js';
import { createLayoutCacheKey } from './utils/layoutCacheKey.js';
import { getSplitKey } from '../domain/tree/splits.js';
import { TransitionFrame } from '../timeline/time/TransitionFrame.js';

export class DeckGLTreeAnimationController extends TreeLayoutController {
  // ==========================================================================
  // CONSTRUCTOR
  // ==========================================================================

  constructor(options = {}) {
    const { animations = true, viewSide = 'single' } = options || {};
    super(null);
    this.animationsEnabled = animations;
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
      getLinkGeometryMode: () => this._getLinkGeometryMode(),
    });

    // --- WORKER INITIALIZATION ---
    this.layoutWorker = new Worker(new URL('./workers/layout.worker.js', import.meta.url), {
      type: 'module',
    });
    this._layoutPrefetchTokens = new Map();
    this._layoutRequestGeneration = 0;

    this.layoutWorker.onmessage = (event) => {
      const { jobId, requestToken, status, result, error } = event.data;
      const treeIndex = parseInt(jobId, 10);
      const expectedToken = this._layoutPrefetchTokens.get(treeIndex);
      if (
        requestToken !== expectedToken ||
        requestToken !== this._createLayoutRequestToken(treeIndex)
      ) {
        return;
      }

      if (status === 'SUCCESS') {
        this.interpolationCache.setPrecomputedData(treeIndex, result);
      } else {
        console.warn('[LayoutWorker] Precomputed layout failed; animation will render on demand.', {
          treeIndex,
          error,
        });
        this._layoutPrefetchTokens.delete(treeIndex);
      }
    };
    // -----------------------------

    this.interactionHandler = new TreeNodeInteractionHandler(this, viewSide);

    // Track last tree index we auto-fit to
    this._lastFocusedTreeIndex = null;
    this._hasUserViewportInteraction = false;

    // --- PERFORMANCE OPTIMIZATION: Coalesce static renders ---
    this._lastZoom = null;
    this._pendingRenderRAF = null;
    this._pendingRenderOptions = null;
    this._renderInFlight = false;
    this._renderQueued = false;
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
    const syncPlaybackProgress = createPlaybackProgressSynchronizer({
      getState: () => useAppStore.getState(),
      isPrefetchEnabled: () => this.animationsEnabled,
      prefetchFrame: (treeIndex) => this._prefetchFrame(treeIndex),
    });

    this.animationRunner = new AnimationRunner({
      getState: () => useAppStore.getState(),
      getOrCacheInterpolationData: this._getOrCacheInterpolationData.bind(this),
      renderSingleFrame: this.interpolationRenderer.renderSingleInterpolatedFrame.bind(
        this.interpolationRenderer
      ),
      renderComparisonFrame: this._renderComparisonFrameForRunner.bind(this),
      setAnimationStage: (stage) => useAppStore.getState().setAnimationStage(stage),
      syncHighlightsForIndex: (treeIndex) =>
        useAppStore.getState().updateColorManagerForIndex?.(treeIndex),
      updateProgress: syncPlaybackProgress,
      stopAnimation: () => useAppStore.getState().stop(),
    });

    // Viewport manager for camera and screen projections
    this.viewportManager = new ViewportManager(this);

    this.layerManager.layerStyles.setStyleChangeCallback({
      onLayoutChange: () => this._handleStyleChange(),
      onLayerDataChange: () => this._handleLayerDataChange(),
      onPaintChange: () => this._handlePaintChange(),
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
    this.deckContext.onWebGLInitialized((_gl) => {
      this._markReady();
    });

    this.deckContext.onError((error) =>
      console.error('[DeckGLTreeAnimationController] deck.gl render error:', error)
    );

    // Use arrow functions to be safe about 'this' and member existence
    this.deckContext.onNodeClick((info, event) => {
      if (this.interactionHandler) {
        this.interactionHandler.handleNodeClick(info, event, this.deckContext.canvas);
      }
    });

    this.deckContext.onDragStart((info, _event) => {
      const handledTreeDrag = handleDragStart(this, info);
      if (!handledTreeDrag) {
        this._hasUserViewportInteraction = true;
      }
      return handledTreeDrag;
    });
    this.deckContext.onDrag((info, _event) => handleDrag(this, info));
    this.deckContext.onDragEnd((_info, _event) => handleDragEnd(this));

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

  _scheduleRender(options = {}) {
    this.scheduleRenderAllElements(options);
  }

  /**
   * Batches rapid static render requests into one render per frame.
   */
  scheduleRenderAllElements(options = {}) {
    if (this._destroyed) return;

    this._pendingRenderOptions = mergeRenderOptions(this._pendingRenderOptions, options);

    if (this._renderInFlight) {
      this._renderQueued = true;
      return;
    }
    if (this._pendingRenderRAF !== null) return;

    const pendingToken = {};
    let frameId;
    this._pendingRenderRAF = pendingToken;

    frameId = scheduleNextFrame(() => {
      this._pendingRenderRAF = null;
      if (this._destroyed) return;
      this._flushScheduledRender();
    });

    if (this._pendingRenderRAF === pendingToken) {
      this._pendingRenderRAF = frameId;
    }
  }

  _flushScheduledRender() {
    if (this._destroyed) return;

    const renderOptions = this._pendingRenderOptions || {};
    this._pendingRenderOptions = null;
    this._renderQueued = false;
    this._renderInFlight = true;

    let renderPromise;
    try {
      renderPromise = Promise.resolve(this.renderAllElements(renderOptions));
    } catch (error) {
      renderPromise = Promise.reject(error);
    }

    renderPromise
      .catch((error) => {
        console.warn('[DeckGLTreeAnimationController] Scheduled render failed:', error);
      })
      .finally(() => {
        this._renderInFlight = false;
        if (!this._destroyed && (this._renderQueued || this._pendingRenderOptions)) {
          this._renderQueued = false;
          this.scheduleRenderAllElements();
        }
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
      const existingNode = this.deckContext.container || null;

      if (existingNode === containerElement) {
        return;
      }
      console.warn(
        '[DeckGLTreeAnimationController] Remounting tree renderer into a new container; previous deck.gl context will be destroyed.'
      );
      this.unmount();
    }

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
    this._hasUserViewportInteraction = true;
    const labelsVisible = useAppStore.getState().labelsVisible !== false;
    const links = [
      ...(this._lastLayerData.links || []),
      ...(this._lastLayerData.extensions || []),
      ...(this._lastLayerData.connectors || []),
    ];

    this.viewportManager.focusOnTree(nodes, labelsVisible ? this._lastLayerData.labels : [], {
      fitMode:
        options.fitMode ?? (labelsVisible ? VIEWPORT_FIT_MODES.LABELS : VIEWPORT_FIT_MODES.BRANCH),
      duration: options.duration ?? 350,
      padding: options.padding,
      links,
    });
  }

  focusOnNode(contextNode, options = {}) {
    const renderedNode = this._findRenderedNodeForContext(contextNode);
    if (!renderedNode || !this.deckContext || typeof this.deckContext.transitionTo !== 'function') {
      return false;
    }

    const position = Array.isArray(renderedNode.position)
      ? renderedNode.position
      : renderedNode.renderPosition;
    if (!Array.isArray(position) || position.length < 2) {
      return false;
    }

    this._hasUserViewportInteraction = true;
    this.deckContext.transitionTo({
      target: [position[0], position[1], position[2] ?? 0],
      duration: options.duration ?? 550,
    });
    return true;
  }

  _findRenderedNodeForContext(contextNode) {
    if (!contextNode) return null;

    const nodes = this._lastLayerData?.nodes;
    if (!Array.isArray(nodes) || nodes.length === 0) return null;

    const targetSplitKey = contextNode.splitKey || getSplitKey(contextNode);
    if (!targetSplitKey) return null;

    const hasTreeIndex = Number.isInteger(contextNode.treeIndex);
    const hasTreeSide = typeof contextNode.treeSide === 'string' && contextNode.treeSide.length > 0;

    return (
      nodes.find((node) => {
        const nodeSplitKey = node?.splitKey || getSplitKey(node);
        if (nodeSplitKey !== targetSplitKey) return false;
        if (hasTreeIndex && node?.treeIndex !== contextNode.treeIndex) return false;
        if (hasTreeSide && node?.treeSide !== contextNode.treeSide) return false;
        return true;
      }) || null
    );
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
    this._markReady();

    super.destroy();
    this.animationRunner.stop();
    // Cancel any pending scheduled render
    if (this._pendingRenderRAF !== null) {
      cancelScheduledFrame(this._pendingRenderRAF);
      this._pendingRenderRAF = null;
    }
    this._pendingRenderOptions = null;
    this._renderQueued = false;
    this._renderInFlight = false;
    this.deckContext?.destroy();
    this.deckContext = null;
    this.layerManager?.destroy();
    this.layerManager = null;
    this.layoutWorker?.terminate();
    this.layoutWorker = null;
    this._layoutPrefetchTokens?.clear();
  }

  resetInterpolationCaches() {
    this.interpolationCache?.reset();
    this.treeInterpolator?.resetCaches?.();
    this.clearLayoutCache?.();
    this.clearTransformedCache?.();
    this._layoutPrefetchTokens?.clear();
    this._layoutRequestGeneration += 1;
  }

  // ==========================================================================
  // WORKER PREFETCHING
  // ==========================================================================

  _prefetchFrame(treeIndex) {
    if (this._destroyed || !this.layoutWorker) return;

    const state = useAppStore.getState();
    const treeList = selectActiveTreeList(state);
    const treeData =
      state.ensureTreeHydrated?.(treeIndex) ??
      useAppStore.getState().treeList?.[treeIndex] ??
      treeList?.[treeIndex] ??
      null;

    // Bounds check
    if (!treeData) return;

    const latestState = useAppStore.getState();
    const { branchTransformation, layoutAngleDegrees, layoutRotationDegrees, styleConfig } =
      latestState;
    const offsets = styleConfig?.labelOffsets || { DEFAULT: 20, EXTENSION: 5 };
    const linkGeometryMode = this._getLinkGeometryMode(latestState);

    // Ensure uniform scaling is initialized before dispatching to worker
    this.initializeUniformScaling(branchTransformation);
    const layoutCacheKey = this._createLayoutCacheKey(treeIndex, latestState);
    const requestToken = this._createLayoutRequestToken(treeIndex, latestState, layoutCacheKey);
    if (this._layoutPrefetchTokens.get(treeIndex) === requestToken) return;

    this._layoutPrefetchTokens.set(treeIndex, requestToken);

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
          treeIndex,
          treeSide: 'left',
          renderMode: 'animation',
          linkGeometryMode,
          layoutCacheKey,
          maxGlobalScale: this.maxGlobalScale, // Pass global scale for consistent sizing
        },
      },
    };

    if (this._destroyed || !this.layoutWorker) return;
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
      maxGlobalScale: this.maxGlobalScale,
    });
  }

  _getLinkGeometryMode(state = useAppStore.getState()) {
    return state?.linkGeometryMode === 'straight' ? 'straight' : 'radial-elbow';
  }

  _syncInterpolatorRootAngle(state = useAppStore.getState()) {
    const degrees = Number(state?.layoutRotationDegrees);
    const radians = Number.isFinite(degrees) ? (degrees * Math.PI) / 180 : 0;
    this.treeInterpolator?.setRootAngle?.(radians);
  }

  _createLayoutRequestToken(treeIndex, state = useAppStore.getState(), layoutCacheKey = null) {
    return `${this._layoutRequestGeneration}|${layoutCacheKey ?? this._createLayoutCacheKey(treeIndex, state)}`;
  }

  // RENDERING - STATIC
  // ==========================================================================

  async renderAllElements(options = {}) {
    if (this._destroyed) return;
    return this.staticRenderer.renderAllElements(options);
  }

  // ==========================================================================
  // Delegated to InterpolationRenderer
  async renderComparisonAwareScrubFrame(fromTreeData, toTreeData, timeFactor, options = {}) {
    if (this._destroyed) return;
    return this.interpolationRenderer.renderComparisonAwareScrubFrame(
      fromTreeData,
      toTreeData,
      timeFactor,
      options
    );
  }

  async renderProgress(progress) {
    if (this._destroyed) return;
    return this.interpolationRenderer.renderProgress(progress);
  }

  async renderTimelineProgress(progress) {
    if (this._destroyed) return;
    return this.interpolationRenderer.renderTimelineProgress(progress);
  }

  // ==========================================================================
  // ANIMATION LOOP (Delegated to AnimationRunner)
  // ==========================================================================

  // Exposed for AnimationRunner
  async _renderComparisonFrameForRunner(fromTree, toTree, easedT, options) {
    const { cachedInputs = null, isCancelled = null, rightTreeIndex, rightTree } = options;
    const transitionFrame = TransitionFrame.from(
      {
        sourceTree: fromTree,
        targetTree: toTree,
        sourceTreeIndex: options.fromTreeIndex,
        targetTreeIndex: options.toTreeIndex,
        transitionProgress: options.rawTimeFactor ?? easedT,
      },
      {
        renderProgress: easedT,
        stage: options.stage,
        transitionChangeModel: options.transitionChangeModel,
      }
    );

    if (isRenderCancelled(isCancelled)) return;

    const renderOptions = transitionFrame.toRenderOptions(options);
    const interpolatedData =
      cachedInputs?.dataFrom && cachedInputs?.dataTo
        ? this._buildInterpolatedDataFromInputs(
            cachedInputs.dataFrom,
            cachedInputs.dataTo,
            transitionFrame.renderProgress,
            {
              ...renderOptions,
              transitionChangeModel:
                cachedInputs.transitionChangeModel ?? renderOptions.transitionChangeModel,
            }
          )
        : this._buildInterpolatedData(
            transitionFrame.sourceTree,
            transitionFrame.targetTree,
            transitionFrame.renderProgress,
            renderOptions
          );

    if (isRenderCancelled(isCancelled)) return;

    await this.layerManager.renderComparisonAnimated({
      interpolatedData,
      rightTree,
      rightIndex: rightTreeIndex,
      activeTreeIndex: transitionFrame.comparisonActiveTreeIndex,
      isCancelled,
    });
  }

  // ==========================================================================
  // INTERPOLATION DATA
  // ==========================================================================

  _buildInterpolatedData(fromTreeData, toTreeData, t, options = {}) {
    const { fromTreeIndex, toTreeIndex } = options;
    const { dataFrom, dataTo, transitionChangeModel } =
      this.interpolationCache.buildInterpolationInputs(
        fromTreeData,
        toTreeData,
        fromTreeIndex,
        toTreeIndex
      );

    if (!dataFrom || !dataTo) {
      console.warn('[DeckGLTreeAnimationController] Missing interpolation layout input.', {
        fromTreeIndex,
        toTreeIndex,
        hasSourceLayout: !!dataFrom,
        hasTargetLayout: !!dataTo,
      });
      return { nodes: [], links: [], labels: [], extensions: [] };
    }

    return this._buildInterpolatedDataFromInputs(dataFrom, dataTo, t, {
      ...options,
      transitionChangeModel,
    });
  }

  _buildInterpolatedDataFromInputs(dataFrom, dataTo, t, options = {}) {
    if (!dataFrom || !dataTo) {
      console.warn(
        '[DeckGLTreeAnimationController] Cannot interpolate frame because source or target layer data is missing.',
        {
          hasSourceLayerData: !!dataFrom,
          hasTargetLayerData: !!dataTo,
        }
      );
      return { nodes: [], links: [], labels: [], extensions: [] };
    }

    const transitionChangeModel = options.transitionChangeModel ?? null;
    this._syncInterpolatorRootAngle();
    const interpolatedData = this.treeInterpolator.interpolateTreeData(dataFrom, dataTo, t, {
      stage: options.stage,
      transitionChangeModel,
      rawTimeFactor: options.rawTimeFactor,
      linkGeometryMode: this._getLinkGeometryMode(),
    });

    // Geometry scaling already protects small trees. Keep stroke/node styling stable
    // so low-branch-length trees are not shrunk a second time.
    interpolatedData.metricScale = 1;

    return interpolatedData;
  }

  _getOrCacheInterpolationData(fromTreeData, toTreeData, fromTreeIndex, toTreeIndex) {
    const { dataFrom, dataTo, transitionChangeModel } =
      this.interpolationCache.getOrCacheInterpolationData(
        fromTreeData,
        toTreeData,
        fromTreeIndex,
        toTreeIndex
      );

    if (!dataFrom || !dataTo) {
      console.warn(
        '[DeckGLTreeAnimationController] Skipping frame with missing layout cache data.',
        {
          fromTreeIndex,
          toTreeIndex,
          hasSourceLayout: !!dataFrom,
          hasTargetLayout: !!dataTo,
        }
      );
      return { dataFrom: null, dataTo: null, transitionChangeModel: null };
    }

    return { dataFrom, dataTo, transitionChangeModel };
  }

  // ==========================================================================
  // LAYER MANAGEMENT
  // ==========================================================================

  _updateLayersEfficiently(interpolatedFrameData) {
    if (this._destroyed || !this.deckContext) return;

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
    if (this._destroyed) return;
    this.resetInterpolationCaches();
    this.scheduleRenderAllElements();
  }

  _handleLayerDataChange() {
    if (this._destroyed) return;
    if (this.animationRunner?.isRunning) {
      this.deckContext?.deck?.redraw(true);
      return;
    }
    this.scheduleRenderAllElements();
  }

  _handlePaintChange() {
    if (this._destroyed) return;
    if (this.animationRunner?.isRunning) {
      return;
    }
    this.scheduleRenderAllElements();
  }
}

function isRenderCancelled(isCancelled) {
  return typeof isCancelled === 'function' && isCancelled();
}

function getNow() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function scheduleNextFrame(callback) {
  if (typeof requestAnimationFrame === 'function') {
    return requestAnimationFrame(callback);
  }
  return setTimeout(() => callback(getNow()), 16);
}

function cancelScheduledFrame(frameId) {
  if (typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(frameId);
    return;
  }
  clearTimeout(frameId);
}

function mergeRenderOptions(current, next = {}) {
  if (!current) return { ...next };

  const merged = { ...current, ...next };
  if (current.skipAutoFit || next.skipAutoFit) {
    merged.skipAutoFit = true;
  }
  return merged;
}
