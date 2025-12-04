import { DeckGLDataAdapter } from './deckgl/DeckGLDataAdapter.js';
import { DeckManager } from './deckgl/core/DeckManager.js';
import { LayerManager } from './deckgl/layers/LayerManager.js';
import { TreeInterpolator } from './deckgl/interpolation/TreeInterpolator.js';
import { TrailBuilder } from './deckgl/trails/TrailBuilder.js';
import { WebGLTreeAnimationController } from './WebGLTreeAnimationController.js';
import { useAppStore, selectCurrentTree } from '../core/store.js';
import { easeInOut, animate } from 'popmotion';
import { NodeContextMenu } from '../components/NodeContextMenu.js';
import { TreeNodeInteractionHandler } from './interaction/TreeNodeInteractionHandler.js';
import { ComparisonModeRenderer } from './comparison/ComparisonModeRenderer.js';
import { ViewportManager } from './viewport/ViewportManager.js';
import { buildViewLinkMapping } from '../domain/view/viewLinkMapper.js';


export class DeckGLTreeAnimationController extends WebGLTreeAnimationController {
  constructor(container, { animations = true, viewSide = 'single', offset = null } = {}) {
    super(container);
    this.animationsEnabled = animations;
    this.viewSide = viewSide;
    this.dataConverter = new DeckGLDataAdapter();
    this.layerManager = new LayerManager();
    this.treeInterpolator = new TreeInterpolator();
    this.contextMenu = new NodeContextMenu();
    this.currentTreeData = null;
    this.interactionHandler = new TreeNodeInteractionHandler(this, this.contextMenu, this.viewSide);

    this.deckManager = new DeckManager(this.webglContainer);

    this.deckManager.onWebGLInitialized((gl) => { this.gl = gl; });

    this.deckManager.onError((error) => console.error('[DeckGL Controller] Deck.gl error:', error));

    this.deckManager.onNodeClick((info, event) => this.interactionHandler.handleNodeClick(info, event, this.deckManager.canvas));

    this.deckManager.onNodeHover((info, event) => this.interactionHandler.handleNodeHover(info, event));

    this.deckManager.initialize();

    this.layerManager.layerStyles.setStyleChangeCallback(() => this._handleStyleChange());

    // Comparison mode renderer
    this.comparisonRenderer = new ComparisonModeRenderer(this);

    // Viewport manager for camera and screen projections
    this.viewportManager = new ViewportManager(this);

    // Motion trail builder for tracking element movement
    this.trailBuilder = new TrailBuilder({ minDistanceSq: 0.25 });

    // Track last interpolation source to detect when we start a new interpolation
    this._lastInterpolationFromIndex = null;

    // Track last tree index we auto-fit to
    this._lastFocusedTreeIndex = null;

    // Optional initial view offset
    this.viewportManager.initializeOffsets(offset);
  }

  startAnimation() {
    if (!this.animationsEnabled) return;
    const { play } = useAppStore.getState();
    play(); // Set store to playing state
    this._animationLoop(); // Start the controller's animation loop
  }

  stopAnimation() {
    if (this.animationFrameId) {
      this.animationFrameId.stop();
      this.animationFrameId = null;
    }
    // The store's stop() action will be called by the Gui controller
  }

  _handleStyleChange() {
    this.renderAllElements();
  }

  _getViewOffset() {
    return this.viewportManager.getViewOffset();
  }

  /**
   * Resolve pair key from current tree metadata (prefer exact indices).
   */
  _derivePairKey(leftIndex, rightIndex, treeMetadata = []) {
    if (!Array.isArray(treeMetadata)) return null;
    const directLeft = treeMetadata[leftIndex]?.tree_pair_key;
    if (directLeft) return directLeft;
    const directRight = treeMetadata[rightIndex]?.tree_pair_key;
    if (directRight) return directRight;
    // Fallback: scan between indices
    const start = Math.min(leftIndex ?? 0, rightIndex ?? 0);
    const end = Math.max(leftIndex ?? 0, rightIndex ?? 0);
    for (let i = start; i <= end; i++) {
      const key = treeMetadata?.[i]?.tree_pair_key;
      if (key) return key;
    }
    return null;
  }

  /**
   * Build and store view link mapping for comparison rendering.
   */
  _updateViewLinkMapping(leftIndex, rightIndex) {
    const { treeList, pairSolutions, setViewLinkMapping, movieData } = useAppStore.getState();
    if (!setViewLinkMapping || !Array.isArray(treeList)) return;

    const pairKey = this._derivePairKey(leftIndex, rightIndex, movieData?.tree_metadata);
    const pairSolution = pairKey ? pairSolutions?.[pairKey] : null;

    if (pairSolution) {
      const mapping = buildViewLinkMapping(
        treeList[leftIndex] || null,
        treeList[rightIndex] || null,
        leftIndex,
        rightIndex,
        pairSolution
      );
      setViewLinkMapping(mapping);
    } else {
      setViewLinkMapping(null);
    }
  }

