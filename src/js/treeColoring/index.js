// Barrel export for treeColoring module

// Constants - Export from central color palette location
export {
  CATEGORICAL_PALETTES,
  SEQUENTIAL_PALETTES,
  DIVERGING_PALETTES,
  getPalette,
  getPaletteInfo,
  getRecommendedPalettes
} from '../constants/ColorPalettes.js';

// Utils
export {
  getGroupForTaxon,
  getGroupForStrategy,
  generateGroups,
  applyColoringData,
  detectBestSeparators
} from './utils/GroupingUtils.js';

// Components
// Components
// export { default as TaxaColoring, openTaxaColoringFromStore } from './components/TaxaColoring.jsx';
