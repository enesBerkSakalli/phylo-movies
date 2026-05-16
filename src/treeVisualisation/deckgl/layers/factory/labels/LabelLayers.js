/**
 * Factory for labels layer
 */
import { selectLeafNamesByIndex } from '../../../../../state/phyloStore/selectors/treeSelectors.js';
import {
  getHistoryOffset,
  addZOffset,
  normalizeTextAnchor
} from '../../styles/labels/labelUtils.js';

export function getLabelsLayerProps(labels, state, layerStyles) {
  const { taxaColorVersion, colorVersion, fontSize, highlightColorMode } = state || {};
  const taxaCount = selectLeafNamesByIndex(state).length;

  // Get cached state once for all accessors
  const cached = layerStyles.getCachedState(state);
  // Render all labels in single layer (source/destination styling handled conditionally)

  return {
    data: labels,
    pickable: true,
    fontWeight: 'bold',  // Bold to match node visual intensity
    getPosition: d => addZOffset(d.position, getHistoryOffset(cached, d)),
    getText: d => d.text,
    getSize: d => layerStyles.getLabelSize(d, cached),
    getColor: d => {
      const color = layerStyles.getLabelColor(d, cached);
      return color;
    },
    // Convert rotation from radians to degrees (deck.gl expects degrees)
    getAngle: d => ((d.rotation ?? 0) * 180) / Math.PI,
    getTextAnchor: d => normalizeTextAnchor(d.textAnchor),

    // SDF disabled - bitmap fonts render cleaner at small sizes when zoomed out
    characterSet: 'auto',
    fontSettings: {
      sdf: false
    },

    updateTriggers: {
      getColor: [colorVersion, taxaColorVersion, highlightColorMode],
      getSize: [fontSize, colorVersion, taxaColorVersion, taxaCount],
      getPosition: [colorVersion]
    }
  };
}
