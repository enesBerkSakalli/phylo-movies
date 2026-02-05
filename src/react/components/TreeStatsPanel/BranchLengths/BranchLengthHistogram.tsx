// BranchLengthHistogram.tsx - Histogram visualization component

import React from 'react';
import { Palette } from 'lucide-react';
import { formatScaleValue } from '../../../../js/domain/tree/scaleUtils.js';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { HistogramBin, HistogramStats } from '../Shared/types';

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
      role="figure"
      aria-label="Branch Length Distribution Histogram"
    >
      {showHeader && (
        <>
          <Label className="text-2xs font-bold uppercase tracking-wider text-muted-foreground/70">
            <Palette className="size-3" aria-hidden />
            Length Distribution
          </Label>
          <Separator className="bg-white/5" />
        </>
      )}

      {/* Histogram bars */}
      <div
        className="grid items-end gap-1 w-full bg-muted/20 p-2 rounded-sm border border-border/40"
        role="group"
        aria-label="Distribution bars"
        style={{
          height: 72,
          gridTemplateColumns: `repeat(${columnCount}, minmax(3px, 1fr))`
        }}
      >
        {hasData ? (
          bins.map((bin, idx) => {
            const heightPx = maxCount > 0
              ? Math.max(4, (bin.count / maxCount) * 58)
              : 0;

            return (
              <Tooltip key={`${idx}-${bin.from}`}>
                <TooltipTrigger asChild>
                  <div
                    className="flex flex-col items-center"
                    style={{ minWidth: 3 }}
                  >
                    <div
                      role="img"
                      aria-label={`Range ${formatScaleValue(bin.from)} to ${formatScaleValue(bin.to)}, count ${bin.count}`}
                      className="w-full bg-primary/80 rounded-sm hover:bg-primary transition-colors cursor-crosshair"
                      style={{
                        height: `${heightPx}px`,
                      }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs tabular-nums">
                  <div className="flex flex-col gap-1">
                    <span>Range: {formatScaleValue(bin.from)} – {formatScaleValue(bin.to)}</span>
                    <span>Count: {bin.count}</span>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })
        ) : (
          <span className="text-2xs text-muted-foreground italic">Insufficient data</span>
        )}
      </div>

      {/* Statistics summary */}
      {hasData && (
        <div className="flex items-center justify-between text-2xs text-muted-foreground/80 font-medium tabular-nums px-1">
          <div className="flex gap-2">
            <span>MIN: <span className="text-foreground/70">{formatScaleValue(stats.min)}</span></span>
            <span>MEAN: <span className="text-foreground/70">{formatScaleValue(stats.mean)}</span></span>
          </div>
          <span>MAX: <span className="text-foreground/70">{formatScaleValue(stats.max)}</span></span>
        </div>
      )}
    </div>
  );
};
