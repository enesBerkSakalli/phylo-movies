import { CLIPBOARD_LAYER_CONFIGS } from '../../config/layerConfigs.js';
import { createTreeLayerSet } from '../LayerSetFactory.js';

export function createClipboardLayers({ data, state, layerStyles, modelMatrix }) {
  return createTreeLayerSet({
    data,
    state,
    layerStyles,
    configs: CLIPBOARD_LAYER_CONFIGS,
    modelMatrix,
    treeSide: 'clipboard',
    skipEmpty: true,
    useSideSuffix: false,
  });
}
