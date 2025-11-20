import { useAppStore, selectCurrentTree } from '../../core/store.js';

/**
 * Handles tree node interactions for deck.gl visualization
 * Coordinates between layer data and tree data for click/hover events
 */
export class TreeNodeInteractionHandler {
  constructor(layoutCalculator, contextMenu) {
    this.layoutCalculator = layoutCalculator;
    this.contextMenu = contextMenu;
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

    const treeNode = this._findTreeNodeFromLayerData(info.object, currentTreeData);

    const rect = canvas.getBoundingClientRect();
    const x = event.center ? event.center.x : (rect.left + (info.x || 0));
    const y = event.center ? event.center.y : (rect.top + (info.y || 0));

    this.contextMenu.show(treeNode, currentTreeData, x, y);
  }

  /**
   * Handle node hover events from deck.gl
   * @param {Object} info - Deck.gl picking info
   * @param {Event} event - DOM event
   */
  handleNodeHover(info, event) {
    // Future: Could add hover effects, tooltips, etc.
  }

  /**
   * Find the D3 tree node that corresponds to a layer data object
   * @param {Object} layerData - Data object from the layer
   * @param {Object} currentTreeData - Current tree data to search in
   * @returns {Object|null} Corresponding D3 tree node
   */
  _findTreeNodeFromLayerData(layerData, currentTreeData) {
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
