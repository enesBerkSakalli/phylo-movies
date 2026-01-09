import { DeckGLDataAdapter } from './deckgl/DeckGLDataAdapter.js';
import { DeckManager } from './deckgl/core/DeckManager.js';
import { LayerManager } from './deckgl/layers/LayerManager.js';
import { TreeInterpolator } from './deckgl/interpolation/TreeInterpolator.js';
import { WebGLTreeAnimationController } from './WebGLTreeAnimationController.js';
import { useAppStore, selectCurrentTree } from '../core/store.js';
import { easeInOut } from 'popmotion';
import { TreeNodeInteractionHandler } from './interaction/TreeNodeInteractionHandler.js';
import { ComparisonModeRenderer } from './comparison/ComparisonModeRenderer.js';
import { ViewportManager } from './viewport/ViewportManager.js';
import { buildViewLinkMapping } from '../domain/view/viewLinkMapper.js';
import { calculateVisualBounds } from './utils/TreeBoundsUtils.js';
import { createClipboardLabelLayer } from './utils/ClipboardUtils.js';

export class DeckGLTreeAnimationController extends WebGLTreeAnimationController {

  // ==========================================================================
  // CONSTRUCTOR
  // ==========================================================================

  constructor(container, { animations = true, viewSide = 'single', offset = null, useReactDeckGL = false } = {}) {
    super(container);
    this.animationsEnabled = animations;
    this.viewSide = viewSide;
    this.ready = false;
    this._resolveReady = null;
    this.readyPromise = new Promise((resolve) => {
      this._resolveReady = resolve;
    });

    this.useReactDeckGL = useReactDeckGL;

    // Core components
    this.dataConverter = new DeckGLDataAdapter();
    this.layerManager = new LayerManager();
    this.treeInterpolator = new TreeInterpolator();
    this.currentTreeData = null;
    this.interactionHandler = new TreeNodeInteractionHandler(this, null, this.viewSide);

    // View link mapping cache
    this._lastMappedLeftIndex = null;
    this._lastMappedRightIndex = null;

    // Track last tree index we auto-fit to
    this._lastFocusedTreeIndex = null;
    this._resizeRenderScheduled = false;
    this.setOnResize(() => this._handleContainerResize());

    // Drag state
    this._dragState = null;

    // Comparison mode renderer
    this.comparisonRenderer = new ComparisonModeRenderer(this);

    // Viewport manager for camera and screen projections
    this.viewportManager = new ViewportManager(this);
    this.viewportManager.initializeOffsets(offset);

    this.layerManager.layerStyles.setStyleChangeCallback(() => this._handleStyleChange());

    // Initialize DeckManager LAST to ensure all state is ready
    if (this.useReactDeckGL) {
      // React DeckGL wrapper will attach the deck instance later
      this.deckManager = new DeckManager(this.webglContainer, { useExternalDeck: true });
      this._configureDeckManagerCallbacks();
    } else {
      this._initializeDeckManager();
    }

    this._reactLayerUpdater = null;
  }

  _initializeDeckManager() {
    if (!this.deckManager) {
      this.deckManager = new DeckManager(this.webglContainer, { useExternalDeck: this.useReactDeckGL });
    }

    this._configureDeckManagerCallbacks();

    if (!this.useReactDeckGL) {
      this.deckManager.initialize();
    }
  }

  _configureDeckManagerCallbacks() {
    this.deckManager.onWebGLInitialized((gl) => {
      this.gl = gl;
      this._markReady();
    });

    this.deckManager.onError((error) => console.error('[DeckGL Controller] Deck.gl error:', error));

    // Use arrow functions to be safe about 'this' and member existence
    this.deckManager.onNodeClick((info, event) => {
      if (this.interactionHandler) {
        this.interactionHandler.handleNodeClick(info, event, this.deckManager.canvas);
      }
    });

    this.deckManager.onNodeHover((info, event) => {
      if (this.interactionHandler) {
        this.interactionHandler.handleNodeHover(info, event);
      }
    });

    this.deckManager.onDragStart((info, event) => this._handleDragStart(info, event));
    this.deckManager.onDrag((info, event) => this._handleDrag(info, event));
    this.deckManager.onDragEnd((info, event) => this._handleDragEnd(info, event));
  }

  _markReady() {
    this.ready = true;
    if (typeof this._resolveReady === 'function') {
      this._resolveReady();
      this._resolveReady = null;
    }
  }

