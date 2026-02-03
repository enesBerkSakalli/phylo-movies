
import React, { useMemo, useState } from 'react';
import { useAppStore } from '../../../../js/core/store';
import {
  calculateSubtreeFrequencies,
  getTopSubtrees,
  formatSubtreeLabel
} from '../../../../js/domain/tree/subtreeFrequencyUtils';
import { ChevronDown, ChevronRight, BarChart2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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

export const SubtreeFrequencyList = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get data from store
  const pairSolutions = useAppStore(selectPairSolutions);
  const sortedLeaves = useAppStore(selectSortedLeaves);
  const setManuallyMarkedNodes = useAppStore(selectSetManuallyMarkedNodes);
  const markedNodes = useAppStore(selectMarkedNodes); // For highlighting active state

  // Calculate frequencies (memoized)
  const topSubtrees = useMemo(() => {
    if (!pairSolutions || Object.keys(pairSolutions).length === 0) return [];
    const allFreqs = calculateSubtreeFrequencies(pairSolutions);
    return getTopSubtrees(allFreqs, 5); // Show top 5
  }, [pairSolutions]);

  if (!topSubtrees.length) return null;

  const handleSubtreeClick = (splitIndices: number[]) => {
    // Toggle: if clicking same subtree, clear it. If new, set it.
    // We compare signatures to see if it's the same subtree
    const signature = [...splitIndices].sort((a, b) => a - b).join(',');
    const currentSignature = Array.isArray(markedNodes) && markedNodes.length > 0
      ? [...markedNodes].sort((a, b) => a - b).join(',')
      : '';

    if (signature === currentSignature) {
      setManuallyMarkedNodes([]);
    } else {
      // Pass the split indices directly. The store's toManualMarkedSets will
      // convert this array of leaf IDs into a Set for the ColorManager.
      setManuallyMarkedNodes(splitIndices);
    }
  };

  return (
    <div className="border-t border-border/60 mt-2 pt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-2xs font-bold uppercase tracking-wider text-muted-foreground/70 hover:text-muted-foreground transition-colors mb-2"
      >
        <BarChart2 className="size-3" />
        <span>Subtree Mobility</span>
        <div className="ml-auto">
          {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        </div>
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-1.5 animate-in slide-in-from-top-1 duration-200">
          {topSubtrees.map((item, idx) => {
            const signature = [...item.splitIndices].sort((a, b) => a - b).join(',');
            const currentSignature = Array.isArray(markedNodes) && markedNodes.length > 0
              ? [...markedNodes].sort((a, b) => a - b).join(',')
              : '';
            const isActive = signature === currentSignature;

            return (
              <div
                key={item.signature}
                className={cn(
                  "flex flex-col gap-1 p-1.5 rounded border transition-all cursor-pointer text-[11px] group",
                  isActive
                    ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20"
                    : "bg-muted/30 border-border/40 hover:bg-muted/50 hover:border-border/60"
                )}
                onClick={() => handleSubtreeClick(item.splitIndices)}
                title={`Topological rearrangements: ${item.count}`}
              >
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "font-semibold truncate max-w-[140px]",
                    isActive ? "text-primary" : "text-foreground/80"
                  )}>
                    {formatSubtreeLabel(item.splitIndices, sortedLeaves)}
                  </span>
                <Badge variant="outline" className="text-2xs h-4 px-1" title="Number of rearrangements involving this subtree">
                  {item.count}
                </Badge>
              </div>
              <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/70 group-hover:bg-primary transition-all"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
  );
};
