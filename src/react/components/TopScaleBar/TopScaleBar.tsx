// TopScaleBar.tsx - Main component for phylogenetic scale tracking and visualization

import React from 'react';
import { useAppStore } from '../../../js/core/store.js';
import { useScaleMetrics } from './useScaleMetrics';
import { CurrentScaleDisplay } from './CurrentScaleDisplay';
import { BranchLengthHistogram } from './BranchLengthHistogram';
import { TaxaLegend } from './TaxaLegend';

/**
 * TopScaleBar component displays phylogenetic scale metrics for the current tree:
 * - Current tree scale (maximum root-to-tip distance)
 * - Branch length distribution histogram
 * - Scale progress indicator
 * - Taxa groups legend
 *
 * This component uses anchor trees (not interpolated trees) for histogram calculations
 * to prevent visual jitter during animation playback.
 */
export const TopScaleBar: React.FC = () => {
  // Zustand state: Use granular selectors to minimize re-renders
  const currentTreeIndex = useAppStore((s) => s.currentTreeIndex);
  const treeList = useAppStore((s) => s.treeList || []);
  const scaleList = useAppStore((s) => s.movieData?.scaleList);
  const maxScale = useAppStore((s) => s.movieData?.maxScale || 0);
  const fullTreeIndices = useAppStore((s) => s.movieData?.fullTreeIndices);
  const transitionResolver = useAppStore((s) => s.transitionResolver);

  // Compute scale metrics and histogram (memoized)
  const {
    formattedCurrent,
    formattedMax,
    progress,
    histogramBins,
    histogramMax,
    histogramStats
  } = useScaleMetrics({
    currentTreeIndex,
    treeList,
    scaleList,
    maxScale,
    fullTreeIndices,
    transitionResolver,
  });

  const progressPercent = Math.round(progress * 100);

  return (
    <div
      className="top-scale-bar"
      role="region"
      aria-label="Phylogenetic Scale Tracker"
      style={{ maxWidth: 240, minWidth: 180, width: '100%', overflow: 'hidden' }}
    >
      {/* Current scale value and progress */}
      <CurrentScaleDisplay
        formattedCurrent={formattedCurrent}
        formattedMax={formattedMax}
        progressPercent={progressPercent}
      />

      {/* Branch length histogram */}
      <BranchLengthHistogram
        bins={histogramBins}
        maxCount={histogramMax}
        stats={histogramStats}
      />

      {/* Taxa groups legend (content populated externally) */}
      <TaxaLegend />
    </div>
  );
};