  attachReactDeck(deckInstance) {
    if (!deckInstance) return;
    if (!this.deckManager) {
      this.deckManager = new DeckManager(this.webglContainer, { useExternalDeck: true });
      this._configureDeckManagerCallbacks();
    }
    this.deckManager.attachExternalDeck(deckInstance);
    if (!this.ready) {
      this._markReady();
    }
  }

  setReactLayerUpdater(updater) {
    this._reactLayerUpdater = updater;
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  setCameraMode(mode) {
    this.deckManager.setCameraMode(mode, { preserveTarget: true });
    this.renderAllElements();
  }

  startAnimation() {
    if (!this.animationsEnabled) return;
    const { play } = useAppStore.getState();
    play();
    if (this.animationFrameId != null) return;
    this._animationLoop();
  }

  stopAnimation() {
    cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
    this._frameInFlight = false;
  }

  destroy() {
    super.destroy();
    cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
    this.contextMenu?.destroy();
    this.deckManager?.destroy();
    this.layerManager?.destroy();
  }

  resetInterpolationCaches() {
    this._cachedInterpolationData = null;
    this.treeInterpolator?.resetCaches?.();
  }

  // ==========================================================================
  // RENDERING - STATIC
  // ==========================================================================

  async renderAllElements(options = {}) {
    if (!this.ready) {
      await this.readyPromise;
    }

    if (!this.useReactDeckGL && !this.deckManager?.deck) return;

    const { treeIndex, leftIndex, rightIndex, comparisonMode } = options;
    const state = useAppStore.getState();
    const { currentTreeIndex, treeList, transitionResolver, comparisonMode: comparisonModeFromStore } = state;

    // Handle comparison mode (explicit or inferred from store)
    const useComparison = comparisonMode ?? comparisonModeFromStore;
    if (useComparison) {
      return this._renderComparisonModeStatic(leftIndex, rightIndex, currentTreeIndex, transitionResolver);
    }

    // Single tree mode
    this._renderSingleTree(treeIndex, currentTreeIndex, treeList, state);
  }

  _renderComparisonModeStatic(leftIndex, rightIndex, currentTreeIndex, transitionResolver) {
    const full = Array.isArray(transitionResolver?.fullTreeIndices) ? transitionResolver.fullTreeIndices : [];
    const computedRight = full.find((i) => i > currentTreeIndex) ?? full[full.length - 1] ?? currentTreeIndex;
    const leftIdx = Number.isInteger(leftIndex) ? leftIndex : currentTreeIndex;
    const rightIdx = Number.isInteger(rightIndex) ? rightIndex : computedRight;
    this._updateViewLinkMapping(leftIdx, rightIdx);
    return this.comparisonRenderer.renderStatic(leftIdx, rightIdx);
  }

  _renderSingleTree(treeIndex, currentTreeIndex, treeList, state) {
    if (!treeList?.length) return;

    const targetIndex = Number.isInteger(treeIndex)
      ? Math.min(Math.max(treeIndex, 0), treeList.length - 1)
      : currentTreeIndex;

    const targetTreeData =
      targetIndex === currentTreeIndex
        ? selectCurrentTree(state)
        : treeList[targetIndex];

    this.currentTreeData = targetTreeData;

    const currentLayout = this.calculateLayout(targetTreeData, {
      treeIndex: targetIndex,
      updateController: true
    });

    if (!currentLayout || !currentLayout.tree) {
      console.warn('[DeckGLTreeAnimationController] Layout not available, skipping render');
      return;
    }

    const treeLeaves = currentLayout.tree.leaves();
    const { extensionRadius, labelRadius } = this._getConsistentRadii(currentLayout, null, treeLeaves);

    const layerData = this.dataConverter.convertTreeToLayerData(
      currentLayout.tree,
      {
        extensionRadius,
        labelRadius,
        canvasWidth: currentLayout.width,
        canvasHeight: currentLayout.height
      }
    );

    // Tag data for interactive picking/dragging (always 'left' in single mode)
    [
      ...layerData.nodes,
      ...(layerData.links || []),
      ...(layerData.labels || []),
      ...(layerData.extensions || [])
    ].forEach(d => d.treeSide = 'left');

    this._updateLayersEfficiently(layerData);

    if (this._lastFocusedTreeIndex === null) {
      this.viewportManager.focusOnTree(layerData.nodes, layerData.labels);
      this._lastFocusedTreeIndex = targetIndex;
    }

    this.viewportManager.updateScreenPositions(layerData.nodes, this.viewSide);
  }

  // ==========================================================================
  // RENDERING - INTERPOLATED (Animation/Scrubbing)
  // ==========================================================================

  async renderInterpolatedFrame(fromTreeData, toTreeData, timeFactor, options = {}) {
    if (!this.ready) {
      await this.readyPromise;
    }

    const { fromTreeIndex, toTreeIndex } = options;
    let t = Math.max(0, Math.min(1, timeFactor));
    if (fromTreeData === toTreeData) t = 0;
    t = easeInOut(t);

    const { dataFrom, dataTo } = this._getOrCacheInterpolationData(fromTreeData, toTreeData, fromTreeIndex, toTreeIndex);

    const interpolatedData = this.treeInterpolator.interpolateTreeData(dataFrom, dataTo, t);
    interpolatedData.targetData = dataTo;  // Add target data for movement arrow endpoints

    this._updateLayersEfficiently(interpolatedData);
    this.viewportManager.updateScreenPositions(interpolatedData.nodes, this.viewSide);
  }

  async renderScrubFrame(fromTreeData, toTreeData, timeFactor, options = {}) {
    if (!this.ready) {
      await this.readyPromise;
    }

    const { comparisonMode, rightTreeIndex, fromTreeIndex } = options;

    if (comparisonMode && typeof rightTreeIndex === 'number') {
      if (typeof fromTreeIndex === 'number') {
        this._updateViewLinkMapping(fromTreeIndex, rightTreeIndex);
      }

      const { movieData } = useAppStore.getState();
      const rightTree = movieData?.interpolated_trees?.[rightTreeIndex];

      if (rightTree) {
        const interpolatedData = this._buildInterpolatedData(fromTreeData, toTreeData, timeFactor, options);
        await this.comparisonRenderer.renderAnimated(interpolatedData, rightTree, rightTreeIndex);
        return;
      }
    }

    await this.renderInterpolatedFrame(fromTreeData, toTreeData, timeFactor, options);
  }

  // ==========================================================================
  // ANIMATION LOOP
  // ==========================================================================

  async _animationLoop() {
    if (!useAppStore.getState().playing) return;

    const step = async () => {
      const { playing } = useAppStore.getState();
      if (!playing) {
        this.animationFrameId = null;
        this._frameInFlight = false;
        return;
      }

      // Prevent overlapping frames
      if (this._frameInFlight) {
        this.animationFrameId = requestAnimationFrame(step);
        return;
      }

      this._frameInFlight = true;
      try {
        await this._updateSmoothAnimation(performance.now());
        this.deckManager?.deck?.redraw?.(true);
      } finally {
        this._frameInFlight = false;
      }

      this.animationFrameId = requestAnimationFrame(step);
    };

    this.animationFrameId = requestAnimationFrame(step);
  }

  async _updateSmoothAnimation(timestamp) {
    const { movieData, updateAnimationProgress, getAnimationInterpolationData, stop, comparisonMode, transitionResolver } = useAppStore.getState();

    if (!movieData || updateAnimationProgress(timestamp)) {
      stop();
      return;
    }

    const { fromTreeIndex, toTreeIndex, easedProgress } = getAnimationInterpolationData();
    const fromTree = movieData.interpolated_trees[fromTreeIndex];
    const toTree = movieData.interpolated_trees[toTreeIndex];

    if (!fromTree || !toTree) {
      console.warn('[DeckGLTreeAnimationController] Missing tree data:', {
        fromTreeIndex,
        toTreeIndex,
        hasFromTree: !!fromTree,
        hasToTree: !!toTree,
        totalTrees: movieData.interpolated_trees?.length
      });
      return;
    }

    if (comparisonMode) {
      await this._updateComparisonAnimation(fromTree, toTree, easedProgress, fromTreeIndex, toTreeIndex, transitionResolver, movieData);
      return;
    }

    await this.renderInterpolatedFrame(fromTree, toTree, easedProgress, { toTreeIndex, fromTreeIndex });
  }

  async _updateComparisonAnimation(fromTree, toTree, easedProgress, fromTreeIndex, toTreeIndex, transitionResolver, movieData) {
    const interpolatedData = this._buildInterpolatedData(fromTree, toTree, easedProgress, {
      toTreeIndex,
      fromTreeIndex
    });

    const full = Array.isArray(transitionResolver?.fullTreeIndices) ? transitionResolver.fullTreeIndices : [];
    const rightIdx = full.find((i) => i > fromTreeIndex) ?? full[full.length - 1] ?? toTreeIndex;
    const rightTree = movieData.interpolated_trees[rightIdx];

    if (rightTree) {
      this._updateViewLinkMapping(fromTreeIndex, rightIdx);
      await this.comparisonRenderer.renderAnimated(interpolatedData, rightTree, rightIdx);
    }
  }

  // ==========================================================================
  // INTERPOLATION DATA
  // ==========================================================================

  _buildInterpolatedData(fromTreeData, toTreeData, t, options = {}) {
    const { fromTreeIndex, toTreeIndex } = options;
    const layoutFrom = this._calculateLayout(fromTreeData, fromTreeIndex);
    const layoutTo = this._calculateLayout(toTreeData, toTreeIndex);

    const currentLeaves = layoutTo.tree.leaves();
    const { extensionRadius, labelRadius } = this._getConsistentRadii(layoutFrom, null, currentLeaves);

    const dataFrom = this._convertLayoutToLayerData(layoutFrom, extensionRadius, labelRadius);
    const dataTo = this._convertLayoutToLayerData(layoutTo, extensionRadius, labelRadius);

    return this.treeInterpolator.interpolateTreeData(dataFrom, dataTo, t);
  }

  _getOrCacheInterpolationData(fromTreeData, toTreeData, fromTreeIndex, toTreeIndex) {
    if (
      this._cachedInterpolationData &&
      this._cachedInterpolationData.fromIndex === fromTreeIndex &&
      this._cachedInterpolationData.toIndex === toTreeIndex &&
      this._cachedInterpolationData.width === this.width &&
      this._cachedInterpolationData.height === this.height
    ) {
      return {
        dataFrom: this._cachedInterpolationData.dataFrom,
        dataTo: this._cachedInterpolationData.dataTo
      };
    }

    const layoutFrom = this._calculateLayout(fromTreeData, fromTreeIndex);
    const layoutTo = this._calculateLayout(toTreeData, toTreeIndex);

    const currentLeaves = layoutTo.tree.leaves();
    const { extensionRadius, labelRadius } = this._getConsistentRadii(layoutFrom, null, currentLeaves);

    const dataFrom = this._convertLayoutToLayerData(layoutFrom, extensionRadius, labelRadius);
    const dataTo = this._convertLayoutToLayerData(layoutTo, extensionRadius, labelRadius);

    this._cachedInterpolationData = {
      fromIndex: fromTreeIndex,
      toIndex: toTreeIndex,
      width: this.width,
      height: this.height,
      dataFrom,
      dataTo
    };

    return { dataFrom, dataTo };
  }

  // ==========================================================================
  // VIEW LINK MAPPING (Comparison Mode)
  // ==========================================================================

  _updateViewLinkMapping(leftIndex, rightIndex) {
    if (this._lastMappedLeftIndex === leftIndex && this._lastMappedRightIndex === rightIndex) {
      return;
    }

    const { treeList, pairSolutions, setViewLinkMapping, movieData } = useAppStore.getState();
    if (!setViewLinkMapping || !Array.isArray(treeList)) return;

    this._lastMappedLeftIndex = leftIndex;
    this._lastMappedRightIndex = rightIndex;

    const pairKey = this._derivePairKey(leftIndex, rightIndex, movieData?.tree_metadata);
    const pairSolution = pairKey ? pairSolutions?.[pairKey] : null;

    if (pairSolution) {
      const mapping = buildViewLinkMapping(leftIndex, rightIndex, pairSolution);
      setViewLinkMapping(mapping);
    } else {
      setViewLinkMapping(null);
    }
  }

  _derivePairKey(leftIndex, rightIndex, treeMetadata = []) {
    const directLeft = treeMetadata[leftIndex]?.tree_pair_key;
    if (directLeft) return directLeft;

    const directRight = treeMetadata[rightIndex]?.tree_pair_key;
    if (directRight) return directRight;

    // Fallback: scan between indices
    const start = Math.min(leftIndex ?? 0, rightIndex ?? 0);
    const end = Math.max(leftIndex ?? 0, rightIndex ?? 0);
    for (let i = start; i <= end; i++) {
      const key = treeMetadata[i]?.tree_pair_key;
      if (key) return key;
    }
    return null;
  }

  // ==========================================================================
  // LAYER MANAGEMENT
  // ==========================================================================

  _updateLayersEfficiently(newData) {
    const layers = this.layerManager.updateLayersWithData(newData);

    // Add clipboard layers if clipboard is active
    const clipboardLayers = this._getClipboardLayers();
    const allLayers = clipboardLayers.length > 0 ? [...layers, ...clipboardLayers] : layers;

    if (this.useReactDeckGL && typeof this._reactLayerUpdater === 'function') {
      this._reactLayerUpdater(allLayers);
      return;
    }

    if (!this.deckManager?.deck) {
      console.warn('[DeckGLTreeAnimationController] Deck not ready, skipping layer update');
      return;
    }

    this.deckManager.setLayers(allLayers);
  }

  _handleStyleChange() {
    this._cachedInterpolationData = null;
    this.renderAllElements();
  }

  // ==========================================================================
  // CLIPBOARD RENDERING
  // ==========================================================================

  /**
   * Get clipboard layers if clipboard is active
   * @returns {Array} Clipboard layers or empty array
   */
  _getClipboardLayers() {
    const { clipboardTreeIndex, treeList } = useAppStore.getState();
    if (clipboardTreeIndex === null || !treeList?.[clipboardTreeIndex]) {
      return [];
    }

    return this._createClipboardLayers(clipboardTreeIndex, treeList[clipboardTreeIndex]);
  }

  /**
   * Create clipboard tree layers with visual positioning.
   */
  _createClipboardLayers(treeIndex, treeData) {
    const layout = this.calculateLayout(treeData, {
      treeIndex,
      updateController: false,
      rotationAlignmentKey: 'clipboard'
    });

    if (!layout?.tree) {
      console.warn('[DeckGLTreeAnimationController] Clipboard layout not available');
      return [];
    }

    const treeLeaves = layout.tree.leaves();
    const { extensionRadius, labelRadius } = this._getConsistentRadii(layout, null, treeLeaves);

    const layerData = this.dataConverter.convertTreeToLayerData(
      layout.tree,
      {
        extensionRadius,
        labelRadius,
        canvasWidth: layout.width,
        canvasHeight: layout.height
      }
    );

    const { transitionResolver, clipboardOffsetX = 0, clipboardOffsetY = 0 } = useAppStore.getState();
    const fullTreeIndices = transitionResolver?.fullTreeIndices || [];

    // Calculate clipboard tree VISUAL bounds (including labels)
    const clipboardBounds = calculateVisualBounds(layerData.nodes, layerData.labels);

    // Get current main tree VISUAL bounds
    const mainTreeBounds = this._getMainTreeBounds();

    // Position clipboard to the TOP LEFT ABOVE the main tree
    // Combined with dynamic user dragging offsets
    const xOffset = (mainTreeBounds.minX - clipboardBounds.minX) + clipboardOffsetX;
    const gap = 50;
    const yOffset = (mainTreeBounds.minY - clipboardBounds.maxY - gap) + clipboardOffsetY;

    const treeLayers = this.layerManager.createClipboardLayers(layerData, 0, xOffset, yOffset);
    const labelLayer = createClipboardLabelLayer(
      treeIndex,
      clipboardBounds,
      fullTreeIndices,
      xOffset,
      yOffset
    );

    return [...treeLayers, labelLayer].filter(Boolean);
  }



  /**
   * Get bounds of the currently rendered main tree
   */
  _getMainTreeBounds() {
    // Use the current tree data to calculate bounds
    if (this.currentTreeData) {
      const layout = this.calculateLayout(this.currentTreeData, {
        treeIndex: useAppStore.getState().currentTreeIndex,
        updateController: false
      });
      if (layout?.tree) {
        const treeLeaves = layout.tree.leaves();
        const { extensionRadius, labelRadius } = this._getConsistentRadii(layout, null, treeLeaves);
        const layerData = this.dataConverter.convertTreeToLayerData(
          layout.tree,
          { extensionRadius, labelRadius, canvasWidth: layout.width, canvasHeight: layout.height }
        );
        return calculateVisualBounds(layerData.nodes, layerData.labels);
      }
    }
    // Fallback to reasonable defaults
    return { minX: -500, maxX: 500, minY: -500, maxY: 500 };
  }


  // ==========================================================================
  // INTERACTIVE DRAGGING (Trees)
  // ==========================================================================

  _handleDragStart(info) {
    // Only allow dragging if we picked a tree element (node, link, extension, label)
    const treeSide = info.object?.treeSide;
    if (!treeSide) return false;

    const state = this._getState();

    // Store starting offsets
    let startOffset;
    if (treeSide === 'left') {
      startOffset = { x: state.leftTreeOffsetX, y: state.leftTreeOffsetY };
    } else if (treeSide === 'right') {
      startOffset = { x: state.viewOffsetX, y: state.viewOffsetY };
    } else if (treeSide === 'clipboard') {
      startOffset = { x: state.clipboardOffsetX, y: state.clipboardOffsetY };
    } else {
      return false;
    }

    const controllerConfig = this.deckManager.getControllerConfig?.() || null;

    this._dragState = {
      side: treeSide,
      startOffset,
      startPos: { x: info.x, y: info.y },
      controllerConfig: controllerConfig ? { ...controllerConfig } : null
    };

    // Prevent map panning while dragging a tree - use callback mechanism for React compatibility
    this.deckManager.setControllerConfig({
      ...(controllerConfig || this.deckManager.getControllerConfig()),
      dragPan: false
    });
    return true;
  }

  _handleDrag(info) {
    if (!this._dragState) return false;

    const { side, startOffset, startPos } = this._dragState;
    const viewState = this.deckManager.getViewState();
    const zoom = viewState.zoom ?? 0;
    const [zoomX, zoomY] = Array.isArray(zoom) ? zoom : [zoom, zoom];
    const safeZoomX = Number.isFinite(zoomX) ? zoomX : 0;
    const safeZoomY = Number.isFinite(zoomY) ? zoomY : 0;

    // Convert total screen pixel displacement to world units
    // Formula for Orthographic: world = pixel * 2^-zoom
    const totalPixelDeltaX = info.x - startPos.x;
    const totalPixelDeltaY = info.y - startPos.y;

    if (!Number.isFinite(totalPixelDeltaX) || !Number.isFinite(totalPixelDeltaY)) {
      return false;
    }

    const worldDeltaX = totalPixelDeltaX * Math.pow(2, -safeZoomX);
    const worldDeltaY = totalPixelDeltaY * Math.pow(2, -safeZoomY);

    const state = this._getState();
    if (side === 'left') {
      state.setLeftTreeOffsetX(startOffset.x + worldDeltaX);
      state.setLeftTreeOffsetY(startOffset.y + worldDeltaY);
    } else if (side === 'right') {
      state.setViewOffsetX(startOffset.x + worldDeltaX);
      state.setViewOffsetY(startOffset.y + worldDeltaY);
    } else if (side === 'clipboard') {
      state.setClipboardOffsetX(startOffset.x + worldDeltaX);
      state.setClipboardOffsetY(startOffset.y + worldDeltaY);
    }

    // Trigger a render update
    this.renderAllElements();

    return true;
  }

  _handleDragEnd() {
    if (!this._dragState) return;

    const controllerConfig = this._dragState.controllerConfig;
    this._dragState = null;

    // Re-enable map panning - use callback mechanism for React compatibility
    if (controllerConfig) {
      this.deckManager.setControllerConfig(controllerConfig);
    } else {
      this.deckManager.setControllerConfig(this.deckManager.getControllerConfig());
    }
  }

  _handleContainerResize() {
    if (this._resizeRenderScheduled) return;
    this._resizeRenderScheduled = true;

    const schedule = typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (cb) => setTimeout(cb, 16);

    schedule(async () => {
      this._resizeRenderScheduled = false;
      const { playing } = this._getState();
      if (playing) return;
      this._lastFocusedTreeIndex = null;
      this.comparisonRenderer?.resetAutoFit?.();
      try {
        await this.renderAllElements();
      } catch (err) {
        console.warn('[DeckGLTreeAnimationController] Resize render failed:', err);
      }
    });
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  _calculateLayout(treeData, treeIndex) {
    const state = this._getState();
    const movingTaxa = Array.isArray(state?.subtreeTracking?.[treeIndex]) && state.subtreeTracking[treeIndex]?.length
      ? state.subtreeTracking[treeIndex]
      : null;
    return this.calculateLayout(treeData, {
      treeIndex,
      updateController: false,
      rotationAlignmentExcludeTaxa: movingTaxa
    });
  }

  _convertLayoutToLayerData(layout, extensionRadius, labelRadius) {
    return this.dataConverter.convertTreeToLayerData(
      layout.tree,
      {
        extensionRadius,
        labelRadius,
        canvasWidth: layout.width,
        canvasHeight: layout.height
      }
    );
  }

  _getViewOffset() {
    return this.viewportManager.getViewOffset();
  }

  _getState() {
    return useAppStore.getState();
  }

  _clampIndex(index) {
    const { treeList } = useAppStore.getState();
    return Math.min(Math.max(index, 0), treeList.length - 1);
  }
}
