
import React, { useMemo } from 'react';
import { useAppStore } from '../../../../js/core/store';
import {
  calculateSubtreeFrequencies,
  getTopSubtrees,
  formatSubtreeLabel
} from '../../../../js/domain/tree/subtreeFrequencyUtils';
import { ChevronRight, BarChart2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { AppStoreState } from '../../../../types/store';

// ==========================================================================
// STORE SELECTORS
// ==========================================================================
const EMPTY_ARRAY: any[] = [];
const selectPairSolutions = (s: AppStoreState) => s.pairSolutions;
const selectSortedLeaves = (s: AppStoreState) => s.movieData?.sorted_leaves || EMPTY_ARRAY;
const selectSetManuallyMarkedNodes = (s: AppStoreState) => s.setManuallyMarkedNodes;
const selectMarkedNodes = (s: AppStoreState) => s.manuallyMarkedNodes;

/**
 * SubtreeFrequencyList
 *
 * Displays the most frequently rearranged subtrees across tree transitions.
 * Click a subtree to highlight it on the tree visualization.
 */
export const SubtreeFrequencyList = () => {
  // Get data from store
  const pairSolutions = useAppStore(selectPairSolutions);
  const sortedLeaves = useAppStore(selectSortedLeaves);
  const setManuallyMarkedNodes = useAppStore(selectSetManuallyMarkedNodes);
  const markedNodes = useAppStore(selectMarkedNodes);

  // Calculate frequencies (memoized)
  const topSubtrees = useMemo(() => {
    if (!pairSolutions || Object.keys(pairSolutions).length === 0) return [];
    const allFreqs = calculateSubtreeFrequencies(pairSolutions);
    return getTopSubtrees(allFreqs, 5); // Show top 5
  }, [pairSolutions]);

  if (!topSubtrees.length) return null;

  const handleSubtreeClick = (splitIndices: number[]) => {
    // Toggle: if clicking same subtree, clear it. If new, set it.
    const signature = [...splitIndices].sort((a, b) => a - b).join(',');
    const currentSignature = Array.isArray(markedNodes) && markedNodes.length > 0
      ? [...markedNodes].sort((a, b) => a - b).join(',')
      : '';

    if (signature === currentSignature) {
      setManuallyMarkedNodes([]);
    } else {
      setManuallyMarkedNodes(splitIndices);
    }
  };

  const getSignature = (indices: number[]) => [...indices].sort((a, b) => a - b).join(',');
  const currentSignature = Array.isArray(markedNodes) && markedNodes.length > 0
    ? getSignature(markedNodes)
    : '';

  return (
    <div className="flex flex-col gap-2">
      <Separator className="bg-white/5" />

      <Collapsible defaultOpen={false} className="group/subtree">
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left hover:text-muted-foreground transition-colors">
          <Label className="text-2xs font-bold uppercase tracking-wider text-muted-foreground/70 cursor-pointer">
            <BarChart2 className="size-3" />
            Subtree Mobility
          </Label>
          <ChevronRight className="ml-auto size-3 text-muted-foreground/70 transition-transform group-data-[state=open]/subtree:rotate-90" />
        </CollapsibleTrigger>

        <CollapsibleContent className="pt-2 space-y-2 animate-in slide-in-from-top-1 duration-200">
          {/* Explanation text */}
          <p className="text-2xs text-muted-foreground/70 leading-relaxed">
            Subtrees ranked by rearrangement frequency across tree transitions. Click to highlight on tree.
          </p>

          <div
            className="flex flex-col gap-1.5"
            role="list"
            aria-label="Most mobile subtrees"
          >
            {topSubtrees.map((item) => {
              const signature = getSignature(item.splitIndices);
              const isActive = signature === currentSignature;
              const subtreeLabel = formatSubtreeLabel(item.splitIndices, sortedLeaves);

              return (
                <Card
                  key={item.signature}
                  role="listitem"
                  tabIndex={0}
                  onClick={() => handleSubtreeClick(item.splitIndices)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSubtreeClick(item.splitIndices);
                    }
                  }}
                  className={cn(
                    "cursor-pointer transition-all py-1.5 px-2 gap-1 rounded shadow-none group",
                    isActive
                      ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20"
                      : "bg-muted/30 border-border/40 hover:bg-muted/50 hover:border-border/60"
                  )}
                  aria-pressed={isActive}
                  aria-label={`${subtreeLabel}, ${item.count} rearrangements, ${item.percentage.toFixed(1)}%`}
                >
                  <CardContent className="p-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={cn(
                            "font-semibold truncate max-w-[140px] text-[11px]",
                            isActive ? "text-primary" : "text-foreground/80"
                          )}>
                            {subtreeLabel}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-xs">
                          <span className="break-words">{subtreeLabel}</span>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-2xs h-4 px-1 tabular-nums">
                            {item.count}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Topological rearrangements involving this subtree
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <Progress
                      value={item.percentage}
                      className="h-1 bg-secondary"
                      aria-label={`${item.percentage.toFixed(1)}% of total rearrangements`}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
