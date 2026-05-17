import { useAppStore, selectCurrentTree } from '../../state/phyloStore/store.js';
import { getSplitKey } from '../../domain/tree/splits.js';

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
    const layerData = info?.object;
    const treeContext = this._getTreeContext(layerData, state);
    const treeData = treeContext?.tree ?? selectCurrentTree(state);
    const treeIndex = treeContext?.treeIndex ?? state.currentTreeIndex;
    const treeNode = this._findContextNodeFromLayerData(layerData, treeData, treeIndex);

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
      state.showNodeContextMenu(treeNode, { x, y });
    } else {
      console.warn('showNodeContextMenu action not found in store');
    }
  }

  /**
   * Find the normalized tree node that corresponds to a layer data object
   * @param {Object} layerData - Data object from the layer
   * @param {Object} currentTreeData - Current tree data to search in
   * @returns {Object|null} Plain context-menu node
   */
  _findContextNodeFromLayerData(layerData, currentTreeData, treeIndex) {
    if (!layerData || !currentTreeData) return null;

    const targetSplitKey = getSplitKey(layerData);
    if (!targetSplitKey) return null;

    const currentLayout = this.layoutCalculator.calculateLayout(currentTreeData, {
      treeIndex
    });

    const allNodes = currentLayout?.nodes;
    if (!Array.isArray(allNodes)) return null;

    const layoutNode = allNodes.find(node => getSplitKey(node?.split_indices) === targetSplitKey);
    return layoutNode ? toContextMenuNode(layoutNode, null, {
      splitKey: layerData?.splitKey || targetSplitKey,
      treeIndex,
      treeSide: layerData?.treeSide
    }) : null;
  }

  _getTreeContext(layerData, state) {
    const treeIndex = layerData?.treeIndex;
    if (Number.isInteger(treeIndex) && typeof state.getTreeContext === 'function') {
      return state.getTreeContext(treeIndex);
    }
    return null;
  }
}

function toContextMenuNode(node, path = null, renderContext = null) {
  const currentPath = path || getNodePath(node);
  const children = Array.isArray(node.children)
    ? node.children.map(child => toContextMenuNode(child, [...currentPath, getNodeName(child)]))
    : [];

  const context = renderContext ? {
    splitKey: renderContext.splitKey,
    treeIndex: renderContext.treeIndex,
    treeSide: renderContext.treeSide,
  } : {};

  return {
    name: node.name,
    length: node.length ?? 0,
    split_indices: Array.isArray(node.split_indices) ? [...node.split_indices] : [],
    depth: node.depth ?? 0,
    height: node.height ?? 0,
    path: currentPath,
    children,
    ...context,
  };
}

function getNodePath(node) {
  if (Array.isArray(node?.path) && node.path.length > 0) {
    return [...node.path];
  }
  return [getNodeName(node)];
}

function getNodeName(node) {
  return node?.name || `depth_${node?.depth ?? 0}`;
}
