// utils.ts - Pure utility functions for scale and histogram calculations

import { bin as d3Bin } from 'd3-array';
import type { TreeNode, HistogramData, HistogramBin, ScaleListItem } from './types';

/**
 * Clamps a value between min and max
 */
export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * Recursively collects all branch lengths from a tree node
 */
export const collectBranchLengths = (node: TreeNode | null | undefined, lengths: number[] = []): number[] => {
  if (!node || typeof node !== 'object') return lengths;

  const len = Number(node.length);
  if (Number.isFinite(len)) {
    lengths.push(Math.max(0, len));
  }

  if (Array.isArray(node.children)) {
    node.children.forEach(child => collectBranchLengths(child, lengths));
  }

  return lengths;
};

/**
 * Builds a histogram from branch lengths using d3's binning algorithm
 */
export const buildHistogram = (lengths: number[]): HistogramData => {
  const emptyResult: HistogramData = {
    bins: [],
    maxCount: 0,
    mean: 0,
    min: 0,
    max: 0
  };

  if (!Array.isArray(lengths) || lengths.length === 0) {
    return emptyResult;
  }

  const minLen = Math.min(...lengths);
  const maxLen = Math.max(...lengths);
  const total = lengths.reduce((sum, v) => sum + v, 0);
  const mean = total / lengths.length;

  // Single value case: create one discrete bin
  if (minLen === maxLen) {
    return {
      bins: [{ from: minLen, to: minLen, count: lengths.length }],
      maxCount: lengths.length,
      mean,
      min: minLen,
      max: maxLen,
    };
  }

  // Few unique values case: create exact bins to avoid empty bins
  const valueCounts = new Map<number, number>();
  lengths.forEach(v => {
    valueCounts.set(v, (valueCounts.get(v) || 0) + 1);
  });

  const uniques = Array.from(valueCounts.keys()).sort((a, b) => a - b);

  if (uniques.length <= 6) {
    const bins: HistogramBin[] = uniques.map(v => ({
      from: v,
      to: v,
      count: valueCounts.get(v) || 0,
    }));
    const maxCount = Math.max(...bins.map(b => b.count));

    return { bins, maxCount, mean, min: minLen, max: maxLen };
  }

  // Many values case: use d3 binning algorithm
  const domainMax = Math.max(minLen + 1e-6, maxLen);
  const thresholdCount = clamp(Math.ceil(Math.sqrt(lengths.length)), 6, 14);

  const binner = d3Bin()
    .domain([minLen, domainMax])
    .thresholds(thresholdCount);

  const binned = binner(lengths);

  const bins: HistogramBin[] = binned.map(bucket => ({
    from: bucket.x0 ?? 0,
    to: bucket.x1 ?? 0,
    count: bucket.length,
  }));

  const maxCount = binned.reduce((acc, bucket) => Math.max(acc, bucket.length), 0);

  return { bins, maxCount, mean, min: minLen, max: maxLen };
};

/**
 * Creates a lookup map from scale list for O(1) access by index
 */
export const buildScaleLookup = (scaleList: ScaleListItem[] | null | undefined): Map<number, number> => {
  const map = new Map<number, number>();

  if (!Array.isArray(scaleList)) return map;

  scaleList.forEach((item, i) => {
    const idx = typeof item === 'object' && item !== null && 'index' in item ? item.index! : i;
    const val = typeof item === 'object' && item !== null && 'value' in item ? item.value! : (item as number);
    map.set(idx, Number(val) || 0);
  });

  return map;
};

/**
 * Resolves the source-target tree index based on current position and transition state
 * Uses source-target trees (not interpolated) to avoid jitter in histogram during animation
 */
export const resolveAnchorIndex = (
  currentTreeIndex: number,
  fullTreeIndices: number[] | null | undefined,
  transitionResolver: { getSourceTreeIndex?: (index: number) => number } | null | undefined,
  scaleListLength: number
): number => {
  try {
    const srcIdx = transitionResolver?.getSourceTreeIndex?.(currentTreeIndex);

    // If we have a valid source index from transition resolver
    if (Number.isFinite(srcIdx) && srcIdx! >= 0) {
      return Array.isArray(fullTreeIndices)
        ? (fullTreeIndices[srcIdx!] ?? fullTreeIndices[0] ?? 0)
        : srcIdx!;
    }

    // Find the most recent source-target tree at or before current position
    if (Array.isArray(fullTreeIndices) && fullTreeIndices.length > 0) {
      let chosen = fullTreeIndices[0];
      for (const fi of fullTreeIndices) {
        if (fi <= currentTreeIndex) {
          chosen = fi;
        } else {
          break;
        }
      }
      return chosen;
    }

    // Fallback: clamp current index
    return clamp(currentTreeIndex, 0, Math.max(0, scaleListLength - 1));
  } catch {
    return clamp(currentTreeIndex || 0, 0, Math.max(0, scaleListLength - 1));
  }
};
