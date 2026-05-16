import { describe, expect, it } from 'vitest';
import { getNodesLayerProps } from '../src/treeVisualisation/deckgl/layers/factory/nodes/NodeLayers.js';
import { HISTORY_NODE_Z_OFFSET } from '../src/treeVisualisation/deckgl/layers/config/layerConfigs.js';
import { getNodeLineWidth } from '../src/treeVisualisation/deckgl/layers/styles/nodes/nodeWidthStyles.js';

describe('NodeLayers accessors', () => {
  it('returns a precomputed render position without allocating in the common path', () => {
    const renderPosition = [10, 20, 0.1];
    const node = {
      position: [10, 20, 0],
      renderPosition
    };
    const layerStyles = {
      getCachedState: () => ({ colorManager: null }),
      getNodeRadius: () => 3,
      getNodeColor: () => [1, 2, 3, 255],
      getNodeBorderColor: () => [1, 2, 3, 255],
      getNodeLineWidth: () => 1
    };

    const props = getNodesLayerProps([node], { leafNamesByIndex: [] }, layerStyles);

    expect(props.getPosition(node)).toBe(renderPosition);
  });

  it('offsets the normalized render position for history nodes', () => {
    const node = {
      position: [10, 20, 0],
      renderPosition: [10, 20, 0.1]
    };
    const layerStyles = {
      getCachedState: () => ({
        colorManager: {
          isNodeHistorySubtree: () => true
        }
      }),
      getNodeRadius: () => 3,
      getNodeColor: () => [1, 2, 3, 255],
      getNodeBorderColor: () => [1, 2, 3, 255],
      getNodeLineWidth: () => 1
    };

    const props = getNodesLayerProps([node], { leafNamesByIndex: [] }, layerStyles);

    expect(props.getPosition(node)).toEqual([10, 20, 0.1 + HISTORY_NODE_Z_OFFSET]);
  });

  it('requires normalized node leaf state for line width styling', () => {
    expect(() => getNodeLineWidth({ children: [] }, {})).toThrow('normalized isLeaf');
  });
});
