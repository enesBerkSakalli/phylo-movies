import { DeckGLTreeLayerDataFactory } from '@/core/treeVisualisation/deckgl/DeckGLTreeLayerDataFactory.js';
import { DeckGLContext } from '@/core/treeVisualisation/deckgl/context/DeckGLContext.js';
import { LayerManager } from '@/core/treeVisualisation/deckgl/layers/LayerManager.js';
import { TreeInterpolator } from '@/core/treeVisualisation/deckgl/interpolation/TreeInterpolator.js';
import { InterpolationCache } from '@/core/treeVisualisation/deckgl/interpolation/InterpolationCache.js';
import { AnimationRunner } from '@/core/treeVisualisation/systems/AnimationRunner.js';
import { InterpolationRenderer } from '@/core/treeVisualisation/systems/InterpolationRenderer.js';
import { StaticRenderer } from '@/core/treeVisualisation/systems/StaticRenderer.js';
import { WebGLTreeAnimationController } from '@/core/treeVisualisation/WebGLTreeAnimationController.js';
import { useAppStore } from '@/state/phyloStore/store.js';
import { TreeNodeInteractionHandler } from '@/core/treeVisualisation/interaction/TreeNodeInteractionHandler.js';
import { handleDragStart, handleDrag, handleDragEnd, handleContainerResize } from '@/core/treeVisualisation/interaction/InteractionHandlers.js';
import { ViewportManager } from '@/core/treeVisualisation/viewport/ViewportManager.js';
import { calculateLayoutOptions } from '@/core/treeVisualisation/viewport/ViewportGeometryService.js';
import { getClipboardLayers } from '@/core/treeVisualisation/utils/ClipboardUtils.js';
import { LayoutWorkerManager } from '@/core/treeVisualisation/workers/LayoutWorkerManager.js';
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

    // Worker Manager
    this.workerManager = new LayoutWorkerManager(this.interpolationCache);

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
      getOrCacheInterpolationData: this.interpolationRenderer.getOrCacheInterpolationData.bind(this.interpolationRenderer),
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

    // Initial render (will await readyPromise internally)
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
    this.workerManager?.destroy();
  }

  resetInterpolationCaches() {
    this.interpolationCache?.reset();
    this.treeInterpolator?.resetCaches?.();
    this.workerManager?.reset();
  }

  // ==========================================================================
  // WORKER PREFETCHING
  // ==========================================================================

  _prefetchFrame(treeIndex) {
    const state = useAppStore.getState();
    const treeList = state.movieData?.interpolated_trees || state.treeList;
    const treeData = treeList?.[treeIndex];

    if (!treeData) return;

    // Ensure uniform scaling is initialized before dispatching to worker
    if (!this.uniformScalingEnabled) {
      this.initializeUniformScaling(state.branchTransformation);
    }

    const layoutOptions = calculateLayoutOptions(this.width, this.height, state, this.maxGlobalScale);

    this.workerManager.prefetchFrame(treeIndex, treeData, layoutOptions);
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
    const { fromTreeIndex, rightTreeIndex, rightTree } = options;

    const interpolatedData = this.interpolationRenderer.buildInterpolatedData(fromTree, toTree, easedT, options);
    await this.layerManager.renderComparisonAnimated({
      interpolatedData,
      rightTree,
      rightIndex: rightTreeIndex,
      leftIndex: fromTreeIndex
    });
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
