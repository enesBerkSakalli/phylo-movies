import { TextLayer } from '@deck.gl/layers';
import { CLIPBOARD_LAYER_ID_PREFIX } from '../deckgl/layers/config/layerConfigs.js';
import { useAppStore } from '../../core/store.js';
import { calculateVisualBounds } from './TreeBoundsUtils.js';

/**
 * Get clipboard layers if clipboard is active
 * @param {Object} controller - The DeckGLTreeAnimationController instance
 * @returns {Array} Clipboard layers or empty array
 */
export function getClipboardLayers(controller) {
  const { clipboardTreeIndex, treeList } = useAppStore.getState();
  if (clipboardTreeIndex === null || !treeList?.[clipboardTreeIndex]) {
    return [];
  }

  return createClipboardVisualLayers(controller, clipboardTreeIndex, treeList[clipboardTreeIndex]);
}

/**
 * Create clipboard tree layers with visual positioning.
 */
function createClipboardVisualLayers(controller, treeIndex, treeData) {
  const layout = controller.calculateLayout(treeData, {
    treeIndex,
    updateController: false,
    rotationAlignmentKey: 'clipboard'
  });

  if (!layout?.tree) {
    console.warn('[DeckGLTreeAnimationController] Clipboard layout not available');
    return [];
  }

  const { extensionRadius, labelRadius } = controller._getConsistentRadii(layout);

  const layerData = controller.dataConverter.convertTreeToLayerData(
    layout.tree,
    {
      extensionRadius,
      labelRadius,
      canvasWidth: layout.width,
      canvasHeight: layout.height
    }
  );

  const { transitionResolver, clipboardOffsetX = 0, clipboardOffsetY = 0 } = useAppStore.getState();
  const fullTreeIndices = transitionResolver?.fullTreeIndices || [];

  // Calculate clipboard tree VISUAL bounds (including labels)
  const clipboardBounds = calculateVisualBounds(layerData.nodes, layerData.labels);

  // Get current main tree VISUAL bounds
  const mainTreeBounds = getMainTreeBounds(controller);

  // Position clipboard to the TOP LEFT ABOVE the main tree
  // Combined with dynamic user dragging offsets
  const xOffset = (mainTreeBounds.minX - clipboardBounds.minX) + clipboardOffsetX;
  const gap = 50;
  const yOffset = (mainTreeBounds.minY - clipboardBounds.maxY - gap) + clipboardOffsetY;

  const treeLayers = controller.layerManager.createClipboardLayers(layerData, 0, xOffset, yOffset);
  const labelLayer = createClipboardLabelLayer(
    treeIndex,
    clipboardBounds,
    fullTreeIndices,
    xOffset,
    yOffset
  );

  return [...treeLayers, labelLayer].filter(Boolean);
}

/**
 * Get bounds of the currently rendered main tree
 */
function getMainTreeBounds(controller) {
  // Use the current tree data to calculate bounds
  if (controller.currentTreeData) {
    const layout = controller.calculateLayout(controller.currentTreeData, {
      treeIndex: useAppStore.getState().currentTreeIndex,
      updateController: false
    });
    if (layout?.tree) {
      const { extensionRadius, labelRadius } = controller._getConsistentRadii(layout);
      const layerData = controller.dataConverter.convertTreeToLayerData(
        layout.tree,
        { extensionRadius, labelRadius, canvasWidth: layout.width, canvasHeight: layout.height }
      );
      return calculateVisualBounds(layerData.nodes, layerData.labels);
    }
  }
  // Fallback to reasonable defaults
  return { minX: -500, maxX: 500, minY: -500, maxY: 500 };
}

/**
 * Create clipboard label TextLayer
 * @param {number} treeIndex - Tree index for label text
 * @param {Object} bounds - Visual bounds of clipboard tree {minX, maxX, minY, maxY}
 * @param {Array} fullTreeIndices - Array of full tree indices from store for anchor detection
 * @param {number} xOffset - X offset for clipboard position
 * @param {number} yOffset - Y offset for clipboard position
 * @returns {TextLayer|null} Label layer or null
 */
export function createClipboardLabelLayer(treeIndex, bounds, fullTreeIndices = [], xOffset = 0, yOffset = 0) {
  if (!bounds) return null;

  // Position label above the tree VISUAL bounds
  const minY = bounds.minY;
  const avgX = (bounds.minX + bounds.maxX) / 2;

  let labelText = `Tree #${treeIndex + 1}`;
  // Check if it's a source-target tree
  const anchorIndex = fullTreeIndices.indexOf(treeIndex);
  if (anchorIndex >= 0) {
      labelText = `Source-Target Tree (Sequence #${anchorIndex + 1})`; // 1-based index for user
  }

  return new TextLayer({
    id: `${CLIPBOARD_LAYER_ID_PREFIX}-tree-label`,
    data: [{
      text: labelText,
      // Place well above the visual top (minY).
      // Visual bounds include label extent, so this should be safe.
      // Add extra padding (e.g. 50px) to separate from top-most tree label.
      position: [avgX + xOffset, minY + yOffset - 50, 0],
      treeSide: 'clipboard'
    }],
    pickable: true,
    getText: d => d.text,
    getPosition: d => d.position,
    getSize: 16,
    getColor: [0, 0, 0, 255], // Black
    fontFamily: 'sans-serif',
    fontWeight: 'bold',
    getTextAnchor: 'middle',
    getAlignmentBaseline: 'bottom'
  });
}
