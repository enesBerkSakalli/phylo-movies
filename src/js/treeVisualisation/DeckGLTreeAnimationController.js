import { DeckGLDataAdapter } from './deckgl/DeckGLDataAdapter.js';
import { DeckManager } from './deckgl/core/DeckManager.js';
import { LayerManager } from './deckgl/layers/LayerManager.js';
import { TreeInterpolator } from './deckgl/interpolation/TreeInterpolator.js';
import { WebGLTreeAnimationController } from './WebGLTreeAnimationController.js';
import { useAppStore } from '../core/store.js';
import { easeInOut, animate } from 'popmotion';
import { NodeContextMenu } from '../components/NodeContextMenu.js';
import { TreeNodeInteractionHandler } from './interaction/TreeNodeInteractionHandler.js';

export class DeckGLTreeAnimationController extends WebGLTreeAnimationController {
  constructor() {
    super();
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
      { extensionRadius, labelRadius }
    );

    this._updateLayersEfficiently(layerData);
    this.focusOnTree(layerData.nodes, layerData.labels);
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

    this.deckManager.fitToBounds(bounds, { padding: 1.2, duration: 500 });
  }

  renderScene() {}

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

    t = this.applyInterpolationEasing(t, 'easeInOut');
    const layoutFrom = this._calculateLayout(fromTreeData, fromTreeIndex);
    const layoutTo = this._calculateLayout(toTreeData, toTreeIndex);

    const currentLeaves = layoutTo.tree.leaves();
    const { extensionRadius, labelRadius } = this._getConsistentRadii(
      layoutFrom, layoutTo, null, currentLeaves
    );
    const dataFrom = this.dataConverter.convertTreeToLayerData(
      layoutFrom.tree,
      { extensionRadius, labelRadius }
    );

    const dataTo = this.dataConverter.convertTreeToLayerData(
      layoutTo.tree,
      { extensionRadius, labelRadius }
    );

    const interpolatedData = this.treeInterpolator.interpolateTreeData(dataFrom, dataTo, t);
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
    this.animationFrameId?.stop();
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

}
