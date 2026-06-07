import {
  selectActiveTreeList,
  selectCurrentTree,
  selectInputFrameIndices,
  useAppStore,
} from '../../state/phyloStore/store.js';
import { VIEWPORT_FIT_OBSTRUCTION_SCOPES } from '../spatial/layout.js';
import { tagTreeSide } from '../utils/layerDataUtils.js';
import {
  VIEWPORT_AUTO_FIT_CENTER_DRIFT_LIMIT_RATIO,
  VIEWPORT_FIT_MODES,
} from '../viewport/viewportFit.js';

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

    if (!this.controller.deckContext?.deck) return;

    const { treeIndex, leftIndex, rightIndex, comparisonMode, skipAutoFit = false } = options;
    const state = useAppStore.getState();
    const { frameIndex, comparisonMode: comparisonModeFromStore } = state;
    const treeList = selectActiveTreeList(state);
    const linkGeometryMode = this.controller._getLinkGeometryMode?.(state) ?? 'radial-elbow';

    // Handle comparison mode (explicit or inferred from store)
    const useComparison = comparisonMode ?? comparisonModeFromStore;
    if (useComparison) {
      return this._renderComparisonModeStatic(leftIndex, rightIndex, frameIndex, state);
    }

    // Single tree mode
    this._renderSingleTree(treeIndex, frameIndex, treeList, state, linkGeometryMode, {
      skipAutoFit,
    });
  }

  /*
   * Helper to render comparison mode static view.
   */
  _renderComparisonModeStatic(leftIndex, rightIndex, frameIndex, state) {
    const inputFrameIndices = selectInputFrameIndices(state);
    const computedRight =
      inputFrameIndices.find((i) => i > frameIndex) ??
      inputFrameIndices[inputFrameIndices.length - 1] ??
      frameIndex;
    const leftIdx = Number.isInteger(leftIndex) ? leftIndex : frameIndex;
    const rightIdx = Number.isInteger(rightIndex) ? rightIndex : computedRight;

    return this.controller.layerManager.renderComparisonStatic(leftIdx, rightIdx);
  }

  /*
   * Helper to render a single tree in static mode.
   */
  _renderSingleTree(
    treeIndex,
    frameIndex,
    treeList,
    state,
    linkGeometryMode = 'radial-elbow',
    options = {}
  ) {
    if (!treeList?.length) return;

    const targetIndex = Number.isInteger(treeIndex)
      ? Math.min(Math.max(treeIndex, 0), treeList.length - 1)
      : frameIndex;

    state.ensureTreeHydrated?.(targetIndex);
    const latestState = useAppStore.getState();
    const latestTreeList = selectActiveTreeList(latestState);
    const targetTreeData =
      targetIndex === frameIndex
        ? selectCurrentTree(latestState)
        : (latestTreeList[targetIndex] ?? treeList[targetIndex]);

    const currentLayout = this.controller.calculateLayout(targetTreeData, {
      treeIndex: targetIndex,
    });
    if (!currentLayout) return;

    const { extensionRadius, labelRadius } = this.controller._getConsistentRadii(currentLayout);

    const layerData = this.controller.dataConverter.convertTreeToLayerData(currentLayout, {
      extensionRadius,
      labelRadius,
      treeIndex: targetIndex,
      treeSide: 'left',
      renderMode: 'single',
      linkGeometryMode,
    });

    // Tag data for interactive picking/dragging (always 'left' in single mode)
    tagTreeSide(layerData, 'left');

    this.controller._updateLayersEfficiently(layerData);

    if (!options.skipAutoFit && this.controller._lastFocusedTreeIndex !== targetIndex) {
      const visibleLabels = state.labelsVisible === false ? [] : layerData.labels;
      this.controller.viewportManager.focusOnTree(layerData.nodes, visibleLabels, {
        fitMode: VIEWPORT_FIT_MODES.BRANCH,
        includeLabelAnchorBounds: visibleLabels.length > 0,
        obstructionScope: VIEWPORT_FIT_OBSTRUCTION_SCOPES.CANVAS,
        maxFitAreaCenterDriftRatio: VIEWPORT_AUTO_FIT_CENTER_DRIFT_LIMIT_RATIO,
        links: [...layerData.links, ...layerData.extensions],
      });
    }

    this.controller._lastFocusedTreeIndex = targetIndex;
  }
}
