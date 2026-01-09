import { useAppStore, selectCurrentTree } from '../../core/store.js';

/**
 * Handles tree node interactions for deck.gl visualization
 * Coordinates between layer data and tree data for click/hover events
 */
export class TreeNodeInteractionHandler {
  constructor(layoutCalculator, viewSide = 'single') {
    this.layoutCalculator = layoutCalculator;
    this.viewSide = viewSide; // 'left' | 'right' | 'single'
  }

  /**
   * Handle node click events from deck.gl
   * @param {Object} info - Deck.gl picking info
   * @param {Event} event - DOM event
   * @param {HTMLCanvasElement} canvas - Canvas element for coordinate calculation
   */
  handleNodeClick(info, event, canvas) {
    const state = useAppStore.getState();
    const currentTreeData = selectCurrentTree(state);
    const treeNode = info?.object?.originalNode ||
      this._findTreeNodeFromLayerData(info?.object, currentTreeData);

    let x, y;
    if (event.center) {
      x = event.center.x;
      y = event.center.y;
    } else if (canvas) {
      const rect = canvas.getBoundingClientRect();
      x = rect.left + (info.x || 0);
      y = rect.top + (info.y || 0);
    } else {
      x = info.x || 0;
      y = info.y || 0;
      console.warn('TreeNodeInteractionHandler: Canvas is null and event.center is missing. Context menu position might be incorrect.');
    }

    if (state.showNodeContextMenu) {
      state.showNodeContextMenu(treeNode, currentTreeData, x, y);
    } else {
      console.warn('showNodeContextMenu action not found in store');
    }
  }

  /**
   * Handle node hover events from deck.gl
   * @param {Object} info - Deck.gl picking info
   * @param {Event} event - DOM event
   */
  handleNodeHover(info, event) {
    // No-op: linked highlighting is applied automatically when view link mapping is recomputed.
  }

  /**
   * Find the D3 tree node that corresponds to a layer data object
   * @param {Object} layerData - Data object from the layer
   * @param {Object} currentTreeData - Current tree data to search in
   * @returns {Object|null} Corresponding D3 tree node
   */
  _findTreeNodeFromLayerData(layerData, currentTreeData) {
    if (!layerData || !layerData.position || !currentTreeData) return null;
    const { currentTreeIndex } = useAppStore.getState();
    const currentLayout = this.layoutCalculator.calculateLayout(currentTreeData, {
      treeIndex: currentTreeIndex,
      updateController: false
    });

    const allNodes = currentLayout.tree.descendants();
    const [targetX, targetY] = layerData.position;
    const tolerance = 0.001;

    return allNodes.find(node => {
      return Math.abs(node.x - targetX) < tolerance && Math.abs(node.y - targetY) < tolerance;
    }) || null;
  }
}