  _areBoundsInView(bounds, paddingFactor = 1.05) {
    return this.viewportManager.areBoundsInView(bounds, paddingFactor);
  }

  setCameraMode(mode) {
    this.deckManager.setCameraMode(mode, { preserveTarget: true });
    this.renderAllElements();
  }


  async _renderComparisonMode(leftIndex, rightIndex) {
    return this.comparisonRenderer.renderStatic(leftIndex, rightIndex);
  }

  async renderAllElements(options = {}) {
    const { treeIndex, leftIndex, rightIndex, comparisonMode } = options;
    const state = useAppStore.getState();
    const { currentTreeIndex, treeList, transitionResolver, comparisonMode: comparisonModeFromStore } = state;

    // Handle comparison mode (explicit or inferred from store)
    const useComparison = comparisonMode ?? comparisonModeFromStore;
    if (useComparison) {
      const full = Array.isArray(transitionResolver?.fullTreeIndices) ? transitionResolver.fullTreeIndices : [];
      // Always pick the next anchor after the current position; fallback to last anchor
      const computedRight = full.find((i) => i > currentTreeIndex) ?? full[full.length - 1] ?? currentTreeIndex;
      const leftIdx = Number.isInteger(leftIndex) ? leftIndex : currentTreeIndex;
      const rightIdx = Number.isInteger(rightIndex) ? rightIndex : computedRight;
      this._updateViewLinkMapping(leftIdx, rightIdx);
      return this._renderComparisonMode(leftIdx, rightIdx);
    }

    // Single tree mode
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

    const treeLeaves = currentLayout.tree.leaves();

    const { extensionRadius, labelRadius } = this._getConsistentRadii(currentLayout, null, null, treeLeaves);

    const layerData = this.dataConverter.convertTreeToLayerData(
      currentLayout.tree,
      {
        extensionRadius,
        labelRadius,
        canvasWidth: currentLayout.width,
        canvasHeight: currentLayout.height
      }
     );

    // Append trails if enabled
    layerData.trails = this._buildFlowTrails(layerData.nodes, layerData.labels);

    this._updateLayersEfficiently(layerData);
    this.viewportManager.updateScreenPositions(layerData.nodes, this.viewSide);

    // Auto-fit policy: only focus when not playing and policy enabled,
    // and only when the tree index actually changes.
    const { playing, autoFitOnTreeChange } = useAppStore.getState();
    if (!playing && autoFitOnTreeChange) {
      if (this._lastFocusedTreeIndex !== targetIndex) {
        this.viewportManager.focusOnTree(layerData.nodes, layerData.labels);
        this._lastFocusedTreeIndex = targetIndex;
      }
    }

  }

  applyInterpolationEasing(t, easingType = 'linear') {
    return easingType === 'easeInOut' ? easeInOut(t) : t;
  }

  _calculateLayout(treeData, treeIndex) {
    return this.calculateLayout(treeData, {
      treeIndex: treeIndex,
      updateController: false
    });
  }

  /**
   * Build interpolated DeckGL layer data between two trees without rendering.
   */
  _buildInterpolatedData(fromTreeData, toTreeData, t, options = {}) {
    const { fromTreeIndex, toTreeIndex } = options;
    const layoutFrom = this._calculateLayout(fromTreeData, fromTreeIndex);
    const layoutTo = this._calculateLayout(toTreeData, toTreeIndex);

    const currentLeaves = layoutTo.tree.leaves();
    const { extensionRadius, labelRadius } = this._getConsistentRadii(
      layoutFrom, layoutTo, null, currentLeaves
    );
    const dataFrom = this.dataConverter.convertTreeToLayerData(
      layoutFrom.tree,
      {
        extensionRadius,
        labelRadius,
        canvasWidth: layoutFrom.width,
        canvasHeight: layoutFrom.height
      }
    );

    const dataTo = this.dataConverter.convertTreeToLayerData(
      layoutTo.tree,
      {
        extensionRadius,
        labelRadius,
        canvasWidth: layoutTo.width,
        canvasHeight: layoutTo.height
      }
    );

    const interpolatedData = this.treeInterpolator.interpolateTreeData(dataFrom, dataTo, t);
    interpolatedData.trails = this._buildFlowTrails(interpolatedData.nodes, interpolatedData.labels);
    return interpolatedData;
  }

