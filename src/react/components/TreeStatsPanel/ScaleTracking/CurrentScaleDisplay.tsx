// CurrentScaleDisplay.tsx - Displays current tree scale value with progress indicator

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Ruler, Crosshair } from 'lucide-react';

interface CurrentScaleDisplayProps {
  formattedCurrent: string;
  formattedMax: string;
  progressPercent: number;
}

/**
 * Displays the current tree's maximum root-to-tip distance (scale)
 * and progress relative to the maximum scale across all trees
 */
export const CurrentScaleDisplay: React.FC<CurrentScaleDisplayProps> = ({
  formattedCurrent,
  formattedMax,
  progressPercent,
}) => {
  return (
    <>
      {/* Current scale value */}
      <div className="scale-header">
        <Ruler className="size-4" />
        <span className="scale-title">Current Tree Scale</span>
      </div>

      <div className="scale-values" aria-live="polite">
        <Badge
          variant="secondary"
          title="Maximum root-to-tip distance in current tree"
        >
          <Crosshair className="size-3" />
          <span id="currentScaleText">{formattedCurrent}</span>
        </Badge>
      </div>

      {/* Scale progress bar */}
      <div className="scale-bar-container" aria-label="Scale relative to maximum">
        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Ruler className="size-3" aria-hidden />
          <span id="scale-max-label">Scale Progress (max: {formattedMax})</span>
        </div>
        <Progress
          id="scale-progress"
          aria-labelledby="scale-max-label"
          value={progressPercent}
        />
      </div>
    </>
  );
};
