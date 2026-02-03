// CurrentScaleDisplay.tsx - Displays current tree scale value with progress indicator

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Ruler, Crosshair } from 'lucide-react';

interface CurrentScaleDisplayProps {
  formattedCurrent: string;
  formattedMax: string;
  magnitudeFactor: number;
  showHeader?: boolean;
}

/**
 * Displays the current tree's maximum root-to-tip distance (scale)
 * and magnitude relative to the maximum scale across all trees
 */
export const CurrentScaleDisplay: React.FC<CurrentScaleDisplayProps> = ({
  formattedCurrent,
  formattedMax,
  magnitudeFactor,
  showHeader = true,
}) => {
  return (
    <div className="flex flex-col gap-2.5">
      {/* Current scale value */}
      {showHeader ? (
        <div className="flex items-center gap-2 text-2xs font-bold uppercase tracking-wider text-muted-foreground/70">
          <Ruler className="size-3" />
          <span>Tree Scale</span>
        </div>
      ) : null}

      <div className="flex flex-col gap-2" aria-live="polite">
        <Badge
          variant="secondary"
          className="w-fit h-6 px-2 text-[11px] font-medium bg-muted/50 border-border/40 hover:bg-muted/80 transition-colors"
          title="Maximum root-to-tip distance in current tree"
        >
          <Crosshair className="size-3 mr-1.5 text-muted-foreground" />
          <span id="currentScaleText">{formattedCurrent}</span>
        </Badge>
      </div>

      {/* Scale magnitude bar */}
      <div className="flex flex-col gap-1.5 mt-1" aria-label="Scale relative to maximum">
        <div className="inline-flex items-center justify-between text-2xs font-bold uppercase tracking-wider text-muted-foreground/70">
          <div className="flex items-center gap-1.5">
             <Ruler className="size-3" aria-hidden />
             <span id="scale-max-label">Relative Scale Magnitude</span>
          </div>
          <span className="text-muted-foreground tabular-nums">{magnitudeFactor.toFixed(2)}</span>
        </div>
        <Progress
          id="scale-progress"
          aria-labelledby="scale-max-label"
          value={magnitudeFactor * 100}
          className="h-1.5"
        />
        <div className="text-[9px] text-muted-foreground/60 italic text-right">
           Maximum Phylogenetic Scale: {formattedMax}
        </div>
      </div>
    </div>
  );
};
