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
export { SEPARATION_STRATEGIES, mapStrategyName } from './constants/Strategies.js';

// Utils
export {
  getGroupForTaxon,
  getGroupForStrategy,
  getGroupBetweenSeparators,
  generateGroups,
  applyColoringData
} from './utils/GroupingUtils.js';
export { analyzeSeparatorUsage, detectUsefulSeparators } from './utils/SeparatorUtils.js';

// Components
export { ColorPicker } from './components/ColorPicker.js';
export { UIComponentFactory } from './components/UIComponentFactory.js';
export { default as TaxaColoring } from './components/TaxaColoring.jsx';
