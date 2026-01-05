
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

export const SubtreeFrequencyList = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get data from store
  const pairSolutions = useAppStore(s => s.pairSolutions);
  const sortedLeaves = useAppStore(s => s.movieData?.sorted_leaves);
  const setManuallyMarkedNodes = useAppStore(s => s.setManuallyMarkedNodes);
  const markedNodes = useAppStore(s => s.manuallyMarkedNodes); // For highlighting active state

  // Calculate frequencies (memoized)
  const topSubtrees = useMemo(() => {
    if (!pairSolutions) return [];
    const allFreqs = calculateSubtreeFrequencies(pairSolutions);
    return getTopSubtrees(allFreqs, 5); // Show top 5
  }, [pairSolutions]);

  if (!topSubtrees.length) return null;

  const handleSubtreeClick = (splitIndices) => {
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
    <div className="border-t border-border mt-2 pt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        <BarChart2 className="size-3" />
        Frequent Jumping Subtrees
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-1.5 animate-in slide-in-from-top-1 duration-200">
          {topSubtrees.map((item, idx) => (
            <div
              key={item.signature}
              className="flex flex-col gap-1 p-1.5 rounded-md hover:bg-accent/50 cursor-pointer text-xs group"
              onClick={() => handleSubtreeClick(item.splitIndices)}
              title={`Occurs ${item.count} times`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium truncate max-w-[140px] text-foreground">
                  {formatSubtreeLabel(item.splitIndices, sortedLeaves)}
                </span>
                <Badge variant="outline" className="text-[10px] h-4 px-1">
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
          ))}
        </div>
      )}
    </div>
  );
};
