import { DeckGLTreeLayerDataFactory } from './deckgl/DeckGLTreeLayerDataFactory.js';
import { DeckGLContext } from './deckgl/context/DeckGLContext.js';
import { LayerManager } from './deckgl/layers/LayerManager.js';
import { TreeInterpolator } from './deckgl/interpolation/TreeInterpolator.js';
import { InterpolationCache } from './deckgl/interpolation/InterpolationCache.js';
import { AnimationRunner } from './systems/AnimationRunner.js';
import { InterpolationRenderer } from './systems/InterpolationRenderer.js';
import { StaticRenderer } from './systems/StaticRenderer.js';
import { WebGLTreeAnimationController } from './WebGLTreeAnimationController.js';
import { useAppStore } from '../core/store.js';
import { TreeNodeInteractionHandler } from './interaction/TreeNodeInteractionHandler.js';
import { handleDragStart, handleDrag, handleDragEnd, handleContainerResize } from './interaction/InteractionHandlers.js';
import { ViewportManager } from './viewport/ViewportManager.js';
import { getClipboardLayers } from './utils/ClipboardUtils.js';
import * as d3 from 'd3';

export class DeckGLTreeAnimationController extends WebGLTreeAnimationController {

  // ==========================================================================
  // CONSTRUCTOR
  // ==========================================================================

