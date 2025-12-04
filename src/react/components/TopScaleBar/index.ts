// index.ts - Public exports for TopScaleBar module

export { TopScaleBar } from './TopScaleBar';
export { BranchLengthHistogram } from './BranchLengthHistogram';
export { CurrentScaleDisplay } from './CurrentScaleDisplay';
export { TaxaLegend } from './TaxaLegend';
export { useScaleMetrics } from './useScaleMetrics';

// Export types for external use
export type {
  HistogramBin,
  HistogramStats,
  HistogramData,
  ScaleMetrics,
  TreeNode,
  ScaleListItem,
  TransitionResolver,
} from './types';
