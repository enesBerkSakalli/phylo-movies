// useScaleMetrics.ts - Custom hook for computing scale metrics and histogram data

import { useMemo } from 'react';
import { buildScaleLookup, formatScaleValue } from '../../../domain/tree/scaleUtils.js';
import { collectBranchLengths, buildHistogram, clamp } from '../Shared/utils';
import type { ScaleMetrics, TreeNode, ScaleListItem } from '../Shared/types';

interface UseScaleMetricsParams {
  sourceFrameIndex: number;
  treeList: TreeNode[];
  scaleList: ScaleListItem[] | null | undefined;
  maxScale: number;
}

/**
 * Computes scale metrics and histogram data for the current tree
 * Memoized to avoid recomputation on every render
 */
export const useScaleMetrics = ({
  sourceFrameIndex,
  treeList,
  scaleList,
  maxScale,
}: UseScaleMetricsParams): ScaleMetrics => {
  return useMemo(() => {
    const scaleLookup = buildScaleLookup(scaleList);

    // Use an input tree (not a transition frame) to avoid jitter during animation.
    const displayIndex = clamp(sourceFrameIndex, 0, Math.max(0, treeList.length - 1));
    const inputTree = treeList[displayIndex];

    // Collect branch lengths and build histogram
    const lengths = inputTree ? collectBranchLengths(inputTree) : [];
    const { bins, maxCount, mean, min, max } = buildHistogram(lengths);

    // Get current scale value
    const currentScale = scaleLookup.get(displayIndex) ?? 0;
    const progress = maxScale > 0 ? clamp(currentScale / maxScale, 0, 1) : 0;

    return {
      formattedCurrent: formatScaleValue(currentScale),
      formattedMax: formatScaleValue(maxScale),
      progress,
      histogramBins: bins,
      histogramMax: maxCount,
      histogramStats: { mean, min, max },
    };
  }, [sourceFrameIndex, maxScale, scaleList, treeList]);
};
