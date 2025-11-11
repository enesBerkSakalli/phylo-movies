import { DeckGLDataAdapter } from './deckgl/DeckGLDataAdapter.js';
import { DeckManager } from './deckgl/core/DeckManager.js';
import { LayerManager } from './deckgl/layers/LayerManager.js';
import { TreeInterpolator } from './deckgl/interpolation/TreeInterpolator.js';
import { TrailBuilder } from './deckgl/trails/TrailBuilder.js';
import { WebGLTreeAnimationController } from './WebGLTreeAnimationController.js';
import { useAppStore } from '../core/store.js';
import { easeInOut, animate } from 'popmotion';
import { NodeContextMenu } from '../components/NodeContextMenu.js';
import { TreeNodeInteractionHandler } from './interaction/TreeNodeInteractionHandler.js';
import { applyInterpolationEasing } from '../utils/easingUtils.js';

export class DeckGLTreeAnimationController extends WebGLTreeAnimationController {
  constructor(container, { animations = true } = {}) {
    super(container);
    this.animationsEnabled = animations;
    this.dataConverter = new DeckGLDataAdapter();
    this.layerManager = new LayerManager();
    this.treeInterpolator = new TreeInterpolator();
    this.contextMenu = new NodeContextMenu();
    this.currentTreeData = null;
    this.interactionHandler = new TreeNodeInteractionHandler(this, this.contextMenu);

    this.deckManager = new DeckManager(this.webglContainer);

    this.deckManager.onWebGLInitialized((gl) => { this.gl = gl; });

    this.deckManager.onError((error) => console.error('[DeckGL Controller] Deck.gl error:', error));

    this.deckManager.onNodeClick((info, event) => this.interactionHandler.handleNodeClick(info, event, this.deckManager.canvas));

    this.deckManager.onNodeHover((info, event) => this.interactionHandler.handleNodeHover(info, event));

    this.deckManager.initialize();

    this.layerManager.layerStyles.setStyleChangeCallback(() => this._handleStyleChange());

    // Motion trail builder for tracking element movement
    this.trailBuilder = new TrailBuilder({ minDistanceSq: 0.25 });
    // Maintain last-frame node angles for tracking purposes
    this._lastNodeAngles = new Map();
    this._lastTickTs = null;

    // Track last interpolation source to detect when we start a new interpolation
    this._lastInterpolationFromIndex = null;

    // Track last tree index we auto-fit to
    this._lastFocusedTreeIndex = null;

    // Track change metrics between frames to adapt easing strategies
    this._lastChangeMetrics = null;

    // Simple layout cache to avoid recomputing the same from/to layouts every frame
    this._lastLayoutFromIndex = null;
    this._lastLayoutToIndex = null;
    this._lastLayoutFrom = null;
    this._lastLayoutTo = null;
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



  setCameraMode(mode) {
    this.deckManager.setCameraMode(mode, { preserveTarget: true });
    this.renderAllElements();
  }


  async renderAllElements(options = {}) {
    const { currentTreeIndex, treeList } = useAppStore.getState();
    const currentTreeData = treeList[currentTreeIndex];

    this.currentTreeData = currentTreeData;

    const currentLayout = this.calculateLayout(currentTreeData, {
      treeIndex: currentTreeIndex,
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

    // Auto-fit policy: only focus when not playing and policy enabled,
    // and only when the tree index actually changes.
    const { playing, autoFitOnTreeChange } = useAppStore.getState();
    if (!playing && autoFitOnTreeChange) {
      if (this._lastFocusedTreeIndex !== currentTreeIndex) {
        this.focusOnTree(layerData.nodes, layerData.labels);
        this._lastFocusedTreeIndex = currentTreeIndex;
      }
    }

  }

  focusOnTree(nodes, labels) {
    const allElements = [...nodes, ...(labels || [])];
    const bounds = allElements.reduce((acc, el) => {
      const [x, y] = el.position;
      acc.minX = Math.min(acc.minX, x);
      acc.maxX = Math.max(acc.maxX, x);
      acc.minY = Math.min(acc.minY, y);
      acc.maxY = Math.max(acc.maxY, y);
      return acc;
    }, {
      minX: Infinity, maxX: -Infinity,
      minY: Infinity, maxY: -Infinity,
    });

    this.deckManager.fitToBounds(bounds, {
      padding: 1.25,
      duration: 550,
      labels,
      getLabelSize: this.layerManager.layerStyles.getLabelSize?.bind(this.layerManager.layerStyles)
    });
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
  }

  async _updateLayersEfficiently(newData) {
    const layers = this.layerManager.updateLayersWithData(newData);
    this.deckManager.setLayers(layers);
  }


  async _updateSmoothAnimation(timestamp) {
    const { movieData, updateAnimationProgress, getAnimationInterpolationData, stop } = useAppStore.getState();
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

  _selectInterpolationEasing(changeMetrics) {
    const avgChange = changeMetrics?.averageChange ?? 0;

    if (!Number.isFinite(avgChange) || avgChange <= 0.05) {
      return 'gentle';
    }

    if (avgChange >= 0.2) {
      return 'linear';
    }

    return avgChange > 0.1 ? 'linear' : 'gentle';
  }

}
