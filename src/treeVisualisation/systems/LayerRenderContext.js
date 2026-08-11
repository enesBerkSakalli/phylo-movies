import { selectLeafNamesByIndex } from '../../state/phyloStore/selectors/treeSelectors.js';
export {
  getRenderContextChangeCategory,
  selectRenderRelevantFields,
} from '../RenderContextFields.js';

/**
 * Build the complete state snapshot consumed by deck.gl layer creation.
 *
 * The controller owns the store read. Layer modules receive this immutable-for-a-render
 * context and therefore do not depend on application state themselves.
 */
export function createLayerRenderContext(state, layerData = {}) {
  return {
    ...state,
    metricScale: Number.isFinite(layerData.metricScale) ? layerData.metricScale : 1,
    zoom: layerData.zoom ?? state.viewState?.zoom,
    taxaCount: selectLeafNamesByIndex(state).length,
  };
}
