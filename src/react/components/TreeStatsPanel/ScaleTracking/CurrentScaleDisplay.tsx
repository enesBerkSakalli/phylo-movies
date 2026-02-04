// CurrentScaleDisplay.tsx - Displays current tree scale value with progress indicator

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Ruler } from 'lucide-react';

interface CurrentScaleDisplayProps {
  formattedCurrent: string;
  formattedMax: string;
  magnitudeFactor: number;
  showHeader?: boolean;
}

/**
 * Displays the current tree's phylogenetic depth (maximum root-to-tip distance)
 * and its ratio relative to the maximum depth across all trees in the sequence.
 */
export const CurrentScaleDisplay: React.FC<CurrentScaleDisplayProps> = ({
  formattedCurrent,
  formattedMax,
  magnitudeFactor,
  showHeader = true,
}) => {
  return (
    <div className="flex flex-col gap-2.5">
      {showHeader && (
        <>
          <Label className="text-2xs font-bold uppercase tracking-wider text-muted-foreground/70">
            <Ruler className="size-3" />
            Tree Depth
          </Label>
          <Separator className="bg-white/5" />
        </>
      )}

      {/* Explanation text */}
      <p className="text-2xs text-muted-foreground/70 leading-relaxed">
        Maximum root-to-tip distance in the current tree, relative to the deepest tree in the sequence.
      </p>

      {/* Current and max values */}
      <div className="flex items-center gap-2" aria-live="polite">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="secondary"
              className="h-6 px-2 text-[11px] font-medium tabular-nums bg-muted/50 border-border/40 hover:bg-muted/80 transition-colors cursor-default"
            >
              {formattedCurrent}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Current tree depth (substitutions per site)
          </TooltipContent>
        </Tooltip>
        <span className="text-2xs text-muted-foreground/50">/</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="h-6 px-2 text-[11px] font-medium tabular-nums border-border/40 hover:bg-muted/20 transition-colors cursor-default"
            >
              {formattedMax}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Maximum tree depth across all trees
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Depth ratio bar */}
      <div className="flex flex-col gap-1.5" role="figure" aria-label="Tree depth ratio">
        <div className="flex items-center justify-between text-2xs text-muted-foreground/70">
          <span className="font-medium">Depth Ratio</span>
          <span className="font-mono tabular-nums">{magnitudeFactor.toFixed(2)}</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Progress
                value={magnitudeFactor * 100}
                aria-label={`Tree depth ratio: ${(magnitudeFactor * 100).toFixed(0)}%`}
                className="h-1.5 cursor-default"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs tabular-nums">
            <div className="flex flex-col gap-0.5">
              <span>Current: {formattedCurrent}</span>
              <span>Maximum: {formattedMax}</span>
              <span>Ratio: {(magnitudeFactor * 100).toFixed(1)}%</span>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};
