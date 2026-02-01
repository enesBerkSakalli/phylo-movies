import { useAppStore, selectCurrentTree } from '../../core/store.js';

/**
 * Handles the static rendering of trees (non-animated states).
 * Coordinates between DeckGLTreeAnimationController and internal renderers.
 */
export class StaticRenderer {
  constructor(controller) {
    this.controller = controller;
  }

  /*
   * Renders all elements for a static view.
   * Handles both single tree and comparison modes.
   */
  async renderAllElements(options = {}) {
    if (!this.controller.ready) {
      await this.controller.readyPromise;
    }

    if (!this.controller.useReactDeckGL && !this.controller.deckContext?.deck) return;

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

  /*
   * Helper to render comparison mode static view.
   */
  _renderComparisonModeStatic(leftIndex, rightIndex, currentTreeIndex, transitionResolver) {
    const full = Array.isArray(transitionResolver?.fullTreeIndices) ? transitionResolver.fullTreeIndices : [];
    const computedRight = full.find((i) => i > currentTreeIndex) ?? full[full.length - 1] ?? currentTreeIndex;
    const leftIdx = Number.isInteger(leftIndex) ? leftIndex : currentTreeIndex;
    const rightIdx = Number.isInteger(rightIndex) ? rightIndex : computedRight;

    return this.controller.layerManager.renderComparisonStatic(leftIdx, rightIdx);
  }

  /*
   * Helper to render a single tree in static mode.
   */
  _renderSingleTree(treeIndex, currentTreeIndex, treeList, state) {
    if (!treeList?.length) return;

    const targetIndex = Number.isInteger(treeIndex)
      ? Math.min(Math.max(treeIndex, 0), treeList.length - 1)
      : currentTreeIndex;

    const targetTreeData =
      targetIndex === currentTreeIndex
        ? selectCurrentTree(state)
        : treeList[targetIndex];

    this.controller.currentTreeData = targetTreeData;

    const currentLayout = this.controller.calculateLayout(targetTreeData, {
      treeIndex: targetIndex,
      updateController: true
    });

    const { extensionRadius, labelRadius } = this.controller._getConsistentRadii(currentLayout);

    const layerData = this.controller.dataConverter.convertTreeToLayerData(
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

    this.controller._updateLayersEfficiently(layerData);

    if (this.controller._lastFocusedTreeIndex === null) {
      this.controller.viewportManager.focusOnTree(layerData.nodes, layerData.labels);
      this.controller._lastFocusedTreeIndex = targetIndex;
    }

    this.controller.viewportManager.updateScreenPositions(layerData.nodes, this.controller.viewSide);
  }
}
