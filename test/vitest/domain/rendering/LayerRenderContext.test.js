import { describe, expect, it } from 'vitest';
import { createLayerRenderContext } from '../../../../src/treeVisualisation/systems/LayerRenderContext.js';

describe('LayerRenderContext', () => {
  it('provides the layer-only values from one controller-owned state snapshot', () => {
    const state = {
      leafNamesByIndex: ['a', 'b', 'c'],
      viewState: { zoom: 2 },
      strokeWidth: 4,
    };

    const context = createLayerRenderContext(state, { metricScale: 0.5, zoom: 3 });

    expect(context).toMatchObject({
      strokeWidth: 4,
      taxaCount: 3,
      metricScale: 0.5,
      zoom: 3,
    });
  });
});
