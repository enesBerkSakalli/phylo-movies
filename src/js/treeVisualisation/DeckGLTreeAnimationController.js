import { DeckGLDataAdapter } from './deckgl/DeckGLDataAdapter.js';
import { DeckManager } from './deckgl/core/DeckManager.js';
import { LayerManager } from './deckgl/layers/LayerManager.js';
import { TreeInterpolator } from './deckgl/interpolation/TreeInterpolator.js';
import { WebGLTreeAnimationController } from './WebGLTreeAnimationController.js';
import { useAppStore, selectCurrentTree } from '../core/store.js';
import { easeInOut } from 'popmotion';
import { TreeNodeInteractionHandler } from './interaction/TreeNodeInteractionHandler.js';
import { handleDragStart, handleDrag, handleDragEnd, handleContainerResize } from './interaction/InteractionHandlers.js';
import { ComparisonModeRenderer } from './comparison/ComparisonModeRenderer.js';
import { ViewportManager } from './viewport/ViewportManager.js';
import { buildViewLinkMapping } from '../domain/view/viewLinkMapper.js';
import { getClipboardLayers } from './utils/ClipboardUtils.js';

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
    this.interactionHandler = new TreeNodeInteractionHandler(this, this.viewSide);

    // View link mapping cache
    this._lastMappedLeftIndex = null;
    this._lastMappedRightIndex = null;

    // Track last tree index we auto-fit to
    this._lastFocusedTreeIndex = null;
    this._resizeRenderScheduled = false;
    this.setOnResize(() => handleContainerResize(this));

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

    this.deckManager.onDragStart((info, event) => handleDragStart(this, info));
    this.deckManager.onDrag((info, event) => handleDrag(this, info));
    this.deckManager.onDragEnd((info, event) => handleDragEnd(this));
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
    // Ensure canvas is set
    if (!this.deckManager.canvas && deckInstance.canvas) {
      this.deckManager.canvas = deckInstance.canvas;
    }
    if (!this.deckManager.canvas) {
       // Fallback for React DeckGL: look in the container
       this.deckManager.canvas = this.webglContainer.node()?.querySelector('canvas');
    }

    if (!this.ready) {
      this._markReady();
    }
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

    const { extensionRadius, labelRadius } = this._getConsistentRadii(currentLayout);

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

  async renderSingleInterpolatedFrame(fromTreeData, toTreeData, timeFactor, options = {}) {
    if (!this.ready) {
      await this.readyPromise;
    }

    const { fromTreeIndex, toTreeIndex } = options;
    let t = Math.max(0, Math.min(1, timeFactor));
    if (fromTreeData === toTreeData) t = 0;
    // Easing is now applied by the caller (renderProgress or _updateSmoothAnimation)
    // t = easeInOut(t);

    const { dataFrom, dataTo } = this._getOrCacheInterpolationData(fromTreeData, toTreeData, fromTreeIndex, toTreeIndex);

    if (!dataFrom || !dataTo) return;

    const interpolatedData = this.treeInterpolator.interpolateTreeData(dataFrom, dataTo, t);
    interpolatedData.targetData = dataTo;  // Add target data for movement arrow endpoints

    this._updateLayersEfficiently(interpolatedData);
    this.viewportManager.updateScreenPositions(interpolatedData.nodes, this.viewSide);
  }

  async renderComparisonAwareScrubFrame(fromTreeData, toTreeData, timeFactor, options = {}) {
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

    await this.renderSingleInterpolatedFrame(fromTreeData, toTreeData, timeFactor, options);
  }

  async renderProgress(progress) {
    if (!this.ready) {
      await this.readyPromise;
    }

    const state = useAppStore.getState();
    const treeList = state.movieData?.interpolated_trees || state.treeList;

    if (!treeList || treeList.length === 0) return;

    const totalTrees = treeList.length;
    // Safety check for single tree
    if (totalTrees === 1) {
      return this.renderAllElements({ treeIndex: 0 });
    }

    const exactTreeIndex = progress * (totalTrees - 1);
    const fromIndex = Math.floor(exactTreeIndex);
    const toIndex = Math.min(fromIndex + 1, totalTrees - 1);
    let t = exactTreeIndex - fromIndex;

    // Apply easing for scrubbing/rendering from progress
    t = easeInOut(t);

    // Optimization: Snap to nearest integer if very close, avoiding interpolation overhead
    if (t <= 0.001 || fromIndex === toIndex) {
      const snapIndex = Math.round(exactTreeIndex);
      return this.renderAllElements({ treeIndex: snapIndex });
    }

    // Render interpolated frame
    const fromTree = treeList[fromIndex];
    const toTree = treeList[toIndex];

    return this.renderSingleInterpolatedFrame(fromTree, toTree, t, {
      fromTreeIndex: fromIndex,
      toTreeIndex: toIndex
    });
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

    const { fromTreeIndex, toTreeIndex, localT } = getAnimationInterpolationData();
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

    // Apply easing centrally here
    const easedT = easeInOut(localT);

    if (comparisonMode) {
      await this._updateComparisonAnimation(fromTree, toTree, easedT, fromTreeIndex, toTreeIndex, transitionResolver, movieData);
      return;
    }

    await this.renderSingleInterpolatedFrame(fromTree, toTree, easedT, { toTreeIndex, fromTreeIndex });
  }

  async _updateComparisonAnimation(fromTree, toTree, easedT, fromTreeIndex, toTreeIndex, transitionResolver, movieData) {
    const interpolatedData = this._buildInterpolatedData(fromTree, toTree, easedT, {
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

    if (!layoutFrom || !layoutTo) {
      console.warn('[DeckGLTreeAnimationController] Layout calculation failed in _buildInterpolatedData, returning empty substitute');
      return { nodes: [], links: [], labels: [], extensions: [] };
    }

    const { extensionRadius, labelRadius } = this._getConsistentRadii(layoutFrom);

    const dataFrom = this._convertLayoutToLayerData(layoutFrom, extensionRadius, labelRadius);
    const dataTo = this._convertLayoutToLayerData(layoutTo, extensionRadius, labelRadius);

    return this.treeInterpolator.interpolateTreeData(dataFrom, dataTo, t);
  }

  _getOrCacheInterpolationData(fromTreeData, toTreeData, fromTreeIndex, toTreeIndex) {
    if (
      this._cachedInterpolationData &&
      this._cachedInterpolationData.fromIndex === fromTreeIndex &&
      this._cachedInterpolationData.toIndex === toTreeIndex &&
      this._cachedInterpolationData.fromTreeData === fromTreeData &&
      this._cachedInterpolationData.toTreeData === toTreeData &&
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

    if (!layoutFrom || !layoutTo) {
      console.warn('[DeckGLTreeAnimationController] Layout calculation failed, skipping frame');
      return { dataFrom: null, dataTo: null };
    }

    const { extensionRadius, labelRadius } = this._getConsistentRadii(layoutFrom);

    const dataFrom = this._convertLayoutToLayerData(layoutFrom, extensionRadius, labelRadius);
    const dataTo = this._convertLayoutToLayerData(layoutTo, extensionRadius, labelRadius);

    this._cachedInterpolationData = {
      fromIndex: fromTreeIndex,
      toIndex: toTreeIndex,
      fromTreeData,
      toTreeData,
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

  _updateLayersEfficiently(interpolatedFrameData) {
    const layers = this.layerManager.updateLayersWithData(interpolatedFrameData);

    // Add clipboard layers if clipboard is active
    const clipboardLayers = getClipboardLayers(this);
    const combinedLayers = clipboardLayers.length > 0 ? [...layers, ...clipboardLayers] : layers;

    if (!this.deckManager?.deck) {
      console.warn('[DeckGLTreeAnimationController] Deck not ready, skipping layer update');
      return;
    }

    this.deckManager.setLayers(combinedLayers);
  }

  _handleStyleChange() {
    this._cachedInterpolationData = null;
    this.renderAllElements();
  }




  // ==========================================================================
  // HELPERS
  // ==========================================================================

  _calculateLayout(treeData, treeIndex) {
    const state = useAppStore.getState();
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


}
