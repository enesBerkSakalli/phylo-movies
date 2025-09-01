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

    // Flow trails history: Map of element id -> array of past positions
    this._trailHistory = new Map();
    
    // Track last interpolation source to detect when we start a new interpolation
    this._lastInterpolationFromIndex = null;

    // Track last tree index we auto-fit to
    this._lastFocusedTreeIndex = null;
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
      this._trailHistory.clear();
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
      { extensionRadius, labelRadius }
    );

    const dataTo = this.dataConverter.convertTreeToLayerData(
      layoutTo.tree,
      { extensionRadius, labelRadius }
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


  _buildFlowTrails(nodes, labels) {
    const { trailsEnabled, trailLength, trailOpacity } = useAppStore.getState();
    if (!trailsEnabled) return [];

    const minDistSq = 0.25; // avoid noise for tiny moves

    const addPoint = (el) => {
      const id = el.id;
      const [x,y] = el.position;
      let arr = this._trailHistory.get(id);
      if (!arr) arr = [];
      const last = arr[arr.length - 1];
      if (!last || ((x - last.x)*(x - last.x) + (y - last.y)*(y - last.y)) > minDistSq) {
        arr.push({ x, y });
        if (arr.length > trailLength) arr.shift();
        this._trailHistory.set(id, arr);
      }
    };

    (nodes || []).forEach(addPoint);
    (labels || []).forEach(addPoint);

    const segments = [];
    const pushSegs = (el, kind) => {
      const id = el.id;
      const hist = this._trailHistory.get(id) || [];
      for (let i = 0; i < hist.length - 1; i++) {
        const p0 = hist[i];
        const p1 = hist[i+1];
        const ageFactor = (i+1) / Math.max(1, hist.length);
        const alphaFactor = trailOpacity * (1 - ageFactor);
        const seg = {
          id: `${id}-seg-${i}`,
          path: [[p0.x, p0.y, 0], [p1.x, p1.y, 0]],
          alphaFactor,
          kind
        };
        if (kind === 'label') seg.leaf = el.leaf;
        if (kind === 'node') seg.node = el;
        segments.push(seg);
      }
    };

    (nodes || []).forEach(n => pushSegs(n, 'node'));
    (labels || []).forEach(l => pushSegs(l, 'label'));

    return segments;
  }

}
