import React, { useMemo } from 'react';
import { Dna } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppStore } from '@/js/state/phyloStore/store.js';
import {
  buildMsaWindow,
  selectCurrentTreeIndex,
  selectHasMsa,
  selectMsaColumnCount,
  selectMsaStepSize,
  selectMsaWindowSize,
  selectTransitionResolver,
  selectTreeListLength,
} from '../shared/hudShared.js';

export function MSAWindowSection() {
  const hasMsa = useAppStore(selectHasMsa);
  const currentTreeIndex = useAppStore(selectCurrentTreeIndex);
  const transitionResolver = useAppStore(selectTransitionResolver);
  const treeListLength = useAppStore(selectTreeListLength);
  const msaWindowSize = useAppStore(selectMsaWindowSize);
  const msaStepSize = useAppStore(selectMsaStepSize);
  const msaColumnCount = useAppStore(selectMsaColumnCount);

  const proxyState = useMemo(
    () => ({ currentTreeIndex, transitionResolver, treeList: { length: treeListLength } }),
    [currentTreeIndex, transitionResolver, treeListLength]
  );

  const msaWindow = buildMsaWindow(hasMsa, proxyState, msaStepSize, msaWindowSize, msaColumnCount);

  return (
    <div className="flex items-center gap-3" id="hud-msa-window-item">
      <Dna className="size-3.5 text-primary" aria-hidden />
      <div className="flex flex-col gap-1">
        <span className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">MSA Window</span>
        <div className="inline-flex items-center gap-1 text-xs font-bold text-foreground tabular-nums">
          <span id="hudWindowStart">{msaWindow?.startPosition ?? 1}</span>
          <span className="text-muted-foreground/50 text-2xs">-</span>
          <span id="hudWindowMid" className="text-primary">{msaWindow?.midPosition ?? 1}</span>
          <span className="text-muted-foreground/50 text-2xs">-</span>
          <span id="hudWindowEnd">{msaWindow?.endPosition ?? msaWindowSize ?? 100}</span>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold text-foreground tabular-nums">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 border border-primary/20 hover:border-primary/40 transition-colors cursor-help">
                <span className="text-2xs text-muted-foreground">Size:</span>
                <span className="text-primary">{msaWindowSize ?? '—'}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-2xs">
              Window size in alignment positions
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 border border-primary/20 hover:border-primary/40 transition-colors cursor-help">
                <span className="text-2xs text-muted-foreground">Step:</span>
                <span className="text-primary">{msaStepSize ?? '—'}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-2xs">
              Step size between frames
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
