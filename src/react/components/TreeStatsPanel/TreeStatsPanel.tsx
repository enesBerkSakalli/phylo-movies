// TreeStatsPanel.tsx - Main component for phylogenetic scale tracking and visualization

import React from 'react';
import { useAppStore } from '../../../js/core/store.js';
import { useScaleMetrics } from './ScaleTracking/useScaleMetrics';
import { CurrentScaleDisplay } from './ScaleTracking/CurrentScaleDisplay';
import { BranchLengthHistogram } from './BranchLengths/BranchLengthHistogram';
import { SubtreeFrequencyList } from './SubtreeAnalytics/SubtreeFrequencyList';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { TaxaLegend } from './Shared/TaxaLegend';

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
export const TreeStatsPanel: React.FC = () => {
  // Zustand state: Use granular selectors to minimize re-renders
  const currentTreeIndex = useAppStore((s) => s.currentTreeIndex);
  const treeList = useAppStore((s) => s.treeList);
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
      style={{ maxWidth: 200, minWidth: 160, width: '100%', overflow: 'hidden' }}
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

      {/* Subtree Frequency Analytics */}
      <SubtreeFrequencyList />

      {/* Advanced Analytics Dashboard Trigger */}
      <div className="mt-2 text-center">
         <AnalyticsDashboard />
      </div>

      {/* Taxa groups legend (content populated externally) */}
      <TaxaLegend />
    </div>
  );
};
