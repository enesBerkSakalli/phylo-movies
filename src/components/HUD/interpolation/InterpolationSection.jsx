import React, { useMemo } from 'react';
import { BarChart2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AppTooltip } from '@/components/ui/app-tooltip';
import { getIndexMappings } from '@/domain/indexing/IndexMapping';
import { useAppStore } from '@/state/phyloStore/store.js';
import {
  buildSegmentText,
  selectCurrentTreeIndex,
  selectTransitionResolver,
  selectTreeListLength,
} from '../shared/hudShared.js';

export function InterpolationSection() {
  const currentTreeIndex = useAppStore(selectCurrentTreeIndex);
  const transitionResolver = useAppStore(selectTransitionResolver);
  const treeListLength = useAppStore(selectTreeListLength);

  const proxyState = useMemo(
    () => ({ currentTreeIndex, transitionResolver, treeList: { length: treeListLength } }),
    [currentTreeIndex, transitionResolver, treeListLength]
  );

  const { sequenceIndex } = getIndexMappings(proxyState);
  const segmentText = buildSegmentText(sequenceIndex, transitionResolver);
  const tooltipText = getTimelineTooltipText(segmentText);

  return (
    <div className="flex items-center gap-2">
      <BarChart2 className="size-3.5 text-primary" aria-hidden />
      <div className="flex flex-col gap-0">
        <span className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">Timeline</span>
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
  if (segmentText === 'Tree window') {
    return 'A real input tree from one alignment window.';
  }
  if (segmentText === 'Timeline frame') {
    return 'A frame in the tree sequence timeline.';
  }
  return 'Interpolated frames between neighboring tree windows.';
}
