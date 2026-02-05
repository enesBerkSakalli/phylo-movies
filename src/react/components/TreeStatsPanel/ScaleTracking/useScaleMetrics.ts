// useScaleMetrics.ts - Custom hook for computing scale metrics and histogram data

import { useMemo } from 'react';
import { formatScaleValue } from '../../../../js/domain/tree/scaleUtils.js';
import {
  buildScaleLookup,
  resolveAnchorIndex,
  collectBranchLengths,
  buildHistogram,
  clamp
} from '../Shared/utils';
import type { ScaleMetrics, TreeNode, ScaleListItem, TransitionResolver } from '../Shared/types';

interface UseScaleMetricsParams {
  currentTreeIndex: number;
  treeList: TreeNode[];
  scaleList: ScaleListItem[] | null | undefined;
  maxScale: number;
  fullTreeIndices: number[] | null | undefined;
  transitionResolver: TransitionResolver | null | undefined;
}

/**
 * Computes scale metrics and histogram data for the current tree
 * Memoized to avoid recomputation on every render
 */
export const useScaleMetrics = ({
  currentTreeIndex,
  treeList,
  scaleList,
  maxScale,
  fullTreeIndices,
  transitionResolver,
}: UseScaleMetricsParams): ScaleMetrics => {
  return useMemo(() => {
    const scaleLookup = buildScaleLookup(scaleList);
    const anchorIndex = resolveAnchorIndex(
      currentTreeIndex,
      fullTreeIndices,
      transitionResolver,
      scaleList?.length || 0
    );

    // Use source-target tree (not interpolated) to avoid jitter during animation
    const displayIndex = clamp(anchorIndex, 0, Math.max(0, treeList.length - 1));
    const anchorTree = treeList[displayIndex];

    // Collect branch lengths and build histogram
    const lengths = anchorTree ? collectBranchLengths(anchorTree) : [];
    const { bins, maxCount, mean, min, max } = buildHistogram(lengths);

    // Get current scale value
    const currentScale = scaleLookup.get(anchorIndex) ?? 0;
    const progress = maxScale > 0 ? clamp(currentScale / maxScale, 0, 1) : 0;

    return {
      formattedCurrent: formatScaleValue(currentScale),
      formattedMax: formatScaleValue(maxScale),
      progress,
      histogramBins: bins,
      histogramMax: maxCount,
      histogramStats: { mean, min, max },
    };
  }, [currentTreeIndex, fullTreeIndices, maxScale, scaleList, transitionResolver, treeList]);
};
