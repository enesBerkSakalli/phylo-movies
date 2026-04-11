// types.ts - Type definitions for TopScaleBar components

export interface HistogramBin {
  from: number;
  to: number;
  count: number;
}

export interface HistogramStats {
  mean: number;
  min: number;
  max: number;
}

export interface HistogramData {
  bins: HistogramBin[];
  maxCount: number;
  mean: number;
  min: number;
  max: number;
}

export interface ScaleMetrics {
  formattedCurrent: string;
  formattedMax: string;
  progress: number;
  histogramBins: HistogramBin[];
  histogramMax: number;
  histogramStats: HistogramStats;
}

export interface TreeNode {
  length?: number;
  children?: TreeNode[];
  [key: string]: unknown;
}

export interface ScaleListItem {
  index?: number;
  value?: number;
}

export interface TransitionResolver {
  getSourceTreeIndex?: (index: number) => number;
}
