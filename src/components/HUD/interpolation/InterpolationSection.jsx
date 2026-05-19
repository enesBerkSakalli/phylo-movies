import React from 'react';
import { BarChart2 } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { AppTooltip } from '../../ui/app-tooltip';
import { useAppStore } from '../../../state/phyloStore/store.js';
import {
  buildSegmentText,
  selectFrameIndex,
  selectTransitionResolver,
} from '../shared/hudShared.js';

export function InterpolationSection() {
  const frameIndex = useAppStore(selectFrameIndex);
  const transitionResolver = useAppStore(selectTransitionResolver);

  const segmentText = buildSegmentText(frameIndex, transitionResolver);
  const tooltipText = getTimelineTooltipText(segmentText);

  return (
    <div className="flex items-center gap-2">
      <BarChart2 className="size-3.5 text-primary" aria-hidden />
      <div className="flex flex-col gap-0">
        <span className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">Tree Type</span>
        <AppTooltip content={tooltipText} contentClassName="max-w-xs">
          <Badge
            id="hudSegmentInfo"
            aria-live="polite"
            variant="secondary"
            className="h-5 px-2 text-2xs font-bold cursor-help"
          >
            {segmentText}
          </Badge>
        </AppTooltip>
      </div>
    </div>
  );
}

function getTimelineTooltipText(segmentText) {
  if (segmentText === 'Input tree') {
    return 'An observed tree from one alignment window or uploaded tree set.';
  }
  if (segmentText === 'Generated frame') {
    return 'A generated tree frame in the sequence.';
  }
  return 'Generated frames between a source input tree and target input tree.';
}