  async renderInterpolatedFrame(fromTreeData, toTreeData, timeFactor, options = {}) {
    const { fromTreeIndex, toTreeIndex } = options;
    let t = Math.max(0, Math.min(1, timeFactor));
    if (fromTreeData === toTreeData) t = 0;

    // Clear trails when starting a new interpolation (from a different source tree)
    if (this._lastInterpolationFromIndex !== fromTreeIndex) {
      this.trailBuilder.clearHistory();
      this._lastInterpolationFromIndex = fromTreeIndex;
    }

    t = this.applyInterpolationEasing(t, 'easeInOut');
    const layoutFrom = this._calculateLayout(fromTreeData, fromTreeIndex);
    const layoutTo = this._calculateLayout(toTreeData, toTreeIndex);

    const currentLeaves = layoutTo.tree.leaves();
    const { extensionRadius, labelRadius } = this._getConsistentRadii(
      layoutFrom, layoutTo, null, currentLeaves
    );
    const dataFrom = this.dataConverter.convertTreeToLayerData(
      layoutFrom.tree,
      {
        extensionRadius,
        labelRadius,
        canvasWidth: layoutFrom.width,
        canvasHeight: layoutFrom.height
      }
    );

    const dataTo = this.dataConverter.convertTreeToLayerData(
      layoutTo.tree,
      {
        extensionRadius,
        labelRadius,
        canvasWidth: layoutTo.width,
        canvasHeight: layoutTo.height
      }
    );

    const interpolatedData = this.treeInterpolator.interpolateTreeData(dataFrom, dataTo, t);
    // Append trails if enabled
    interpolatedData.trails = this._buildFlowTrails(interpolatedData.nodes, interpolatedData.labels);
    this._updateLayersEfficiently(interpolatedData);
    this.viewportManager.updateScreenPositions(interpolatedData.nodes, this.viewSide);
  }

  async _updateLayersEfficiently(newData) {
    if (!this.deckManager?.deck) {
      console.warn('[DeckGLTreeAnimationController] Deck not ready, skipping layer update');
      return;
    }
    const layers = this.layerManager.updateLayersWithData(newData);
    this.deckManager.setLayers(layers);
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

    // Safety check: ensure tree data exists before rendering
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
      const interpolatedData = this._buildInterpolatedData(fromTree, toTree, easedProgress, {
        toTreeIndex,
        fromTreeIndex
      });

      const full = Array.isArray(transitionResolver?.fullTreeIndices) ? transitionResolver.fullTreeIndices : [];
      const rightIdx = full.find((i) => i > toTreeIndex) ?? full[full.length - 1] ?? toTreeIndex;
      const rightTree = movieData.interpolated_trees[rightIdx];

      if (rightTree) {
        await this.comparisonRenderer.renderAnimated(interpolatedData, rightTree, rightIdx);
        return;
      }
    }

    await this.renderInterpolatedFrame(
      fromTree,
      toTree,
      easedProgress,
      {
        toTreeIndex: toTreeIndex,
        fromTreeIndex: fromTreeIndex
      }
    );

  }


  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.contextMenu?.destroy();
    this.deckManager?.destroy();
    this.layerManager?.destroy();
  }

  async _animationLoop() {
    if (!useAppStore.getState().playing) return;

    this.animationFrameId = animate({
      from: 0,
      to: 1,
      duration: 16.67,
      repeat: Infinity,
      onUpdate: async () => {
        const { playing } = useAppStore.getState();
        if (playing) {
          await this._updateSmoothAnimation(performance.now());
        } else {
          this.animationFrameId?.stop();
          this.animationFrameId = null;
        }
      }
    });
  }

  async renderScrubFrame(fromTreeData, toTreeData, timeFactor, options = {}) {
    await this.renderInterpolatedFrame(fromTreeData, toTreeData, timeFactor, options);
  }


  refreshAllColors(triggerRender = true) {
    this.layerManager?.layerStyles?.invalidateCache();
    if (triggerRender) this.renderAllElements();
  }


  /**
   * Build flow trails for nodes and labels using modular TrailBuilder.
   * Trails help track element movement during animations.
   * @param {Array} nodes - Node elements
   * @param {Array} labels - Label elements
   * @returns {Array} Trail segments
   */
  _buildFlowTrails(nodes, labels) {
    const { trailsEnabled, trailLength, trailOpacity } = useAppStore.getState();

    return this.trailBuilder.buildTrails(nodes, labels, {
      enabled: trailsEnabled,
      length: trailLength,
      opacity: trailOpacity
    });
  }

  /**
   * Get store state - helper for ComparisonModeRenderer
   */
  _getState() {
    return useAppStore.getState();
  }

  /**
   * Clamp tree index to valid range - helper for ComparisonModeRenderer
   */
  _clampIndex(index) {
    const { treeList } = useAppStore.getState();
    return Math.min(Math.max(index, 0), treeList.length - 1);
  }

}
