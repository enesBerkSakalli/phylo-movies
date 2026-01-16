// BranchLengthHistogram.tsx - Histogram visualization component

import React from 'react';
import { Palette } from 'lucide-react';
import { formatScaleValue } from '../../../../js/domain/tree/scaleUtils.js';
import type { HistogramBin, HistogramStats } from './types';

interface BranchLengthHistogramProps {
  bins: HistogramBin[];
  maxCount: number;
  stats: HistogramStats;
  showHeader?: boolean;
}

/**
 * Displays a histogram of branch lengths for the current tree
 * Shows distribution of evolutionary distances across branches
 */
export const BranchLengthHistogram: React.FC<BranchLengthHistogramProps> = ({
  bins,
  maxCount,
  stats,
  showHeader = true
}) => {
  const columnCount = Math.max(bins.length, 1);
  const hasData = bins.length > 0;

  return (
    <div
      className="flex flex-col gap-2 w-full"
      aria-label="Current Tree Branch Length Distribution"
    >
      {showHeader ? (
        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Palette className="size-3" aria-hidden />
          <span id="branch-lengths-label">Current Tree Branch Lengths</span>
        </div>
      ) : null}

      {/* Histogram bars */}
      <div
        className="grid items-end gap-1 w-full"
        style={{
          height: 64,
          gridTemplateColumns: `repeat(${columnCount}, minmax(4px, 1fr))`
        }}
      >
        {hasData ? (
          bins.map((bin, idx) => {
            const heightPx = maxCount > 0
              ? Math.max(6, (bin.count / maxCount) * 52)
              : 0;

            return (
              <div
                key={`${idx}-${bin.from}`}
                className="flex flex-col items-center gap-1"
                style={{ minWidth: 4 }}
              >
                <div
                  title={`Range: ${formatScaleValue(bin.from)} – ${formatScaleValue(bin.to)}\nCount: ${bin.count}`}
                  aria-labelledby="branch-lengths-label"
                  style={{
                    width: '100%',
                    background: 'var(--primary)',
                    height: `${heightPx}px`,
                    borderRadius: 3,
                    opacity: 0.8,
                  }}
                />
              </div>
            );
          })
        ) : (
          <span className="text-xs text-muted-foreground">No branch data</span>
        )}
      </div>

      {/* Statistics summary */}
      {hasData && (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>min: {formatScaleValue(stats.min)}</span>
          <span>mean: {formatScaleValue(stats.mean)}</span>
          <span>max: {formatScaleValue(stats.max)}</span>
        </div>
      )}
    </div>
  );
};