  constructor(container, { animations = true, viewSide = 'single', offset = null } = {}) {
    super(container);
    this.animationsEnabled = animations;
    this.viewSide = viewSide;
    this.ready = false;
    this._resolveReady = null;
    this.readyPromise = new Promise((resolve) => {
      this._resolveReady = resolve;
    });

    // Core components
    this.dataConverter = new DeckGLTreeLayerDataFactory();
    this.layerManager = new LayerManager();
    this.treeInterpolator = new TreeInterpolator();
    this.interpolationCache = new InterpolationCache({
      calculateLayout: this.calculateLayout.bind(this),
      getConsistentRadii: this._getConsistentRadii.bind(this),
      convertTreeToLayerData: this.dataConverter.convertTreeToLayerData.bind(this.dataConverter),
      getDimensions: () => ({ width: this.width, height: this.height }),
      getBranchTransformation: () => useAppStore.getState().branchTransformation
    });

    // --- WORKER INITIALIZATION ---
    this.layoutWorker = new Worker(new URL('./workers/layout.worker.js', import.meta.url), { type: 'module' });
    this.requestedFrames = new Set();

    this.layoutWorker.onmessage = (event) => {
      const { jobId, status, result, error } = event.data;
      if (status === 'SUCCESS') {
        const treeIndex = parseInt(jobId, 10);
        this.interpolationCache.setPrecomputedData(treeIndex, result);
      } else {
        console.warn(`[Worker] Layout failed for tree ${jobId}:`, error);
        this.requestedFrames.delete(parseInt(jobId, 10)); // Allow retry
      }
    };
    // -----------------------------

    this.currentTreeData = null;
    this.interactionHandler = new TreeNodeInteractionHandler(this, this.viewSide);

    // Track last tree index we auto-fit to
    this._lastFocusedTreeIndex = null;

    // --- PERFORMANCE OPTIMIZATION: Throttle & Debounce ---
    this._lastZoom = null;
    this._pendingRenderRAF = null;
    this._lastRenderTime = 0;
    this._renderDebounceMs = 16; // ~60fps max

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
        const treeList = state.movieData?.interpolated_trees || state.treeList;
        const totalTrees = treeList?.length || 0;
        const currentTreeIndex = Math.min(Math.floor(progress * (totalTrees - 1)), totalTrees - 1);
        useAppStore.setState({ animationProgress: progress, currentTreeIndex });

        // Prefetch next frames
        if (this.animationsEnabled && totalTrees > 0) {
          this._prefetchFrame(currentTreeIndex + 1);
          this._prefetchFrame(currentTreeIndex + 2);
        }
      },
      stopAnimation: () => useAppStore.getState().stop(),
      requestRedraw: () => this.deckContext?.deck?.redraw(true)
    });

    // Viewport manager for camera and screen projections
    this.viewportManager = new ViewportManager(this);
    this.viewportManager.initializeOffsets(offset);

    this.layerManager.layerStyles.setStyleChangeCallback(() => this._handleStyleChange());

    // NOTE: deckContext is initialized via mount(container)
    this.deckContext = null;
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

    this.deckContext.onNodeHover((info, event) => {
      if (this.interactionHandler) {
        this.interactionHandler.handleNodeHover(info, event);
      }
    });

    this.deckContext.onDragStart((info, event) => handleDragStart(this, info));
    this.deckContext.onDrag((info, event) => handleDrag(this, info));
    this.deckContext.onDragEnd((info, event) => handleDragEnd(this));

    this.deckContext.onResize((dimensions) => {
      this.resize(dimensions);
    });

    // Rerender when camera moves to update dynamic halo scaling (outlineWidth depends on zoom)
    // OPTIMIZATION: Throttle to avoid redundant renders during pan/zoom
    this.deckContext.addViewStateListener(({ zoom }) => {
      // Skip if animation is running (AnimationRunner handles its own renders)
      if (this.animationRunner.isRunning) return;

      // Skip if zoom hasn't changed significantly (avoid pan-only redundant renders)
      const zoomDelta = this._lastZoom !== null ? Math.abs(zoom - this._lastZoom) : Infinity;
      if (zoomDelta < 0.01) return; // Threshold: ~1% zoom change

      this._lastZoom = zoom;
      this._scheduleRender();
    });
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
    // If we are already mounted to the SAME container, do nothing.
    // If we are mounted to a DIFFERENT container, unmount first (though React cleanup should have handled this).
    if (this.deckContext) {
      // Check if webglContainer exists first to avoid crash if internal state is weird
      const existingNode = this.webglContainer && typeof this.webglContainer.node === 'function'
        ? this.webglContainer.node()
        : null;

      if (existingNode === containerElement) {
        return;
      }
      console.warn('[DeckGLTreeAnimationController] Remounting to new container');
      this.unmount();
    }

    // Bridge D3 selection (if used internally)
    this.webglContainer = d3.select(containerElement);

    // Create DeckGLContext attached to this container
    this.deckContext = new DeckGLContext(this.webglContainer);
    this.deckContext.initialize();

    this._configureDeckContextCallbacks();
    this._markReady();

    // Initial render
    this.renderAllElements();
  }

  unmount() {
    this.deckContext?.destroy();
    this.deckContext = null;
    this.ready = false;
  }



  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  setCameraMode(mode) {
    this.deckContext.setCameraMode(mode, { preserveTarget: true });
    this.renderAllElements();
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
    super.destroy();
    this.animationRunner.stop();
    // Cancel any pending debounced render
    if (this._pendingRenderRAF) {
      cancelAnimationFrame(this._pendingRenderRAF);
      this._pendingRenderRAF = null;
    }
    this.deckContext?.destroy();
    this.layerManager?.destroy();
    this.layoutWorker?.terminate();
  }

  resetInterpolationCaches() {
    this.interpolationCache?.reset();
    this.treeInterpolator?.resetCaches?.();
    this.requestedFrames?.clear();
  }

  // ==========================================================================
  // WORKER PREFETCHING
  // ==========================================================================

  _prefetchFrame(treeIndex) {
    const state = useAppStore.getState();
    const treeList = state.movieData?.interpolated_trees || state.treeList;

    // Bounds check
    if (!treeList || !treeList[treeIndex]) return;

    // Deduplication check
    if (this.requestedFrames.has(treeIndex)) return;

    // Cache check (if main thread already calculated it, don't ask worker)
    // Note: This relies on InterpolationCache having a way to peek,
    // but requestedFrames is our main tracking for "in progress".

    this.requestedFrames.add(treeIndex);

    const treeData = treeList[treeIndex];
    const { branchTransformation, layoutAngleDegrees, layoutRotationDegrees, styleConfig } = state;
    const offsets = styleConfig?.labelOffsets || { DEFAULT: 20, EXTENSION: 5 };

    // Layout configuration
    const containerWidth = this.width - 120; // 60 margin * 2
    const containerHeight = this.height - 120;
    const maxLeafRadius = Math.min(containerWidth, containerHeight) / 2;
    const extensionRadius = maxLeafRadius + (offsets.EXTENSION ?? 5);
    const labelRadius = extensionRadius + (offsets.DEFAULT ?? 20);

    // Ensure uniform scaling is initialized before dispatching to worker
    if (!this.uniformScalingEnabled) {
      this.initializeUniformScaling(branchTransformation);
    }

    const payload = {
      jobId: String(treeIndex),
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
          extensionRadius,
          labelRadius,
          maxGlobalScale: this.maxGlobalScale // Pass global scale for consistent sizing
        }
      }
    };

    this.layoutWorker.postMessage(payload);
  }

  // ==========================================================================
  //
  // ==========================================================================
  // RENDERING - STATIC
  // ==========================================================================

  async renderAllElements(options = {}) {
    return this.staticRenderer.renderAllElements(options);
  }

  // ==========================================================================
  // Delegated to InterpolationRenderer
  async renderSingleInterpolatedFrame(fromTreeData, toTreeData, timeFactor, options = {}) {
    return this.interpolationRenderer.renderSingleInterpolatedFrame(
      fromTreeData,
      toTreeData,
      timeFactor,
      options
    );
  }

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

  // ==========================================================================
  // ANIMATION LOOP (Delegated to AnimationRunner)
  // ==========================================================================

  // Exposed for AnimationRunner
  async _renderComparisonFrameForRunner(fromTree, toTree, easedT, options) {
    const { fromTreeIndex, rightIdx, rightTree } = options;

    const interpolatedData = this._buildInterpolatedData(fromTree, toTree, easedT, options);
    await this.layerManager.renderComparisonAnimated({
      interpolatedData,
      rightTree,
      rightIndex: rightIdx,
      leftIndex: fromTreeIndex
    });
  }

  // ==========================================================================
  // INTERPOLATION DATA
  // ==========================================================================

  _buildInterpolatedData(fromTreeData, toTreeData, t, options = {}) {
    const { fromTreeIndex, toTreeIndex } = options;
    const { dataFrom, dataTo } = this.interpolationCache.buildInterpolationInputs(
      fromTreeData,
      toTreeData,
      fromTreeIndex,
      toTreeIndex
    );

    if (!dataFrom || !dataTo) {
      console.warn('[DeckGLTreeAnimationController] Layout calculation failed in _buildInterpolatedData, returning empty substitute');
      return { nodes: [], links: [], labels: [], extensions: [] };
    }

    const { branchTransformation } = useAppStore.getState();
    const interpolatedData = this.treeInterpolator.interpolateTreeData(dataFrom, dataTo, t, branchTransformation);

    // --- Adaptive Visual Scaling ---
    // Interpolate max_radius from cached metadata
    const rFrom = dataFrom.max_radius || 300;
    const rTo = dataTo.max_radius || 300;
    const currentMaxRadius = rFrom + (rTo - rFrom) * t;

    // Calculate metricScale: min(1.0, currentMaxRadius / idealRadius)
    // Ideal radius is roughly half the screen dimension (e.g. 300-400px)
    // We use a safe default of 300px if width is missing
    const idealRadius = Math.min(this.width || 800, this.height || 600) / 2.5;

    // Pass scale to layers (clamped to 1.0 max, and 0.05 min to prevent invisibility)
    interpolatedData.metricScale = Math.max(0.05, Math.min(1.0, currentMaxRadius / idealRadius));

    return interpolatedData;
  }

  _getOrCacheInterpolationData(fromTreeData, toTreeData, fromTreeIndex, toTreeIndex) {
    const { dataFrom, dataTo } = this.interpolationCache.getOrCacheInterpolationData(
      fromTreeData,
      toTreeData,
      fromTreeIndex,
      toTreeIndex
    );

    if (!dataFrom || !dataTo) {
      console.warn('[DeckGLTreeAnimationController] Layout calculation failed, skipping frame');
      return { dataFrom: null, dataTo: null };
    }

    return { dataFrom, dataTo };
  }

  // ==========================================================================
  // LAYER MANAGEMENT
  // ==========================================================================

  _updateLayersEfficiently(interpolatedFrameData) {
    // Inject current zoom level for dynamic label halo scaling
    if (interpolatedFrameData) {
      interpolatedFrameData.zoom = this.deckContext?.getViewState()?.zoom;
    }
    const layers = this.layerManager.updateLayersWithData(interpolatedFrameData);

    // Add clipboard layers if clipboard is active
    const clipboardLayers = getClipboardLayers(this);
    const combinedLayers = clipboardLayers.length > 0 ? [...layers, ...clipboardLayers] : layers;
    this.deckContext.setLayers(combinedLayers);
  }

  _handleStyleChange() {
    this.interpolationCache?.reset();
    this.renderAllElements();
  }
}
